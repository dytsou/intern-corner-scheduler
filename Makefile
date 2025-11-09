PYTHON ?= python3
PIP ?= pip3
PNPM ?= pnpm

.PHONY: install install-frontend install-backend run serve serve-frontend serve-backend build lint test

# Install all dependencies (Python backend + Node.js frontend)
install: install-backend install-frontend

# Install Python backend dependencies
install-backend:
	@echo "Installing Python dependencies..."
	$(PYTHON) -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt

# Install Node.js frontend dependencies
install-frontend:
	@echo "Installing Node.js dependencies..."
	$(PNPM) install

# Usage: make run < input.txt
run:
	cd python && ../.venv/bin/python main.py

# Run FastAPI development server (backend)
serve: serve-backend

serve-backend:
	.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run Vite development server (frontend)
serve-frontend:
	$(PNPM) run dev

# Build React app for production
build:
	$(PNPM) run build

# Run tests
test:
	.venv/bin/pytest tests/ -v
