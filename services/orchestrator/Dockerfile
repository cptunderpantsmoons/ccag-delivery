# Pinned to the same digest used in Dockerfile.production for consistency.
# Refresh the digest periodically: docker pull python:3.12-slim && docker inspect python:3.12-slim
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for health check)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and Alembic migration files
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Create non-root user and add to docker group (GID 999) so it can reach
# /var/run/docker.sock without running as root. The host docker socket is
# mounted :ro in production; the GID must match the host docker group.
RUN groupadd -r appuser \
    && groupadd -g 999 docker 2>/dev/null || true \
    && useradd -r -g appuser -G docker -d /app -s /sbin/nologin appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run Alembic migrations on startup, then start the app
CMD ["sh", "-c", "python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
