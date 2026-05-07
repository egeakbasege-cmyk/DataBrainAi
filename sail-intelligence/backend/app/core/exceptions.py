"""
app/core/exceptions.py

Structured exception hierarchy for Sail Intelligence.

Design rules:
  - Every exception carries a machine-readable `code` (snake_case).
  - HTTP status is set here — handlers in main.py map code → Response.
  - Agent/connector failures must raise a subclass here, never raw Exception.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SailBaseError(Exception):
    """Root of the Sail Intelligence exception tree."""
    message: str
    code: str = "sail_error"
    detail: dict[str, Any] = field(default_factory=dict)
    http_status: int = 500

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": self.code,
            "message": self.message,
            "detail": self.detail,
        }


# ── Auth ──────────────────────────────────────────────────────────────────────

@dataclass
class AuthenticationError(SailBaseError):
    code: str = "authentication_error"
    http_status: int = 401


@dataclass
class AuthorizationError(SailBaseError):
    code: str = "authorization_error"
    http_status: int = 403


@dataclass
class TokenExpiredError(AuthenticationError):
    code: str = "token_expired"


# ── Connector / ingestion ─────────────────────────────────────────────────────

@dataclass
class ConnectorError(SailBaseError):
    """Base for all data-connector failures."""
    code: str = "connector_error"
    connector_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {**super().to_dict(), "connector_id": self.connector_id}


@dataclass
class ConnectorTimeoutError(ConnectorError):
    code: str = "connector_timeout"
    http_status: int = 504


@dataclass
class ConnectorRateLimitError(ConnectorError):
    code: str = "connector_rate_limit"
    http_status: int = 429
    retry_after_seconds: int = 60


@dataclass
class ConnectorAuthError(ConnectorError):
    code: str = "connector_auth_error"
    http_status: int = 502


@dataclass
class AllConnectorsFailed(ConnectorError):
    """Raised when primary connector AND every registered fallback have failed."""
    code: str = "all_connectors_failed"
    http_status: int = 503


# ── Ontology / validation ─────────────────────────────────────────────────────

@dataclass
class OntologyValidationError(SailBaseError):
    code: str = "ontology_validation_error"
    http_status: int = 422
    source: str = ""


# ── Agent ─────────────────────────────────────────────────────────────────────

@dataclass
class AgentError(SailBaseError):
    code: str = "agent_error"
    agent_name: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {**super().to_dict(), "agent_name": self.agent_name}


@dataclass
class AgentTimeoutError(AgentError):
    code: str = "agent_timeout"
    http_status: int = 504


# ── HITL (Motor Mode) ─────────────────────────────────────────────────────────

@dataclass
class HITLViolationError(SailBaseError):
    """
    Raised when a capital-deployment action is attempted without
    explicit human authorisation.  MUST NOT be caught silently.
    """
    code: str = "hitl_violation"
    http_status: int = 403
    action_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {**super().to_dict(), "action_id": self.action_id}


# ── Vector DB ─────────────────────────────────────────────────────────────────

@dataclass
class VectorDBError(SailBaseError):
    code: str = "vector_db_error"
    http_status: int = 503


# ── Vault ─────────────────────────────────────────────────────────────────────

@dataclass
class VaultError(SailBaseError):
    code: str = "vault_error"
    http_status: int = 500
