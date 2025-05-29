FROM python:3.13-slim

RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml README.md ./
RUN pip install uv --no-cache-dir  && uv pip install "." --no-cache-dir --system

COPY . /app

ENV PYTHONUNBUFFERED=1; PYTHONPATH=/app
EXPOSE 8000
CMD ["python", "main.py"]

