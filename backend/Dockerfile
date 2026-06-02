# syntax=docker/dockerfile:1
# FastAPI backend chay bang uv. Khi khoi dong: chay migration roi serve uvicorn.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH=/app/.venv/bin:$PATH \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Cai uv (binary tinh, khong can pip)
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /app

# Cai dependency truoc (tan dung cache) — psycopg[binary] da gom san libpq.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy ma nguon
COPY . .

EXPOSE 8000

# Goi truc tiep binary trong .venv (PATH da tro san) -> khong sync lai luc chay.
# alembic upgrade head: tao/đong bo schema. Sau do serve uvicorn.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
