# Server entry point for Emergent platform
# This module re-exports the FastAPI app from main.py

from __future__ import annotations
import os
import sys

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI app from main.py
from backend.main import app

# Re-export for uvicorn
__all__ = ["app"]
