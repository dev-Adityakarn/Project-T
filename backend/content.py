"""Validation and text helpers for versioned blog post bodies.

The rich-text body is stored as JSON (Tiptap/ProseMirror shape).  This module is
the server-side trust boundary: only the node/mark types we render are accepted,
URLs are restricted to safe schemes, and size/depth limits stop abusive payloads.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlsplit

CONTENT_FORMAT_LEGACY = "legacy-text-v1"
CONTENT_FORMAT_RICH = "rich-json-v1"
CONTENT_FORMATS = {CONTENT_FORMAT_LEGACY, CONTENT_FORMAT_RICH}

MAX_JSON_BYTES = 200_000
MAX_NODES = 5_000
MAX_DEPTH = 12
MAX_TEXT_CHARS = 100_000
MAX_URL_LENGTH = 2_048
MIN_TEXT_CHARS = 20

_BLOCK_TYPES = {
    "paragraph",
    "lead",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "blockquote",
    "horizontalRule",
}
_INLINE_TYPES = {"text", "hardBreak"}
_ALLOWED_MARKS = {"bold", "italic", "link"}


class ContentValidationError(ValueError):
    """Raised when a rich-text payload is not safe or not structurally valid."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))

    def as_detail(self) -> list[dict[str, Any]]:
        return [
            {"loc": ["body", "content_json"], "msg": message, "type": "content"}
            for message in self.errors
        ]


def _error(errors: list[str], path: str, message: str) -> None:
    errors.append(f"{path}: {message}")


def _check_keys(
    node: dict[str, Any],
    allowed: set[str],
    path: str,
    errors: list[str],
) -> None:
    unknown = sorted(set(node) - allowed)
    if unknown:
        _error(errors, path, f"Unsupported field(s): {', '.join(unknown)}.")


def _validate_url(value: Any, path: str, errors: list[str]) -> str | None:
    if not isinstance(value, str):
        _error(errors, path, "Link URL must be a string.")
        return None

    href = value.strip()
    if not href:
        _error(errors, path, "Link URL cannot be empty.")
        return None
    if len(href) > MAX_URL_LENGTH:
        _error(errors, path, f"Link URL must be {MAX_URL_LENGTH} characters or fewer.")
        return None
    if any(ord(char) < 32 or ord(char) == 127 for char in href):
        _error(errors, path, "Link URL cannot contain control characters.")
        return None
    if any(char.isspace() for char in href):
        _error(errors, path, "Link URL cannot contain spaces.")
        return None
    if "\\" in href:
        _error(errors, path, "Link URL cannot contain backslashes.")
        return None
    if href.startswith("//"):
        _error(errors, path, "Protocol-relative link URLs are not allowed.")
        return None

    if href.startswith("/"):
        return href

    try:
        parsed = urlsplit(href)
    except ValueError:
        _error(errors, path, "Link URL is not valid.")
        return None

    scheme = (parsed.scheme or "").lower()
    if scheme in {"http", "https"}:
        if not parsed.netloc or not parsed.hostname:
            _error(errors, path, "External links need a host name.")
            return None
        if parsed.username or parsed.password:
            _error(errors, path, "Link URLs cannot contain credentials.")
            return None
        return href

    if scheme == "mailto":
        if not parsed.path or "@" not in parsed.path:
            _error(errors, path, "Mail links need a valid email address.")
            return None
        return href

    _error(
        errors,
        path,
        "Link URLs must use https, http, mailto, or a site-relative path beginning with /.",
    )
    return None


def _validate_marks(
    marks: Any,
    path: str,
    errors: list[str],
) -> list[dict[str, Any]] | None:
    if marks is None:
        return None
    if not isinstance(marks, list):
        _error(errors, path, "Text marks must be a list.")
        return None

    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, mark in enumerate(marks):
        mark_path = f"{path}[{index}]"
        if not isinstance(mark, dict):
            _error(errors, mark_path, "Each mark must be an object.")
            continue
        mark_type = mark.get("type")
        if mark_type not in _ALLOWED_MARKS:
            _error(errors, mark_path, f"Unsupported mark type: {mark_type!r}.")
            continue
        if mark_type in seen:
            _error(errors, mark_path, f"Duplicate {mark_type} mark.")
            continue
        seen.add(mark_type)
        _check_keys(mark, {"type", "attrs"}, mark_path, errors)

        attrs = mark.get("attrs")
        if mark_type == "link":
            if not isinstance(attrs, dict):
                _error(errors, mark_path, "Link marks need a URL.")
                continue
            _check_keys(attrs, {"href"}, f"{mark_path}.attrs", errors)
            href = _validate_url(attrs.get("href"), f"{mark_path}.href", errors)
            if href is not None:
                normalized.append({"type": "link", "attrs": {"href": href}})
        else:
            if attrs not in (None, {}):
                _error(errors, mark_path, f"{mark_type} marks cannot have attributes.")
            normalized.append({"type": mark_type})

    return normalized or None


