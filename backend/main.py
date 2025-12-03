from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv

# Load environment variables from a .env file if present (do not require it)
# Priority: backend/.env then project root .env
backend_env = Path(__file__).resolve().parent / ".env"
load_dotenv(backend_env, override=False)
load_dotenv(override=False)

# Fallback: set critical API keys from backend/config.py into environment if not already set
try:
    from .config import GEMINI_API_KEY as CONF_GEMINI_API_KEY  # type: ignore
except Exception:
    CONF_GEMINI_API_KEY = None  # type: ignore
try:
    from .config import FIRECRAWL_API_KEY as CONF_FIRECRAWL_API_KEY  # type: ignore
except Exception:
    CONF_FIRECRAWL_API_KEY = None  # type: ignore

if CONF_GEMINI_API_KEY and not os.getenv("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = CONF_GEMINI_API_KEY  # noqa: S105
if CONF_FIRECRAWL_API_KEY and not os.getenv("FIRECRAWL_API_KEY"):
    os.environ["FIRECRAWL_API_KEY"] = CONF_FIRECRAWL_API_KEY  # noqa: S105

app = FastAPI(title="Neuro-Web Backend", version="1.0.0")

# CORS for local dev (support multiple Vite ports)
origins_env = os.getenv("FRONTEND_ORIGIN") or os.getenv("FRONTEND_ORIGINS")
allowed_origins = []
if origins_env:
    allowed_origins.extend([o.strip() for o in origins_env.split(",") if o.strip()])

# Always allow common local dev origins
allowed_origins += [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
from .app.api.endpoints import router as api_router  # noqa: E402
from .app.auth import router as auth_router  # noqa: E402

app.include_router(api_router)
app.include_router(auth_router, prefix="/api/v1")


# Serve built frontend if present (dist/) - support both root/dist and backend/dist
SPA_DIR: Path | None = None
try:
    BASE_DIR = Path(__file__).resolve().parent
    ROOT_DIR = BASE_DIR.parent
    DIST_CANDIDATES = [ROOT_DIR / "dist", BASE_DIR / "dist"]
    for d in DIST_CANDIDATES:
        if d.exists():
            SPA_DIR = d
            app.mount("/", StaticFiles(directory=str(d), html=True), name="static")
            break
except Exception:
    SPA_DIR = None
    pass


@app.get("/api")
def backend_info():
    return {"status": "ok", "service": "neuro-web-backend", "version": app.version}


# SPA fallback: serve index.html for any non-API path to support client-side routing
@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    # Let API paths return proper 404 via routers
    if full_path.startswith("api"):
        return {"detail": "Not Found"}
    try:
        if SPA_DIR and (SPA_DIR / "index.html").exists():
            return HTMLResponse((SPA_DIR / "index.html").read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"detail": "Not Found"}


# Global 404 handler: if a non-API path 404s (including StaticFiles), return index.html for SPA routing
@app.exception_handler(404)
async def spa_404_handler(request: Request, exc):
    path = request.url.path
    if path.startswith("/api"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    try:
        if SPA_DIR and (SPA_DIR / "index.html").exists():
            return HTMLResponse((SPA_DIR / "index.html").read_text(encoding="utf-8"))
    except Exception:
        pass
    return JSONResponse({"detail": "Not Found"}, status_code=404)

if __name__ == "__main__":
    # Allow "cd backend && python main.py" for local dev
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)
