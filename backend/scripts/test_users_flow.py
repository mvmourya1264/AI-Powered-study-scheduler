#!/usr/bin/env python3
"""Throwaway smoke test for GET/PATCH /users/me and GET /users/me/progress."""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402
from app.models import PriorityLevel  # noqa: E402

client = TestClient(app)

SAMPLE_TOPICS = [
    {
        "title": "Algebra",
        "priority": PriorityLevel.MEDIUM,
        "weight": 1.0,
        "marks": None,
        "order_index": 0,
    },
    {
        "title": "Geometry",
        "priority": PriorityLevel.MEDIUM,
        "weight": 1.0,
        "marks": None,
        "order_index": 1,
    },
    {
        "title": "Calculus",
        "priority": PriorityLevel.HIGH,
        "weight": 1.5,
        "marks": None,
        "order_index": 2,
    },
]


def main() -> None:
    suffix = uuid.uuid4().hex[:8]
    email = f"progress_test_{suffix}@example.com"
    password = "testpass123"

    register = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert register.status_code in (200, 201), register.text

    login = client.post("/auth/login", data={"username": email, "password": password})
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    with patch(
        "app.routers.syllabus.parse_pdf",
        return_value=("Algebra\nGeometry\nCalculus", SAMPLE_TOPICS),
    ):
        upload = client.post(
            "/syllabus/upload",
            headers=headers,
            files={"file": ("sample-syllabus.pdf", b"%PDF-1.4 sample", "application/pdf")},
        )
    assert upload.status_code == 200, upload.text
    syllabus_id = upload.json()["id"]

    plan = client.post(
        "/plan/generate",
        headers=headers,
        json={"syllabus_id": syllabus_id, "total_days": 7, "hours_per_day": 2},
    )
    assert plan.status_code == 200, plan.text
    sessions = plan.json()["sessions"]
    assert len(sessions) >= 2, "Expected multiple sessions in generated plan"

    for session in sessions[:2]:
        updated = client.patch(
            f"/plan/sessions/{session['id']}",
            headers=headers,
            json={"completed": True},
        )
        assert updated.status_code == 200, updated.text

    progress = client.get("/users/me/progress", headers=headers)
    assert progress.status_code == 200, progress.text
    data = progress.json()
    assert data["total_plans"] == 1
    assert data["completed_sessions"] == 2
    assert data["total_sessions"] == len(sessions)
    assert data["percent_complete"] > 0
    assert data["completed_hours"] > 0
    assert data["total_hours"] > data["completed_hours"]
    assert len(data["plans"]) == 1
    assert data["plans"][0]["completed_sessions"] == 2
    assert data["plans"][0]["percent_complete"] > 0

    empty_user_email = f"empty_{suffix}@example.com"
    client.post(
        "/auth/register",
        json={"email": empty_user_email, "password": password, "full_name": "Empty User"},
    )
    empty_login = client.post(
        "/auth/login", data={"username": empty_user_email, "password": password}
    )
    empty_headers = {"Authorization": f"Bearer {empty_login.json()['access_token']}"}
    empty_progress = client.get("/users/me/progress", headers=empty_headers)
    assert empty_progress.status_code == 200
    assert empty_progress.json()["percent_complete"] == 0
    assert empty_progress.json()["total_sessions"] == 0

    patch_res = client.patch(
        "/users/me", headers=headers, json={"full_name": "Updated Name"}
    )
    assert patch_res.status_code == 200, patch_res.text
    assert patch_res.json()["full_name"] == "Updated Name"

    me = client.get("/users/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["full_name"] == "Updated Name"
    assert me.json()["email"] == email

    print("All checks passed.")
    print(f"Progress: {data['completed_sessions']}/{data['total_sessions']} sessions, "
          f"{data['percent_complete']}% complete")


if __name__ == "__main__":
    main()
