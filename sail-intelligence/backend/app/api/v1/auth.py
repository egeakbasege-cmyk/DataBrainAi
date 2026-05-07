"""
app/api/v1/auth.py

Auth endpoints + reusable FastAPI dependency.

POST /api/v1/auth/token    — issue access + refresh token pair (password flow)
POST /api/v1/auth/refresh  — exchange refresh token for a new access token
GET  /api/v1/auth/me       — return current user claims

Dependency:
    require_auth — inject into any endpoint to enforce JWT authentication.

JWT signing uses HS256 with the APP_SECRET_KEY from settings.
In production, rotate to RS256 with a proper key pair.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import get_settings

router   = APIRouter()
settings = get_settings()
bearer   = HTTPBearer(auto_error=True)


# ── Token helpers ─────────────────────────────────────────────────────────────

def _create_token(
    sub:     str,
    kind:    str,   # "access" | "refresh"
    expires: timedelta,
    extra:   dict[str, Any] | None = None,
) -> str:
    now     = datetime.now(timezone.utc)
    payload = {
        "sub":  sub,
        "kind": kind,
        "iat":  now,
        "exp":  now + expires,
        **(extra or {}),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(sub: str, extra: dict | None = None) -> str:
    return _create_token(
        sub=sub,
        kind="access",
        expires=timedelta(minutes=settings.access_token_expire_minutes),
        extra=extra,
    )


def create_refresh_token(sub: str) -> str:
    return _create_token(
        sub=sub,
        kind="refresh",
        expires=timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str, expected_kind: str = "access") -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.get("kind") != expected_kind:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected '{expected_kind}' token, got '{payload.get('kind')}'.",
        )
    return payload


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def require_auth(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
) -> dict[str, Any]:
    """
    Dependency injected into protected routes.
    Returns the decoded JWT payload (sub, iat, exp, …) on success.
    Raises 401 on missing, invalid, or expired token.
    """
    return decode_token(credentials.credentials, expected_kind="access")


# ── Schemas ───────────────────────────────────────────────────────────────────

class TokenRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int           # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/token", response_model=TokenResponse, summary="Issue access + refresh token")
async def token(body: TokenRequest) -> TokenResponse:
    """
    Password-flow token issuance.

    TODO: Replace the stub credential check below with a real DB lookup
    (hashed password comparison via passlib) once the User model is in place.
    The interface is intentionally stable — only the credential-check block changes.
    """
    # ── STUB — replace with DB query + passlib.verify() ──────────────────────
    DEMO_USERS = {
        "admin@sail.ai": {"password": "changeme", "role": "admin"},
    }
    user = DEMO_USERS.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )
    # ── end STUB ──────────────────────────────────────────────────────────────

    access  = create_access_token(sub=body.username, extra={"role": user.get("role")})
    refresh = create_refresh_token(sub=body.username)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh(body: RefreshRequest) -> TokenResponse:
    payload = decode_token(body.refresh_token, expected_kind="refresh")
    sub     = payload["sub"]

    access  = create_access_token(sub=sub)
    refresh = create_refresh_token(sub=sub)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get("/me", summary="Current authenticated user")
async def me(
    user: Annotated[dict, Depends(require_auth)],
) -> dict:
    return {"sub": user.get("sub"), "role": user.get("role")}
