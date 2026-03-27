# GeniusWriter 部署指南
# 部署到 ageniuswriter.com 域名

## 📋 部署概览

本指南将帮助您将 GeniusWriter AI小说创作系统部署到 `ageniuswriter.com` 域名。提供多种部署方式以满足不同需求。

## 🎯 部署目标
- **域名**: `ageniuswriter.com` (支持 `www.ageniuswriter.com`)
- **协议**: HTTPS (SSL证书)
- **服务器**: 高性能VPS (推荐2GB+内存)
- **技术栈**: Ubuntu 22.04 + Nginx + Gunicorn + Flask

## 🚀 快速开始

### 前置条件
1. **域名**: `ageniuswriter.com` 已注册并指向您的服务器IP
2. **服务器**: VPS或云服务器 (Ubuntu 22.04推荐)
3. **SSH访问**: 服务器SSH权限
4. **端口**: 80/443端口开放

### 步骤一：准备服务器

```bash
# 1. 登录服务器
ssh root@your-server-ip

# 2. 更新系统
apt update && apt upgrade -y

# 3. 安装基础工具
apt install -y curl wget git vim htop net-tools

# 4. 设置时区（中国时区）
timedatectl set-timezone Asia/Shanghai
```

### 步骤二：安装Python和依赖

```bash
# 1. 安装Python 3.11
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# 2. 创建应用用户
adduser --system --group --no-create-home geniuswriter
```

### 步骤三：部署应用程序

```bash
# 1. 创建应用目录
mkdir -p /opt/geniuswriter
cd /opt/geniuswriter

# 2. 克隆GitHub仓库（或上传代码）
git clone https://github.com/tynux/genius-writer.git .

# 3. 设置权限
chown -R geniuswriter:geniuswriter /opt/geniuswriter
chmod -R 755 /opt/geniuswriter

# 4. 创建虚拟环境
python3.11 -m venv venv
source venv/bin/activate

# 5. 安装Python依赖
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# 6. 创建数据目录
mkdir -p data logs uploads
chown -R geniuswriter:geniuswriter data logs uploads
```

### 步骤四：配置环境变量

```bash
# 创建.env文件
cat > /opt/geniuswriter/.env << EOF
# Flask配置
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)

# 服务器配置
DEBUG=False
HOST=0.0.0.0
PORT=8000

# 数据库配置
DATABASE_URL=sqlite:////opt/geniuswriter/data/genius_writer.db

# OpenAI API配置（可选）
OPENAI_API_KEY=your-openai-api-key-here

# DeepSeek API配置（可选）
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# 上传配置
UPLOAD_FOLDER=/opt/geniuswriter/uploads
MAX_CONTENT_LENGTH=16777216
EOF

# 设置权限
chown geniuswriter:geniuswriter /opt/geniuswriter/.env
chmod 600 /opt/geniuswriter/.env
```

### 步骤五：配置Gunicorn

```bash
# 创建Gunicorn服务文件
cat > /etc/systemd/system/geniuswriter.service << EOF
[Unit]
Description=GeniusWriter AI Novel Creation System
After=network.target

[Service]
User=geniuswriter
Group=geniuswriter
WorkingDirectory=/opt/geniuswriter
Environment="PATH=/opt/geniuswriter/venv/bin"
EnvironmentFile=/opt/geniuswriter/.env
ExecStart=/opt/geniuswriter/venv/bin/gunicorn \
  --workers 3 \
  --worker-class gevent \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile /opt/geniuswriter/logs/access.log \
  --error-logfile /opt/geniuswriter/logs/error.log \
  app:app

Restart=always
RestartSec=10
StandardOutput=append:/opt/geniuswriter/logs/stdout.log
StandardError=append:/opt/geniuswriter/logs/stderr.log

[Install]
WantedBy=multi-user.target
EOF

# 重载systemd并启动服务
systemctl daemon-reload
systemctl start geniuswriter
systemctl enable geniuswriter
systemctl status geniuswriter
```

### 步骤六：安装和配置Nginx

```bash
# 1. 安装Nginx
apt install -y nginx

# 2. 创建Nginx配置文件
cat > /etc/nginx/sites-available/geniuswriter << EOF
# HTTP重定向到HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ageniuswriter.com www.ageniuswriter.com;
    
    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ageniuswriter.com www.ageniuswriter.com;

    # SSL证书路径（需替换为实际路径）
    ssl_certificate /etc/letsencrypt/live/ageniuswriter.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ageniuswriter.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 日志
    access_log /opt/geniuswriter/logs/nginx-access.log;
    error_log /opt/geniuswriter/logs/nginx-error.log;
    
    # 静态文件
    location /static/ {
        alias /opt/geniuswriter/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 上传文件
    location /uploads/ {
        alias /opt/geniuswriter/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # 代理到Gunicorn
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        
        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 禁止访问敏感文件
    location ~ /\.(env|git|svn|htaccess) {
        deny all;
    }
    
    location ~ /\.(?!well-known).* {
        deny all;
    }
}
EOF

# 3. 启用站点
ln -sf /etc/nginx/sites-available/geniuswriter /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 4. 测试配置并重启Nginx
nginx -t
systemctl restart nginx
```

### 步骤七：设置SSL证书（Let's Encrypt）

