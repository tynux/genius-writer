/**
 * GeniusWriter 历史记录页面交互脚本
 * 处理项目列表、过滤、排序、分页和项目操作
 */

class HistoryPage {
    constructor() {
        console.log('📚 GeniusWriter 历史记录页面初始化');
        
        this.projects = [];
        this.filteredProjects = [];
        this.currentPage = 1;
        this.pageSize = 12;
        this.totalPages = 1;
        this.currentFilter = 'all';
        this.currentSort = 'updated_at';
        this.currentGenre = 'all';
        
        this.init();
    }
    
    async init() {
        console.log('🚀 初始化历史记录页面...');
        
        // 等待DOM加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        try {
            // 初始化事件监听器
            this.initEventListeners();
            
            // 加载项目数据
            await this.loadProjects();
            
            console.log('✅ 历史记录页面初始化完成');
        } catch (error) {
            console.error('❌ 历史记录页面初始化失败:', error);
            this.showError('页面初始化失败: ' + error.message);
        }
    }
    
    initEventListeners() {
        console.log('🔗 初始化事件监听器...');
        
        // 筛选标签
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });
        
        // 排序选择
        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFilters();
            });
        }
        
        // 类型筛选
        const genreFilter = document.getElementById('genre-filter');
        if (genreFilter) {
            genreFilter.addEventListener('change', (e) => {
                this.currentGenre = e.target.value;
                this.applyFilters();
            });
        }
        
        // 分页大小
        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.applyFilters();
            });
        }
        
        // 分页按钮
        const prevPageBtn = document.getElementById('prev-page');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                this.goToPage(this.currentPage - 1);
            });
        }
        
        const nextPageBtn = document.getElementById('next-page');
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.goToPage(this.currentPage + 1);
            });
        }
        
        console.log('✅ 事件监听器初始化完成');
    }
    
    async loadProjects() {
        console.log('📖 加载项目数据...');
        
        try {
            // 显示加载状态
            this.showLoading();
            
            // 调用API获取项目列表
            const response = await fetch('/api/novels');
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.projects = data.novels || [];
                console.log(`✅ 加载了 ${this.projects.length} 个项目`);
                
                // 应用初始筛选和排序
                this.applyFilters();
            } else {
                console.warn('⚠️ API返回不成功:', data.message);
                this.projects = [];
                this.showEmptyState('暂无项目数据');
            }
            
        } catch (error) {
            console.error('❌ 加载项目失败:', error);
            this.showError('加载项目列表失败: ' + error.message);
            
            // 显示空状态
            this.showEmptyState('加载失败，请刷新页面重试');
        }
    }
    
    handleFilterChange(filter) {
        console.log(`🔍 切换筛选: ${filter}`);
        
        // 更新筛选标签状态
        document.querySelectorAll('.filter-tab').forEach(tab => {
            if (tab.dataset.filter === filter) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // 更新当前筛选器
        this.currentFilter = filter;
        this.currentPage = 1;
        
        // 应用筛选
        this.applyFilters();
    }
    
    applyFilters() {
        console.log('🔧 应用筛选和排序...');
        
        // 筛选项目
        this.filteredProjects = this.projects.filter(project => {
            // 状态筛选
            if (this.currentFilter !== 'all') {
                if (project.status !== this.currentFilter) {
                    return false;
                }
            }
            
            // 类型筛选
            if (this.currentGenre !== 'all') {
                if (project.genre !== this.currentGenre) {
                    return false;
                }
            }
            
            return true;
        });
        
        // 排序项目
        this.filteredProjects.sort((a, b) => {
            switch (this.currentSort) {
                case 'created_at':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'progress':
                    return b.progress - a.progress;
                case 'updated_at':
                default:
                    return new Date(b.updated_at) - new Date(a.updated_at);
            }
        });
        
        console.log(`📊 筛选后: ${this.filteredProjects.length} 个项目`);
        
        // 更新分页
        this.updatePagination();
        
        // 渲染当前页的项目
        this.renderCurrentPage();
    }
    
    updatePagination() {
        console.log('📄 更新分页...');
        
        // 计算总页数
        this.totalPages = Math.ceil(this.filteredProjects.length / this.pageSize);
        
        const paginationEl = document.getElementById('pagination');
        const pageInfoEl = document.getElementById('page-info');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        
        // 显示/隐藏分页
        if (this.totalPages > 1) {
            paginationEl.style.display = 'flex';
        } else {
            paginationEl.style.display = 'none';
        }
        
        // 更新页面信息
        if (pageInfoEl) {
            pageInfoEl.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页`;
        }
        
        // 更新按钮状态
        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= this.totalPages;
        }
    }
    
    goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.totalPages) {
            return;
        }
        
        console.log(`🔀 跳转到第 ${pageNumber} 页`);
        
        this.currentPage = pageNumber;
        this.updatePagination();
        this.renderCurrentPage();
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    renderCurrentPage() {
        console.log(`🎨 渲染第 ${this.currentPage} 页的项目...`);
        
        const projectsGrid = document.getElementById('projects-grid');
        if (!projectsGrid) return;
        
        // 计算当前页的项目
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredProjects.length);
        const pageProjects = this.filteredProjects.slice(startIndex, endIndex);
        
        // 清空网格
        projectsGrid.innerHTML = '';
        
        // 如果没有项目，显示空状态
        if (pageProjects.length === 0) {
            this.showEmptyState('没有找到符合条件的项目');
            return;
        }
        
        // 渲染项目卡片
        pageProjects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            projectsGrid.appendChild(projectCard);
        });
    }
    
    createProjectCard(project) {
        console.log(`📝 创建项目卡片: ${project.title}`);
        
        // 创建卡片元素
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.projectId = project.id;
        
        // 状态文本
        const statusText = {
            'planning': '规划中',
            'writing': '创作中',
            'reviewing': '审阅中',
            'completed': '已完成',
            'paused': '已暂停'
        }[project.status] || project.status;
        
        // 格式化日期
        const createdDate = new Date(project.created_at).toLocaleDateString('zh-CN');
        const updatedDate = new Date(project.updated_at).toLocaleDateString('zh-CN');
        
        // 计算章节完成情况
        const completedChapters = Math.round((project.progress / 100) * project.chapters_count);
        
        card.innerHTML = `
            <div class="project-header">
                <div class="project-status status-${project.status}">${statusText}</div>
                <h3 class="project-title" title="${project.title}">${project.title}</h3>
                <div class="project-meta">
                    <span><i class="fas fa-user"></i> ${project.author || '匿名'}</span>
                    <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                </div>
            </div>
            
            <div class="project-body">
                <div class="project-description">
                    ${project.description || '暂无描述'}
                </div>
                
                <div class="project-stats">
                    <div class="stat-item">
                        <span class="stat-label">类型</span>
                        <span class="stat-value">${project.genre || '未设置'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">章节</span>
                        <span class="stat-value">${completedChapters}/${project.chapters_count}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">字数</span>
                        <span class="stat-value">${this.formatNumber(project.total_words || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">更新于</span>
                        <span class="stat-value">${updatedDate}</span>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-header">
                        <span class="progress-label">创作进度</span>
                        <span class="progress-percent">${project.progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${project.progress}%"></div>
                    </div>
                </div>
                
                <div class="project-actions">
                    <button class="action-btn action-btn-primary" data-action="continue">
                        <i class="fas fa-play"></i>
                        继续创作
                    </button>
                    <button class="action-btn action-btn-secondary" data-action="download">
                        <i class="fas fa-download"></i>
                        下载
                    </button>
                    <button class="action-btn action-btn-danger" data-action="delete">
                        <i class="fas fa-trash"></i>
                        删除
                    </button>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        const continueBtn = card.querySelector('[data-action="continue"]');
        const downloadBtn = card.querySelector('[data-action="download"]');
        const deleteBtn = card.querySelector('[data-action="delete"]');
        
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.continueProject(project.id);
            });
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadProject(project.id);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteProject(project.id, project.title);
            });
        }
        
        // 点击卡片标题可以查看详情
        const titleElement = card.querySelector('.project-title');
        if (titleElement) {
            titleElement.style.cursor = 'pointer';
            titleElement.addEventListener('click', () => {
                this.viewProjectDetails(project.id);
            });
        }
        
        return card;
    }
    
    async continueProject(projectId) {
        console.log(`🚀 继续项目: ${projectId}`);
        
        try {
            // 加载项目数据到localStorage
            const response = await fetch(`/api/novels/${projectId}`);
            
            if (!response.ok) {
                throw new Error(`加载项目失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.novel) {
                // 保存到localStorage
                const configData = {
                    novel: {
                        title: data.novel.title,
                        genre: data.novel.genre,
                        chapters: data.novel.chapters_count,
                        wordsPerChapter: data.novel.words_per_chapter,
                        writingStyle: data.novel.writing_style,
                        additionalInfo: data.novel.description || ''
                    },
                    model: {
                        selected: data.novel.target_model || 'simulated'
                    },
                    step: 4, // 直接跳到最后一步
                    savedAt: new Date().toISOString()
                };
                
                localStorage.setItem('geniuswriter_config', JSON.stringify(configData));
                
                // 显示成功消息
                this.showSuccess(`已加载项目"${data.novel.title}"，正在跳转到创作页面...`);
                
                // 跳转到创作页面
                setTimeout(() => {
                    window.location.href = '/writing';
                }, 1500);
                
            } else {
                throw new Error(data.message || '项目数据不完整');
            }
            
        } catch (error) {
            console.error('❌ 继续项目失败:', error);
            this.showError('继续创作失败: ' + error.message);
        }
    }
    
    async downloadProject(projectId) {
        console.log(`💾 下载项目: ${projectId}`);
        
        try {
            // 显示下载中状态
            const originalText = '下载';
            const downloadBtn = event?.target;
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 准备中...';
                downloadBtn.disabled = true;
            }
            
            // 获取项目数据
            const response = await fetch(`/api/novels/${projectId}/export?format=txt`);
            
            if (!response.ok) {
                throw new Error(`导出失败: ${response.status}`);
            }
            
            // 获取项目信息用于文件名
            const projectInfoResponse = await fetch(`/api/novels/${projectId}`);
            const projectInfo = await projectInfoResponse.json();
            const projectTitle = projectInfo.success ? projectInfo.novel.title : 'novel';
            
            // 创建下载链接
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectTitle}_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // 恢复按钮状态
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
                downloadBtn.disabled = false;
            }
            
            this.showSuccess('下载开始，文件将保存到您的设备');
            
        } catch (error) {
            console.error('❌ 下载项目失败:', error);
            this.showError('下载失败: ' + error.message);
            
            // 恢复按钮状态
            const downloadBtn = event?.target;
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
                downloadBtn.disabled = false;
            }
        }
    }
    
    async deleteProject(projectId, projectTitle) {
        console.log(`🗑️ 删除项目: ${projectId} (${projectTitle})`);
        
        // 确认删除
        if (!confirm(`确定要删除项目"${projectTitle}"吗？此操作不可撤销。`)) {
            return;
        }
        
        try {
            // 显示删除中状态
            const deleteBtn = event?.target;
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 删除中...';
                deleteBtn.disabled = true;
            }
            
            // 发送删除请求
            const response = await fetch(`/api/novels/${projectId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`删除失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // 从列表中移除项目
                this.projects = this.projects.filter(p => p.id !== projectId);
                
                // 重新应用筛选
                this.applyFilters();
                
                this.showSuccess(`项目"${projectTitle}"已删除`);
            } else {
                throw new Error(data.message || '删除失败');
            }
            
        } catch (error) {
            console.error('❌ 删除项目失败:', error);
            this.showError('删除失败: ' + error.message);
            
            // 恢复按钮状态
            const deleteBtn = event?.target;
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 删除';
                deleteBtn.disabled = false;
            }
        }
    }
    
    async viewProjectDetails(projectId) {
        console.log(`🔍 查看项目详情: ${projectId}`);
        
        // 在新的标签页中打开项目详情
        window.open(`/project/${projectId}`, '_blank');
    }
    
    showLoading() {
        const projectsGrid = document.getElementById('projects-grid');
        if (!projectsGrid) return;
        
        projectsGrid.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载项目...</div>
            </div>
        `;
    }
    
    showEmptyState(message = '暂无项目') {
        const projectsGrid = document.getElementById('projects-grid');
        if (!projectsGrid) return;
        
        projectsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-book-open"></i>
                </div>
                <h3 class="empty-title">${message}</h3>
                <p class="empty-description">
                    您可以开始一个新的创作项目，或者尝试不同的筛选条件。
                </p>
                <a href="/config" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    开始新项目
                </a>
            </div>
        `;
    }
    
    showError(message) {
        // 简单的错误提示
        alert(`错误: ${message}`);
    }
    
    showSuccess(message) {
        // 简单的成功提示
        alert(`成功: ${message}`);
    }
    
    formatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

// 初始化历史记录页面
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM内容加载完成，初始化历史记录页面...');
    
    // 确保页面完全加载
    setTimeout(() => {
        window.historyPage = new HistoryPage();
    }, 100);
});