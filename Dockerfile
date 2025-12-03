# Multi-stage build: build React (Vite) frontend, then package FastAPI backend
# 1) Frontend build
FROM node:20-alpine AS frontend-builder
WORKDIR /app
# Install deps and build
COPY package.json .
COPY pnpm-lock.yaml ./pnpm-lock.yaml
# Use npm to avoid requiring pnpm in the builder; fall back gracefully
RUN npm install
COPY . .
RUN npm run build

# 2) Backend image
FROM python:3.11-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_HEADLESS=1

WORKDIR /app

# System deps (optional but helpful for some libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install backend Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m pip install --upgrade pip && \
    pip install -r backend/requirements.txt

# Install Playwright browsers and required system deps for Crawl4AI
# Note: crawl4ai needs specific browser versions, best to let playwright install what it needs
RUN python -m playwright install --with-deps chromium

# Copy backend source
COPY backend ./backend

# Copy built frontend assets into backend/dist so FastAPI can serve them
COPY --from=frontend-builder /app/dist ./backend/dist

# Expose the port uvicorn will bind to
EXPOSE 8080

# Default runtime env (override with Fly secrets / env)
# - GEMINI_API_KEY
# - AUTH_SECRET
ENV PORT=8080

# Run FastAPI via uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
