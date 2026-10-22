#!/usr/bin/env python3
"""Securely create or update a Typinger administrator.

Usage examples
--------------
Create a new super administrator (prompts for a password):
    ./venv/bin/python scripts/create_admin.py --email ops@example.com --role super_admin

Promote an existing user without touching their password:
    ./venv/bin/python scripts/create_admin.py --email ops@example.com --promote-only

Rotate an administrator password (prompts securely):
    ./venv/bin/python scripts/create_admin.py --email ops@example.com --reset-password
"""
from __future__ import annotations

import argparse
import getpass
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

ROLES = ("user", "admin", "super_admin")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def prompt_password() -> str:
    password = getpass.getpass("Password (min 12 chars): ")
    if len(password) < 12:
        sys.exit("error: password must be at least 12 characters")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        sys.exit("error: passwords do not match")
    return password


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update a Typinger administrator")
    parser.add_argument("--email", required=True, help="administrator email")
    parser.add_argument("--name", help="display name (new accounts only)")
    parser.add_argument("--role", choices=ROLES, help="role to set")
    parser.add_argument("--password", help="password (prefer the interactive prompt)")
    parser.add_argument("--promote-only", action="store_true", help="change role, leave password untouched")
    parser.add_argument("--reset-password", action="store_true", help="rotate the password")
    args = parser.parse_args()

    email = args.email.strip().lower()
    if not args.role and not args.promote_only and not args.reset_password:
        parser.error("pass --role (new account), --promote-only or --reset-password")

    client = MongoClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc)
    existing = db.users.find_one({"email": email})

    if existing:
        if not (args.promote_only or args.reset_password or args.role):
            sys.exit("error: account exists; use --promote-only or --reset-password")
        updates = {"updated_at": now}
        if args.role:
            updates["role"] = args.role
        if args.reset_password:
            password = args.password or prompt_password()
            updates["password_hash"] = hash_password(password)
        db.users.update_one({"_id": existing["_id"]}, {"$set": updates})
        # Force re-authentication everywhere after a privilege or credential change.
        db.admin_sessions.update_many(
            {"user_id": str(existing["_id"]), "revoked_at": None},
            {"$set": {"revoked_at": now}},
        )
        print(f"updated {email}: {', '.join(sorted(updates.keys()))}")
    else:
        if args.promote_only:
            sys.exit("error: no such account to promote")
        if not args.role:
            parser.error("--role is required when creating a new account")
        password = args.password or prompt_password()
        doc = {
            "name": args.name or email.split("@")[0],
            "email": email,
            "role": args.role,
            "status": "active",
            "password_hash": hash_password(password),
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
        }
        result = db.users.insert_one(doc)
        print(f"created {email} ({args.role}) id={result.inserted_id}")
    client.close()


if __name__ == "__main__":
    main()
