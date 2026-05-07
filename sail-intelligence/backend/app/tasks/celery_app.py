"""
app/tasks/celery_app.py

Celery application factory + Beat schedule.

Broker  : Redis (CELERY_BROKER_URL)
Backend : Redis (CELERY_RESULT_BACKEND)

Beat schedules:
  sail_mode_nightly   — SAIL_MODE_CRON  (default: 02:00 UTC daily)
  yacht_mode_refresh  — YACHT_MODE_CRON (default: every 15 min)
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()


def _parse_cron(cron_str: str) -> crontab:
    """Parse '0 2 * * *' → crontab(minute=0, hour=2)."""
    parts = cron_str.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Invalid cron expression: '{cron_str}'")
    minute, hour, day_of_month, month_of_year, day_of_week = parts

    def _v(s: str) -> str | int:
        return s if s == "*" else int(s)

    return crontab(
        minute=_v(minute),
        hour=_v(hour),
        day_of_month=_v(day_of_month),
        month_of_year=_v(month_of_year),
        day_of_week=_v(day_of_week),
    )


celery_app = Celery(
    "sail_intelligence",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.sail_mode",
        "app.tasks.yacht_mode",
        "app.tasks.motor_mode",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,          # requeue on worker crash
    worker_prefetch_multiplier=1, # fair dispatch for long-running tasks
    beat_schedule={
        "sail_mode_nightly": {
            "task":     "app.tasks.sail_mode.run_sail_mode_task",
            "schedule": _parse_cron(settings.sail_mode_cron),
            "args":     (["market trends 2025", "ecommerce pricing"],),
        },
        "yacht_mode_refresh": {
            "task":     "app.tasks.yacht_mode.run_yacht_mode_task",
            "schedule": _parse_cron(settings.yacht_mode_cron),
            "kwargs":   {"domain": "ecommerce"},
        },
    },
)