def _validate_inline(
    node: Any,
    path: str,
    errors: list[str],
    counters: dict[str, int],
    depth: int,
) -> dict[str, Any] | None:
    if not isinstance(node, dict):
        _error(errors, path, "Inline content must be an object.")
        return None

    node_type = node.get("type")
    if node_type not in _INLINE_TYPES:
        _error(errors, path, f"Only text and hard breaks are allowed inside paragraphs (found {node_type!r}).")
        return None

    counters["nodes"] += 1
    if counters["nodes"] > MAX_NODES:
        if not counters.get("nodes_error"):
            _error(errors, path, f"Content cannot contain more than {MAX_NODES} nodes.")
            counters["nodes_error"] = 1
        return None
    if depth > MAX_DEPTH:
        if not counters.get("depth_error"):
            _error(errors, path, f"Content cannot be nested more than {MAX_DEPTH} levels deep.")
            counters["depth_error"] = 1
        return None

    if node_type == "hardBreak":
        _check_keys(node, {"type"}, path, errors)
        return {"type": "hardBreak"}

    _check_keys(node, {"type", "text", "marks"}, path, errors)
    text = node.get("text")
    if not isinstance(text, str):
        _error(errors, path, "Text nodes need a string text value.")
        return None
    if any(ord(char) < 32 and char not in "\n\t" for char in text):
        _error(errors, path, "Text cannot contain control characters.")
        return None

    counters["text_chars"] += len(text)
    if counters["text_chars"] > MAX_TEXT_CHARS:
        if not counters.get("text_error"):
            _error(errors, path, f"Content cannot contain more than {MAX_TEXT_CHARS} characters of text.")
            counters["text_error"] = 1

    marks = _validate_marks(node.get("marks"), f"{path}.marks", errors)
    normalized: dict[str, Any] = {"type": "text", "text": text}
    if marks:
        normalized["marks"] = marks
    return normalized


def _validate_inline_content(
    content: Any,
    path: str,
    errors: list[str],
    counters: dict[str, int],
    depth: int,
) -> list[dict[str, Any]]:
    if content is None:
        return []
    if not isinstance(content, list):
        _error(errors, path, "Inline content must be a list.")
        return []
    normalized = []
    for index, child in enumerate(content):
        item = _validate_inline(child, f"{path}[{index}]", errors, counters, depth + 1)
        if item is not None:
            normalized.append(item)
    return normalized


