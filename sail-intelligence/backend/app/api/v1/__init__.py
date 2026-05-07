"""
app/api/v1/__init__.py

Versioned API router — all v1 endpoints are mounted here.
Add new sub-routers below; prefix and tags are set on each sub-router.
"""

from fastapi import APIRouter

from app.api.v1.connectors import router as connectors_router
from app.api.v1.signals    import router as signals_router
from app.api.v1.auth       import router as auth_router
from app.api.v1.agents     import router as agents_router

router = APIRouter()

router.include_router(auth_router,        prefix="/auth",       tags=["auth"])
router.include_router(connectors_router,  prefix="/connectors", tags=["connectors"])
router.include_router(signals_router,     prefix="/signals",    tags=["signals"])
router.include_router(agents_router,      prefix="/agents",     tags=["agents"])
