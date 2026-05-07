"""
app/config.py

Centralised settings via Pydantic BaseSettings.
All values are read from environment variables or .env — never hardcoded.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    app_secret_key: str = Field(..., min_length=32)
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    frontend_url: AnyHttpUrl = "http://localhost:5173"  # type: ignore[assignment]

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    database_url: str = Field(
        ...,
        description="Full async SQLAlchemy URL — postgresql+asyncpg://...",
    )

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # ── Pinecone ──────────────────────────────────────────────────────────────
    # Optional — vector store disabled when empty; agents degrade gracefully
    pinecone_api_key: str = ""
    pinecone_environment: str = ""
    pinecone_index_name: str = "sail-intelligence"

    # ── Auth / JWT ────────────────────────────────────────────────────────────
    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── OAuth 2.0 ─────────────────────────────────────────────────────────────
    oauth_google_client_id: str = ""
    oauth_google_client_secret: str = ""
    oauth_redirect_uri: str = "http://localhost:8000/api/v1/auth/callback"

    # ── AES-256 Vault ─────────────────────────────────────────────────────────
    # Optional in dev — connector credential encryption disabled when empty
    vault_encryption_key: str = ""

    # ── Apify ─────────────────────────────────────────────────────────────────
    # Optional — web scraping disabled when empty
    apify_api_token: str = ""
    apify_default_timeout_secs: int = 120
    apify_max_retries: int = 4

    # ── LLM providers ─────────────────────────────────────────────────────────
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""
    embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 3072

    # ── Proxy ─────────────────────────────────────────────────────────────────
    residential_proxy_url: str = ""
    proxy_rotation_enabled: bool = True

    # ── Alerting ──────────────────────────────────────────────────────────────
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    whatsapp_webhook_url: str = ""
    alert_anomaly_threshold: float = 2.5   # σ above baseline

    # ── Cron schedules ────────────────────────────────────────────────────────
    sail_mode_cron: str = "0 2 * * *"
    yacht_mode_cron: str = "*/15 * * * *"

    # ── Per-connector rate limits (req/min) ───────────────────────────────────
    rate_limit_amazon: int = 20
    rate_limit_ebay: int = 30
    rate_limit_tiktok: int = 15
    rate_limit_meta_ads: int = 25
    rate_limit_spotify: int = 20

    # ── Feature flags ─────────────────────────────────────────────────────────
    enable_hitl_enforcement: bool = True
    enable_captcha_handling: bool = True
    enable_proxy_rotation: bool = True
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # ── Derived helpers ───────────────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @field_validator("vault_encryption_key")
    @classmethod
    def validate_fernet_key(cls, v: str) -> str:
        # Fernet keys must be exactly 44 URL-safe base64 chars
        import base64
        try:
            decoded = base64.urlsafe_b64decode(v + "==")
            if len(decoded) != 32:
                raise ValueError
        except Exception:
            raise ValueError(
                "VAULT_ENCRYPTION_KEY must be a valid 32-byte Fernet key. "
                "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton — import and call this everywhere instead of Settings()."""
    return Settings()  # type: ignore[call-arg]
