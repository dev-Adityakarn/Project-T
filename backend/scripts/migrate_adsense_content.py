#!/usr/bin/env python3
"""Retire duplicate blog records and repair known public-copy artefacts.

This script supports the 2026 AdSense quality remediation. It is deliberately
conservative:

* It never deletes a post. Retired records are set to ``published: false`` and
  labelled with ``retired_at`` / ``retired_reason`` so they can be restored.
* It writes a complete JSON backup of the ``posts`` collection before the first
  write. The backup uses MongoDB Extended JSON and keeps the original ObjectIds
  and dates.
* It is idempotent. Re-running it reports zero changes for records that have
  already been retired or repaired.
* It is a dry run unless ``--apply`` is passed. Dry runs do not write anything.

Usage
-----
Preview the changes against the configured database:
    python scripts/migrate_adsense_content.py

Write the changes (backup first):
    python scripts/migrate_adsense_content.py --apply

The MongoDB connection is read from MONGO_URL and DB_NAME in backend/.env, the
same variables used by the application and scripts/create_admin.py.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bson.json_util import dumps as bson_dumps
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

RETIRE = {
    "ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide": "/blog/ssc-chsl-typing-test-2026",
    "ssc-cgl-dest-2026-typing-test-format-and-15-minute-practice-plan": "/blog/ssc-cgl-dest-2026-typing-test-format-and-15-minute-practice-plan",
    "ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections": "/blog/ssc-chsl-typing-test-2026",
    "how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description": "/blog/how-to-increase-typing-speed",
    "english-typing-test-for-10-minutes-a-government-exam-practice-guide": "/blog/english-typing-test-1-5-10-minute",
}

LINK_REPLACEMENTS = {
    "/blog/what-is-a-good-wpm-score": "/blog/what-is-a-good-typing-speed",
    "/blog/touch-typing-guide-for-beginners": "/blog/touch-typing-for-beginners",
    "/blog/ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide": "/blog/ssc-chsl-typing-test-2026",
    "/blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections": "/blog/ssc-chsl-typing-test-2026",
    "/blog/how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description": "/blog/how-to-increase-typing-speed",
    "/blog/english-typing-test-for-10-minutes-a-government-exam-practice-guide": "/blog/english-typing-test-1-5-10-minute",
}

# Exact artefacts observed in the imported drafts. These are unambiguous, so
# they can be removed automatically. Anything less certain is reported by the
# scan below instead of being rewritten by a machine.
RESIDUE_REPLACEMENTS = {
    "\tMETA DESCRIPTION": "",
    "  META DESCRIPTION": "",
    " META DESCRIPTION": "",
    "META DESCRIPTION": "",
    "(\nOfficial SSC CHSL notification, §13.9.13.7\n)": (
        "See the official SSC CHSL notice, section 13.9.13.7."
    ),
    "( Official SSC CHSL notification, §13.9.13.7 )": (
        "See the official SSC CHSL notice, section 13.9.13.7."
    ),
}

SCAN_PATTERNS = (
    "do not present",
    "users should distinguish",
    "this is where a site like",
    "target keyword",
    "editorial note",
    "seo strategy",
    "meta description",
    "todo:",
    "fixme:",
)

TEXT_FIELDS = (
    "title",
    "h1",
    "excerpt",
    "meta_title",
    "meta_description",
    "author",
)


class Repair:
    """Recursive string replacement for legacy strings and rich JSON docs."""

    def __init__(self) -> None:
        self.count = 0

    def text(self, value: str) -> str:
        for old, new in RESIDUE_REPLACEMENTS.items():
            if old in value:
                value = value.replace(old, new)
                self.count += 1
        for old, new in LINK_REPLACEMENTS.items():
            if old in value:
                value = value.replace(old, new)
                self.count += 1
        return value

    def value(self, value: Any) -> Any:
        if isinstance(value, str):
            return self.text(value)
        if isinstance(value, list):
            return [self.value(item) for item in value]
        if isinstance(value, dict):
            return {key: self.value(item) for key, item in value.items()}
        return value


def scan(doc: dict) -> list[str]:
    hits: list[str] = []
    blob = json.dumps(
        {key: doc.get(key) for key in TEXT_FIELDS + ("content", "content_json")},
        ensure_ascii=False,
        default=str,
    ).lower()
    for pattern in SCAN_PATTERNS:
        if pattern in blob:
            hits.append(pattern)
    return sorted(set(hits))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="write changes; without this flag the script is a dry run",
    )
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=ROOT / "backups",
        help="directory for the JSON backup (default: backend/backups)",
    )
    args = parser.parse_args()

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("error: MONGO_URL and DB_NAME must be set in backend/.env", file=sys.stderr)
        return 2

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
    try:
        db = client[db_name]
        posts = list(db.posts.find({}))
        print(f"connected: database={db_name} posts={len(posts)} mode={'APPLY' if args.apply else 'DRY RUN'}")

        if args.apply and posts:
            args.backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            backup = args.backup_dir / f"adsense_content_backup_{stamp}.json"
            backup.write_text(bson_dumps(posts, indent=2, ensure_ascii=False), encoding="utf-8")
            backup.chmod(0o600)
            print(f"backup: {backup} ({len(posts)} posts)")

        retired = 0
        repaired = 0
        skipped = 0
        warnings: list[tuple[str, list[str]]] = []

        now = datetime.now(timezone.utc)
        for doc in posts:
            slug = str(doc.get("slug") or "")
            updates: dict[str, Any] = {}

            if slug in RETIRE and doc.get("published") is not False:
                updates.update(
                    {
                        "published": False,
                        "retired_at": now,
                        "retired_reason": "adsense-quality-consolidation",
                        "retired_target": RETIRE[slug],
                    }
                )

            repair = Repair()
            for field in TEXT_FIELDS:
                if isinstance(doc.get(field), str):
                    fixed = repair.text(doc[field])
                    if fixed != doc[field]:
                        updates[field] = fixed
            if isinstance(doc.get("content"), str):
                fixed = repair.text(doc["content"])
                if fixed != doc["content"]:
                    updates["content"] = fixed
            if isinstance(doc.get("content_json"), (dict, list)):
                fixed = repair.value(doc["content_json"])
                if fixed != doc["content_json"]:
                    updates["content_json"] = fixed

            hits = scan(doc)
            if hits:
                warnings.append((slug or "<no slug>", hits))

            if not updates:
                skipped += 1
                continue

            if "published" in updates and updates["published"] is False:
                retired += 1
            else:
                repaired += 1

            if args.apply:
                updates["updated_at"] = now
                db.posts.update_one({"_id": doc["_id"]}, {"$set": updates})
                print(f"{'retired' if 'published' in updates else 'repaired'}: {slug}")
            else:
                print(f"would {'retire' if 'published' in updates else 'repair'}: {slug} -> {sorted(updates)}")

        print(
            f"summary: retired={retired} repaired={repaired} unchanged={skipped} "
            f"dry_run={not args.apply}"
        )
        if warnings:
            print("review: editorial-pattern scan found text that needs a human read")
            for slug, hits in warnings:
                print(f"  {slug}: {', '.join(hits)}")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
