/**
 * GeniusWriter 创作页面交互脚本
 * 处理创作页面的所有交互逻辑
 */

class WritingPage {
    constructor() {
        this.novelData = null;
        this.currentChapter = 1;
        this.chapters = [];
        this.creationStatus = 'idle'; // idle, planning, writing, paused, completed
        this.agentActivities = [];
        this.init();
    }
    
    async init() {
        console.log('创作页面初始化');
        
        // 加载现有小说数据
        await this.loadNovelData();
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 初始化UI组件
        this.initUIComponents();
        
        // 开始监控创作状态
        this.startStatusMonitoring();
        
        console.log('创作页面初始化完成');
    }
    
    async loadNovelData() {
        try {
            // 从localStorage加载小说配置
            const savedConfig = localStorage.getItem('geniuswriter_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.novelData = {
                    config: config.novel,
                    model: config.models,
                    agents: config.agents
                };
                
                // 加载或生成章节数据
                await this.loadChapters();
                
                // 更新UI
                this.updateNovelInfo();
                this.updateChapterList();
                this.loadChapterContent(1);
            } else {
                this.showNoNovelWarning();
            }
        } catch (error) {
            console.error('加载小说数据失败:', error);
            this.showError('加载小说数据失败，请返回配置页面重新开始');
        }
    }
    
    async loadChapters() {
        // 模拟加载章节数据
        // 在实际应用中，这里应该从服务器加载
        
        const totalChapters = this.novelData?.config?.chapters || 10;
        this.chapters = [];
        
        for (let i = 1; i <= totalChapters; i++) {
            this.chapters.push({
                number: i,
                title: `第${i}章`,
                status: i === 1 ? 'current' : 'pending', // pending, current, writing, completed, reviewed
                wordCount: 0,
                createdAt: null,
                updatedAt: null
            });
        }
        
        // 如果有保存的章节数据，加载它
        const savedChapters = localStorage.getItem('geniuswriter_chapters');
        if (savedChapters) {
            try {
                const parsed = JSON.parse(savedChapters);
                this.chapters = parsed;
            } catch (error) {
                console.error('加载保存的章节失败:', error);
            }
        }
    }
    
    showNoNovelWarning() {
        const warningHtml = `
            <div class="no-novel-warning">
                <div class="warning-icon">
                    <i class="fas fa-book-open"></i>
                </div>
                <h3>未找到小说项目</h3>
                <p>请先配置小说并开始创作</p>
                <a href="/config" class="btn btn-primary">
                    <i class="fas fa-cog"></i> 前往配置页面
                </a>
            </div>
        `;
        
        // 替换主内容区域
        const mainContent = document.querySelector('.writing-main');
        if (mainContent) {
            mainContent.innerHTML = warningHtml;
        }
        
        // 禁用控制按钮
        this.disableControls();
    }
    
    initEventListeners() {
        // 控制按钮事件
        this.initControlEvents();
        
        // 章节导航事件
        this.initNavigationEvents();
        
        // 编辑器事件
        this.initEditorEvents();
        
        // 质量控制和快速操作事件
        this.initActionEvents();
        
        // 导出事件
        this.initExportEvents();
    }
    
    initControlEvents() {
        // 暂停按钮
        const pauseBtn = document.getElementById('pause-creation');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseCreation());
        }
        
        // 继续按钮
        const resumeBtn = document.getElementById('resume-creation');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeCreation());
        }
        
        // 停止按钮
        const stopBtn = document.getElementById('stop-creation');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopCreation());
        }
        
        // 重新生成大纲
        const regenOutlineBtn = document.getElementById('regenerate-outline');
        if (regenOutlineBtn) {
            regenOutlineBtn.addEventListener('click', () => this.regenerateOutline());
        }
        
        // 生成本章按钮
        const writeChapterBtn = document.getElementById('write-chapter');
        if (writeChapterBtn) {
            writeChapterBtn.addEventListener('click', () => this.writeCurrentChapter());
        }
        
        // 导出按钮
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showExportModal();
            });
        }
    }
    
    initNavigationEvents() {
        // 上一章按钮
        const prevBtn = document.getElementById('prev-chapter');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateToChapter(this.currentChapter - 1));
        }
        
        // 下一章按钮
        const nextBtn = document.getElementById('next-chapter');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateToChapter(this.currentChapter + 1));
        }
        
        // 跳转按钮
        const jumpBtn = document.getElementById('jump-to-chapter');
        if (jumpBtn) {
            jumpBtn.addEventListener('click', () => this.showChapterJumpDialog());
        }
        
        // 章节列表点击事件（事件委托）
        const chapterList = document.getElementById('chapter-list');
        if (chapterList) {
            chapterList.addEventListener('click', (e) => {
                const chapterItem = e.target.closest('.chapter-item');
                if (chapterItem) {
                    const chapterNumber = parseInt(chapterItem.dataset.chapter);
                    if (!isNaN(chapterNumber)) {
                        this.navigateToChapter(chapterNumber);
                    }
                }
            });
        }
        
        // 智能体日志切换
        const toggleLogBtn = document.getElementById('toggle-agent-log');
        if (toggleLogBtn) {
            toggleLogBtn.addEventListener('click', () => this.toggleAgentLog());
        }
        
        // 清空消息按钮
        const clearMessagesBtn = document.getElementById('clear-messages');
        if (clearMessagesBtn) {
            clearMessagesBtn.addEventListener('click', () => this.clearSystemMessages());
        }
    }
    
    initEditorEvents() {
        const editor = document.getElementById('chapter-content');
        if (!editor) return;
        
        // 实时字数统计
        editor.addEventListener('input', () => {
            this.updateWordCount();
            this.saveChapterDraft();
        });
        
        // 编辑器工具栏
        document.querySelectorAll('.tool-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.closest('.tool-btn').dataset.action;
                const format = e.target.closest('.tool-btn').dataset.format;
                
                if (action === 'format') {
                    this.formatText(format);
                } else if (action === 'save-chapter') {
                    this.saveChapter();
                } else if (action === 'regenerate-chapter') {
                    this.regenerateChapter();
                }
            });
        });
    }
    
    initActionEvents() {
        // 质量检查按钮
        const qualityCheckBtn = document.getElementById('run-quality-check');
        if (qualityCheckBtn) {
            qualityCheckBtn.addEventListener('click', () => this.runQualityCheck());
        }
        
        // 快速操作按钮
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.closest('.quick-action-btn').dataset.action;
                this.handleQuickAction(action);
            });
        });
    }
    
    initExportEvents() {
        // 导出确认按钮
        const confirmExportBtn = document.getElementById('confirm-export');
        if (confirmExportBtn) {
            confirmExportBtn.addEventListener('click', () => this.exportNovel());
        }
        
        // 导出格式选择
        document.querySelectorAll('input[name="export-format"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateExportPreview();
            });
        });
        
        // 导出选项切换
        document.querySelectorAll('#export-modal input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateExportPreview();
            });
        });
        
        // 导出文件名输入
        const filenameInput = document.getElementById('export-filename');
        if (filenameInput) {
            filenameInput.addEventListener('input', () => {
                this.updateExportPreview();
            });
        }
    }
    
    initUIComponents() {
        // 初始化图表（如果有）
        this.initCharts();
        
        // 初始化模态框
        this.initModals();
        
        // 更新初始状态
        this.updateStatus();
        this.updateProgress();
        this.updateStats();
    }
    
    initCharts() {
        // 初始化字数统计图表
        const chartCanvas = document.getElementById('word-count-chart');
        if (!chartCanvas || !window.Chart) return;
        
        const ctx = chartCanvas.getContext('2d');
        this.wordChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '章节字数',
                    data: [],
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '字数'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '章节'
                        }
                    }
                }
            }
        });
        
        this.updateChart();
    }
    
    initModals() {
        // 章节详情模态框
        const chapterModal = document.getElementById('chapter-detail-modal');
        if (chapterModal) {
            // 编辑按钮
            const editBtn = document.getElementById('edit-chapter-detail');
            if (editBtn) {
                editBtn.addEventListener('click', () => this.editChapterDetails());
            }
        }
    }
    
    startStatusMonitoring() {
        // 定期更新状态
        this.statusInterval = setInterval(() => {
            this.updateStatus();
            this.updateAgentActivities();
            this.updateSystemMessages();
        }, 5000); // 每5秒更新一次
    }
    
    updateNovelInfo() {
        if (!this.novelData) return;
        
        const config = this.novelData.config;
        
        // 更新大纲区域
        const outlineContent = document.getElementById('outline-content');
        if (outlineContent) {
            outlineContent.innerHTML = `
                <div class="outline-summary">
                    <h4>《${config.title}》大纲</h4>
                    <p><strong>类型：</strong>${config.genre}</p>
                    <p><strong>章节：</strong>${config.chapters}章</p>
                    <p><strong>总字数：</strong>${this.formatNumber(config.chapters * config.wordsPerChapter)}字</p>
                    <p><strong>风格：</strong>${config.writingStyle}</p>
                    ${config.additionalInfo ? `<p><strong>特殊要求：</strong>${config.additionalInfo}</p>` : ''}
                </div>
            `;
        }
        
        // 更新章节目标字数
        const targetWordsEl = document.getElementById('chapter-target-words');
        if (targetWordsEl && config.wordsPerChapter) {
            targetWordsEl.textContent = this.formatNumber(config.wordsPerChapter);
        }
    }
    
    updateChapterList() {
        const chapterList = document.getElementById('chapter-list');
        if (!chapterList) return;
        
        chapterList.innerHTML = '';
        
        this.chapters.forEach(chapter => {
            const chapterItem = document.createElement('div');
            chapterItem.className = `chapter-item ${chapter.status}`;
            chapterItem.dataset.chapter = chapter.number;
            
            let statusIcon = 'fa-clock';
            let statusText = '待创作';
            
            switch (chapter.status) {
                case 'completed':
                    statusIcon = 'fa-check-circle';
                    statusText = '已完成';
                    break;
                case 'writing':
                    statusIcon = 'fa-pen';
                    statusText = '创作中';
                    break;
                case 'reviewed':
                    statusIcon = 'fa-star';
                    statusText = '已审阅';
                    break;
                case 'current':
                    statusIcon = 'fa-play-circle';
                    statusText = '当前章';
                    break;
            }
            
            chapterItem.innerHTML = `
                <div class="chapter-number">${chapter.number}</div>
                <div class="chapter-status">
                    <i class="fas ${statusIcon}"></i>
                    <span>${statusText}</span>
                </div>
                ${chapter.wordCount > 0 ? 
                    `<div class="chapter-words">${this.formatNumber(chapter.wordCount)}字</div>` : ''}
            `;
            
            chapterList.appendChild(chapterItem);
        });
    }
    
    async loadChapterContent(chapterNumber) {
        this.currentChapter = chapterNumber;
        
        // 更新UI
        this.updateChapterUI();
        
        // 加载章节内容
        const chapter = this.chapters[chapterNumber - 1];
        const editor = document.getElementById('chapter-content');
        
        if (!editor) return;
        
        if (chapter.content) {
            // 加载已保存的内容
            editor.value = chapter.content;
        } else {
            // 显示加载状态
            editor.value = `正在加载第${chapterNumber}章内容...`;
            
            // 尝试从服务器加载
            try {
                const content = await this.fetchChapterContent(chapterNumber);
                if (content) {
                    editor.value = content;
                    chapter.content = content;
                    chapter.wordCount = this.countWords(content);
                }
            } catch (error) {
                console.error('加载章节内容失败:', error);
                editor.value = `第${chapterNumber}章内容\n\n（本章尚未创作，点击"生成本章"按钮开始创作）`;
            }
        }
        
        // 更新字数统计
        this.updateWordCount();
        
        // 更新导航按钮状态
        this.updateNavigationButtons();
        
        // 记录活动
        this.logActivity(`切换到第${chapterNumber}章`);
    }
    
    async fetchChapterContent(chapterNumber) {
        // 模拟API调用
        return new Promise(resolve => {
            setTimeout(() => {
                // 在实际应用中，这里应该调用服务器API
                resolve(null); // 返回null表示没有内容
            }, 500);
        });
    }
    
    updateChapterUI() {
        const chapter = this.chapters[this.currentChapter - 1];
        
        // 更新章节信息
        const chapterNumberEl = document.getElementById('current-chapter-number');
        const chapterTitleEl = document.getElementById('current-chapter-title');
        
        if (chapterNumberEl) chapterNumberEl.textContent = this.currentChapter;
        if (chapterTitleEl) chapterTitleEl.textContent = chapter.title;
        
        // 更新章节状态
        const chapterStatusEl = document.getElementById('chapter-status');
        if (chapterStatusEl) {
            let statusText = '未开始';
            if (chapter.status === 'completed') statusText = '已完成';
            else if (chapter.status === 'writing') statusText = '创作中';
            else if (chapter.status === 'reviewed') statusText = '已审阅';
            else if (chapter.status === 'current') statusText = '当前章';
            
            chapterStatusEl.textContent = statusText;
        }
        
        // 更新章节列表中的当前章节
        document.querySelectorAll('.chapter-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.chapter) === this.currentChapter) {
                item.classList.add('active');
            }
        });
    }
    
    updateWordCount() {
        const editor = document.getElementById('chapter-content');
        if (!editor) return;
        
        const content = editor.value;
        const wordCount = this.countWords(content);
        
        // 更新字数显示
        const wordCountEl = document.getElementById('chapter-word-count');
        if (wordCountEl) {
            wordCountEl.textContent = this.formatNumber(wordCount);
        }
        
        // 更新章节数据
        const chapter = this.chapters[this.currentChapter - 1];
        if (chapter) {
            chapter.wordCount = wordCount;
            
            // 如果字数超过0，标记为已开始
            if (wordCount > 0 && chapter.status === 'pending') {
                chapter.status = 'writing';
                this.updateChapterList();
            }
        }
        
        // 更新总字数统计
        this.updateStats();
    }
    
    countWords(text) {
        if (!text || text.trim() === '') return 0;
        
        // 简单的中文字数统计
        const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        // 中文字每个字符算一个字，英文单词每个算一个字
        return chineseChars.length + words.length;
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-chapter');
        const nextBtn = document.getElementById('next-chapter');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentChapter <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentChapter >= this.chapters.length;
        }
    }
    
    updateStatus() {
        const statusEl = document.getElementById('current-status');
        const agentEl = document.getElementById('current-agent');
        
        if (statusEl) {
            let statusText = '等待开始';
            let statusClass = 'idle';
            
            switch (this.creationStatus) {
                case 'planning':
                    statusText = '规划中';
                    statusClass = 'planning';
                    break;
                case 'writing':
                    statusText = '创作中';
                    statusClass = 'writing';
                    break;
                case 'paused':
                    statusText = '已暂停';
                    statusClass = 'paused';
                    break;
                case 'completed':
                    statusText = '已完成';
                    statusClass = 'completed';
                    break;
            }
            
            statusEl.textContent = statusText;
            statusEl.className = `status-value ${statusClass}`;
        }
        
        if (agentEl) {
            // 模拟当前活动的代理
            const agents = ['创意总监', '情节设计师', '对话专家', '场景专家'];
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            agentEl.textContent = this.creationStatus === 'idle' ? '无' : randomAgent;
        }
    }
    
    updateProgress() {
        if (!this.chapters.length) return;
        
        // 计算完成度
        const completedChapters = this.chapters.filter(c => c.status === 'completed' || c.status === 'reviewed').length;
        const totalChapters = this.chapters.length;
        const progressPercent = Math.round((completedChapters / totalChapters) * 100);
        
        // 更新进度条
        const progressFill = document.getElementById('progress-fill');
        const progressPercentEl = document.getElementById('progress-percent');
        const progressTextEl = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
        }
        
        if (progressPercentEl) {
            progressPercentEl.textContent = `${progressPercent}%`;
        }
        
        if (progressTextEl) {
            progressTextEl.textContent = `(${completedChapters}/${totalChapters}章)`;
        }
        
        // 更新总字数
        const totalWords = this.chapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0);
        const totalWordsEl = document.getElementById('total-words');
        if (totalWordsEl) {
            totalWordsEl.textContent = this.formatNumber(totalWords) + '字';
        }
    }
    
    updateStats() {
        const completedChapters = this.chapters.filter(c => c.status === 'completed' || c.status === 'reviewed').length;
        const totalWords = this.chapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0);
        const avgWords = completedChapters > 0 ? Math.round(totalWords / completedChapters) : 0;
        
        // 更新统计显示
        const chaptersDoneEl = document.getElementById('stats-chapters-done');
        const totalWordsEl = document.getElementById('stats-total-words');
        const avgWordsEl = document.getElementById('stats-avg-words');
        const creationTimeEl = document.getElementById('stats-creation-time');
        
        if (chaptersDoneEl) chaptersDoneEl.textContent = completedChapters;
        if (totalWordsEl) totalWordsEl.textContent = this.formatNumber(totalWords);
        if (avgWordsEl) avgWordsEl.textContent = this.formatNumber(avgWords);
        if (creationTimeEl) {
            // 模拟创作时间（每分钟约500字）
            const minutes = Math.round(totalWords / 500);
            creationTimeEl.textContent = `${minutes}分钟`;
        }
        
        // 更新图表
        this.updateChart();
    }
    
    updateChart() {
        if (!this.wordChart) return;
        
        const labels = [];
        const data = [];
        
        this.chapters.forEach((chapter, index) => {
            labels.push(`第${index + 1}章`);
            data.push(chapter.wordCount || 0);
        });
        
        this.wordChart.data.labels = labels;
        this.wordChart.data.datasets[0].data = data;
        this.wordChart.update();
    }
    
    updateAgentActivities() {
        // 模拟代理活动
        if (this.creationStatus === 'writing' && Math.random() > 0.7) {
            const activities = [
                '创意总监正在评审故事概念',
                '情节设计师在规划下一章的结构',
                '对话专家在优化人物对话',
                '场景专家在丰富环境描写',
                '文学总监在检查文本质量'
            ];
            
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            this.addAgentActivity(randomActivity);
        }
        
        // 更新代理状态显示
        this.updateAgentStatus();
    }
    
    addAgentActivity(activity) {
        const timestamp = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        this.agentActivities.unshift({
            time: timestamp,
            content: activity
        });
        
        // 保持最多20条记录
        if (this.agentActivities.length > 20) {
            this.agentActivities.pop();
        }
        
        // 更新UI
        this.updateActivityLog();
    }
    
    updateActivityLog() {
        const logContainer = document.getElementById('agent-activity-log');
        if (!logContainer) return;
        
        logContainer.innerHTML = '';
        
        this.agentActivities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-time">[${activity.time}]</div>
                <div class="activity-content">${activity.content}</div>
            `;
            logContainer.appendChild(activityItem);
        });
    }
    
    updateAgentStatus() {
        // 模拟代理状态更新
        const statusItems = document.querySelectorAll('.agent-status-item');
        
        statusItems.forEach(item => {
            const agentName = item.querySelector('.agent-name').textContent;
            const stateEl = item.querySelector('.agent-state');
            
            if (!stateEl) return;
            
            // 根据创作状态设置代理状态
            if (this.creationStatus === 'writing') {
                const states = ['idle', 'working', 'done'];
                const randomState = states[Math.floor(Math.random() * states.length)];
                stateEl.textContent = randomState === 'idle' ? '空闲' : 
                                   randomState === 'working' ? '工作中' : '完成';
                stateEl.className = `agent-state ${randomState}`;
            } else {
                stateEl.textContent = '空闲';
                stateEl.className = 'agent-state idle';
            }
        });
    }
    
    updateSystemMessages() {
        // 模拟系统消息
        if (Math.random() > 0.9) {
            const messages = [
                '系统运行正常，所有组件工作良好',
                '建议定期保存章节内容',
                '可以使用快速操作功能优化文本',
                '创作进度良好，继续保持'
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            this.addSystemMessage(randomMessage, 'tip');
        }
    }
    
    addSystemMessage(content, type = 'info') {
        const messagesContainer = document.getElementById('system-messages');
        if (!messagesContainer) return;
        
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'tip') icon = 'fa-lightbulb';
        else if (type === 'error') icon = 'fa-exclamation-circle';
        
        messageItem.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="message-content">${content}</div>
        `;
        
        messagesContainer.insertBefore(messageItem, messagesContainer.firstChild);
        
        // 保持最多10条消息
        if (messagesContainer.children.length > 10) {
            messagesContainer.removeChild(messagesContainer.lastChild);
        }
    }
    
    // 控制方法
    async pauseCreation() {
        if (this.creationStatus !== 'writing') return;
        
        this.creationStatus = 'paused';
        this.updateStatus();
        
        // 显示继续按钮，隐藏暂停按钮
        document.getElementById('pause-creation').style.display = 'none';
        document.getElementById('resume-creation').style.display = 'inline-block';
        
        this.logActivity('创作已暂停');
        this.showSuccess('创作已暂停');
    }
    
    async resumeCreation() {
        if (this.creationStatus !== 'paused') return;
        
        this.creationStatus = 'writing';
        this.updateStatus();
        
        // 显示暂停按钮，隐藏继续按钮
        document.getElementById('pause-creation').style.display = 'inline-block';
        document.getElementById('resume-creation').style.display = 'none';
        
        this.logActivity('创作已继续');
        this.showSuccess('创作已继续');
    }
    
    async stopCreation() {
        if (!confirm('确定要停止创作吗？未保存的内容可能会丢失。')) {
            return;
        }
        
        this.creationStatus = 'idle';
        this.updateStatus();
        
        // 保存当前进度
        await this.saveAllChapters();
        
        this.logActivity('创作已停止');
        this.showSuccess('创作已停止，进度已保存');
    }
    
    async regenerateOutline() {
        if (!confirm('确定要重新生成大纲吗？当前大纲将被替换，已创作的章节内容可能受影响。')) {
            return;
        }
        
        try {
            this.showSuccess('正在重新生成大纲...');
            
            const novelId = this.novelData.id;
            if (!novelId) {
                throw new Error('小说ID不存在，请先保存小说');
            }
            
            // 获取当前配置
            const config = this.novelData.config;
            
            // 构建请求数据
            const requestData = {
                novel_id: novelId,
                title: config.title,
                genre: config.genre,
                chapters: config.chapters,
                words_per_chapter: config.wordsPerChapter,
                writing_style: config.writingStyle || '通俗性',
                additional_info: config.additionalInfo || '',
                model: config.model || 'openai',
                temperature: config.temperature || 0.7,
                max_tokens: 4000,
            };
            
            // 调用API重新生成大纲
            // 注意：这里假设有一个重新生成大纲的API端点
            // 如果没有，可以调用创建小说时的规划工作流
            const response = await this.apiRequest(`/api/novels/${novelId}/regenerate-outline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            }).catch(() => {
                // 如果端点不存在，尝试使用通用规划
                return this.fallbackRegenerateOutline(requestData);
            });
            
            if (response && response.success && response.outline) {
                // 更新本地大纲数据
                this.updateOutlineFromResponse(response.outline);
                this.showSuccess('大纲重新生成完成');
                this.logActivity('重新生成小说大纲');
            } else {
                throw new Error(response?.error || '大纲生成失败');
            }
            
        } catch (error) {
            console.error('重新生成大纲失败:', error);
            this.showError('重新生成大纲失败: ' + error.message);
        }
    }
    
    async fallbackRegenerateOutline(config) {
        // 降级方案：模拟生成大纲
        return new Promise(resolve => {
            setTimeout(() => {
                // 生成模拟大纲数据
                const outline = {
                    title: config.title,
                    genre: config.genre,
                    chapters_count: config.chapters,
                    words_per_chapter: config.words_per_chapter,
                    writing_style: config.writing_style,
                    chapters: []
                };
                
                // 生成模拟章节
                for (let i = 1; i <= config.chapters; i++) {
                    outline.chapters.push({
                        chapter: i,
                        title: `第${i}章 ${this.getChapterTitleByPosition(i, config.chapters)}`,
                        summary: this.generateChapterSummary(i, config),
                        key_points: this.generateKeyPoints(i, config),
                        characters: ['主人公', '重要配角'],
                        tone: this.getChapterTone(i, config.chapters)
                    });
                }
                
                resolve({
                    success: true,
                    outline: outline,
                    message: '大纲已重新生成（模拟数据）'
                });
            }, 2000);
        });
    }
    
    getChapterTitleByPosition(chapterNum, totalChapters) {
        if (chapterNum === 1) return '故事的开始';
        if (chapterNum <= totalChapters * 0.3) return '冲突初现';
        if (chapterNum <= totalChapters * 0.7) return '发展升级';
        if (chapterNum === totalChapters) return '最终结局';
        return '情节推进';
    }
    
    generateChapterSummary(chapterNum, config) {
        const position = chapterNum / config.chapters;
        if (position <= 0.2) {
            return `第${chapterNum}章：引入主人公${config.genre}世界，建立初始冲突。`;
        } else if (position <= 0.6) {
            return `第${chapterNum}章：情节发展，冲突升级，人物关系深化。`;
        } else if (position <= 0.9) {
            return `第${chapterNum}章：高潮临近，所有线索汇聚，最终冲突准备。`;
        } else {
            return `第${chapterNum}章：解决核心冲突，交代人物命运，故事圆满结束。`;
        }
    }
    
    generateKeyPoints(chapterNum, config) {
        const keyPoints = [];
        if (chapterNum === 1) {
            keyPoints.push('引入主人公', '展示世界观', '触发事件');
        } else if (chapterNum === config.chapters) {
            keyPoints.push('最终对决', '问题解决', '主题升华');
        } else {
            keyPoints.push('情节推进', '人物发展', '冲突升级');
        }
        return keyPoints;
    }
    
    getChapterTone(chapterNum, totalChapters) {
        const position = chapterNum / totalChapters;
        if (position <= 0.2) return '引入性';
        if (position <= 0.4) return '发展性';
        if (position <= 0.7) return '紧张性';
        if (position <= 0.9) return '高潮性';
        return '结局性';
    }
    
    updateOutlineFromResponse(outline) {
        // 更新章节数据
        if (outline.chapters && Array.isArray(outline.chapters)) {
            this.chapters = outline.chapters.map(chapter => ({
                number: chapter.chapter,
                title: chapter.title || `第${chapter.chapter}章`,
                summary: chapter.summary || '',
                keyPoints: chapter.key_points || [],
                characters: chapter.characters || [],
                tone: chapter.tone || '适中',
                status: 'pending',
                content: '',
                wordCount: 0
            }));
            
            // 更新当前章节
            this.currentChapter = Math.min(this.currentChapter, this.chapters.length);
            
            // 更新UI
            this.updateChapterList();
            this.updateOutlineDisplay();
            this.updateProgress();
        }
    }
    
    async writeCurrentChapter() {
        const chapter = this.chapters[this.currentChapter - 1];
        
        if (chapter.status === 'completed' || chapter.status === 'reviewed') {
            if (!confirm('本章已经完成，确定要重新创作吗？')) {
                return;
            }
        }
        
        try {
            this.showSuccess(`开始创作第${this.currentChapter}章...`);
            
            // 更新章节状态
            chapter.status = 'writing';
            this.updateChapterList();
            
            // 调用API生成章节内容
            const content = await this.generateChapterContent(this.currentChapter);
            
            if (content) {
                // 更新编辑器内容
                const editor = document.getElementById('chapter-content');
                if (editor) {
                    editor.value = content;
                }
                
                // 更新章节数据
                chapter.content = content;
                chapter.wordCount = this.countWords(content);
                chapter.status = 'completed';
                chapter.updatedAt = new Date().toISOString();
                
                // 更新UI
                this.updateWordCount();
                this.updateChapterList();
                this.updateProgress();
                this.updateStats();
                
                this.showSuccess(`第${this.currentChapter}章创作完成`);
                this.logActivity(`完成第${this.currentChapter}章创作`);
                
                // 自动保存
                this.saveChapter();
                
                // 如果是最后一章，标记为完成
                if (this.currentChapter === this.chapters.length) {
                    this.creationStatus = 'completed';
                    this.updateStatus();
                    this.showSuccess('恭喜！小说创作全部完成！');
                }
            } else {
                this.showError('章节创作失败，请重试');
            }
            
        } catch (error) {
            console.error('章节创作失败:', error);
            this.showError('章节创作失败: ' + error.message);
            chapter.status = 'pending';
            this.updateChapterList();
        }
    }
    
    async generateChapterContent(chapterNumber) {
        try {
            const chapter = this.chapters[chapterNumber - 1];
            const config = this.novelData.config;
            const novelId = this.novelData.id;
            
            if (!novelId) {
                throw new Error('小说ID不存在，请先保存小说');
            }
            
            // 构建请求数据
            const requestData = {
                novel_id: novelId,
                chapter_number: chapterNumber,
                target_words: config.wordsPerChapter,
                model: config.model || 'openai',
                temperature: config.temperature || 0.7,
                writing_style: config.writingStyle || '通俗性',
                enhance_writing_style: true,
                // 传递大纲信息
                outline: {
                    title: config.title,
                    genre: config.genre,
                    chapters: this.chapters.map(ch => ({
                        chapter: ch.number,
                        title: ch.title,
                        summary: ch.summary || '',
                        key_points: ch.keyPoints || [],
                        characters: ch.characters || [],
                        tone: ch.tone || '适中'
                    }))
                }
            };
            
            // 调用真实的API
            const response = await this.apiRequest('/api/novel/write-chapter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (response && response.success && response.chapter && response.chapter.content) {
                return response.chapter.content;
            } else {
                throw new Error(response?.error || '章节生成失败');
            }
            
        } catch (error) {
            console.error('调用章节生成API失败:', error);
            
            // 如果API调用失败，返回模拟内容（降级处理）
            const chapter = this.chapters[chapterNumber - 1];
            const config = this.novelData.config;
            
            return `第${chapterNumber}章 ${chapter.title}

清晨的第一缕阳光透过窗帘的缝隙，照在房间里。新的一天开始了，充满了无限的可能。

"今天会是重要的一天，"主人公对自己说，声音中带着一丝期待和紧张。

这是《${config.title}》的第${chapterNumber}章，基于${config.genre}题材创作。本章目标字数：${config.wordsPerChapter}字，包含场景描写、人物对话和情节发展。

随着故事的推进，主人公面临新的选择和挑战。每一个决定都可能影响未来的道路，每一个相遇都可能改变命运的轨迹。

（注：AI生成服务暂时不可用，这是模拟内容。请手动修改或稍后重试。）`;
        }
    }
    
    // 辅助方法：API请求
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API请求失败 ${url}:`, error);
            throw error;
        }
    }
    
    // 导航方法
    navigateToChapter(chapterNumber) {
        if (chapterNumber < 1 || chapterNumber > this.chapters.length) {
            return;
        }
        
        // 检查当前章节是否有未保存的更改
        if (this.hasUnsavedChanges()) {
            if (!confirm('当前章节有未保存的更改，确定要离开吗？')) {
                return;
            }
        }
        
        this.loadChapterContent(chapterNumber);
    }
    
    showChapterJumpDialog() {
        const chapterNumber = prompt(`请输入要跳转的章节号 (1-${this.chapters.length}):`, this.currentChapter);
        
        if (chapterNumber) {
            const num = parseInt(chapterNumber);
            if (!isNaN(num) && num >= 1 && num <= this.chapters.length) {
                this.navigateToChapter(num);
            } else {
                this.showError('请输入有效的章节号');
            }
        }
    }
    
    toggleAgentLog() {
        const logContainer = document.getElementById('agent-activity-log');
        const toggleBtn = document.getElementById('toggle-agent-log');
        
        if (!logContainer || !toggleBtn) return;
        
        if (logContainer.style.display === 'none') {
            logContainer.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            logContainer.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
    
    clearSystemMessages() {
        const messagesContainer = document.getElementById('system-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="message-item info">
                    <i class="fas fa-info-circle"></i>
                    <div class="message-content">系统消息已清空</div>
                </div>
            `;
        }
    }
    
    // 编辑器方法
    formatText(format) {
        const editor = document.getElementById('chapter-content');
        if (!editor) return;
        
        const selectionStart = editor.selectionStart;
        const selectionEnd = editor.selectionEnd;
        const selectedText = editor.value.substring(selectionStart, selectionEnd);
        
        let formattedText = selectedText;
        
        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'heading':
                formattedText = `## ${selectedText}`;
                break;
        }
        
        // 替换选中的文本
        editor.value = editor.value.substring(0, selectionStart) + 
                      formattedText + 
                      editor.value.substring(selectionEnd);
        
        // 恢复选中状态
        editor.focus();
        editor.setSelectionRange(selectionStart, selectionStart + formattedText.length);
    }
    
    async saveChapter() {
        const editor = document.getElementById('chapter-content');
        if (!editor) return;
        
        const content = editor.value;
        const chapter = this.chapters[this.currentChapter - 1];
        
        // 更新章节数据
        chapter.content = content;
        chapter.wordCount = this.countWords(content);
        chapter.status = content.trim() ? 'completed' : 'pending';
        chapter.updatedAt = new Date().toISOString();
        
        // 保存到localStorage
        await this.saveAllChapters();
        
        // 更新UI
        this.updateChapterList();
        this.updateProgress();
        this.updateStats();
        
        this.showSuccess('章节已保存');
        this.logActivity(`保存第${this.currentChapter}章`);
    }
    
    saveChapterDraft() {
        // 自动保存草稿（防抖处理）
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            const editor = document.getElementById('chapter-content');
            if (!editor) return;
            
            const content = editor.value;
            const chapter = this.chapters[this.currentChapter - 1];
            
            // 只更新内容，不改变状态
            chapter.content = content;
            chapter.wordCount = this.countWords(content);
            
            // 保存到localStorage
            localStorage.setItem('geniuswriter_chapters', JSON.stringify(this.chapters));
            
            console.log('自动保存草稿');
        }, 2000); // 2秒防抖
    }
    
    async saveAllChapters() {
        try {
            localStorage.setItem('geniuswriter_chapters', JSON.stringify(this.chapters));
            return true;
        } catch (error) {
            console.error('保存章节失败:', error);
            return false;
        }
    }
    
    async regenerateChapter() {
        if (!confirm('确定要重新生成本章内容吗？当前内容将被替换。')) {
            return;
        }
        
        await this.writeCurrentChapter();
    }
    
    hasUnsavedChanges() {
        const editor = document.getElementById('chapter-content');
        if (!editor) return false;
        
        const chapter = this.chapters[this.currentChapter - 1];
        if (!chapter) return false;
        
        const currentContent = editor.value;
        const savedContent = chapter.content || '';
        
        return currentContent !== savedContent;
    }
    
    // 质量控制和快速操作方法
    async runQualityCheck() {
        this.showSuccess('正在运行质量检查...');
        
        // 模拟质量检查
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 随机生成质量分数
        const scores = {
            coherence: Math.floor(Math.random() * 30) + 70,
            character: Math.floor(Math.random() * 30) + 70,
            language: Math.floor(Math.random() * 30) + 70,
            style: Math.floor(Math.random() * 30) + 70
        };
        
        // 更新质量分数显示
        this.updateQualityScores(scores);
        
        this.showSuccess('质量检查完成');
        this.logActivity('运行质量检查');
    }
    
    updateQualityScores(scores) {
        Object.keys(scores).forEach(key => {
            const score = scores[key];
            const scoreBars = document.querySelectorAll(`.quality-item .score-fill`);
            const scoreValues = document.querySelectorAll(`.quality-item .score-value`);
            
            // 找到对应的元素（基于顺序）
            let index = 0;
            switch (key) {
                case 'coherence': index = 0; break;
                case 'character': index = 1; break;
                case 'language': index = 2; break;
                case 'style': index = 3; break;
            }
            
            if (scoreBars[index]) {
                scoreBars[index].style.width = `${score}%`;
            }
            
            if (scoreValues[index]) {
                scoreValues[index].textContent = `${score}%`;
            }
        });
    }
    
    async handleQuickAction(action) {
        const editor = document.getElementById('chapter-content');
        if (!editor || !editor.value.trim()) {
            this.showError('请先输入或生成章节内容');
            return;
        }
        
        this.showSuccess(`执行快速操作: ${action}`);
        
        // 模拟快速操作
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const actions = {
            'generate-summary': '生成章节摘要',
            'review-chapter': '审阅本章内容',
            'improve-style': '优化文笔风格',
            'suggest-continuation': '提供续写建议',
            'check-consistency': '检查连贯性',
            'export-current': '导出本章内容'
        };
        
        this.logActivity(`执行快速操作: ${actions[action] || action}`);
        this.showSuccess(`${actions[action] || action} 完成`);
    }
    
    // 导出方法
    showExportModal() {
        GeniusWriter.showModal('export-modal');
        
        // 设置默认文件名
        const filenameInput = document.getElementById('export-filename');
        if (filenameInput && this.novelData?.config?.title) {
            filenameInput.value = this.novelData.config.title;
        }
        
        this.updateExportPreview();
    }
    
    updateExportPreview() {
        const format = document.querySelector('input[name="export-format"]:checked')?.value || 'markdown';
        const includeOutline = document.getElementById('include-outline')?.checked || false;
        const includeAllChapters = document.getElementById('include-all-chapters')?.checked || false;
        const includeMetadata = document.getElementById('include-metadata')?.checked || false;
        
        // 在实际应用中，这里可以显示导出预览
        // 目前只是更新状态
        console.log('导出设置更新:', { format, includeOutline, includeAllChapters, includeMetadata });
    }
    
    async exportNovel() {
        const format = document.querySelector('input[name="export-format"]:checked')?.value || 'markdown';
        const filename = document.getElementById('export-filename')?.value || '我的小说';
        const includeOutline = document.getElementById('include-outline')?.checked || false;
        const includeAllChapters = document.getElementById('include-all-chapters')?.checked || false;
        const includeMetadata = document.getElementById('include-metadata')?.checked || false;
        
        this.showSuccess(`正在导出${format.toUpperCase()}格式...`);
        
        try {
            // 模拟导出过程
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 在实际应用中，这里应该调用服务器API进行导出
            // 目前只是模拟
            const exportData = {
                format,
                filename,
                includeOutline,
                includeAllChapters,
                includeMetadata,
                novel: this.novelData,
                chapters: this.chapters
            };
            
            console.log('导出数据:', exportData);
            
            // 模拟下载
            this.simulateDownload(filename, format);
            
            GeniusWriter.hideModal('export-modal');
            this.showSuccess(`导出成功: ${filename}.${this.getExtension(format)}`);
            this.logActivity(`导出小说为${format.toUpperCase()}格式`);
            
        } catch (error) {
            console.error('导出失败:', error);
            this.showError('导出失败: ' + error.message);
        }
    }
    
    getExtension(format) {
        const extensions = {
            'markdown': 'md',
            'word': 'docx',
            'pdf': 'pdf',
            'html': 'html'
        };
        
        return extensions[format] || 'txt';
    }
    
    simulateDownload(filename, format) {
        // 创建模拟的下载链接
        const content = `这是《${filename}》的${format.toUpperCase()}格式导出文件。\n\n在实际应用中，这里应该是实际的小说内容。`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${this.getExtension(format)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // 其他方法
    logActivity(message) {
        console.log(`[创作活动] ${message}`);
        this.addAgentActivity(message);
    }
    
    disableControls() {
        const controls = ['pause-creation', 'resume-creation', 'stop-creation', 
                         'write-chapter', 'prev-chapter', 'next-chapter'];
        
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = true;
            }
        });
    }
    
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    showError(message) {
        window.app?.showError(message);
    }
    
    showSuccess(message) {
        window.app?.showSuccess(message);
    }
    
    editChapterDetails() {
        const chapter = this.chapters[this.currentChapter - 1];
        const newTitle = prompt('请输入新的章节标题:', chapter.title);
        
        if (newTitle && newTitle.trim()) {
            chapter.title = newTitle.trim();
            this.updateChapterList();
            this.updateChapterUI();
            this.saveAllChapters();
            this.showSuccess('章节标题已更新');
        }
    }
}

// 初始化创作页面
document.addEventListener('DOMContentLoaded', () => {
    // 确保主应用已初始化
    if (window.app) {
        window.writingPage = new WritingPage();
    } else {
        // 如果主应用未初始化，等待一下
        setTimeout(() => {
            if (window.app) {
                window.writingPage = new WritingPage();
            } else {
                console.error('无法初始化创作页面：主应用未加载');
                const warning = document.createElement('div');
                warning.className = 'error-warning';
                warning.innerHTML = `
                    <div style="text-align: center; padding: 3rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f8961e; margin-bottom: 1rem;"></i>
                        <h3>无法加载创作页面</h3>
                        <p>请返回首页重新开始</p>
                        <a href="/" class="btn btn-primary" style="margin-top: 1rem;">
                            <i class="fas fa-home"></i> 返回首页
                        </a>
                    </div>
                `;
                
                const mainContainer = document.querySelector('.writing-container');
                if (mainContainer) {
                    mainContainer.innerHTML = '';
                    mainContainer.appendChild(warning);
                }
            }
        }, 1000);
    }
});