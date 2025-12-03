# Server entry point for Emergent platform
# This module re-exports the FastAPI app from main.py

from __future__ import annotations
import os
import sys
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env", override=False)

# Setup CORS to accept traffic from frontend
if not os.getenv("FRONTEND_ORIGIN"):
    os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Create the FastAPI app
app = FastAPI(title="Neuro-Web Backend", version="1.0.0")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

# Add configured frontend origin
frontend_origin = os.getenv("FRONTEND_ORIGIN", "")
if frontend_origin and frontend_origin not in origins:
    origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and mount API routes
try:
    # Ensure backend package is importable
    sys.path.insert(0, str(Path(__file__).parent))
    
    from app.api.endpoints import router as api_router
    from app.auth import router as auth_router
    
    app.include_router(api_router)
    app.include_router(auth_router, prefix="/api/v1")
except Exception as e:
    print(f"Warning: Could not import API routes: {e}")
    
    @app.get("/api")
    def api_fallback():
        return {"status": "error", "message": str(e)}


@app.get("/api")
def backend_info():
    return {"status": "ok", "service": "neuro-web-backend", "version": app.version}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


# Exception handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse({"detail": "Not Found"}, status_code=404)


# Re-export for uvicorn
__all__ = ["app"]
