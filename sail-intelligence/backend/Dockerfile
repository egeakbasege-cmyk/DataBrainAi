FROM python:3.12-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
# alembic.ini is optional — only needed when running migrations
COPY alembic.ini* ./

# Non-root user
RUN useradd -m -u 1000 sail && chown -R sail:sail /app
USER sail

EXPOSE 8000

# Uvicorn with 2 workers per CPU core (adjust for your VM)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
