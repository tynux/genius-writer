/**
 * GeniusWriter 项目详情页面交互脚本
 * 处理项目详情、章节导航和内容展示
 */

class ProjectPage {
    constructor() {
        console.log('📖 GeniusWriter 项目详情页面初始化');
        
        // 从URL获取项目ID
        this.projectId = this.getProjectIdFromUrl();
        if (!this.projectId) {
            this.showError('未找到项目ID');
            return;
        }
        
        this.projectData = null;
        this.chapters = [];
        this.currentChapter = null;
        
        this.init();
    }
    
    async init() {
        console.log(`🚀 初始化项目详情页面，项目ID: ${this.projectId}`);
        
        try {
            // 等待DOM加载
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // 初始化事件监听器
            this.initEventListeners();
            
            // 加载项目数据
            await this.loadProjectData();
            
            console.log('✅ 项目详情页面初始化完成');
        } catch (error) {
            console.error('❌ 项目详情页面初始化失败:', error);
            this.showError('页面初始化失败: ' + error.message);
        }
    }
    
    getProjectIdFromUrl() {
        // 从URL路径中提取项目ID
        const path = window.location.pathname;
        const match = path.match(/\/project\/([^\/]+)/);
        return match ? match[1] : null;
    }
    
    initEventListeners() {
        console.log('🔗 初始化事件监听器...');
        
        // 返回按钮
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }
        
        // 编辑项目按钮
        const editProjectBtn = document.getElementById('edit-project-btn');
        if (editProjectBtn) {
            editProjectBtn.addEventListener('click', () => {
                this.editProject();
            });
        }
        
        // 继续创作按钮
        const continueWritingBtn = document.getElementById('continue-writing-btn');
        if (continueWritingBtn) {
            continueWritingBtn.addEventListener('click', () => {
                this.continueWriting();
            });
        }
        
        // 下载项目按钮
        const downloadProjectBtn = document.getElementById('download-project-btn');
        if (downloadProjectBtn) {
            downloadProjectBtn.addEventListener('click', () => {
                this.downloadProject();
            });
        }
        
