from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List

_MAX_LOGS = 500


class ActivityLogService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._logs: List[dict] = []
        self._active_sessions: Dict[str, int] = {}

    def log(self, username: str, action: str, detail: str = "") -> None:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "username": username,
            "action": action,
            "detail": detail,
        }
        with self._lock:
            self._logs.insert(0, entry)
            if len(self._logs) > _MAX_LOGS:
                self._logs = self._logs[:_MAX_LOGS]

    def mark_login(self, username: str) -> None:
        with self._lock:
            self._active_sessions[username] = self._active_sessions.get(username, 0) + 1

    def mark_logout(self, username: str) -> None:
        with self._lock:
            if username in self._active_sessions:
                self._active_sessions[username] -= 1
                if self._active_sessions[username] <= 0:
                    self._active_sessions.pop(username, None)

    def get_logs(self) -> List[dict]:
        with self._lock:
            return list(self._logs)

    def get_active_users_count(self) -> int:
        with self._lock:
            return len([u for u, sessions in self._active_sessions.items() if sessions > 0])

    def get_active_usernames(self) -> List[str]:
        with self._lock:
            return sorted([u for u, sessions in self._active_sessions.items() if sessions > 0])


activity_log_service = ActivityLogService()
