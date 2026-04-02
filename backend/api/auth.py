"""
POST /api/auth/register — create account
POST /api/auth/login    — return JWT
GET  /api/auth/me       — current user profile
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .deps import get_current_user, get_db

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

_raw_secret = os.environ.get("NEXTAUTH_SECRET", "")
if not _raw_secret:
    import sys
    print("FATAL: NEXTAUTH_SECRET is not set. Refusing to start.", file=sys.stderr)
    sys.exit(1)
JWT_SECRET = _raw_secret
ALGORITHM  = "HS256"
TTL_HOURS  = 24


def _make_token(user_id: str, email: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=TTL_HOURS)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": exp},
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


class RegisterRequest(BaseModel):
    email:    EmailStr
    password: str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


@router.post("/auth/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    existing = await db.execute(
        text("SELECT id FROM users WHERE email = :e"), {"e": body.email}
    )
    if existing.first():
        raise HTTPException(status_code=409, detail="Email already registered.")

    hashed = pwd_ctx.hash(body.password)
    result = await db.execute(
        text(
            "INSERT INTO users (email, hashed_password) VALUES (:e, :h) RETURNING id"
        ),
        {"e": body.email, "h": hashed},
    )
    user_id = str(result.scalar_one())
    await db.commit()
    return {"ok": True, "user_id": user_id}


@router.post("/auth/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    row = await db.execute(
        text("SELECT id, hashed_password, credits, free_used FROM users WHERE email = :e"),
        {"e": body.email},
    )
    user = row.mappings().first()
    if not user or not pwd_ctx.verify(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    token = _make_token(str(user["id"]), body.email)
    return {
        "access_token": token,
        "user_id":      str(user["id"]),
        "email":        body.email,
        "credits":      user["credits"],
        "free_used":    user["free_used"],
    }


@router.get("/auth/me")
async def me(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await db.execute(
        text("SELECT id, email, credits, free_used, total_analyses, created_at FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    user = row.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "id":             str(user["id"]),
        "email":          user["email"],
        "credits":        user["credits"],
        "free_used":      user["free_used"],
        "total_analyses": user["total_analyses"],
        "created_at":     user["created_at"].isoformat() if user["created_at"] else None,
    }
