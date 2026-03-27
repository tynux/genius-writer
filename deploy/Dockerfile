# GeniusWriter Docker镜像
# 基于Python 3.11官方镜像

FROM python:3.11-slim

LABEL maintainer="tynux <tynux2026@users.noreply.github.com>"
LABEL description="GeniusWriter - AI Novel Creation System"
LABEL version="1.0.0"

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libpq-dev \
        libcairo2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf2.0-0 \
        libffi-dev \
        shared-mime-info \
        curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt gunicorn gevent

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p data logs uploads \
    && chmod -R 755 data logs uploads \
    && chown -R 1000:1000 data logs uploads

# 创建非root用户
RUN useradd -m -u 1000 geniuswriter \
    && chown -R geniuswriter:geniuswriter /app

USER geniuswriter

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["gunicorn", \
    "--bind", "0.0.0.0:8000", \
    "--workers", "3", \
    "--worker-class", "gevent", \
    "--timeout", "120", \
    "--access-logfile", "/app/logs/access.log", \
    "--error-logfile", "/app/logs/error.log", \
    "--log-level", "info", \
    "app:app"]