def _validate_block(
    node: Any,
    path: str,
    errors: list[str],
    counters: dict[str, int],
    depth: int,
    *,
    allow_lead: bool,
    allow_list_item: bool = False,
    headings: list[tuple[int, str]],
) -> dict[str, Any] | None:
    if not isinstance(node, dict):
        _error(errors, path, "Block content must be an object.")
        return None

    node_type = node.get("type")
    if node_type not in _BLOCK_TYPES:
        _error(errors, path, f"Unsupported block type: {node_type!r}.")
        return None
    if node_type == "listItem" and not allow_list_item:
        _error(errors, path, "List items must be inside a bulleted or numbered list.")
        return None

    counters["nodes"] += 1
    if counters["nodes"] > MAX_NODES:
        if not counters.get("nodes_error"):
            _error(errors, path, f"Content cannot contain more than {MAX_NODES} nodes.")
            counters["nodes_error"] = 1
        return None
    if depth > MAX_DEPTH:
        if not counters.get("depth_error"):
            _error(errors, path, f"Content cannot be nested more than {MAX_DEPTH} levels deep.")
            counters["depth_error"] = 1
        return None

    if node_type == "horizontalRule":
        _check_keys(node, {"type"}, path, errors)
        return {"type": "horizontalRule"}

    if node_type in {"paragraph", "lead"}:
        if node_type == "lead" and not allow_lead:
            _error(errors, path, "A lead paragraph is only allowed as the first top-level block.")
            return None
        _check_keys(node, {"type", "content"}, path, errors)
        inline = _validate_inline_content(node.get("content"), f"{path}.content", errors, counters, depth)
        return {"type": node_type, "content": inline} if inline else {"type": node_type}

    if node_type == "heading":
        _check_keys(node, {"type", "attrs", "content"}, path, errors)
        attrs = node.get("attrs")
        if not isinstance(attrs, dict):
            _error(errors, path, "Headings need a level attribute.")
            return None
        _check_keys(attrs, {"level"}, f"{path}.attrs", errors)
        level = attrs.get("level")
        if not isinstance(level, int) or isinstance(level, bool) or level not in {2, 3, 4}:
            _error(errors, path, "Headings must be H2, H3, or H4. H1 is reserved for the article title.")
            return None
        inline = _validate_inline_content(node.get("content"), f"{path}.content", errors, counters, depth)
        if not _node_text({"type": "heading", "content": inline}).strip():
            _error(errors, path, "Headings cannot be empty.")
            return None
        headings.append((level, path))
        return {"type": "heading", "attrs": {"level": level}, "content": inline}

    if node_type == "bulletList":
        _check_keys(node, {"type", "content"}, path, errors)
        items = node.get("content")
        if not isinstance(items, list) or not items:
            _error(errors, path, "A bulleted list needs at least one item.")
            return None
        normalized_items = []
        for index, item in enumerate(items):
            child = _validate_block(
                item,
                f"{path}.content[{index}]",
                errors,
                counters,
                depth + 1,
                allow_lead=False,
                allow_list_item=True,
                headings=headings,
            )
            if child is not None:
                if child.get("type") != "listItem":
                    _error(errors, f"{path}.content[{index}]", "Bulleted lists can only contain list items.")
                else:
                    normalized_items.append(child)
        if not normalized_items:
            return None
        return {"type": "bulletList", "content": normalized_items}

    if node_type == "orderedList":
        _check_keys(node, {"type", "attrs", "content"}, path, errors)
        attrs = node.get("attrs") or {}
        if not isinstance(attrs, dict):
            _error(errors, path, "Ordered-list attributes must be an object.")
            return None
        _check_keys(attrs, {"start"}, f"{path}.attrs", errors)
        start = attrs.get("start", 1)
        if not isinstance(start, int) or isinstance(start, bool) or not 1 <= start <= 9999:
            _error(errors, path, "Ordered-list start must be an integer between 1 and 9999.")
            start = 1
        items = node.get("content")
        if not isinstance(items, list) or not items:
            _error(errors, path, "A numbered list needs at least one item.")
            return None
        normalized_items = []
        for index, item in enumerate(items):
            child = _validate_block(
                item,
                f"{path}.content[{index}]",
                errors,
                counters,
                depth + 1,
                allow_lead=False,
                allow_list_item=True,
                headings=headings,
            )
            if child is not None:
                if child.get("type") != "listItem":
                    _error(errors, f"{path}.content[{index}]", "Numbered lists can only contain list items.")
                else:
                    normalized_items.append(child)
        if not normalized_items:
            return None
        return {"type": "orderedList", "attrs": {"start": start}, "content": normalized_items}

    if node_type == "listItem":
        _check_keys(node, {"type", "content"}, path, errors)
        blocks = node.get("content")
        if not isinstance(blocks, list) or not blocks:
            _error(errors, path, "A list item cannot be empty.")
            return None
        normalized_blocks = []
        for index, block in enumerate(blocks):
            child = _validate_block(
                block,
                f"{path}.content[{index}]",
                errors,
                counters,
                depth + 1,
                allow_lead=False,
                headings=headings,
            )
            if child is not None:
                normalized_blocks.append(child)
        if not normalized_blocks:
            return None
        if normalized_blocks[0].get("type") != "paragraph":
            _error(errors, path, "A list item must start with a paragraph.")
            return None
        return {"type": "listItem", "content": normalized_blocks}

    if node_type == "blockquote":
        _check_keys(node, {"type", "content"}, path, errors)
        blocks = node.get("content")
        if not isinstance(blocks, list) or not blocks:
            _error(errors, path, "A blockquote needs at least one block.")
            return None
        normalized_blocks = []
        for index, block in enumerate(blocks):
            child = _validate_block(
                block,
                f"{path}.content[{index}]",
                errors,
                counters,
                depth + 1,
                allow_lead=False,
                headings=headings,
            )
            if child is not None:
                normalized_blocks.append(child)
        if not normalized_blocks:
            return None
        return {"type": "blockquote", "content": normalized_blocks}

    _error(errors, path, f"Unsupported block type: {node_type!r}.")
    return None


def _node_text(node: dict[str, Any]) -> str:
    node_type = node.get("type")
    if node_type == "text":
        return node.get("text", "")
    if node_type == "hardBreak":
        return " "
    if node_type == "horizontalRule":
        return " "
    children = node.get("content")
    if not isinstance(children, list):
        return ""
    return " ".join(_node_text(child) for child in children)


def rich_text_from_doc(doc: Any) -> str:
    """Return readable plain text without counting JSON syntax as words."""
    if not isinstance(doc, dict):
        return ""
    return " ".join(_node_text(doc).split())


