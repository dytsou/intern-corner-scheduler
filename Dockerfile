FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy the fully pinned requirements and install the verified Python dependencies
COPY requirements.lock .
RUN python -m pip install --no-cache-dir --require-hashes --only-binary :all: -r requirements.lock

# Copy application code
COPY python/ ./python/
COPY app/ ./app/

# Copy environment file (optional - can be overridden with docker-compose)
COPY .env.example .env

# Run as a non-root user
RUN useradd --create-home --uid 10001 appuser \
  && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
