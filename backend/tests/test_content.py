"""Unit tests for the rich-text trust boundary and text helpers."""
from __future__ import annotations

import pytest

from content import (
    CONTENT_FORMAT_RICH,
    MAX_DEPTH,
    ContentValidationError,
    excerpt_from_doc,
    lead_text_from_doc,
    reading_time_from_text,
    rich_text_from_doc,
    validate_legacy_content,
    validate_rich_doc,
)


def text(value, *marks):
    node = {"type": "text", "text": value}
    if marks:
        node["marks"] = list(marks)
    return node


def paragraph(*content):
    return {"type": "paragraph", "content": list(content)}


def lead(*content):
    return {"type": "lead", "content": list(content)}


def heading(level, value):
    return {
        "type": "heading",
        "attrs": {"level": level},
        "content": [text(value)],
    }


def doc(*content):
    return {"type": "doc", "content": list(content)}


def valid_doc():
    return doc(
        lead(text("A lead paragraph long enough to introduce the article.")),
        paragraph(
            text("Plain "),
            text("bold", {"type": "bold"}),
            text(" and "),
            text("italic", {"type": "italic"}),
            text(" with a "),
            text(
                "link",
                {
                    "type": "link",
                    "attrs": {"href": "https://example.com/guide"},
                },
            ),
            text(" and a break"),
            {"type": "hardBreak"},
            text("after it."),
        ),
        heading(2, "First section"),
        paragraph(text("Section body text that is comfortably long enough.")),
        heading(3, "A subsection"),
        paragraph(text("Subsection body.")),
        heading(4, "A detail"),
        paragraph(text("Detail body.")),
        {
            "type": "bulletList",
            "content": [
                {
                    "type": "listItem",
                    "content": [paragraph(text("First bullet"))],
                },
                {
                    "type": "listItem",
                    "content": [paragraph(text("Second bullet"))],
                },
            ],
        },
        {
            "type": "orderedList",
            "attrs": {"start": 3},
            "content": [
                {
                    "type": "listItem",
                    "content": [paragraph(text("Third step"))],
                },
                {
                    "type": "listItem",
                    "content": [paragraph(text("Fourth step"))],
                },
            ],
        },
        {
            "type": "blockquote",
            "content": [paragraph(text("A quoted sentence."))],
        },
        {"type": "horizontalRule"},
    )


def test_every_supported_block_and_mark_is_accepted():
    normalized = validate_rich_doc(valid_doc())
    assert normalized["type"] == "doc"
    types = [node["type"] for node in normalized["content"]]
    assert types == [
        "lead",
        "paragraph",
        "heading",
        "paragraph",
        "heading",
        "paragraph",
        "heading",
        "paragraph",
        "bulletList",
        "orderedList",
        "blockquote",
        "horizontalRule",
    ]
    marks = normalized["content"][1]["content"]
    assert any("bold" in [mark["type"] for mark in node.get("marks", [])] for node in marks)
    assert any("italic" in [mark["type"] for mark in node.get("marks", [])] for node in marks)
    assert any("link" in [mark["type"] for mark in node.get("marks", [])] for node in marks)


@pytest.mark.parametrize(
    "href",
    [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "//evil.example/path",
        "https://user:pass@example.com/",
        "https:\\\\evil.example",
        "file:///etc/passwd",
        "https://exa mple.com",
        "",
    ],
)
def test_unsafe_link_schemes_are_rejected(href):
    bad = doc(paragraph(text("x" * 30, {"type": "link", "attrs": {"href": href}})))
    with pytest.raises(ContentValidationError):
        validate_rich_doc(bad)


@pytest.mark.parametrize(
    "href",
    [
        "https://example.com/a?b=1#c",
        "http://example.com",
        "mailto:hello@example.com",
        "/blog/guide/",
    ],
)
def test_safe_links_are_accepted(href):
    good = doc(
        paragraph(
            text("A sufficiently long paragraph. ", {"type": "link", "attrs": {"href": href}}),
            text("More text to reach the minimum length."),
        )
    )
    assert validate_rich_doc(good)["content"][0]["content"][0]["marks"] == [
        {"type": "link", "attrs": {"href": href}}
    ]


def test_unknown_nodes_and_marks_are_rejected():
    bad_node = doc(paragraph(text("x" * 30)), {"type": "codeBlock", "content": []})
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(bad_node)
    assert "Unsupported block type" in str(exc.value)

    bad_mark = doc(paragraph(text("x" * 30, {"type": "strike"})))
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(bad_mark)
    assert "Unsupported mark" in str(exc.value)

    bad_attr = doc(paragraph(text("x" * 30, {"type": "bold", "attrs": {"x": 1}})))
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(bad_attr)
    assert "cannot have attributes" in str(exc.value)


def test_h1_and_h5_are_rejected():
    for level in (1, 5, 6):
        with pytest.raises(ContentValidationError) as exc:
            validate_rich_doc(
                doc(heading(level, "Bad heading"), paragraph(text("x" * 30)))
            )
        assert "Headings must be H2, H3, or H4" in str(exc.value)


