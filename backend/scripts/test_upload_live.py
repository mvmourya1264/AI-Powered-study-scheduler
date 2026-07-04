#!/usr/bin/env python3
"""Live API file-type test against running backend."""
import io
import sys
import uuid

import httpx

BASE = "http://127.0.0.1:8000"


def main() -> None:
    email = f"live_{uuid.uuid4().hex[:8]}@test.com"
    password = "testpass123"
    httpx.post(
        f"{BASE}/auth/register",
        json={"email": email, "password": password, "full_name": "Live"},
        timeout=30,
    )
    tok = httpx.post(
        f"{BASE}/auth/login",
        data={"username": email, "password": password},
        timeout=30,
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {tok}"}

    cases = [
        ("notes.docx", b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 400),
        ("notes.doc", b"\xd0\xcf", "application/msword", 400),
        ("syllabus.txt", b"Topic A", "text/plain", 400),
        ("sheet.xlsx", b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 400),
        ("photo.png", b"\x89PNG\r\n\x1a\n", "image/png", None),
        ("syllabus.pdf", b"%PDF-1.4\n", "application/pdf", None),
    ]

    print("Live backend upload tests @", BASE)
    print("-" * 55)
    for name, data, mime, expected in cases:
        r = httpx.post(
            f"{BASE}/syllabus/upload",
            headers=headers,
            files={"file": (name, io.BytesIO(data), mime)},
            timeout=120,
        )
        if r.status_code == 200:
            body = r.json()
            detail = f"topics={len(body.get('topics', []))} filename={body.get('filename')}"
        else:
            detail = r.json().get("detail", r.text[:100])
        exp = f"(expect {expected})" if expected else "(Gemini/live)"
        ok = expected is None or r.status_code == expected
        print(f"[{'OK' if ok else '!!'}] {name:14} HTTP {r.status_code}  {detail} {exp}")


if __name__ == "__main__":
    main()