        // 导出JSON按钮
        const exportJsonBtn = document.getElementById('export-json-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                this.exportJson();
            });
        }
        
        console.log('✅ 事件监听器初始化完成');
    }
    
    async loadProjectData() {
        console.log('📊 加载项目数据...');
        
        try {
            // 显示加载状态
            this.showLoading();
            
            // 同时加载项目信息和章节列表
            const [projectResponse, chaptersResponse] = await Promise.all([
                fetch(`/api/novels/${this.projectId}`),
                fetch(`/api/novels/${this.projectId}/chapters?limit=1000`)
            ]);
            
            if (!projectResponse.ok) {
                throw new Error(`加载项目信息失败: ${projectResponse.status}`);
            }
            
            if (!chaptersResponse.ok) {
                throw new Error(`加载章节列表失败: ${chaptersResponse.status}`);
            }
            
            const projectData = await projectResponse.json();
            const chaptersData = await chaptersResponse.json();
            
            if (projectData.success && chaptersData.success) {
                this.projectData = projectData.novel;
                this.chapters = chaptersData.chapters || [];
                
                // 渲染项目信息
                this.renderProjectInfo();
                
                // 渲染章节列表
                this.renderChaptersList();
                
                // 如果有章节，显示第一个章节
                if (this.chapters.length > 0) {
                    this.showChapter(this.chapters[0]);
                } else {
                    this.showNoChapters();
                }
                
                console.log(`✅ 项目数据加载完成: ${this.projectData.title}`);
            } else {
                throw new Error(projectData.error || chaptersData.error || '数据加载失败');
            }
            
        } catch (error) {
            console.error('❌ 加载项目数据失败:', error);
            this.showError('加载项目数据失败: ' + error.message);
        }
    }
    
    renderProjectInfo() {
        console.log('🎨 渲染项目信息...');
        
        const project = this.projectData;
        if (!project) return;
        
        // 更新页面标题
        document.title = `${project.title} - GeniusWriter`;
        
        // 更新项目头部信息
        document.getElementById('project-title').textContent = project.title;
        document.getElementById('project-subtitle').textContent = project.description || '暂无描述';
        document.getElementById('project-author').textContent = project.author || '匿名';
        document.getElementById('project-genre').textContent = project.genre || '未设置';
        document.getElementById('project-chapters-total').textContent = `${project.chapters_count}章`;
        document.getElementById('project-words-per-chapter').textContent = `${project.words_per_chapter}字`;
        document.getElementById('project-progress-percent').textContent = `${project.progress}%`;
        document.getElementById('project-progress-fill').style.width = `${project.progress}%`;
        
        // 隐藏加载状态，显示内容
        document.getElementById('header-loading').style.display = 'none';
        document.getElementById('project-header-content').style.display = 'block';
    }
    
    renderChaptersList() {
        console.log('📚 渲染章节列表...');
        
        const chaptersList = document.getElementById('chapters-list');
        const chaptersCount = document.getElementById('chapters-count');
        
        if (!chaptersList) return;
        
        // 更新章节数量
        if (chaptersCount) {
            chaptersCount.textContent = `${this.chapters.length}个章节`;
        }
        
        // 清空列表
        chaptersList.innerHTML = '';
        
        if (this.chapters.length === 0) {
            chaptersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="empty-title">暂无章节</div>
                    <p class="text-gray-600">开始创作后，章节将显示在这里</p>
                </div>
            `;
            return;
        }
        
        // 按章节号排序
        const sortedChapters = [...this.chapters].sort((a, b) => 
            (a.chapter_number || 0) - (b.chapter_number || 0)
        );
        
        // 创建章节项
        sortedChapters.forEach(chapter => {
            const chapterItem = this.createChapterItem(chapter);
            chaptersList.appendChild(chapterItem);
        });
    }
    
    createChapterItem(chapter) {
        const chapterNumber = chapter.chapter_number || 0;
        const chapterTitle = chapter.title || `第${chapterNumber}章`;
        const hasContent = chapter.content && chapter.content.trim().length > 0;
        
        const item = document.createElement('div');
        item.className = 'chapter-nav-item';
        item.dataset.chapterId = chapter.id;
        item.dataset.chapterNumber = chapterNumber;
        
        // 状态指示器
        let status = 'planned';
        let statusText = '规划中';
        
        if (hasContent) {
            status = 'completed';
            statusText = '已完成';
        } else if (chapter.status === 'writing') {
            status = 'writing';
            statusText = '创作中';
        } else if (chapter.status === 'reviewed') {
            status = 'reviewed';
            statusText = '已审阅';
        }
        
        item.innerHTML = `
            <div class="chapter-nav-info">
                <div class="chapter-nav-title" title="${chapterTitle}">${chapterTitle}</div>
                <div class="chapter-nav-number">第${chapterNumber}章 • ${statusText}</div>
            </div>
            <div class="chapter-nav-status status-${status}"></div>
        `;
        
        // 点击事件
        item.addEventListener('click', () => {
            this.showChapter(chapter);
            
            // 更新活动状态
            document.querySelectorAll('.chapter-nav-item').forEach(el => {
                el.classList.remove('active');
            });
            item.classList.add('active');
        });
        
        return item;
    }
    
    async showChapter(chapter) {
        console.log(`📖 显示章节: ${chapter.title || chapter.chapter_number}`);
        
        this.currentChapter = chapter;
        
        // 显示加载状态
        document.getElementById('chapter-loading').style.display = 'block';
        document.getElementById('chapter-content').style.display = 'none';
        document.getElementById('empty-chapter').style.display = 'none';
        
        try {
            // 如果章节没有内容，尝试从服务器获取
            if (!chapter.content || chapter.content.trim().length === 0) {
                const response = await fetch(`/api/novels/${this.projectId}/chapters/${chapter.chapter_number}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.chapter) {
                        chapter = data.chapter;
                        this.currentChapter = chapter;
                        
                        // 更新章节列表中的对应项
                        const chapterItem = document.querySelector(`[data-chapter-id="${chapter.id}"]`);
                        if (chapterItem && chapter.content && chapter.content.trim().length > 0) {
                            const statusIndicator = chapterItem.querySelector('.chapter-nav-status');
                            if (statusIndicator) {
                                statusIndicator.className = 'chapter-nav-status status-completed';
                                statusIndicator.parentElement.querySelector('.chapter-nav-number').textContent = 
                                    `第${chapter.chapter_number}章 • 已完成`;
                            }
                        }
                    }
                }
            }
            
            // 渲染章节内容
            this.renderChapterContent(chapter);
            
        } catch (error) {
            console.error('❌ 加载章节内容失败:', error);
            this.renderChapterContent(chapter); // 仍然尝试渲染已有内容
        }
    }
    
    renderChapterContent(chapter) {
        console.log('✍️ 渲染章节内容...');
        
        const hasContent = chapter.content && chapter.content.trim().length > 0;
        
        if (hasContent) {
            // 显示章节内容
            document.getElementById('chapter-title').textContent = 
                chapter.title || `第${chapter.chapter_number}章`;
            
            // 构建元数据
            const metaHtml = `
                <span><i class="fas fa-hashtag"></i> 第${chapter.chapter_number}章</span>
                <span><i class="fas fa-ruler"></i> ${chapter.word_count || 0}字</span>
                <span><i class="fas fa-calendar"></i> ${new Date(chapter.updated_at || chapter.created_at).toLocaleDateString('zh-CN')}</span>
                ${chapter.model_used ? `<span><i class="fas fa-robot"></i> ${chapter.model_used}</span>` : ''}
            `;
            
            document.getElementById('chapter-meta').innerHTML = metaHtml;
            document.getElementById('chapter-text').textContent = chapter.content;
            
            // 显示内容，隐藏加载状态和空状态
            document.getElementById('chapter-loading').style.display = 'none';
            document.getElementById('chapter-content').style.display = 'block';
            document.getElementById('empty-chapter').style.display = 'none';
        } else {
            // 显示空状态
            document.getElementById('chapter-loading').style.display = 'none';
            document.getElementById('chapter-content').style.display = 'none';
            document.getElementById('empty-chapter').style.display = 'block';
        }
    }
    
    showNoChapters() {
        console.log('📭 没有章节可显示');
        
        document.getElementById('chapter-loading').style.display = 'none';
        document.getElementById('chapter-content').style.display = 'none';
        document.getElementById('empty-chapter').style.display = 'block';
    }
    
    showLoading() {
        // 页面初始加载状态已经在HTML中定义
        console.log('⏳ 显示加载状态...');
    }
    
    showError(message) {
        console.error('❌ 错误:', message);
        
        // 在页面顶部显示错误消息
        const header = document.querySelector('.project-header');
        if (header) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                color: rgb(185, 28, 28);
                padding: 1rem;
                border-radius: 0.5rem;
                margin-bottom: 1rem;
                font-size: 0.875rem;
            `;
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-exclamation-circle"></i>
                    <strong>错误:</strong> ${message}
                </div>
                <button onclick="window.location.reload()" style="
                    margin-top: 0.5rem;
                    padding: 0.25rem 0.75rem;
                    background: white;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 0.25rem;
                    color: rgb(185, 28, 28);
                    cursor: pointer;
                    font-size: 0.75rem;
                ">
                    刷新页面
                </button>
            `;
            
            header.insertBefore(errorDiv, header.firstChild);
        } else {
            alert(`错误: ${message}\n\n请刷新页面重试。`);
        }
    }
    
    editProject() {
        console.log('✏️ 编辑项目');
        
        // 这里可以实现编辑项目的功能
        // 暂时显示提示
        alert('编辑功能正在开发中...\n\n您可以在历史记录页面继续创作或下载项目。');
    }
    
    continueWriting() {
        console.log('🚀 继续创作项目');
        
        if (!this.projectData) {
            this.showError('项目数据未加载');
            return;
        }
        
        // 加载项目数据到localStorage
        const configData = {
            novel: {
                title: this.projectData.title,
                genre: this.projectData.genre,
                chapters: this.projectData.chapters_count,
                wordsPerChapter: this.projectData.words_per_chapter,
                writingStyle: this.projectData.writing_style,
                additionalInfo: this.projectData.description || ''
            },
            model: {
                selected: this.projectData.target_model || 'simulated'
            },
            step: 4, // 直接跳到最后一步
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('geniuswriter_config', JSON.stringify(configData));
        
        // 显示成功消息
        this.showSuccess(`正在加载项目"${this.projectData.title}"...`);
        
        // 跳转到创作页面
        setTimeout(() => {
            window.location.href = '/writing';
        }, 1500);
    }
    
    async downloadProject() {
        console.log('💾 下载项目');
        
        if (!this.projectData) {
            this.showError('项目数据未加载');
            return;
        }
        
        try {
            // 显示下载中状态
            const downloadBtn = document.getElementById('download-project-btn');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 准备中...';
            downloadBtn.disabled = true;
            
            // 下载TXT格式
            const response = await fetch(`/api/novels/${this.projectId}/export?format=txt`);
            
            if (!response.ok) {
                throw new Error(`导出失败: ${response.status}`);
            }
            
            // 创建下载链接
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.projectData.title}_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // 恢复按钮状态
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
            
            this.showSuccess('下载开始，文件将保存到您的设备');
            
        } catch (error) {
            console.error('❌ 下载失败:', error);
            this.showError('下载失败: ' + error.message);
            
            // 恢复按钮状态
            const downloadBtn = document.getElementById('download-project-btn');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
                downloadBtn.disabled = false;
            }
        }
    }
    
    async exportJson() {
        console.log('📄 导出JSON');
        
        if (!this.projectData) {
            this.showError('项目数据未加载');
            return;
        }
        
        try {
            // 显示导出中状态
            const exportBtn = document.getElementById('export-json-btn');
            const originalText = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导出中...';
            exportBtn.disabled = true;
            
            // 获取JSON格式数据
            const response = await fetch(`/api/novels/${this.projectId}/export?format=json`);
            
            if (!response.ok) {
                throw new Error(`导出失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // 创建JSON文件下载
                const jsonStr = JSON.stringify(data.data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.projectData.title}_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess('JSON导出成功，文件将保存到您的设备');
            } else {
                throw new Error(data.error || '导出失败');
            }
            
            // 恢复按钮状态
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
            
        } catch (error) {
            console.error('❌ JSON导出失败:', error);
            this.showError('JSON导出失败: ' + error.message);
            
            // 恢复按钮状态
            const exportBtn = document.getElementById('export-json-btn');
            if (exportBtn) {
                exportBtn.innerHTML = '<i class="fas fa-file-export"></i> 导出JSON';
                exportBtn.disabled = false;
            }
        }
    }
    
    showSuccess(message) {
        // 简单的成功提示
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            color: rgb(21, 128, 61);
            padding: 1rem;
            border-radius: 0.5rem;
            z-index: 1000;
            max-width: 300px;
            font-size: 0.875rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        `;
        successDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-check-circle"></i>
                <div>${message}</div>
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
}

// 初始化项目页面
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM内容加载完成，初始化项目页面...');
    
    // 确保页面完全加载
    setTimeout(() => {
        window.projectPage = new ProjectPage();
    }, 100);
});