def test_first_heading_must_be_h2():
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(
            doc(heading(3, "Starts too deep"), paragraph(text("x" * 30)))
        )
    assert "first heading must be H2" in str(exc.value)


def test_skipped_heading_level_is_reported_actionably():
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(
            doc(
                heading(2, "Top"),
                paragraph(text("x" * 30)),
                heading(4, "Too deep"),
                paragraph(text("More body text.")),
            )
        )
    message = str(exc.value)
    assert "Heading level skipped: H2 is followed by H4" in message
    assert "Add an H3" in message


def test_lead_must_be_first_and_unique():
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(
            doc(paragraph(text("x" * 30)), lead(text("Late lead")))
        )
    assert "only allowed as the first" in str(exc.value)

    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(
            doc(lead(text("First lead")), lead(text("Second lead")), paragraph(text("x" * 30)))
        )
    assert "lead paragraph" in str(exc.value).lower()
    assert "first" in str(exc.value).lower()


def test_empty_lead_and_empty_heading_are_rejected():
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(doc(lead(), paragraph(text("x" * 30))))
    assert "lead paragraph cannot be empty" in str(exc.value)

    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(doc(heading(2, "   "), paragraph(text("x" * 30))))
    assert "Headings cannot be empty" in str(exc.value)


def test_list_item_must_live_inside_a_list():
    stray = doc(
        {
            "type": "listItem",
            "content": [paragraph(text("Stray list item text that is long enough."))],
        }
    )
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(stray)
    assert "inside a bulleted or numbered list" in str(exc.value)

    in_quote = doc(
        paragraph(text("x" * 30)),
        {
            "type": "blockquote",
            "content": [
                {
                    "type": "listItem",
                    "content": [paragraph(text("Quote list item."))],
                }
            ],
        },
    )
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(in_quote)
    assert "inside a bulleted or numbered list" in str(exc.value)


def test_deeply_nested_content_is_rejected():
    node = paragraph(text("x" * 30))
    for _ in range(MAX_DEPTH + 1):
        node = {"type": "blockquote", "content": [node]}
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(doc(node))
    assert "nested more than" in str(exc.value)


def test_short_document_is_rejected():
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(doc(paragraph(text("Too short"))))
    assert "at least 20 characters" in str(exc.value)


def test_control_characters_are_rejected():
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(doc(paragraph(text("x" * 20 + "\x00"))))
    assert "control characters" in str(exc.value)


def test_text_extraction_does_not_count_json_syntax():
    value = valid_doc()
    plain = rich_text_from_doc(value)
    assert "A lead paragraph" in plain
    assert '"type"' not in plain
    assert "horizontalRule" not in plain
    assert lead_text_from_doc(value).startswith("A lead paragraph")
    assert reading_time_from_text("one two three") == "1 min read"
    assert reading_time_from_text("word " * 440).startswith("2 min")


def test_excerpt_prefers_lead_then_first_block_and_truncates():
    value = doc(
        lead(text("Lead text that should win.")),
        paragraph(text("Body text should not win.")),
    )
    assert excerpt_from_doc(value) == "Lead text that should win."

    without_lead = doc(paragraph(text("First paragraph wins.")), paragraph(text("Later.")))
    assert excerpt_from_doc(without_lead) == "First paragraph wins."

    long = doc(paragraph(text("word " * 60)))
    excerpt = excerpt_from_doc(long, limit=40)
    assert excerpt.endswith("…")
    assert len(excerpt) <= 41


def test_legacy_content_still_requires_text():
    assert validate_legacy_content("x" * 20) == "x" * 20
    with pytest.raises(ContentValidationError):
        validate_legacy_content("short")
    with pytest.raises(ContentValidationError):
        validate_legacy_content(None)
    with pytest.raises(ContentValidationError) as exc:
        validate_legacy_content("x" * 100_001)
    assert "100000 characters or fewer" in str(exc.value)


def test_presentation_only_attributes_are_rejected():
    bad_link = doc(
        paragraph(
            text(
                "A sufficiently long paragraph. ",
                {
                    "type": "link",
                    "attrs": {
                        "href": "https://example.com/guide",
                        "target": "_blank",
                    },
                },
            )
        )
    )
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(bad_link)
    assert "Unsupported field" in str(exc.value)

    bad_list = doc(
        paragraph(text("A sufficiently long paragraph.")),
        {
            "type": "orderedList",
            "attrs": {"start": 1, "type": "a"},
            "content": [
                {
                    "type": "listItem",
                    "content": [paragraph(text("One step"))],
                }
            ],
        },
    )
    with pytest.raises(ContentValidationError) as exc:
        validate_rich_doc(bad_list)
    assert "Unsupported field" in str(exc.value)


def test_rich_format_constant_is_exposed_for_api_clients():
    assert CONTENT_FORMAT_RICH == "rich-json-v1"
