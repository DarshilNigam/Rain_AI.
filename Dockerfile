# ==============================================================================
# R.A.I. (Rainfall Artificial Intelligence) Backend Production Container
# ==============================================================================
FROM python:3.11-slim AS runtime

# Set security & Python runtime environment flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000 \
    HOST=0.0.0.0

# Install runtime system utilities for healthchecks & SSL certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python production dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy ML engine, models, and operational code
COPY ml /app/ml

# Create non-root system user for least-privilege container execution
RUN groupadd -g 1000 rai && \
    useradd -u 1000 -g rai -s /bin/sh -m raiuser && \
    chown -R raiuser:rai /app

# Switch to non-root user
USER raiuser

# Expose FastAPI operational service port
EXPOSE 8000

# Health check to monitor operational inference status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/model/status || exit 1

# Production ASGI server command
CMD ["uvicorn", "ml.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
