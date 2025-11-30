FROM python:3.11-slim
WORKDIR /app
COPY . /app
ENV PORT=8000
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python", "server.py"]
