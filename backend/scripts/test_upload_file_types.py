#!/usr/bin/env python3
"""Smoke test: syllabus upload accepts/rejects file types correctly."""
from __future__ import annotations

import io
import sys
import uuid
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402
from app.models import PriorityLevel  # noqa: E402

client = TestClient(app)

MOCK_TOPICS = [
    {
        "title": "Sample Topic",
        "priority": PriorityLevel.MEDIUM,
        "weight": 1.0,
        "marks": None,
        "order_index": 0,
    },
]

# Minimal valid-ish bytes per type (validation is extension-based on backend)
FILE_CASES = [
    ("syllabus.pdf", b"%PDF-1.4\n1 0 obj\n", "application/pdf", True),
    ("photo.jpg", b"\xff\xd8\xff\xe0", "image/jpeg", True),
    ("photo.jpeg", b"\xff\xd8\xff\xe0", "image/jpeg", True),
    ("photo.png", b"\x89PNG\r\n\x1a\n", "image/png", True),
    ("photo.webp", b"RIFFxxxxWEBP", "image/webp", True),
    ("notes.docx", b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", False),
    ("notes.doc", b"\xd0\xcf\x11\xe0", "application/msword", False),
    ("syllabus.txt", b"Chapter 1\nChapter 2", "text/plain", False),
    ("sheet.xlsx", b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", False),
    ("no_extension", b"data", "application/octet-stream", False),
]


def register_and_login() -> dict:
    suffix = uuid.uuid4().hex[:8]
    email = f"upload_test_{suffix}@example.com"
    password = "testpass123"
    reg = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Upload Tester"},
    )
    assert reg.status_code in (200, 201), reg.text
    login = client.post("/auth/login", data={"username": email, "password": password})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def upload(filename: str, content: bytes, content_type: str, headers: dict) -> int:
    with patch(
        "app.routers.syllabus.extract_topics_with_gemini",
        return_value=MOCK_TOPICS,
    ), patch("app.routers.syllabus.extract_text", return_value="Sample raw text"):
        res = client.post(
            "/syllabus/upload",
            headers=headers,
            files={"file": (filename, io.BytesIO(content), content_type)},
        )
    return res.status_code


def main() -> None:
    headers = register_and_login()
    print("Syllabus upload file-type tests\n" + "=" * 50)

    passed = 0
    failed = 0

    for filename, content, mime, should_accept in FILE_CASES:
        status = upload(filename, content, mime, headers)
        ok = (status == 200) if should_accept else (status == 400)
        mark = "PASS" if ok else "FAIL"
        expected = "accept (200)" if should_accept else "reject (400)"
        print(f"[{mark}] {filename:16} -> HTTP {status}  (expected {expected})")
        if ok:
            passed += 1
        else:
            failed += 1

    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")

    # Verify GEMINI_API_KEY is loadable from environment (never print the value)
    import os

    from dotenv import load_dotenv

    env_path = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env_path)
    key_set = bool(os.getenv("GEMINI_API_KEY", "").strip())
    print(f"\nbackend/.env exists: {env_path.is_file()}")
    print(f"GEMINI_API_KEY loaded from env: {key_set}")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
