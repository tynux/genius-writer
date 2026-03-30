/**
 * GeniusWriter 用户体验优化创作页面交互脚本
 * 处理三栏创作控制台交互：章节导航、编辑器、状态面板
 */

class WritingUX {
    constructor() {
        console.log('🔧 GeniusWriter WritingUX 构造函数调用');
        
        this.novelData = null;
        this.currentChapter = 1;
        this.chapters = [];
        this.creationStatus = 'idle'; // idle, planning, writing, paused, completed
        this.agentActivities = [];
        this.autoSaveInterval = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 GeniusWriter UX创作页面初始化开始');
        
        // 等待DOM完全加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        try {
            // 加载小说数据
            await this.loadNovelData();
            
            // 初始化事件监听器
            this.initEventListeners();
            
            // 初始化UI组件
            this.initUIComponents();
            
            // 开始自动保存
            this.startAutoSave();
            
            // 开始监控创作状态
            this.startStatusMonitoring();
            
            this.isInitialized = true;
            console.log('✅ 创作页面初始化完成');
            console.log('📊 小说数据:', this.novelData ? '已加载' : '未加载');
            console.log('📚 章节数量:', this.chapters.length);
            
        } catch (error) {
            console.error('❌ 创作页面初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }
    
    async loadNovelData() {
        console.log('📖 加载小说数据...');
        
        try {
            // 尝试从localStorage加载配置
            const savedConfig = localStorage.getItem('geniuswriter_config');
            if (savedConfig) {
                console.log('📝 找到本地保存的配置');
                const config = JSON.parse(savedConfig);
                
                this.novelData = {
                    config: config.novel || {},
                    model: config.model || {},
                    parameters: config.parameters || {},
                    workflows: config.workflows || {}
                };

                // 恢复由 config 页面在规划后写入的 novel_id
                const savedNovelId = localStorage.getItem('geniuswriter_novel_id');
                if (savedNovelId) {
                    this.novelData.id = savedNovelId;
                    console.log('📌 已恢复 novel_id:', savedNovelId);
                }
                
                console.log('📋 配置解析成功:', {
                    title: this.novelData.config.title,
                    chapters: this.novelData.config.chapters,
                    model: this.novelData.model.selected
                });
                
                // 加载章节数据
                await this.loadChapters();
                
                // 更新UI
                this.updateNovelInfo();
                this.updateChapterList();
                
                // 加载第一章内容
                if (this.chapters.length > 0) {
                    await this.loadChapterContent(1);
                }
                
                // 如果有大纲，开始自动创作
                if (this.shouldStartAutoCreation()) {
                    this.startAutoCreation();
                }
                
            } else {
                console.warn('⚠️ 未找到本地保存的配置');
                this.showNoNovelWarning();
            }
        } catch (error) {
            console.error('❌ 加载小说数据失败:', error);
            this.showError('加载小说数据失败，请返回配置页面重新开始');
        }
    }
    
    async loadChapters() {
        console.log('📚 加载章节数据...');
        
        // 从配置获取总章节数
        const totalChapters = this.novelData?.config?.chapters || 10;
        console.log(`📖 总章节数: ${totalChapters}`);
        
        // 初始化章节数组
        this.chapters = [];
        
        // 尝试从localStorage加载保存的章节
        const savedChapters = localStorage.getItem('geniuswriter_chapters');
        if (savedChapters) {
            try {
                console.log('📝 找到本地保存的章节数据');
                const parsed = JSON.parse(savedChapters);
                this.chapters = parsed;
                console.log(`📚 已加载 ${this.chapters.length} 个章节`);
            } catch (error) {
                console.warn('⚠️ 加载保存的章节失败，使用默认章节:', error);
                this.createDefaultChapters(totalChapters);
            }
        } else {
            // 创建默认章节
            this.createDefaultChapters(totalChapters);
        }
        
        // 保存章节到localStorage（用于后续使用）
        this.saveChaptersToLocalStorage();
    }
    
    createDefaultChapters(totalChapters) {
        console.log(`📝 创建 ${totalChapters} 个默认章节`);
        
        for (let i = 1; i <= totalChapters; i++) {
            this.chapters.push({
                id: i,
                number: i,
                title: `第${i}章`,
                status: i === 1 ? 'pending' : 'planned', // planned, writing, completed, reviewed
                wordCount: 0,
                content: '',
                outline: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // 如果有小说标题，更新章节标题
        if (this.novelData?.config?.title) {
            this.updateChapterTitles();
        }
    }
    
    updateChapterTitles() {
        const title = this.novelData.config.title;
        const genre = this.novelData.config.genre || '都市';
        
        // 简单的章节标题生成逻辑
        this.chapters.forEach((chapter, index) => {
            if (!chapter.title || chapter.title === `第${chapter.number}章`) {
                // 根据章节位置生成有意义的标题
                if (index === 0) {
                    chapter.title = '开端';
                } else if (index === 1) {
                    chapter.title = '发展';
                } else if (index === this.chapters.length - 1) {
                    chapter.title = '结局';
                } else if (index === this.chapters.length - 2) {
                    chapter.title = '高潮';
                } else {
                    // 随机生成一些有意义的标题
                    const prefixes = ['转折', '意外', '重逢', '危机', '机遇', '成长', '挑战'];
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    chapter.title = `${prefix}时刻`;
                }
            }
        });
    }
    
    async loadChapterContent(chapterNumber) {
        console.log(`📄 加载第 ${chapterNumber} 章内容...`);
        
        const chapter = this.chapters.find(c => c.number === chapterNumber);
        if (!chapter) {
            console.warn(`⚠️ 第 ${chapterNumber} 章不存在`);
            return;
        }
        
        // 更新当前章节
        this.currentChapter = chapterNumber;
        
        // 更新章节选择状态
        this.updateChapterSelection();
        
        // 加载章节内容
        await this.displayChapterContent(chapter);
        
        // 更新编辑器状态
        this.updateEditorStatus();
        
        console.log(`✅ 第 ${chapterNumber} 章内容加载完成`);
    }
    
    async displayChapterContent(chapter) {
        // 更新编辑器内容
        const editor = document.getElementById('chapter-editor');
        if (editor) {
            if (chapter.content) {
                editor.value = chapter.content;
            } else {
                // 显示占位符
                editor.value = `# ${chapter.title}\n\n本章内容待创作...\n\n请点击"开始创作"按钮或输入内容开始写作。`;
            }
        }
        
        // 更新章节信息
        this.updateChapterInfo(chapter);
    }
    
    updateChapterSelection() {
        // 更新章节列表中的选中状态
        document.querySelectorAll('.chapter-item').forEach(item => {
            const chapterNumber = parseInt(item.dataset.chapter);
            if (chapterNumber === this.currentChapter) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // 更新当前章节显示
        const currentChapterEl = document.getElementById('current-chapter-number');
        if (currentChapterEl) {
            currentChapterEl.textContent = this.currentChapter;
        }
        
        const currentChapterTitleEl = document.getElementById('current-chapter-title');
        if (currentChapterTitleEl) {
            const chapter = this.chapters.find(c => c.number === this.currentChapter);
            currentChapterTitleEl.textContent = chapter?.title || `第${this.currentChapter}章`;
        }
    }
    
    updateChapterInfo(chapter) {
        // 更新字数统计
        const wordCountEl = document.getElementById('word-count');
        if (wordCountEl) {
            const content = chapter.content || '';
            const wordCount = this.countWords(content);
            wordCountEl.textContent = wordCount;
            
            // 更新章节对象中的字数
            chapter.wordCount = wordCount;
        }
        
        // 更新状态显示
        const statusEl = document.getElementById('chapter-status');
        if (statusEl) {
            const statusText = {
                'planned': '待创作',
                'writing': '创作中',
                'completed': '已完成',
                'reviewed': '已审阅'
            }[chapter.status] || '未知';
            statusEl.textContent = statusText;
        }
    }
    
    updateNovelInfo() {
        const novelTitleEl = document.getElementById('novel-title-display');
        if (novelTitleEl && this.novelData?.config?.title) {
            novelTitleEl.textContent = this.novelData.config.title;
        }
        
        const novelGenreEl = document.getElementById('novel-genre-display');
        if (novelGenreEl && this.novelData?.config?.genre) {
            novelGenreEl.textContent = this.novelData.config.genre;
        }
        
        const totalChaptersEl = document.getElementById('total-chapters');
        if (totalChaptersEl && this.novelData?.config?.chapters) {
            totalChaptersEl.textContent = this.novelData.config.chapters;
        }
        
        const modelEl = document.getElementById('selected-model-display');
        if (modelEl && this.novelData?.model?.selected) {
            const modelNames = {
                'openai': 'OpenAI',
                'deepseek': 'DeepSeek',
                'simulated': '模拟模式'
            };
            modelEl.textContent = modelNames[this.novelData.model.selected] || '未知';
        }
    }
    
    updateChapterList() {
        const chapterListEl = document.getElementById('chapter-list');
        if (!chapterListEl) return;
        
        console.log(`🔄 更新章节列表，共 ${this.chapters.length} 章`);
        
        // 清空现有列表
        chapterListEl.innerHTML = '';
        
        // 创建章节项
        this.chapters.forEach(chapter => {
            const chapterItem = document.createElement('div');
            chapterItem.className = 'chapter-item';
            chapterItem.dataset.chapter = chapter.number;
            
            const statusClass = {
                'planned': 'status-planned',
                'writing': 'status-writing',
                'completed': 'status-completed',
                'reviewed': 'status-reviewed'
            }[chapter.status] || 'status-planned';
            
            chapterItem.innerHTML = `
                <div class="chapter-info">
                    <div class="chapter-number">第${chapter.number}章</div>
                    <div class="chapter-title">${chapter.title}</div>
                </div>
                <div class="chapter-status ${statusClass}"></div>
            `;
            
            // 点击事件
            chapterItem.addEventListener('click', () => {
                this.loadChapterContent(chapter.number);
            });
            
            chapterListEl.appendChild(chapterItem);
        });
        
        // 更新进度统计
        this.updateProgressStats();
    }
    
    updateProgressStats() {
        const totalChapters = this.chapters.length;
        const completedChapters = this.chapters.filter(c => c.status === 'completed' || c.status === 'reviewed').length;
        const progressPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
        
        const progressPercentEl = document.getElementById('progress-percent');
        if (progressPercentEl) {
            progressPercentEl.textContent = `${progressPercent}%`;
        }
        
        const completedCountEl = document.getElementById('completed-chapters');
        if (completedCountEl) {
            completedCountEl.textContent = completedChapters;
        }
        
        const totalCountEl = document.getElementById('total-chapters-count');
        if (totalCountEl) {
            totalCountEl.textContent = totalChapters;
        }
        
        // 更新进度条
        this.updateProgressBar(progressPercent);
    }
    
    updateProgressBar(percent) {
        const progressBarEl = document.getElementById('progress-bar-fill');
        if (progressBarEl) {
            progressBarEl.style.width = `${percent}%`;
        }
    }
    
    initEventListeners() {
        console.log('🔗 初始化事件监听器...');
        
        // 编辑器输入事件
        const editor = document.getElementById('chapter-editor');
        if (editor) {
            editor.addEventListener('input', (e) => {
                this.onEditorInput(e.target.value);
            });
        }
        
        // 保存按钮
        const saveBtn = document.getElementById('save-chapter');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentChapter();
            });
        }
        
        // 开始创作按钮
        const startBtn = document.getElementById('start-creation');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startChapterCreation();
            });
        }
        
        // 前一章按钮
        const prevBtn = document.getElementById('prev-chapter');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.navigateToChapter(this.currentChapter - 1);
            });
        }
        
        // 后一章按钮
        const nextBtn = document.getElementById('next-chapter');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.navigateToChapter(this.currentChapter + 1);
            });
        }
        
        // 生成大纲按钮
        const outlineBtn = document.getElementById('generate-outline');
        if (outlineBtn) {
            outlineBtn.addEventListener('click', () => {
                this.generateNovelOutline();
            });
        }
        
        console.log('✅ 事件监听器初始化完成');
    }
    
    initUIComponents() {
        console.log('🎨 初始化UI组件...');
        
        // 初始化字数统计
        this.updateWordCount();
        
        // 初始化自动保存状态
        this.updateAutoSaveStatus();
        
        // 初始化模型状态
        this.updateModelStatus();
        
        console.log('✅ UI组件初始化完成');
    }
    
    onEditorInput(content) {
        // 更新当前章节内容
        const chapter = this.chapters.find(c => c.number === this.currentChapter);
        if (chapter) {
            chapter.content = content;
            chapter.updatedAt = new Date().toISOString();
            
            // 更新字数
            this.updateWordCount();
            
            // 更新章节状态（如果内容非空，标记为写作中）
            if (content.trim().length > 100 && chapter.status === 'planned') {
                chapter.status = 'writing';
                this.updateChapterList();
            }
        }
    }
    
    updateWordCount() {
        const chapter = this.chapters.find(c => c.number === this.currentChapter);
        if (!chapter) return;
        
        const content = chapter.content || '';
        const wordCount = this.countWords(content);
        const charCount = content.length;
        
        const wordCountEl = document.getElementById('word-count');
        if (wordCountEl) {
            wordCountEl.textContent = wordCount;
        }
        
        const charCountEl = document.getElementById('char-count');
        if (charCountEl) {
            charCountEl.textContent = charCount;
        }
        
        // 更新章节对象
        chapter.wordCount = wordCount;
    }
    
    countWords(text) {
        if (!text || text.trim().length === 0) return 0;
        
        // 简单的中文字数统计（中文字符+标点）
        const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
        const chinesePunctuation = text.match(/[\u3000-\u303f\uff00-\uffef]/g) || [];
        
        // 英文单词统计
        const englishWords = text.match(/\b[a-zA-Z]+\b/g) || [];
        
        return chineseChars.length + chinesePunctuation.length + englishWords.length;
    }
    
    async saveCurrentChapter() {
        const chapter = this.chapters.find(c => c.number === this.currentChapter);
        if (!chapter) return;
        
        console.log(`💾 保存第 ${this.currentChapter} 章...`);
        
        try {
            // 更新状态
            chapter.status = 'completed';
            chapter.updatedAt = new Date().toISOString();
            
            // 保存到localStorage
            this.saveChaptersToLocalStorage();
            
            // 更新UI
            this.updateChapterList();
            this.updateChapterInfo(chapter);
            
            // 显示成功消息
            this.showSuccess(`第${this.currentChapter}章保存成功！`);
            
            // 自动跳转到下一章（如果存在）
            if (this.currentChapter < this.chapters.length) {
                setTimeout(() => {
                    this.navigateToChapter(this.currentChapter + 1);
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ 保存章节失败:', error);
            this.showError('保存失败: ' + error.message);
        }
    }
    
    saveChaptersToLocalStorage() {
        try {
            localStorage.setItem('geniuswriter_chapters', JSON.stringify(this.chapters));
            console.log('💾 章节数据已保存到本地存储');
        } catch (error) {
            console.error('❌ 保存章节到本地存储失败:', error);
        }
    }
    
    async startChapterCreation() {
        const chapter = this.chapters.find(c => c.number === this.currentChapter);
        if (!chapter) return;
        
        console.log(`🚀 开始创作第 ${this.currentChapter} 章...`);
        
        // 更新状态
        chapter.status = 'writing';
        this.creationStatus = 'writing';
        
        // 更新UI
        this.updateChapterList();
        this.updateCreationStatus();
        
        // 显示创作面板
        this.showCreationPanel();
        
        // 如果是模拟模式，生成示例内容
        if (this.novelData?.model?.selected === 'simulated') {
            await this.generateSimulatedChapter();
        } else {
            // 显示API配置提示
            this.showApiConfigPrompt();
        }
    }
    
    async generateSimulatedChapter() {
        console.log('🎭 生成模拟章节内容...');
        
        const chapter = this.chapters.find(c => c.number === this.currentChapter);
        if (!chapter) return;
        
        // 模拟生成内容
        const novelTitle = this.novelData?.config?.title || '未命名小说';
        const genre = this.novelData?.config?.genre || '都市';
        
        const simulatedContent = `# ${chapter.title}

这是《${novelTitle}》的第${chapter.number}章，类型为${genre}小说。

清晨的阳光透过窗帘的缝隙洒进房间，主人公从睡梦中醒来。新的一天开始了，充满了无限可能。

"今天会是个好日子，"主人公自言自语道，声音在安静的房间里回荡。

窗外，城市已经开始苏醒。远处传来汽车的喇叭声，近处是邻居晨练的脚步声。生活就像这清晨的阳光，温暖而充满希望。

（本章内容为模拟生成，实际创作时将由AI模型生成高质量内容。）

本章约800字，包含了场景描写、人物心理和情节铺垫。`;

        // 更新编辑器内容
        const editor = document.getElementById('chapter-editor');
        if (editor) {
            editor.value = simulatedContent;
        }
        
        // 更新章节数据
        chapter.content = simulatedContent;
        chapter.status = 'completed';
        chapter.updatedAt = new Date().toISOString();
        
        // 更新UI
        this.updateWordCount();
        this.updateChapterList();
        
        // 显示成功消息
        this.showSuccess(`第${chapter.number}章模拟生成完成！`);
        
        console.log('✅ 模拟章节生成完成');
    }
    
    showApiConfigPrompt() {
        // 显示API配置提示
        const alertHtml = `
            <div class="api-config-alert">
                <h3>需要API配置</h3>
                <p>要使用AI创作功能，请确保已在配置页面设置有效的API密钥。</p>
                <div class="alert-buttons">
                    <a href="/config" class="btn btn-primary">前往配置</a>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.style.display='none'">稍后设置</button>
                </div>
            </div>
        `;
        
        // 将提示添加到页面
        const container = document.querySelector('.editor-container') || document.body;
        const alertEl = document.createElement('div');
        alertEl.innerHTML = alertHtml;
        container.appendChild(alertEl.firstElementChild);
    }
    
    navigateToChapter(chapterNumber) {
        if (chapterNumber < 1 || chapterNumber > this.chapters.length) {
            console.warn(`⚠️ 章节 ${chapterNumber} 超出范围`);
            return;
        }
        
        console.log(`🔀 导航到第 ${chapterNumber} 章`);
        this.loadChapterContent(chapterNumber);
    }
    
    shouldStartAutoCreation() {
        // 检查是否应该开始自动创作
        const hasOutline = localStorage.getItem('geniuswriter_outline');
        const autoStart = this.novelData?.workflows?.autoStart || false;
        
        return hasOutline && autoStart && this.creationStatus === 'idle';
    }
    
    startAutoCreation() {
        console.log('🤖 开始自动创作流程...');
        
        this.creationStatus = 'planning';
        this.updateCreationStatus();
        
        // 模拟自动创作流程
        setTimeout(() => {
            this.generateNextChapter();
        }, 2000);
    }
    
    async generateNextChapter() {
        // 找到第一个待创作的章节
        const nextChapter = this.chapters.find(c => c.status === 'planned');
        if (!nextChapter) {
            console.log('✅ 所有章节已完成创作');
            this.creationStatus = 'completed';
            this.updateCreationStatus();
            return;
        }
        
        console.log(`🤖 自动创作第 ${nextChapter.number} 章...`);
        
        // 加载该章节
        await this.loadChapterContent(nextChapter.number);
        
        // 开始创作
        await this.startChapterCreation();
        
        // 如果是模拟模式，自动完成
        if (this.novelData?.model?.selected === 'simulated') {
            setTimeout(() => {
                this.saveCurrentChapter();
                this.generateNextChapter();
            }, 3000);
        }
    }
    
    updateCreationStatus() {
        const statusEl = document.getElementById('creation-status');
        if (statusEl) {
            const statusText = {
                'idle': '待开始',
                'planning': '规划中',
                'writing': '创作中',
                'paused': '已暂停',
                'completed': '已完成'
            }[this.creationStatus] || '未知';
            statusEl.textContent = statusText;
        }
        
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator ' + this.creationStatus;
        }
    }
    
    updateEditorStatus() {
        const editor = document.getElementById('chapter-editor');
        if (!editor) return;
        
        const chapter = this.chapters.find(c => c.number === this.currentChapter);
        if (!chapter) return;
        
        // 根据章节状态启用/禁用编辑器
        if (chapter.status === 'completed' || chapter.status === 'reviewed') {
            editor.readOnly = true;
            editor.classList.add('readonly');
        } else {
            editor.readOnly = false;
            editor.classList.remove('readonly');
        }
    }
    
    updateModelStatus() {
        const modelEl = document.getElementById('model-status');
        if (!modelEl) return;
        
        const model = this.novelData?.model?.selected || '未选择';
        const modelNames = {
            'openai': 'OpenAI GPT',
            'deepseek': 'DeepSeek',
            'simulated': '模拟模式'
        };
        
        modelEl.textContent = modelNames[model] || model;
        
        // 更新状态颜色
        const statusColor = model === 'simulated' ? 'var(--color-warning)' : 'var(--color-success)';
        modelEl.style.color = statusColor;
    }
    
    updateAutoSaveStatus() {
        const autoSaveEl = document.getElementById('auto-save-status');
        if (autoSaveEl) {
            autoSaveEl.textContent = '已启用';
            autoSaveEl.style.color = 'var(--color-success)';
        }
    }
    
    startAutoSave() {
        // 每30秒自动保存
        this.autoSaveInterval = setInterval(() => {
            this.saveChaptersToLocalStorage();
        }, 30000);
        
        console.log('💾 自动保存已启用（每30秒）');
    }
    
    startStatusMonitoring() {
        // 每10秒更新一次状态
        setInterval(() => {
            this.updateProgressStats();
            this.updateCreationStatus();
        }, 10000);
    }
    
    showNoNovelWarning() {
        const mainContent = document.querySelector('.writing-console') || document.body;
        
        const warningHtml = `
            <div class="no-novel-warning" style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 4rem;
                background: var(--color-white);
                border-radius: 1rem;
                border: 2px dashed var(--color-gray-300);
            ">
                <div class="warning-icon" style="font-size: 4rem; color: var(--color-gray-400); margin-bottom: 1.5rem;">
                    <i class="fas fa-book-open"></i>
                </div>
                <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; color: var(--color-gray-800);">
                    未找到小说项目
                </h3>
                <p style="color: var(--color-gray-600); margin-bottom: 2rem; max-width: 400px; margin-left: auto; margin-right: auto;">
                    请先配置小说并开始创作。您需要设置小说标题、选择模型并生成大纲。
                </p>
                <a href="/config" class="btn btn-primary" style="padding: 0.75rem 2rem; font-size: 1rem;">
                    前往配置页面
                </a>
            </div>
        `;
        
        mainContent.innerHTML = warningHtml;
    }
    
    showCreationPanel() {
        // 显示创作控制面板
        const creationPanel = document.getElementById('creation-panel');
        if (creationPanel) {
            creationPanel.style.display = 'block';
        }
    }
    
    async generateNovelOutline() {
        console.log('📋 生成小说大纲...');
        
        // 显示生成中状态
        this.showLoading('正在生成小说大纲...');
        
        try {
            // 模拟生成大纲
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const outline = {
                title: this.novelData.config.title,
                genre: this.novelData.config.genre,
                chapters: this.chapters.map(chapter => ({
                    number: chapter.number,
                    title: chapter.title,
                    summary: `第${chapter.number}章简要内容...`
                })),
                characters: [
                    { name: '主人公', role: '主角', description: '勇敢善良的年轻人' },
                    { name: '女主角', role: '主要角色', description: '聪明独立的女性' },
                    { name: '导师', role: '辅助角色', description: '经验丰富的长者' }
                ],
                themes: ['成长', '友情', '冒险'],
                generatedAt: new Date().toISOString()
            };
            
            // 保存大纲
            localStorage.setItem('geniuswriter_outline', JSON.stringify(outline));
            
            // 更新章节标题（基于大纲）
            this.chapters.forEach((chapter, index) => {
                if (outline.chapters[index]) {
                    chapter.title = outline.chapters[index].title;
                    chapter.outline = outline.chapters[index].summary;
                }
            });
            
            // 更新UI
            this.updateChapterList();
            this.saveChaptersToLocalStorage();
            
            // 显示成功消息
            this.showSuccess('小说大纲生成成功！');
            
            // 开始自动创作（如果启用）
            if (this.novelData?.workflows?.autoStart) {
                this.startAutoCreation();
            }
            
        } catch (error) {
            console.error('❌ 生成大纲失败:', error);
            this.showError('生成大纲失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    showLoading(message) {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-overlay';
        loadingEl.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        
        document.body.appendChild(loadingEl);
        this.currentLoadingEl = loadingEl;
    }
    
    hideLoading() {
        if (this.currentLoadingEl && this.currentLoadingEl.parentNode) {
            this.currentLoadingEl.parentNode.removeChild(this.currentLoadingEl);
            this.currentLoadingEl = null;
        }
    }
    
    showError(message) {
        // 简单的错误提示
        alert(`错误: ${message}`);
    }
    
    showSuccess(message) {
        // 简单的成功提示
        alert(`成功: ${message}`);
    }
}

// 初始化创作页面
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM内容加载完成，初始化创作页面...');
    
    // 确保页面完全加载
    setTimeout(() => {
        window.writingUX = new WritingUX();
    }, 100);
});