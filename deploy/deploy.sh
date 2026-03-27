#!/bin/bash
# GeniusWriter一键部署脚本
# 将应用部署到ageniuswriter.com域名

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装"
        exit 1
    fi
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用root权限运行此脚本"
        exit 1
    fi
}

# 显示横幅
show_banner() {
    cat << "EOF"
  ____                   _                 __        __        
 / ___| ___   ___  _ __ (_)_   _ _ __ ___  \ \      / /__  ___ 
| |  _ / _ \ / _ \| '_ \| | | | | '_ ` _ \  \ \ /\ / / _ \/ __|
| |_| | (_) | (_) | | | | | |_| | | | | | |  \ V  V /  __/\__ \
 \____|\___/ \___/|_| |_|_|\__,_|_| |_| |_|   \_/\_/ \___||___/
                                                                
  AI小说创作系统部署脚本 v1.0.0
  目标域名: ageniuswriter.com
EOF
}

# 检查域名解析
check_dns() {
    DOMAIN="ageniuswriter.com"
    log_info "检查域名解析: $DOMAIN"
    
    if ! dig $DOMAIN +short | grep -q '^[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+$'; then
        log_warning "域名 $DOMAIN 未正确解析到IP地址"
        echo "请在DNS控制面板中设置以下记录："
        echo "类型: A, 名称: ageniuswriter.com, 值: $(curl -s ifconfig.me)"
        echo "类型: A, 名称: www.ageniuswriter.com, 值: $(curl -s ifconfig.me)"
        read -p "是否继续部署？(y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "域名解析正常"
    fi
}

# 检测操作系统和包管理器
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
        VERSION=$(cat /etc/redhat-release | sed -E 's/.*release ([0-9]+(\.[0-9]+)?).*/\1/')
    elif [ -f /etc/alpine-release ]; then
        OS="alpine"
        VERSION=$(cat /etc/alpine-release)
    else
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        VERSION=$(uname -r)
    fi
    
    # 确定包管理器
    case $OS in
        ubuntu|debian|raspbian)
            PKG_MANAGER="apt"
            ;;
        centos|rhel|fedora|amzn)
            if command -v dnf >/dev/null 2>&1; then
                PKG_MANAGER="dnf"
            else
                PKG_MANAGER="yum"
            fi
            ;;
        alpine)
            PKG_MANAGER="apk"
            ;;
        opensuse*|sles)
            PKG_MANAGER="zypper"
            ;;
        *)
            PKG_MANAGER="unknown"
            ;;
    esac
    
    log_info "检测到操作系统: $OS $VERSION, 包管理器: $PKG_MANAGER"
}

# 安装基础依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    case $PKG_MANAGER in
        apt)
            apt update
            apt install -y curl wget git vim htop net-tools \
                python3 python3-venv python3-dev python3-pip \
                nginx certbot python3-certbot-nginx \
                fail2ban ufw software-properties-common
            ;;
        dnf|yum)
            $PKG_MANAGER update -y
            $PKG_MANAGER install -y curl wget git vim htop net-tools \
                python3 python3-devel python3-pip \
                nginx firewalld policycoreutils-python-utils
            
            # CentOS/RHEL需要启用EPEL仓库获取certbot
            if [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
                $PKG_MANAGER install -y epel-release
            fi
            
            # 安装certbot（来自EPEL或默认仓库）
            $PKG_MANAGER install -y certbot python3-certbot-nginx
            ;;
        apk)
            apk update
            apk add curl wget git vim htop net-tools \
                python3 py3-pip python3-dev \
                nginx certbot py3-certbot-nginx \
                fail2ban ufw
            ;;
        zypper)
            zypper refresh
            zypper install -y curl wget git vim htop net-tools \
                python3 python3-pip python3-devel \
                nginx certbot python3-certbot-nginx \
                fail2ban firewalld
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            log_warning "请手动安装以下依赖："
            echo "curl wget git python3 python3-pip nginx certbot"
            read -p "是否继续？(可能需要手动安装依赖) (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
            ;;
    esac
    
    # 检查Python版本
    if command -v python3.11 >/dev/null 2>&1; then
        log_success "Python 3.11 已安装"
    elif command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        log_info "检测到Python $PYTHON_VERSION"
        if [[ "$PYTHON_VERSION" =~ ^3\.[8-9]|3\.1[0-9] ]]; then
            log_success "Python $PYTHON_VERSION 版本符合要求"
        else
            log_warning "Python版本可能较低($PYTHON_VERSION)，建议升级到3.8+"
        fi
    else
        log_error "Python未安装，请手动安装Python 3.8+"
        exit 1
    fi
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    case $OS in
        ubuntu|debian)
            ufw --force enable
            ufw allow 22/tcp  # SSH
            ufw allow 80/tcp  # HTTP
            ufw allow 443/tcp # HTTPS
            ufw reload
            log_success "防火墙配置完成 (使用UFW)"
            ;;
        centos|rhel|fedora|amzn)
            systemctl enable firewalld
            systemctl start firewalld
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --reload
            log_success "防火墙配置完成 (使用FirewallD)"
            ;;
        alpine)
            # Alpine Linux使用iptables，这里只开放端口
            iptables -A INPUT -p tcp --dport 22 -j ACCEPT
            iptables -A INPUT -p tcp --dport 80 -j ACCEPT
            iptables -A INPUT -p tcp --dport 443 -j ACCEPT
            iptables-save > /etc/iptables/rules.v4
            log_success "防火墙配置完成 (使用iptables)"
            ;;
        *)
            log_warning "不支持的操作系统 $OS，跳过防火墙配置"
            log_warning "请手动配置防火墙规则：开放22, 80, 443端口"
            ;;
    esac
}

# 创建应用用户
create_app_user() {
    log_info "创建应用用户..."
    
    if ! id -u geniuswriter >/dev/null 2>&1; then
        case $OS in
            ubuntu|debian)
                adduser --system --group --no-create-home --disabled-login geniuswriter
                ;;
            centos|rhel|fedora|amzn|alpine)
                useradd -r -s /bin/false -M geniuswriter
                ;;
            *)
                useradd -r -s /bin/false -M geniuswriter 2>/dev/null || \
                adduser --system --group --no-create-home --disabled-login geniuswriter 2>/dev/null || \
                log_error "无法创建用户，请手动创建: useradd -r -s /bin/false -M geniuswriter"
                ;;
        esac
        
        if id -u geniuswriter >/dev/null 2>&1; then
            log_success "用户 geniuswriter 创建成功"
        else
            log_warning "用户创建失败，将以当前用户运行"
        fi
    else
        log_warning "用户 geniuswriter 已存在"
    fi
}

# 部署应用代码
deploy_application() {
    log_info "部署应用代码..."
    
    DEPLOY_DIR="/opt/geniuswriter"
    
    # 创建目录
    mkdir -p $DEPLOY_DIR
    cd $DEPLOY_DIR
    
    # 克隆代码（如果目录为空）
    if [ -z "$(ls -A $DEPLOY_DIR)" ]; then
        git clone https://github.com/tynux/genius-writer.git .
    else
        git pull origin master
    fi
    
    # 设置权限
    chown -R geniuswriter:geniuswriter $DEPLOY_DIR
    chmod -R 755 $DEPLOY_DIR
    
    log_success "应用代码部署完成"
}

# 设置Python环境
setup_python_env() {
    log_info "设置Python环境..."
    
    cd /opt/geniuswriter
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        python3.11 -m venv venv
    fi
    
    source venv/bin/activate
    
    # 安装依赖
    pip install --upgrade pip
    pip install -r requirements.txt gunicorn gevent
    
    log_success "Python环境设置完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    cd /opt/geniuswriter
    
    # 创建.env文件
    if [ ! -f ".env" ]; then
        cat > .env << EOF
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

# 上传配置
UPLOAD_FOLDER=/opt/geniuswriter/uploads
MAX_CONTENT_LENGTH=16777216

# 可选：API密钥配置
# OPENAI_API_KEY=your-key-here
# DEEPSEEK_API_KEY=your-key-here
EOF
        chown geniuswriter:geniuswriter .env
        chmod 600 .env
    fi
    
    # 创建数据目录
    mkdir -p data logs uploads
    chown -R geniuswriter:geniuswriter data logs uploads
    
    log_success "环境变量配置完成"
}

# 配置Gunicorn服务
setup_gunicorn() {
    log_info "配置Gunicorn服务..."
    
    SERVICE_FILE="/etc/systemd/system/geniuswriter.service"
    
    if [ ! -f "$SERVICE_FILE" ]; then
        cat > $SERVICE_FILE << EOF
[Unit]
Description=GeniusWriter AI Novel Creation System
After=network.target

[Service]
User=geniuswriter
Group=geniuswriter
WorkingDirectory=/opt/geniuswriter
Environment="PATH=/opt/geniuswriter/venv/bin"
EnvironmentFile=/opt/geniuswriter/.env
ExecStart=/opt/geniuswriter/venv/bin/gunicorn \\
  --workers 3 \\
  --worker-class gevent \\
  --bind 0.0.0.0:8000 \\
  --timeout 120 \\
  --access-logfile /opt/geniuswriter/logs/access.log \\
  --error-logfile /opt/geniuswriter/logs/error.log \\
  app:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    fi
    
    systemctl daemon-reload
    systemctl enable geniuswriter
    systemctl start geniuswriter
    
    log_success "Gunicorn服务配置完成"
}

# 配置Nginx
setup_nginx() {
    log_info "配置Nginx..."
    
    # 检查Nginx是否安装
    if ! command -v nginx >/dev/null 2>&1; then
        log_warning "Nginx未安装，尝试安装..."
        case $PKG_MANAGER in
            apt)
                apt install -y nginx
                ;;
            dnf|yum)
                $PKG_MANAGER install -y nginx
                ;;
            apk)
                apk add nginx
                ;;
            zypper)
                zypper install -y nginx
                ;;
            *)
                log_error "无法安装Nginx，请手动安装: nginx"
                return 1
                ;;
        esac
    fi
    
    # 确定Nginx配置目录结构
    NGINX_CONF_DIR=""
    if [ -d "/etc/nginx/sites-available" ]; then
        NGINX_CONF_DIR="/etc/nginx/sites-available"
        NGINX_SITE="$NGINX_CONF_DIR/geniuswriter"
        log_info "使用Nginx配置目录: sites-available"
    elif [ -d "/etc/nginx/conf.d" ]; then
        NGINX_CONF_DIR="/etc/nginx/conf.d"
        NGINX_SITE="$NGINX_CONF_DIR/geniuswriter.conf"
        log_info "使用Nginx配置目录: conf.d"
    else
        # 尝试创建sites-available目录
        mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled 2>/dev/null
        if [ -d "/etc/nginx/sites-available" ]; then
            NGINX_CONF_DIR="/etc/nginx/sites-available"
            NGINX_SITE="$NGINX_CONF_DIR/geniuswriter"
            log_info "创建Nginx配置目录: sites-available"
        else
            log_error "无法确定Nginx配置目录，请手动配置"
            return 1
        fi
    fi
    
    # 确保配置目录存在
    mkdir -p "$(dirname "$NGINX_SITE")"
    
    # 创建Nginx配置文件
    log_info "创建Nginx配置文件: $NGINX_SITE"
    cat > "$NGINX_SITE" << EOF
# GeniusWriter配置
# 域名: ageniuswriter.com

server {
    listen 80;
    server_name ageniuswriter.com www.ageniuswriter.com;
    
    # 访问日志
    access_log /var/log/nginx/geniuswriter_access.log;
    error_log /var/log/nginx/geniuswriter_error.log;
    
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
        
        # WebSocket支持（如果有）
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
    
    # 启用站点（仅适用于sites-available/sites-enabled结构）
    if [ "$NGINX_CONF_DIR" = "/etc/nginx/sites-available" ]; then
        if [ -d "/etc/nginx/sites-enabled" ]; then
            ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/
            # 移除默认站点（如果存在）
            rm -f /etc/nginx/sites-enabled/default 2>/dev/null
            log_info "Nginx站点已启用 (sites-enabled)"
        fi
    fi
    
    # 确保Nginx日志目录存在
    mkdir -p /var/log/nginx
    
    # 测试配置
    log_info "测试Nginx配置..."
    if nginx -t; then
        # 重启Nginx
        if systemctl restart nginx; then
            log_success "Nginx配置完成并已重启"
        else
            # 尝试启动Nginx
            systemctl enable nginx 2>/dev/null
            systemctl start nginx
            if systemctl is-active --quiet nginx; then
                log_success "Nginx配置完成并已启动"
            else
                log_warning "Nginx重启失败，但配置已保存。请手动重启nginx"
            fi
        fi
    else
        log_error "Nginx配置测试失败，请检查配置文件"
        log_warning "配置文件位置: $NGINX_SITE"
        return 1
    fi
}

# 获取SSL证书
setup_ssl() {
    log_info "获取SSL证书..."
    
    # 检查certbot是否安装
    if ! command -v certbot >/dev/null 2>&1; then
        log_error "certbot未安装，跳过SSL证书配置"
        log_warning "请手动安装certbot并配置SSL证书"
        return 1
    fi
    
    # 获取certbot路径
    CERTBOT_PATH=$(command -v certbot)
    
    # 运行certbot
    certbot --nginx -d ageniuswriter.com -d www.ageniuswriter.com --non-interactive --agree-tos
    
    # 设置自动续期
    if [ -f /etc/crontab ]; then
        echo "0 0,12 * * * root $CERTBOT_PATH renew --quiet" | tee -a /etc/crontab > /dev/null
        log_success "SSL证书自动续期已添加到crontab"
    elif command -v crontab >/dev/null 2>&1; then
        # 为root用户添加cron任务
        (crontab -l 2>/dev/null; echo "0 0,12 * * * $CERTBOT_PATH renew --quiet") | crontab -
        log_success "SSL证书自动续期已添加到root用户的crontab"
    else
        log_warning "未找到crontab，请手动设置证书自动续期"
        log_warning "运行: $CERTBOT_PATH renew --quiet"
    fi
    
    log_success "SSL证书配置完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    cd /opt/geniuswriter
    source venv/bin/activate
    
    python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"
    
    log_success "数据库初始化完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查服务状态
    if systemctl is-active --quiet geniuswriter; then
        log_success "GeniusWriter服务运行正常"
    else
        log_error "GeniusWriter服务未运行"
        systemctl status geniuswriter
    fi
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx服务运行正常"
    else
        log_error "Nginx服务未运行"
        systemctl status nginx
    fi
    
    # 测试API
    if curl -s http://localhost:8000/api/health | grep -q "healthy"; then
        log_success "API接口访问正常"
    else
        log_error "API接口访问异常"
    fi
    
    log_info "部署验证完成"
}

# 显示部署完成信息
show_completion() {
    cat << EOF

${GREEN}🎉 GeniusWriter部署完成！${NC}

访问地址：
  https://ageniuswriter.com
  https://www.ageniuswriter.com

管理命令：
  查看服务状态： systemctl status geniuswriter
  查看应用日志： journalctl -u geniuswriter -f
  重启应用：     systemctl restart geniuswriter
  查看Nginx日志： tail -f /var/log/nginx/access.log

文件位置：
  应用目录：     /opt/geniuswriter
  配置文件：     /opt/geniuswriter/.env
  数据库：       /opt/geniuswriter/data/genius_writer.db
  日志文件：     /opt/geniuswriter/logs/

下一步：
  1. 编辑 /opt/geniuswriter/.env 配置API密钥
  2. 访问 https://ageniuswriter.com 开始使用
  3. 配置备份策略（推荐每日备份）

${YELLOW}⚠️  重要提醒：${NC}
  - 定期更新系统： apt update && apt upgrade
  - 定期备份数据库
  - 监控服务器资源使用情况

部署完成时间： $(date)
EOF
}

# 主函数
main() {
    show_banner
    check_root
    detect_os
    check_dns
    
    echo "选择部署模式："
    echo "1) 完整部署（推荐）"
    echo "2) 仅部署应用"
    echo "3) 仅配置Nginx和SSL"
    read -p "请选择 (1/2/3): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            log_info "开始完整部署..."
            install_dependencies
            configure_firewall
            create_app_user
            deploy_application
            setup_python_env
            setup_environment
            setup_gunicorn
            setup_nginx
            setup_ssl
            init_database
            verify_deployment
            ;;
        2)
            log_info "开始仅部署应用..."
            create_app_user
            deploy_application
            setup_python_env
            setup_environment
            setup_gunicorn
            init_database
            verify_deployment
            ;;
        3)
            log_info "开始仅配置Nginx和SSL..."
            install_dependencies
            setup_nginx
            setup_ssl
            ;;
        *)
            log_error "无效选择"
            exit 1
            ;;
    esac
    
    show_completion
}

# 执行主函数
main "$@"