def lead_text_from_doc(doc: Any) -> str | None:
    if not isinstance(doc, dict):
        return None
    content = doc.get("content")
    if not isinstance(content, list) or not content:
        return None
    first = content[0]
    if not isinstance(first, dict) or first.get("type") != "lead":
        return None
    text = " ".join(_node_text(first).split())
    return text or None


def first_text_from_doc(doc: Any) -> str:
    if not isinstance(doc, dict):
        return ""
    content = doc.get("content")
    if not isinstance(content, list):
        return ""
    for block in content:
        if not isinstance(block, dict):
            continue
        if block.get("type") in {"lead", "paragraph", "heading"}:
            text = " ".join(_node_text(block).split())
            if text:
                return text
    return ""


def excerpt_from_doc(doc: Any, limit: int = 180) -> str:
    text = lead_text_from_doc(doc) or first_text_from_doc(doc)
    if not text:
        return ""
    if len(text) <= limit:
        return text
    shortened = text[: limit + 1].rsplit(" ", 1)[0].rstrip(" ,.;:-")
    return f"{shortened}…" if shortened else f"{text[:limit].rstrip()}…"


def reading_time_from_text(text: str) -> str:
    words = len((text or "").split())
    return f"{max(1, round(words / 220))} min read"


def validate_rich_doc(doc: Any) -> dict[str, Any]:
    """Validate and normalize a rich-text document, or raise ContentValidationError."""
    errors: list[str] = []
    if not isinstance(doc, dict):
        raise ContentValidationError(["content_json: Content must be an object."])

    try:
        encoded = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    except (TypeError, ValueError, RecursionError):
        raise ContentValidationError(["content_json: Content must be JSON-serializable."]) from None
    if len(encoded) > MAX_JSON_BYTES:
        raise ContentValidationError(
            [f"content_json: Content is larger than the {MAX_JSON_BYTES // 1000} KB limit."]
        )

    _check_keys(doc, {"type", "content"}, "content_json", errors)
    if doc.get("type") != "doc":
        _error(errors, "content_json", 'The document type must be "doc".')
    content = doc.get("content")
    if not isinstance(content, list) or not content:
        _error(errors, "content_json.content", "The document cannot be empty.")
        content = []

    counters: dict[str, int] = {"nodes": 0, "text_chars": 0}
    headings: list[tuple[int, str]] = []
    normalized_content: list[dict[str, Any]] = []
    for index, node in enumerate(content):
        normalized = _validate_block(
            node,
            f"content_json.content[{index}]",
            errors,
            counters,
            depth=1,
            allow_lead=index == 0,
            headings=headings,
        )
        if normalized is not None:
            normalized_content.append(normalized)

    lead_indexes = [i for i, node in enumerate(normalized_content) if node.get("type") == "lead"]
    if len(lead_indexes) > 1:
        _error(errors, "content_json.content", "Only one lead paragraph is allowed.")
    if lead_indexes and lead_indexes[0] != 0:
        _error(errors, "content_json.content", "The lead paragraph must be the first body block.")
    if lead_indexes:
        lead = normalized_content[lead_indexes[0]]
        if not _node_text(lead).strip():
            _error(errors, "content_json.content[0]", "The lead paragraph cannot be empty.")

    if headings:
        first_level, first_path = headings[0]
        if first_level != 2:
            _error(
                errors,
                first_path,
                f"The first heading must be H2, but this is H{first_level}. Start with an H2 or change it to H2.",
            )
        previous_level = first_level
        for level, path in headings[1:]:
            if level > previous_level + 1:
                _error(
                    errors,
                    path,
                    f"Heading level skipped: H{previous_level} is followed by H{level}. "
                    f"Add an H{previous_level + 1} before it or change this heading to H{previous_level + 1} or lower.",
                )
            previous_level = level

    normalized_doc = {"type": "doc", "content": normalized_content}
    text = rich_text_from_doc(normalized_doc)
    if len(text.strip()) < MIN_TEXT_CHARS:
        _error(
            errors,
            "content_json",
            f"Content must contain at least {MIN_TEXT_CHARS} characters of text.",
        )

    if errors:
        raise ContentValidationError(errors)
    return normalized_doc


def validate_legacy_content(content: Any) -> str:
    if not isinstance(content, str):
        raise ContentValidationError(["content: Legacy content must be text."])
    if len(content.strip()) < MIN_TEXT_CHARS:
        raise ContentValidationError(
            [f"content: Content must contain at least {MIN_TEXT_CHARS} characters of text."]
        )
    if len(content) > MAX_TEXT_CHARS:
        raise ContentValidationError(
            [f"content: Legacy content must be {MAX_TEXT_CHARS} characters or fewer."]
        )
    return content