```bash
# 1. 安装Certbot
apt install -y certbot python3-certbot-nginx

# 2. 获取SSL证书（确保域名已解析到服务器）
certbot --nginx -d ageniuswriter.com -d www.ageniuswriter.com

# 3. 设置自动续期
echo "0 0,12 * * * root /usr/bin/certbot renew --quiet" | tee -a /etc/crontab > /dev/null
```

### 步骤八：初始化数据库

```bash
# 以应用用户身份运行
sudo -u geniuswriter bash -c "
  cd /opt/geniuswriter
  source venv/bin/activate
  python -c '
from app import app, db
with app.app_context():
    db.create_all()
    print(\"Database tables created successfully\")
  '
"
```

### 步骤九：验证部署

```bash
# 1. 检查服务状态
systemctl status geniuswriter
systemctl status nginx

# 2. 检查端口监听
netstat -tlnp | grep -E "(:80|:443|:8000)"

# 3. 测试应用访问
curl -I http://localhost:8000/api/health
curl -I https://ageniuswriter.com/api/health

# 4. 查看日志
tail -f /opt/geniuswriter/logs/error.log
```

## 🌐 域名配置

### DNS记录设置
在您的域名注册商控制面板中设置以下DNS记录：

| 类型 | 名称 | 值 | TTL |
|------|------|----|-----|
| A | ageniuswriter.com | 您的服务器IP | 3600 |
| A | www.ageniuswriter.com | 您的服务器IP | 3600 |

### 验证域名解析
部署前验证域名解析：
```bash
# 检查域名解析
nslookup ageniuswriter.com
dig ageniuswriter.com

# 检查服务器是否可访问
ping -c 4 ageniuswriter.com
```

## 🐳 Docker部署（可选）

### Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    container_name: geniuswriter-app
    restart: always
    ports:
      - "8000:8000"
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=sqlite:////app/data/genius_writer.db
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    env_file:
      - .env
  
  nginx:
    image: nginx:alpine
    container_name: geniuswriter-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
```

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建目录
RUN mkdir -p data logs uploads

# 设置环境变量
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PORT=8000

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["gunicorn", "--workers", "3", "--worker-class", "gevent", "--bind", "0.0.0.0:8000", "app:app"]
```

## 🔧 维护和监控

### 常用命令
```bash
# 查看应用状态
systemctl status geniuswriter

# 查看应用日志
journalctl -u geniuswriter -f
tail -f /opt/geniuswriter/logs/error.log

# 重启应用
systemctl restart geniuswriter

# 更新应用代码
cd /opt/geniuswriter
git pull
systemctl restart geniuswriter

# 备份数据库
cp /opt/geniuswriter/data/genius_writer.db /backup/genius_writer_$(date +%Y%m%d).db
```

### 监控设置
```bash
# 安装监控工具
apt install -y fail2ban

# 配置日志轮转
cat > /etc/logrotate.d/geniuswriter << EOF
/opt/geniuswriter/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 geniuswriter geniuswriter
    sharedscripts
    postrotate
        systemctl reload geniuswriter > /dev/null 2>&1 || true
    endscript
}
EOF
```

## 📊 性能优化

### 数据库优化
```python
# 在app.py中添加数据库连接池配置
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 300,
    'pool_pre_ping': True,
}
```

### Gunicorn优化
```ini
# gunicorn_config.py
workers = 4
worker_class = 'gevent'
bind = '0.0.0.0:8000'
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
```

## 🚨 故障排除

### 常见问题

1. **502 Bad Gateway**
   ```bash
   # 检查Gunicorn是否运行
   systemctl status geniuswriter
   
   # 检查端口监听
   netstat -tlnp | grep 8000
   ```

2. **数据库权限问题**
   ```bash
   # 修复权限
   chown -R geniuswriter:geniuswriter /opt/geniuswriter/data
   ```

3. **SSL证书问题**
   ```bash
   # 更新证书
   certbot renew --force-renewal
   systemctl reload nginx
   ```

4. **内存不足**
   ```bash
   # 查看内存使用
   free -h
   top
   
   # 减少Gunicorn workers
   # 编辑 /etc/systemd/system/geniuswriter.service
   # 将 workers 从 3 减少到 2
   ```

## 📞 支持

如果遇到部署问题：
1. 检查所有服务状态
2. 查看相关日志文件
3. 验证配置文件语法
4. 确保端口开放和安全组配置正确

### 日志文件位置
- 应用日志: `/opt/geniuswriter/logs/`
- Nginx日志: `/var/log/nginx/`
- Systemd日志: `journalctl -u geniuswriter`

## ✅ 完成检查清单

- [ ] 域名解析到服务器IP
- [ ] 服务器基础环境配置完成
- [ ] Python和依赖安装完成
- [ ] 应用代码部署完成
- [ ] 环境变量配置完成
- [ ] Gunicorn服务配置完成
- [ ] Nginx配置完成
- [ ] SSL证书安装完成
- [ ] 数据库初始化完成
- [ ] 防火墙和安全组配置完成
- [ ] 监控和备份设置完成

---

**部署完成时间**: 2026-03-27  
**技术支持**: OpenClaw Assistant  
**GitHub仓库**: https://github.com/tynux/genius-writer