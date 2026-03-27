# GeniusWriter 快速部署指南
# 部署到 ageniuswriter.com

## ⚡ 快速部署（10分钟内完成）

### 前提条件
1. **服务器**: Ubuntu 22.04 VPS (1GB+内存)
2. **域名**: `ageniuswriter.com` 已注册
3. **DNS**: 域名已解析到服务器IP
4. **SSH**: root权限访问服务器

### 一键部署命令

```bash
# 1. 登录服务器
ssh root@your-server-ip

# 2. 下载并运行部署脚本
curl -sSL https://raw.githubusercontent.com/tynux/genius-writer/master/deploy/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh

# 3. 按照提示完成部署
# 选择选项1（完整部署）
```

### 手动分步部署

#### 步骤1：基础设置
```bash
# 更新系统
apt update && apt upgrade -y

# 安装必要工具
apt install -y curl git nginx python3.11 python3.11-venv
```

#### 步骤2：部署应用
```bash
# 创建应用目录
mkdir -p /opt/geniuswriter
cd /opt/geniuswriter

# 克隆代码
git clone https://github.com/tynux/genius-writer.git .

# 创建虚拟环境
python3.11 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt gunicorn
```

#### 步骤3：配置应用
```bash
# 创建环境变量文件
cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=False
DATABASE_URL=sqlite:////opt/geniuswriter/data/genius_writer.db
EOF

# 创建数据目录
mkdir -p data logs uploads
```

#### 步骤4：启动应用
```bash
# 使用Gunicorn启动
venv/bin/gunicorn --bind 0.0.0.0:8000 --workers 3 app:app
```

#### 步骤5：配置Nginx
```bash
# 创建Nginx配置
cat > /etc/nginx/sites-available/geniuswriter << EOF
server {
    listen 80;
    server_name ageniuswriter.com www.ageniuswriter.com;
    location / {
        proxy_pass http://localhost:8000;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/geniuswriter /etc/nginx/sites-enabled/
systemctl restart nginx
```

#### 步骤6：获取SSL证书
```bash
# 安装Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d ageniuswriter.com -d www.ageniuswriter.com
```

## 🐳 Docker快速部署

### 使用Docker Compose
```bash
# 1. 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. 克隆代码
git clone https://github.com/tynux/genius-writer
cd genius-writer/deploy

# 3. 启动服务
docker-compose up -d

# 4. 配置反向代理（可选）
# 使用Nginx或Traefik代理到端口8000
```

### Docker单容器部署
```bash
# 构建镜像
docker build -f deploy/Dockerfile -t geniuswriter .

# 运行容器
docker run -d \
  -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  --name geniuswriter \
  geniuswriter
```

## 🌐 域名配置

### DNS记录设置
| 记录类型 | 主机名 | 值 | TTL |
|---------|--------|----|-----|
| A | @ | 服务器IP | 3600 |
| A | www | 服务器IP | 3600 |
| CNAME | * | ageniuswriter.com | 3600 |

### 验证DNS解析
```bash
# 检查域名解析
nslookup ageniuswriter.com
dig ageniuswriter.com +short

# 检查服务器IP
curl ifconfig.me
```

## 🔧 配置API密钥（可选）

编辑环境变量文件 `/opt/geniuswriter/.env`：
```bash
# OpenAI API (可选)
OPENAI_API_KEY=sk-your-openai-api-key

# DeepSeek API (可选)  
DEEPSEEK_API_KEY=your-deepseek-api-key
```

## 📱 访问应用

### 部署后访问
- **网站地址**: https://ageniuswriter.com
- **API地址**: https://ageniuswriter.com/api/health
- **管理界面**: https://ageniuswriter.com/config

### 验证部署
```bash
# 检查服务状态
curl -I https://ageniuswriter.com/api/health

# 预期响应
HTTP/2 200
Content-Type: application/json
{"status":"healthy","timestamp":"2026-03-27T03:23:00Z"}
```

## 🚨 故障排除

### 常见问题

1. **502 Bad Gateway**
   ```bash
   # 检查Gunicorn是否运行
   ps aux | grep gunicorn
   
   # 查看日志
   tail -f /opt/geniuswriter/logs/error.log
   ```

2. **SSL证书错误**
   ```bash
   # 重新获取证书
   certbot renew --force-renewal
   systemctl reload nginx
   ```

3. **数据库权限问题**
   ```bash
   # 修复权限
   chown -R geniuswriter:geniuswriter /opt/geniuswriter/data
   ```

4. **端口被占用**
   ```bash
   # 查看端口使用
   netstat -tlnp | grep :8000
   
   # 停止占用进程
   sudo fuser -k 8000/tcp
   ```

## 🔄 更新应用

### 手动更新
```bash
cd /opt/geniuswriter
git pull
systemctl restart geniuswriter
```

### 自动更新（使用Cron）
```bash
# 编辑crontab
crontab -e

# 添加每日自动更新
0 2 * * * cd /opt/geniuswriter && git pull && systemctl restart geniuswriter
```

## 📞 技术支持

### 获取帮助
1. **查看日志**: `journalctl -u geniuswriter`
2. **GitHub Issues**: https://github.com/tynux/genius-writer/issues
3. **文档**: https://github.com/tynux/genius-writer#readme

### 紧急恢复
```bash
# 重新部署
cd /opt/geniuswriter/deploy
./deploy.sh
```

## ✅ 完成检查

- [ ] 域名解析到服务器IP
- [ ] 服务器端口80/443开放
- [ ] 应用成功启动（端口8000）
- [ ] Nginx配置正确
- [ ] SSL证书有效
- [ ] 数据库可访问
- [ ] API接口响应正常

---

**部署完成** 🎉  
访问 https://ageniuswriter.com 开始使用GeniusWriter AI小说创作系统！

**技术支持**: OpenClaw Assistant  
**部署时间**: $(date +%Y-%m-%d)  
**版本**: v1.0.0