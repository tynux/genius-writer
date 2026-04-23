/**
 * GeniusWriter - 主JavaScript文件
 * 全局功能和通用工具
 */

class GeniusWriterApp {
    constructor() {
        this.apiBaseUrl = '';
        this.currentUser = null;
        this.systemStatus = null;
        this.init();
    }

    async init() {
        // 获取API基础URL
        this.apiBaseUrl = window.location.origin;
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 检查系统状态
        await this.checkSystemStatus();
        
        // 初始化页面特定功能
        this.initPageSpecific();
        
        console.log('GeniusWriter应用初始化完成');
    }

    initEventListeners() {
        // 智能体面板切换
        const agentToggle = document.getElementById('agent-toggle');
        if (agentToggle) {
            agentToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAgentPanel();
            });
        }

        // 关闭智能体面板
        const closePanel = document.getElementById('close-panel');
        if (closePanel) {
            closePanel.addEventListener('click', () => {
                this.hideAgentPanel();
            });
        }

        // 返回首页按钮
        const backToHome = document.getElementById('back-to-home');
        if (backToHome) {
            backToHome.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/';
            });
        }

        // 演示按钮
        const demoBtn = document.getElementById('demo-btn');
        if (demoBtn) {
            demoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showDemo();
            });
        }

        // API文档链接
        const apiDocs = document.getElementById('api-docs');
        if (apiDocs) {
            apiDocs.addEventListener('click', (e) => {
                e.preventDefault();
                window.open('/docs', '_blank');
            });
        }
    }

    initPageSpecific() {
        const path = window.location.pathname;
        
        switch (path) {
            case '/':
                this.initHomePage();
                break;
            case '/config':
                this.initConfigPage();
                break;
            case '/writing':
                this.initWritingPage();
                break;
        }
    }

    async initHomePage() {
        try {
            // 加载智能体信息
            await this.loadAgents();
            
            // 加载系统统计
            await this.loadSystemStats();
            
            // 更新页脚状态
            await this.updateFooterStatus();
            
        } catch (error) {
            console.error('首页初始化失败:', error);
            this.showError('首页初始化失败，请刷新页面重试');
        }
    }

    async initConfigPage() {
        // 配置页面有专门的config.js处理
        console.log('配置页面初始化');
    }

    async initWritingPage() {
        // 创作页面有专门的writing.js处理
        console.log('创作页面初始化');
    }

    async checkSystemStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/health`);
            if (!response.ok) throw new Error('健康检查失败');
            
            this.systemStatus = await response.json();
            console.log('系统状态:', this.systemStatus);
            
            // 更新页面上的状态指示器
            this.updateStatusIndicators();
            
        } catch (error) {
            console.error('系统状态检查失败:', error);
            this.systemStatus = {
                status: 'unhealthy',
                message: '无法连接服务器'
            };
        }
    }

    async loadAgents() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/agents/list`);
            if (!response.ok) throw new Error('加载代理失败');
            
            const data = await response.json();
            this.renderAgents(data.agents);
            
        } catch (error) {
            console.error('加载代理失败:', error);
            // 使用模拟数据
            this.renderAgents(this.getMockAgents());
        }
    }

    renderAgents(agents) {
        // 按层级分组
        const tier1 = agents.filter(a => a.tier === 1);
        const tier2 = agents.filter(a => a.tier === 2);
        const tier3 = agents.filter(a => a.tier === 3);
        
        // 渲染到智能体面板
        this.renderAgentTier('tier1-agents', tier1);
        this.renderAgentTier('tier2-agents', tier2);
        this.renderAgentTier('tier3-agents', tier3);
        
        // 更新统计数字
        const agentCount = document.getElementById('agent-count');
        if (agentCount) {
            agentCount.textContent = agents.length;
        }
    }

    renderAgentTier(containerId, agents) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        agents.forEach(agent => {
            const agentCard = this.createAgentCard(agent);
            container.appendChild(agentCard);
        });
    }

    createAgentCard(agent) {
        const card = document.createElement('div');
        card.className = 'agent-card';
        
        // 不同层级的图标
        let icon = 'fa-user';
        if (agent.tier === 1) icon = 'fa-crown';
        else if (agent.tier === 2) icon = 'fa-user-tie';
        else if (agent.tier === 3) icon = 'fa-user-graduate';
        
        card.innerHTML = `
            <h5><i class="fas ${icon}"></i> ${agent.name}</h5>
            <p>${agent.description || '无描述'}</p>
        `;
        
        return card;
    }

    async loadSystemStats() {
        // 更新技能数量
        const skillCount = document.getElementById('skill-count');
        if (skillCount) {
            skillCount.textContent = '28'; // 固定值，可以从API获取
        }
        
        // 更新模型数量
        const modelCount = document.getElementById('model-count');
        if (modelCount) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/models/list`);
                if (response.ok) {
                    const data = await response.json();
                    const enabledModels = data.models.filter(m => m.enabled).length;
                    modelCount.textContent = enabledModels;
                }
            } catch (error) {
                modelCount.textContent = '2'; // 默认值
            }
        }
    }

    async updateFooterStatus() {
        const systemStatusEl = document.getElementById('system-status');
        if (!systemStatusEl) return;
        
        if (this.systemStatus && this.systemStatus.status === 'healthy') {
            systemStatusEl.textContent = '系统运行正常';
            systemStatusEl.className = 'status-text';
        } else {
            systemStatusEl.textContent = '系统连接异常';
            systemStatusEl.className = 'status-text error';
        }
    }

    updateStatusIndicators() {
        // 更新页面中的状态指示器
        const statusIndicators = document.querySelectorAll('.status-indicator');
        statusIndicators.forEach(indicator => {
            if (this.systemStatus && this.systemStatus.status === 'healthy') {
                indicator.classList.remove('inactive');
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
                indicator.classList.add('inactive');
            }
        });
    }

    toggleAgentPanel() {
        const panel = document.getElementById('agent-panel');
        if (!panel) return;
        
        panel.classList.toggle('hidden');
        
        // 如果正在显示，加载代理数据
        if (!panel.classList.contains('hidden')) {
            this.loadAgents();
        }
    }

    hideAgentPanel() {
        const panel = document.getElementById('agent-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    showDemo() {
        alert('演示功能开发中...\n\n即将展示GeniusWriter的完整创作流程，包括：\n1. 小说配置\n2. 大纲生成\n3. 章节创作\n4. 智能体协作');
    }

    showError(message) {
        // 简单的错误提示
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f94144;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    showSuccess(message) {
        // 简单的成功提示
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4cc9f0;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
        `;
        successDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, finalOptions);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    getMockAgents() {
        return [
            {
                name: '创意总监',
                role: '总监层',
                description: '负责整体创意方向',
                tier: 1
            },
            {
                name: '文学总监',
                role: '总监层',
                description: '负责文学质量和风格',
                tier: 1
            },
            {
                name: '制作人',
                role: '总监层',
                description: '负责项目管理和协调',
                tier: 1
            },
            {
                name: '情节设计师',
                role: '部门主管',
                description: '设计情节和故事结构',
                tier: 2
            },
            {
                name: '人物设计师',
                role: '部门主管',
                description: '设计人物和角色关系',
                tier: 2
            },
            {
                name: '历史专家',
                role: '专家层',
                description: '历史小说创作专家',
                tier: 3
            },
            {
                name: '科幻专家',
                role: '专家层',
                description: '科幻小说创作专家',
                tier: 3
            }
        ];
    }

    // 工具函数
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    formatDate(date) {
        return new Date(date).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GeniusWriterApp();
});

// 全局工具函数
window.GeniusWriter = {
    showModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    },
    
    hideModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    },
    
    closeAllModals: function() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    },
    
    // 模态框事件委托
    initModalEvents: function() {
        // 点击模态框背景关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
            }
        });
        
        // 点击关闭按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal') || 
                e.target.closest('.close-modal')) {
                e.preventDefault();
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
};

// 初始化模态框事件
document.addEventListener('DOMContentLoaded', () => {
    GeniusWriter.initModalEvents();
});