FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade --only-binary :all: pip && \
  pip install --no-cache-dir --only-binary :all: -r requirements.txt

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

