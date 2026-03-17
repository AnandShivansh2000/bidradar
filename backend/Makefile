install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --port 8000

test:
	pytest tests/ -v -m "not integration"

test-all:
	pytest tests/ -v

lint:
	ruff check app/
