FROM python:3.12-slim
WORKDIR /app
COPY duplicate_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY duplicate_service/ .
RUN python encoder.py
ENV HF_HUB_OFFLINE=1 TOKENIZERS_PARALLELISM=false
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000} --no-access-log --workers 1"]
