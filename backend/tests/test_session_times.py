from types import SimpleNamespace

from app.session_times import compute_session_times


def test_compute_session_times_stacks_hours():
    sessions = [
        SimpleNamespace(allocated_hours=1.5),
        SimpleNamespace(allocated_hours=1.0),
    ]
    times = compute_session_times(sessions, "09:00")
    assert times == [("09:00", "10:30"), ("10:30", "11:30")]


def test_compute_session_times_custom_start():
    sessions = [SimpleNamespace(allocated_hours=0.5)]
    assert compute_session_times(sessions, "14:30") == [("14:30", "15:00")]
