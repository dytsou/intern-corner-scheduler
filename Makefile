PYTHON ?= python3
PIP ?= pip3

.PHONY: install run serve lint

install:
	@echo "Installing dependencies..."
	$(PYTHON) -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt

# Usage: make run < input.txt
run:
	cd python && ../.venv/bin/python main.py

# Run FastAPI development server
serve:
	.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
