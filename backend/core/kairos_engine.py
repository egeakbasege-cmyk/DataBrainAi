import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel, Field, field_validator

try:
    from pythonjsonlogger import jsonlogger
    _HAS_JSON_LOG = True
except ImportError:
    _HAS_JSON_LOG = False

_MAX_VECTORS = 100

# ─── Models ──────────────────────────────────────────────────────────────────

class SystemState(BaseModel):
    current_date: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    core_memory: Dict[str, Any]
    active_skill: Dict[str, Any]

    @field_validator("core_memory", "active_skill", mode="before")
    @classmethod
    def ensure_dict(cls, v: Any) -> Dict:
        return v if isinstance(v, dict) else {}


class IntelligenceUpdate(BaseModel):
    action_summary: str = ""
    new_vectors: List[str] = Field(default_factory=list)


# ─── Engine ──────────────────────────────────────────────────────────────────

class KairosEngine:
    def __init__(self, base_dir: str = "./system_data"):
        self.base_dir = Path(base_dir)
        self.memory_path = self.base_dir / "core_memory.json"
        self.skills_path = self.base_dir / "active_skill.json"
        self.log_path = self.base_dir / "system_events.json.log"
        self._lock = asyncio.Lock()
        self._initialized = False
        self.logger: logging.Logger = logging.getLogger(f"KAIROS.{id(self)}")

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def setup(self) -> None:
        """Idempotent async initializer — safe to call multiple times."""
        if self._initialized:
            return
        async with self._lock:
            if self._initialized:  # double-checked
                return
            self.base_dir.mkdir(parents=True, exist_ok=True)
            self._setup_logger()
            for path in (self.memory_path, self.skills_path):
                if not path.exists():
                    await self._write(path, {"init": True})
            self._initialized = True
            self.logger.info("Setup complete", extra={"version": "V2.3"})

    def _setup_logger(self) -> None:
        """Attach a single handler — guards against duplicate handler accumulation."""
        self.logger.setLevel(logging.INFO)
        if self.logger.handlers:
            return
        handler = logging.FileHandler(self.log_path)
        if _HAS_JSON_LOG:
            fmt = jsonlogger.JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s")
        else:
            fmt = logging.Formatter(
                '{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}'
            )
        handler.setFormatter(fmt)
        self.logger.addHandler(handler)

    # ── I/O helpers ───────────────────────────────────────────────────────────

    async def _write(self, path: Path, data: Dict) -> None:
        def _sync() -> None:
            tmp = path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            tmp.replace(path)  # atomic on POSIX

        try:
            await asyncio.to_thread(_sync)
        except Exception as exc:
            self.logger.error("Write failed", extra={"path": str(path), "error": str(exc)})
            raise

    async def _read(self, path: Path) -> Dict:
        def _sync() -> Dict:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                return {}

        try:
            return await asyncio.to_thread(_sync)
        except Exception as exc:
            self.logger.warning("Read fallback", extra={"path": str(path), "error": str(exc)})
            return {}

    # ── Public API ────────────────────────────────────────────────────────────

    async def compile_payload(self, template_str: str) -> str:
        """Inject current memory + active skill into a prompt template."""
        if not self._initialized:
            await self.setup()

        state = SystemState(
            core_memory=await self._read(self.memory_path),
            active_skill=await self._read(self.skills_path),
        )
        payload = template_str.format(
            current_date=state.current_date,
            core_memory=json.dumps(state.core_memory, ensure_ascii=False, indent=2),
            active_skill=json.dumps(state.active_skill, ensure_ascii=False, indent=2),
        )
        self.logger.info("Payload compiled", extra={"bytes": len(payload)})
        return payload

    async def ingest_intelligence(self, update: IntelligenceUpdate | Dict[str, Any]) -> int:
        """
        Merge new_vectors into core memory.
        Returns the number of vectors actually added (deduped).
        The write is lock-protected to prevent race conditions.
        """
        if not self._initialized:
            await self.setup()

        if isinstance(update, dict):
            update = IntelligenceUpdate(**update)

        async with self._lock:
            memory = await self._read(self.memory_path)
            existing: List[str] = memory.get("vectors", [])
            seen = set(existing)
            deduped = [v for v in update.new_vectors if v not in seen]
            merged = (existing + deduped)[-_MAX_VECTORS:]
            memory["vectors"] = merged
            if update.action_summary:
                memory["last_action"] = update.action_summary
            memory["last_updated"] = datetime.now(timezone.utc).isoformat()
            await self._write(self.memory_path, memory)

        self.logger.info(
            "Intelligence ingested",
            extra={"added": len(deduped), "total": len(merged)},
        )
        return len(deduped)


# ─── FastAPI scaffold ─────────────────────────────────────────────────────────
# Uncomment and drop into main.py to expose over HTTP.
#
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
#
# engine = KairosEngine()
#
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     await engine.setup()
#     yield
#
# app = FastAPI(title="KAIROS-Primary", lifespan=lifespan)
#
# @app.post("/compile")
# async def compile_route(template: str):
#     return {"payload": await engine.compile_payload(template)}
#
# @app.post("/ingest")
# async def ingest_route(req: IntelligenceUpdate):
#     added = await engine.ingest_intelligence(req)
#     return {"status": "ok", "vectors_added": added}


if __name__ == "__main__":
    async def _main() -> None:
        kairos = KairosEngine()
        await kairos.setup()
        added = await kairos.ingest_intelligence(
            IntelligenceUpdate(
                action_summary="smoke test",
                new_vectors=["Istanbul timezone is UTC+3", "Design system: Swiss Minimalism"],
            )
        )
        print(f"[KAIROS V2.3] Online. Vectors added: {added}")

    asyncio.run(_main())
