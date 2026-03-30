/**
 * GeniusWriter 新版UI交互脚本
 * 支持新版用户界面和功能
 */

// 全局状态管理
const GeniusWriter = {
    // 应用状态
    state: {
        currentPage: 'dashboard',
        currentNovel: null,
        currentChapterId: null,
        novels: [],
        agents: [],
        settings: {}
    },

    // 初始化应用
    async init() {
        console.log('🚀 GeniusWriter 新版UI初始化开始');
        console.log(`📊 当前URL: ${window.location.href}`);
        console.log(`🔧 GeniusWriter对象状态: ${this ? '已创建' : '未创建'}`);

        try {
            // 加载保存的状态
            await this.loadSavedState();

            // 初始化事件监听器
            this.initEventListeners();

            // 初始化页面
            this.initPage();

            console.log('✅ GeniusWriter 新版UI初始化完成');
            console.log(`📚 当前小说: ${this.state.currentNovel ? this.state.currentNovel.title : '无'}`);
            console.log(`📖 小说列表: ${this.state.novels.length} 部`);
        } catch (error) {
            console.error('❌ GeniusWriter 初始化失败:', error);
            console.error('🔍 错误详情:', error.stack);
            this.showError('应用初始化失败，请刷新页面重试');
        }
    },

    // 加载保存的状态
    async loadSavedState() {
        try {
            // 加载当前小说
            const savedNovel = localStorage.getItem('geniuswriter_current_novel');
            if (savedNovel) {
                this.state.currentNovel = JSON.parse(savedNovel);
                console.log('📖 加载保存的小说:', this.state.currentNovel.title);
            }

            // 加载小说列表
            const savedNovels = localStorage.getItem('geniuswriter_novels');
            if (savedNovels) {
                this.state.novels = JSON.parse(savedNovels);
                console.log('📚 加载小说列表:', this.state.novels.length, '部');
            }

            // 加载设置
            const savedSettings = localStorage.getItem('geniuswriter_settings');
            if (savedSettings) {
                this.state.settings = JSON.parse(savedSettings);
            }
        } catch (error) {
            console.warn('⚠️ 加载保存状态失败:', error);
            // 使用默认状态继续
        }
    },

    // 初始化事件监听器
    initEventListeners() {
        // 导航点击事件
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // 主要按钮事件
        const primaryBtn = document.getElementById('tb-primary-btn');
        if (primaryBtn) {
            primaryBtn.addEventListener('click', () => {
                this.handlePrimaryAction();
            });
        }

        // 帮助按钮事件
        const helpBtn = document.getElementById('tb-help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showHelp();
            });
        }
    },

    // 初始化页面
    initPage() {
        // 检查URL中的页面参数
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');

        if (pageParam && ['dashboard', 'new-novel', 'writing', 'agents', 'settings'].includes(pageParam)) {
            this.navigateTo(pageParam);
        } else {
            this.navigateTo('dashboard');
        }
    },

    // 导航到指定页面
    navigateTo(pageId) {
        console.log(`📍 导航到页面: ${pageId}`);

        // 更新状态
        this.state.currentPage = pageId;

        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            }
        });

        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = document.getElementById('page-' + pageId);
        if (targetPage) {
            targetPage.classList.add('active');

            // 动态加载页面内容（如果需要）
            this.loadPageContent(pageId);

            // 更新标题栏
            this.updateTopbar(pageId);

            // 更新URL（不刷新页面）
            window.history.pushState({ page: pageId }, '', `/new?page=${pageId}`);
        }
    },

    // 动态加载页面内容
    loadPageContent(pageId) {
        const pageElement = document.getElementById('page-' + pageId);

        // 如果页面已有内容，不再加载
        if (pageElement.innerHTML.trim() && !pageElement.innerHTML.includes('正在开发中...')) {
            return;
        }

        // 根据页面ID加载内容
        switch(pageId) {
            case 'dashboard':
                this.loadDashboardContent();
                break;
            case 'new-novel':
                this.loadNewNovelContent();
                break;
            case 'writing':
                this.loadWritingContent();
                break;
            case 'agents':
                this.loadAgentsContent();
                break;
            case 'settings':
                this.loadSettingsContent();
                break;
        }
    },

    // 加载Dashboard内容
    loadDashboardContent() {
        // 更新统计数据
        this.updateDashboardStats();
    },

    // 更新Dashboard统计数据
    updateDashboardStats() {
        // 活跃项目数
        const activeProjects = this.state.novels.filter(novel =>
            novel.status === 'writing' || novel.status === 'planning'
        ).length;
        document.getElementById('active-projects').textContent = activeProjects;

        // 总字数
        const totalWords = this.state.novels.reduce((sum, novel) => {
            return sum + (novel.wordCount || 0);
        }, 0);
        document.getElementById('total-words').textContent = totalWords.toLocaleString();

        // 完成章节数
        const completedChapters = this.state.novels.reduce((sum, novel) => {
            return sum + (novel.completedChapters || 0);
        }, 0);
        document.getElementById('completed-chapters').textContent = completedChapters;

        // AI调用次数（模拟）
        const aiCalls = Math.floor(Math.random() * 500) + 100;
        document.getElementById('ai-calls').textContent = aiCalls.toLocaleString();

        // 更新最近项目
        this.updateRecentProjects();

        // 更新继续创作按钮状态
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            if (this.state.currentNovel) {
                continueBtn.disabled = false;
                continueBtn.textContent = '继续创作';
            } else {
                continueBtn.disabled = true;
                continueBtn.textContent = '暂无项目';
            }
        }
    },

    // 更新最近项目列表
    updateRecentProjects() {
        const container = document.getElementById('recent-projects');
        if (!container) return;

        const recentNovels = this.state.novels
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);

        if (recentNovels.length === 0) {
            return; // 使用模板中的默认内容
        }

        const projectsHtml = recentNovels.map(novel => `
            <div style="padding: 20px; border-bottom: 1px solid var(--paper-border); display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${novel.title || '未命名小说'}</div>
                    <div style="font-size: 14px; color: var(--ink-soft); margin-bottom: 8px;">
                        ${this.getGenreName(novel.genre)} · ${novel.wordCount || 0}字 · ${this.getStatusText(novel.status)}
                    </div>
                    <div style="font-size: 12px; color: var(--ink-ghost);">
                        最后更新: ${this.formatDate(novel.updatedAt || novel.createdAt)}
                    </div>
                </div>
                <div>
                    <button class="card-btn" onclick="GeniusWriter.openNovel('${novel.id}')">
                        打开
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = projectsHtml;
    },

    // 获取类型名称
    getGenreName(genreId) {
        const genres = {
            'xianxia': '仙侠',
            'wuxia': '武侠',
            'urban': '都市',
            'history': '历史',
            'fantasy': '奇幻',
            'scifi': '科幻',
            'suspense': '悬疑',
            'romance': '言情'
        };
        return genres[genreId] || genreId;
    },

    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            'planning': '规划中',
            'writing': '创作中',
            'completed': '已完成',
            'paused': '已暂停'
        };
        return statusMap[status] || status;
    },

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '未知';
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;

        return date.toLocaleDateString('zh-CN');
    },

    // 打开小说
    openNovel(novelId) {
        const novel = this.state.novels.find(n => n.id === novelId);
        if (novel) {
            this.state.currentNovel = novel;
            localStorage.setItem('geniuswriter_current_novel', JSON.stringify(novel));
            this.navigateTo('writing');
        }
    },

    // 加载新建小说页面内容
    loadNewNovelContent() {
        // 页面内容已由模板提供，只需初始化
        this.initNewNovelWizard();
    },

    // 初始化新建小说向导
    initNewNovelWizard() {
        // 初始化类型选择
        this.initGenreSelection();

        // 绑定步骤按钮事件
        document.querySelectorAll('[onclick^="nextStep"]').forEach(btn => {
            const oldOnClick = btn.getAttribute('onclick');
            btn.removeAttribute('onclick');
            btn.addEventListener('click', () => {
                const step = parseInt(oldOnClick.match(/nextStep\((\d+)\)/)[1]);
                this.nextWizardStep(step);
            });
        });

        document.querySelectorAll('[onclick^="prevStep"]').forEach(btn => {
            const oldOnClick = btn.getAttribute('onclick');
            btn.removeAttribute('onclick');
            btn.addEventListener('click', () => {
                const step = parseInt(oldOnClick.match(/prevStep\((\d+)\)/)[1]);
                this.prevWizardStep(step);
            });
        });

        // 绑定开始创作按钮
        const startBtn = document.querySelector('[onclick="startWriting()"]');
        if (startBtn) {
            startBtn.removeAttribute('onclick');
            startBtn.addEventListener('click', () => this.startNewNovel());
        }
    },

    // 初始化类型选择
    initGenreSelection() {
        const genres = [
            { id: 'xianxia', name: '仙侠', desc: '修仙问道，飞升成仙', icon: '🧙' },
            { id: 'wuxia', name: '武侠', desc: '江湖恩怨，武功绝学', icon: '⚔️' },
            { id: 'urban', name: '都市', desc: '现代生活，职场情感', icon: '🏙️' },
            { id: 'history', name: '历史', desc: '历史事件，朝代更迭', icon: '📜' },
            { id: 'fantasy', name: '奇幻', desc: '魔法异界，幻想世界', icon: '🐉' },
            { id: 'scifi', name: '科幻', desc: '未来科技，星际探索', icon: '🚀' },
            { id: 'suspense', name: '悬疑', desc: '推理破案，谜团重重', icon: '🔍' },
            { id: 'romance', name: '言情', desc: '爱情故事，情感纠葛', icon: '❤️' }
        ];

        const container = document.getElementById('genre-selection');
        if (!container) return;

        container.innerHTML = genres.map(genre => `
            <div class="genre-card" data-genre="${genre.id}">
                <div class="genre-icon">${genre.icon}</div>
                <div class="genre-name">${genre.name}</div>
                <div class="genre-desc">${genre.desc}</div>
            </div>
        `).join('');

        // 绑定点击事件
        container.querySelectorAll('.genre-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.genre-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    },

    // 下一步向导步骤
    nextWizardStep(currentStep) {
        // 验证当前步骤
        if (currentStep === 1) {
            const titleInput = document.getElementById('novel-title');
            if (!titleInput || !titleInput.value.trim()) {
                this.showError('请输入小说名称');
                return;
            }

            const selectedGenre = document.querySelector('.genre-card.selected');
            if (!selectedGenre) {
                this.showError('请选择小说类型');
                return;
            }
        }

        // 更新步骤UI
        this.updateWizardSteps(currentStep + 1);
    },

    // 上一步向导步骤
    prevWizardStep(currentStep) {
        this.updateWizardSteps(currentStep - 1);
    },

    // 更新向导步骤
    updateWizardSteps(targetStep) {
        for (let i = 1; i <= 5; i++) {
            const stepEl = document.getElementById('step-' + i);
            const circleEl = document.getElementById('sc-' + i);
            const panelEl = document.getElementById('panel-' + i);

            if (!stepEl || !circleEl || !panelEl) continue;

            stepEl.classList.remove('active', 'done');
            panelEl.classList.remove('active');

            if (i < targetStep) {
                stepEl.classList.add('done');
                circleEl.innerHTML = '✓';
            } else if (i === targetStep) {
                stepEl.classList.add('active');
                circleEl.innerHTML = i;
                panelEl.classList.add('active');
            } else {
                circleEl.innerHTML = i;
            }
        }

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // 开始新小说
    async startNewNovel() {
        try {
            // 收集表单数据
            const titleInput = document.getElementById('novel-title');
            const descriptionInput = document.getElementById('novel-description');
            const selectedGenre = document.querySelector('.genre-card.selected');

            if (!titleInput || !titleInput.value.trim()) {
                this.showError('请输入小说名称');
                return;
            }

            if (!selectedGenre) {
                this.showError('请选择小说类型');
                return;
            }

            // 创建新小说对象
            const novelId = 'novel_' + Date.now();
            const newNovel = {
                id: novelId,
                title: titleInput.value.trim(),
                genre: selectedGenre.dataset.genre,
                description: descriptionInput ? descriptionInput.value.trim() : '',
                status: 'planning',
                wordCount: 0,
                completedChapters: 0,
                totalChapters: 10,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // 保存到状态
            this.state.currentNovel = newNovel;

            // 添加到小说列表
            this.state.novels.unshift(newNovel);

            // 保存到localStorage
            localStorage.setItem('geniuswriter_current_novel', JSON.stringify(newNovel));
            localStorage.setItem('geniuswriter_novels', JSON.stringify(this.state.novels));

            // 显示成功消息
            this.showSuccess(`小说"${newNovel.title}"创建成功！`);

            // 导航到创作页面
            setTimeout(() => {
                this.navigateTo('writing');
            }, 1000);

        } catch (error) {
            console.error('❌ 创建小说失败:', error);
            this.showError('创建小说失败: ' + error.message);
        }
    },

    // 加载创作页面内容
    loadWritingContent() {
        const pageElement = document.getElementById('page-writing');

        // 检查是否有当前小说
        if (!this.state.currentNovel) {
            pageElement.innerHTML = `
                <div style="text-align: center; padding: 80px 20px;">
                    <div style="font-size: 64px; margin-bottom: 24px;">📚</div>
                    <div style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: var(--ink);">
                        还没有开始创作的小说
                    </div>
                    <div style="font-size: 16px; color: var(--ink-soft); margin-bottom: 40px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        开始创作你的第一部小说，体验AI助手的创作魔力。
                    </div>
                    <button class="tb-btn tb-btn-primary" style="padding: 16px 40px; font-size: 16px;" onclick="GeniusWriter.navigateTo('new-novel')">
                        创建第一部小说
                    </button>
                </div>
            `;
            return;
        }

        // 加载创作页面内容
        pageElement.innerHTML = `
            <div class="writing-container">
                <!-- 章节侧边栏 -->
                <div class="chapter-sidebar">
                    <div class="section-title">章节列表</div>
                    <div id="chapter-list">
                        <div style="text-align: center; padding: 40px 20px; color: var(--ink-soft);">
                            <div style="font-size: 32px; margin-bottom: 16px;">📝</div>
                            <div>暂无章节</div>
                            <button class="card-btn mt-4" onclick="GeniusWriter.addNewChapter()">添加第一章</button>
                        </div>
                    </div>
                </div>

                <!-- 编辑器区域 -->
                <div class="editor-area">
                    <div class="editor-header">
                        <div class="editor-title" id="current-chapter-title">选择章节开始创作</div>
                        <div class="editor-sub">
                            <span id="current-chapter-status">状态：未开始</span>
                            <span id="current-chapter-words">0 字</span>
                        </div>
                    </div>

                    <div class="editor-content">
                        <textarea class="editor-textarea" id="chapter-content" placeholder="开始你的创作..."></textarea>
                    </div>

                    <div class="editor-footer">
                        <div class="word-count">
                            <span id="word-count">0</span> 字 ·
                            <span id="char-count">0</span> 字符
                        </div>
                        <div class="editor-actions">
                            <button class="editor-btn editor-btn-secondary" id="save-chapter-btn">保存草稿</button>
                            <button class="editor-btn editor-btn-primary" id="generate-chapter-btn">AI生成</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- AI助手 -->
            <div class="ai-assistant mt-8">
                <div class="ai-header">AI创作助手</div>
                <div class="ai-messages" id="ai-messages">
                    <div class="ai-msg ai-msg-assistant">
                        你好！我是你的AI创作助手。我可以帮你生成章节内容、优化文字、提供创作建议等。
                    </div>
                </div>
                <div class="ai-input-area">
                    <textarea class="ai-input" id="ai-input" placeholder="输入你的创作需求..."></textarea>
                    <button class="ai-send-btn" id="ai-send-btn">发送</button>
                </div>
            </div>
        `;

        // 初始化创作页面事件
        this.initWritingPage();

        // 初始化章节状态
        this.initChapterState();
    },

    // 初始化章节状态
    initChapterState() {
        if (!this.state.currentNovel) return;

        // 更新章节列表显示
        this.updateChapterList();

        // 如果有章节，设置第一个章节为当前章节
        const chapters = this.state.currentNovel.chapters || [];
        if (chapters.length > 0 && !this.state.currentChapterId) {
            this.setCurrentChapter(chapters[0].id);
        }
    },

    // 初始化创作页面
    initWritingPage() {
        // 绑定编辑器事件
        const editor = document.getElementById('chapter-content');
        if (editor) {
            editor.addEventListener('input', () => {
                this.updateWordCount();
            });
        }

        // 绑定保存按钮
        const saveBtn = document.getElementById('save-chapter-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentChapter();
            });
        }

        // 绑定生成按钮
        const generateBtn = document.getElementById('generate-chapter-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateChapterContent();
            });
        }

        // 绑定AI助手发送按钮
        const aiSendBtn = document.getElementById('ai-send-btn');
        const aiInput = document.getElementById('ai-input');
        if (aiSendBtn && aiInput) {
            aiSendBtn.addEventListener('click', () => {
                this.sendAIMessage();
            });

            aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendAIMessage();
                }
            });
        }

        // 初始更新字数统计
        this.updateWordCount();
    },

    // 更新字数统计
    updateWordCount() {
        const editor = document.getElementById('chapter-content');
        const wordCountEl = document.getElementById('word-count');
        const charCountEl = document.getElementById('char-count');

        if (!editor || !wordCountEl || !charCountEl) return;

        const text = editor.value;
        const charCount = text.length;
        const wordCount = this.calculateWordCount(text);

        wordCountEl.textContent = wordCount.toLocaleString();
        charCountEl.textContent = charCount.toLocaleString();

        // 如果当前有章节，更新章节字数显示
        if (this.state.currentChapterId && this.state.currentNovel) {
            const chapters = this.state.currentNovel.chapters || [];
            const chapter = chapters.find(c => c.id === this.state.currentChapterId);
            if (chapter) {
                const wordsEl = document.getElementById('current-chapter-words');
                if (wordsEl) wordsEl.textContent = `${wordCount} 字`;

                // 更新章节状态
                if (wordCount > 0 && chapter.status === 'draft') {
                    chapter.status = 'writing';
                }
            }
        }
    },

    // 保存当前章节
    saveCurrentChapter() {
        const editor = document.getElementById('chapter-content');
        if (!editor) return;

        const content = editor.value;
        if (!content.trim()) {
            this.showError('请输入章节内容');
            return;
        }

        // 这里应该调用API保存到服务器
        // 目前先保存到localStorage
        this.showSuccess('章节已保存到草稿');
    },

    // 生成章节内容
    generateChapterContent() {
        const editor = document.getElementById('chapter-content');
        if (!editor) return;

        // 检查是否有当前章节
        if (!this.state.currentChapterId || !this.state.currentNovel) {
            this.showError('请先选择或创建一个章节');
            return;
        }

        // 获取当前章节
        const chapters = this.state.currentNovel.chapters || [];
        const chapterIndex = chapters.findIndex(c => c.id === this.state.currentChapterId);
        if (chapterIndex === -1) {
            this.showError('找不到当前章节');
            return;
        }

        // 获取配置的目标字数
        const targetWords = chapters[chapterIndex].targetWords ||
                           this.state.currentNovel.config?.novel?.wordsPerChapter ||
                           3000;

        // 显示生成中状态
        const originalContent = editor.value;
        editor.value = originalContent + `\n\n[AI正在生成约${targetWords}字的内容...]\n`;

        // 模拟AI生成（根据目标字数生成不同长度的内容）
        setTimeout(() => {
            const aiGeneratedContent = this.generateAIContent(targetWords, chapterIndex + 1);

            editor.value = originalContent + aiGeneratedContent;
            this.updateWordCount();

            // 更新章节内容
            chapters[chapterIndex].content = editor.value;
            chapters[chapterIndex].wordCount = this.calculateWordCount(editor.value);
            chapters[chapterIndex].status = 'writing';
            chapters[chapterIndex].updatedAt = new Date().toISOString();

            // 更新小说状态
            this.state.currentNovel.chapters = chapters;
            this.state.currentNovel.updatedAt = new Date().toISOString();
            this.state.currentNovel.wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

            // 保存状态
            this.saveNovelState();

            // 更新章节列表显示
            this.updateChapterList();
            this.setCurrentChapter(this.state.currentChapterId);

            this.showSuccess(`AI内容生成完成 (约${this.calculateWordCount(aiGeneratedContent)}字)`);
        }, 2000);
    },

    // 根据目标字数和章节号生成AI内容
    generateAIContent(targetWords, chapterNumber) {
        // 基础内容模板
        const baseContent = `# 第${chapterNumber}章\n\n`;

        // 根据目标字数决定内容长度
        let content = baseContent;

        // 添加场景描写（约占30%）
        const sceneWords = Math.floor(targetWords * 0.3);
        content += this.generateSceneDescription(sceneWords, chapterNumber) + '\n\n';

        // 添加人物对话（约占40%）
        const dialogueWords = Math.floor(targetWords * 0.4);
        content += this.generateDialogue(dialogueWords, chapterNumber) + '\n\n';

        // 添加情节推进（约占30%）
        const plotWords = targetWords - sceneWords - dialogueWords;
        content += this.generatePlotAdvancement(plotWords, chapterNumber);

        return content;
    },

    // 生成场景描写
    generateSceneDescription(wordCount, chapterNumber) {
        const scenes = [
            `清晨的阳光透过窗户洒进房间，新的一天开始了。窗外传来鸟儿的啁啾声，空气中弥漫着淡淡的花香。`,
            `夜幕降临，华灯初上。城市的街道上车水马龙，霓虹灯闪烁，映照着行色匆匆的路人。`,
            `雨后的山林格外清新，树叶上还挂着晶莹的水珠。远处传来溪流的潺潺水声，一切都显得那么宁静。`,
            `繁华的市集中人声鼎沸，商贩们的叫卖声此起彼伏。各种商品的香味混合在一起，形成独特的气息。`,
            `古老的建筑矗立在夕阳的余晖中，岁月的痕迹在墙壁上清晰可见。这里见证了多少历史的变迁。`
        ];

        const scene = scenes[chapterNumber % scenes.length];
        return this.expandContent(scene, wordCount);
    },

    // 生成人物对话
    generateDialogue(wordCount, chapterNumber) {
        const dialogues = [
            `"你终于来了，" 他转过身，眼神复杂地看着对方，"我等了很久。"\n\n"有些事情需要处理，" 她轻声回答，避开他的目光，"你知道的，我不能总是随心所欲。"`,
            `"这样真的值得吗？" 年轻的助手问道，语气中充满担忧。\n\n"值不值得，不是现在能判断的，" 导师平静地说，"时间会给出答案。"`,
            `"我看到了！" 侦查员压低声音，"他们在那边，至少有五个人。"\n\n"保持冷静，" 队长做了个手势，"按计划行动，不要打草惊蛇。"`,
            `"为什么选择我？" 她直视着对方的眼睛，"有那么多人比我更合适。"\n\n"因为只有你，" 他微微一笑，"拥有那种特别的东西。"`,
            `"事情不像表面那么简单，" 老人叹了口气，"背后有更大的阴谋。"\n\n"那我们该怎么办？" 年轻人急切地问。\n\n"先收集证据，" 老人眼中闪过一丝光芒，"真相总会浮出水面。"`
        ];

        const dialogue = dialogues[chapterNumber % dialogues.length];
        return this.expandContent(dialogue, wordCount);
    },

    // 生成情节推进
    generatePlotAdvancement(wordCount, chapterNumber) {
        const plots = [
            `主人公做出了一个重要的决定，这个决定将影响整个故事的发展方向。内心的挣扎和外在的压力交织在一起，形成复杂的局面。`,
            `新的线索出现了，为解开谜团提供了关键信息。但同时也引出了更多的问题，让情况变得更加扑朔迷离。`,
            `人物之间的关系发生了微妙的变化，信任与怀疑的天平在摇摆。每个人都隐藏着自己的秘密，真相需要层层剥开。`,
            `危机突然降临，迫使所有人迅速做出反应。在压力之下，真正的性格和动机开始显露出来。`,
            `转折点出现了，故事进入了新的阶段。过去的铺垫开始发挥作用，为后续发展埋下伏笔。`
        ];

        const plot = plots[chapterNumber % plots.length];
        return this.expandContent(plot, wordCount);
    },

    // 扩展内容以达到目标字数
    expandContent(content, targetWordCount) {
        const words = content.trim().split(/\s+/);
        if (words.length >= targetWordCount) {
            return content;
        }

        // 添加更多细节来扩展内容
        const details = [
            "空气中弥漫着一种难以言喻的氛围。",
            "时间仿佛在这一刻凝固了。",
            "远处传来隐约的声音，打破了寂静。",
            "光线在物体表面投下长长的影子。",
            "微风吹过，带来丝丝凉意。",
            "心中的思绪如潮水般涌动。",
            "眼前的景象让人不禁陷入沉思。",
            "每一个细节都显得那么意味深长。",
            "命运的交织在这一刻变得清晰。",
            "未来充满了无限的可能性。"
        ];

        let expandedContent = content;
        while (this.calculateWordCount(expandedContent) < targetWordCount) {
            const detail = details[Math.floor(Math.random() * details.length)];
            expandedContent += " " + detail;
        }

        return expandedContent;
    },

    // 计算文字内容的字数（中文按字符数计算）
    calculateWordCount(text) {
        const trimmedText = text.trim();
        if (trimmedText === '') return 0;

        // 中文按字符数计算（包括汉字、标点、数字、字母等）
        // 去除所有空格和换行符，然后计算字符数
        const cleanText = trimmedText.replace(/\s+/g, '');
        return cleanText.length;
    },

    // 保存当前章节
    saveCurrentChapter() {
        const editor = document.getElementById('chapter-content');
        if (!editor) return;

        const content = editor.value;

        // 检查是否有当前章节
        if (!this.state.currentChapterId || !this.state.currentNovel) {
            this.showError('请先选择或创建一个章节');
            return;
        }

        // 获取当前章节
        const chapters = this.state.currentNovel.chapters || [];
        const chapterIndex = chapters.findIndex(c => c.id === this.state.currentChapterId);
        if (chapterIndex === -1) {
            this.showError('找不到当前章节');
            return;
        }

        // 更新章节内容
        chapters[chapterIndex].content = content;
        chapters[chapterIndex].wordCount = this.calculateWordCount(content);
        chapters[chapterIndex].status = content.trim() ? 'writing' : 'draft';
        chapters[chapterIndex].updatedAt = new Date().toISOString();

        // 更新小说状态
        this.state.currentNovel.chapters = chapters;
        this.state.currentNovel.updatedAt = new Date().toISOString();
        this.state.currentNovel.wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

        // 保存状态
        this.saveNovelState();

        // 更新章节列表显示
        this.updateChapterList();

        this.showSuccess('章节已保存');
    },

    // 发送AI消息
    sendAIMessage() {
        const aiInput = document.getElementById('ai-input');
        const aiMessages = document.getElementById('ai-messages');

        if (!aiInput || !aiMessages) return;

        const message = aiInput.value.trim();
        if (!message) return;

        // 添加用户消息
        const userMsg = document.createElement('div');
        userMsg.className = 'ai-msg ai-msg-user';
        userMsg.textContent = message;
        aiMessages.appendChild(userMsg);

        // 清空输入框
        aiInput.value = '';

        // 滚动到底部
        aiMessages.scrollTop = aiMessages.scrollHeight;

        // 添加AI思考中消息
        const thinkingMsg = document.createElement('div');
        thinkingMsg.className = 'ai-msg ai-msg-assistant';
        thinkingMsg.textContent = '思考中...';
        aiMessages.appendChild(thinkingMsg);

        aiMessages.scrollTop = aiMessages.scrollHeight;

        // 模拟AI回复
        setTimeout(() => {
            thinkingMsg.textContent = this.generateAIResponse(message);
            aiMessages.scrollTop = aiMessages.scrollHeight;
        }, 1500);
    },

    // 生成AI回复
    generateAIResponse(message) {
        const responses = [
            `关于"${message}"，我建议可以这样处理：首先建立场景氛围，然后通过人物的对话和动作推进情节，最后留下悬念为下一章铺垫。`,
            `这是一个很好的创作想法！在"${message}"这个方向上，可以考虑加入一些转折或冲突，让故事更加吸引人。`,
            `对于"${message}"，我认为可以从主角的内心矛盾入手，通过外部事件推动其成长和改变。`,
            `"${message}"这个主题很有潜力。建议结合具体的历史背景或文化元素，增加故事的深度和真实感。`,
            `在创作"${message}"时，注意节奏的控制。可以先快速建立冲突，然后放慢节奏深入描写人物情感。`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    },

    // 添加新章节
    addNewChapter() {
        console.log('📝 添加新章节 - 开始');
        console.log('🔍 检查状态:', {
            hasCurrentNovel: !!this.state.currentNovel,
            currentNovelTitle: this.state.currentNovel?.title,
            currentNovelId: this.state.currentNovel?.id
        });
        
        try {
            // 检查是否有当前小说
            if (!this.state.currentNovel) {
                console.error('❌ 没有当前小说');
                this.showError('请先创建小说');
                return;
            }
            
            // 获取当前小说的章节列表
            const chapters = this.state.currentNovel.chapters || [];
            const chapterCount = chapters.length;
            console.log(`📊 当前章节数: ${chapterCount}`);
            
            // 检查是否超过总章节数限制
            const totalChapters = this.state.currentNovel.totalChapters || 10;
            console.log(`📊 总章节限制: ${totalChapters}`);
            if (chapterCount >= totalChapters) {
                console.error(`❌ 超过章节限制: ${chapterCount} >= ${totalChapters}`);
                this.showError(`已达到最大章节数 (${totalChapters}章)`);
                return;
            }
            
            // 创建新章节对象
            const newChapter = {
                id: 'chapter_' + Date.now() + '_' + (chapterCount + 1),
                number: chapterCount + 1,
                title: `第${chapterCount + 1}章`,
                content: '',
                status: 'draft', // draft, writing, completed, reviewed
                wordCount: 0,
                targetWords: this.state.currentNovel.config?.novel?.wordsPerChapter || 3000,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.log(`✅ 创建章节: ${newChapter.title}, 目标字数: ${newChapter.targetWords}`);
            
            // 添加到章节列表
            chapters.push(newChapter);
            this.state.currentNovel.chapters = chapters;
            
            // 更新小说状态
            this.state.currentNovel.updatedAt = new Date().toISOString();
            
            // 保存到localStorage
            console.log('💾 保存小说状态...');
            this.saveNovelState();
            
            // 更新章节列表显示
            console.log('🔄 更新章节列表显示...');
            this.updateChapterList();
            
            // 设置为当前编辑章节
            console.log(`🎯 设置为当前章节: ${newChapter.id}`);
            this.setCurrentChapter(newChapter.id);
            
            console.log(`✅ 章节添加成功: 第${newChapter.number}章`);
            this.showSuccess(`已添加第${newChapter.number}章`);
            
        } catch (error) {
            console.error('❌ 添加章节失败:', error);
            console.error('🔍 错误堆栈:', error.stack);
            this.showError(`添加章节失败: ${error.message}`);
        }
    },

    // 保存小说状态到localStorage
    saveNovelState() {
        try {
            // 保存当前小说
            if (this.state.currentNovel) {
                localStorage.setItem('geniuswriter_current_novel', JSON.stringify(this.state.currentNovel));
            }

            // 更新小说列表中的当前小说
            const novelIndex = this.state.novels.findIndex(n => n.id === this.state.currentNovel?.id);
            if (novelIndex !== -1 && this.state.currentNovel) {
                this.state.novels[novelIndex] = this.state.currentNovel;
            }

            // 保存小说列表
            localStorage.setItem('geniuswriter_novels', JSON.stringify(this.state.novels));

            console.log('💾 小说状态已保存');
        } catch (error) {
            console.error('❌ 保存小说状态失败:', error);
        }
    },

    // 更新章节列表显示
    updateChapterList() {
        const chapterListEl = document.getElementById('chapter-list');
        if (!chapterListEl || !this.state.currentNovel) return;

        const chapters = this.state.currentNovel.chapters || [];

        if (chapters.length === 0) {
            chapterListEl.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--ink-soft);">
                    <div style="font-size: 32px; margin-bottom: 16px;">📝</div>
                    <div>暂无章节</div>
                    <button class="card-btn mt-4" onclick="GeniusWriter.addNewChapter()">添加第一章</button>
                </div>
            `;
            return;
        }

        // 生成章节列表HTML
        const chaptersHtml = chapters.map(chapter => `
            <div class="chapter-item ${this.state.currentChapterId === chapter.id ? 'active' : ''}"
                 data-chapter-id="${chapter.id}"
                 onclick="GeniusWriter.setCurrentChapter('${chapter.id}')">
                <div class="chapter-info">
                    <div class="chapter-number">${chapter.title}</div>
                    <div class="chapter-title">${chapter.status === 'completed' ? '已完成' : chapter.status === 'writing' ? '创作中' : '草稿'}</div>
                </div>
                <div class="chapter-status" style="background: ${chapter.status === 'completed' ? 'var(--green-accent)' : chapter.status === 'writing' ? 'var(--gold)' : 'var(--ink-ghost)'}"></div>
            </div>
        `).join('');

        chapterListEl.innerHTML = chaptersHtml;
    },

    // 设置当前编辑章节
    setCurrentChapter(chapterId) {
        if (!this.state.currentNovel) return;

        const chapters = this.state.currentNovel.chapters || [];
        const chapter = chapters.find(c => c.id === chapterId);

        if (!chapter) {
            console.error(`❌ 找不到章节: ${chapterId}`);
            return;
        }

        this.state.currentChapterId = chapterId;

        // 更新章节标题显示
        const titleEl = document.getElementById('current-chapter-title');
        const statusEl = document.getElementById('current-chapter-status');
        const wordsEl = document.getElementById('current-chapter-words');
        const editor = document.getElementById('chapter-content');

        if (titleEl) titleEl.textContent = chapter.title;
        if (statusEl) statusEl.textContent = `状态：${chapter.status === 'completed' ? '已完成' : chapter.status === 'writing' ? '创作中' : '草稿'}`;
        if (wordsEl) wordsEl.textContent = `${chapter.wordCount} 字`;
        if (editor) editor.value = chapter.content || '';

        // 更新章节列表高亮
        this.updateChapterList();

        // 更新字数统计
        this.updateWordCount();

        console.log(`✅ 切换到章节: ${chapter.title}`);
    },

    // 加载代理中心内容
    loadAgentsContent() {
        const pageElement = document.getElementById('page-agents');

        pageElement.innerHTML = `
            <div class="agents-grid">
                <div class="agent-card">
                    <div class="agent-icon">🎭</div>
                    <div class="agent-name">创意总监</div>
                    <div class="agent-role">把控整体创意方向</div>
                    <div class="agent-status status-active">运行中</div>
                    <div class="agent-desc">
                        负责小说的整体创意方向、主题把控和风格统一，确保作品的艺术性和商业性平衡。
                    </div>
                    <div class="agent-actions">
                        <button class="card-btn">配置</button>
                        <button class="card-btn" style="background: var(--paper);">日志</button>
                    </div>
                </div>

                <div class="agent-card">
                    <div class="agent-icon">📖</div>
                    <div class="agent-name">文学总监</div>
                    <div class="agent-role">文字质量把关</div>
                    <div class="agent-status status-active">运行中</div>
                    <div class="agent-desc">
                        负责文字质量把关、文学性提升和语言风格统一，确保作品的文学价值和可读性。
                    </div>
                    <div class="agent-actions">
                        <button class="card-btn">配置</button>
                        <button class="card-btn" style="background: var(--paper);">日志</button>
                    </div>
                </div>

                <div class="agent-card">
                    <div class="agent-icon">🎬</div>
                    <div class="agent-name">制片人</div>
                    <div class="agent-role">项目管理与协调</div>
                    <div class="agent-status status-active">运行中</div>
                    <div class="agent-desc">
                        负责项目管理、进度协调和资源分配，确保创作流程高效顺畅。
                    </div>
                    <div class="agent-actions">
                        <button class="card-btn">配置</button>
                        <button class="card-btn" style="background: var(--paper);">日志</button>
                    </div>
                </div>

                <div class="agent-card">
                    <div class="agent-icon">🧩</div>
                    <div class="agent-name">情节设计师</div>
                    <div class="agent-role">情节架构设计</div>
                    <div class="agent-status status-active">运行中</div>
                    <div class="agent-desc">
                        负责情节架构设计、转折点设置和节奏控制，确保故事引人入胜。
                    </div>
                    <div class="agent-actions">
                        <button class="card-btn">配置</button>
                        <button class="card-btn" style="background: var(--paper);">日志</button>
                    </div>
                </div>

                <div class="agent-card">
                    <div class="agent-icon">👤</div>
                    <div class="agent-name">人物设计师</div>
                    <div class="agent-role">人物塑造与发展</div>
                    <div class="agent-status status-active">运行中</div>
                    <div class="agent-desc">
                        负责人物塑造、性格发展和关系建立，确保角色立体鲜活。
                    </div>
                    <div class="agent-actions">
                        <button class="card-btn">配置</button>
                        <button class="card-btn" style="background: var(--paper);">日志</button>
                    </div>
                </div>

                <div class="agent-card">
                    <div class="agent-icon">🌍</div>
                    <div class="agent-name">世界观设计师</div>
                    <div class="agent-role">世界观构建</div>
                    <div class="agent-status status-active">运行中</div>
                    <div class="agent-desc">
                        负责世界观构建、场景设定和文化背景，确保故事环境的真实感和沉浸感。
                    </div>
                    <div class="agent-actions">
                        <button class="card-btn">配置</button>
                        <button class="card-btn" style="background: var(--paper);">日志</button>
                    </div>
                </div>
            </div>
        `;
    },

    // 加载设置页面内容
    loadSettingsContent() {
        const pageElement = document.getElementById('page-settings');

        pageElement.innerHTML = `
            <div class="settings-container">
                <div class="settings-section">
                    <div class="section-heading">创作设置</div>

                    <div class="settings-row">
                        <div>
                            <div class="setting-label">自动保存</div>
                            <div class="setting-desc">每5分钟自动保存创作内容</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="settings-row">
                        <div>
                            <div class="setting-label">AI助手提示</div>
                            <div class="setting-desc">在创作时显示AI建议</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="settings-row">
                        <div>
                            <div class="setting-label">字数统计</div>
                            <div class="setting-desc">实时显示字数统计</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="section-heading">模型设置</div>

                    <div class="settings-row">
                        <div>
                            <div class="setting-label">默认创作模型</div>
                            <div class="setting-desc">DeepSeek (推荐)</div>
                        </div>
                        <select class="form-select" style="width: 200px;">
                            <option>DeepSeek</option>
                            <option>OpenAI GPT-4</option>
                            <option>模拟模式</option>
                        </select>
                    </div>

                    <div class="settings-row">
                        <div>
                            <div class="setting-label">创造力水平</div>
                            <div class="setting-desc">控制AI生成内容的创意程度</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 14px; color: var(--ink-soft);">保守</span>
                            <input type="range" min="0" max="10" value="7" style="width: 200px;">
                            <span style="font-size: 14px; color: var(--ink-soft);">创意</span>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="section-heading">数据管理</div>

                    <div class="settings-row">
                        <div>
                            <div class="setting-label">导出所有数据</div>
                            <div class="setting-desc">导出所有小说项目和设置</div>
                        </div>
                        <button class="tb-btn tb-btn-secondary">导出JSON</button>
                    </div>

                    <div class="settings-row">
                        <div>
                            <div class="setting-label">清空本地数据</div>
                            <div class="setting-desc">清除所有本地保存的小说和设置</div>
                        </div>
                        <button class="tb-btn tb-btn-secondary" style="background: var(--red-accent); color: white;">清除数据</button>
                    </div>
                </div>
            </div>
        `;
    },

    // 处理主要按钮动作
    handlePrimaryAction() {
        switch (this.state.currentPage) {
            case 'dashboard':
                this.navigateTo('new-novel');
                break;
            case 'writing':
                this.exportCurrentNovel();
                break;
            case 'agents':
                // 管理代理
                break;
            default:
                // 无动作
                break;
        }
    },

    // 导出当前小说
    exportCurrentNovel() {
        if (!this.state.currentNovel) {
            this.showError('没有当前小说可以导出');
            return;
        }

        // 这里应该实现导出逻辑
        this.showSuccess(`小说"${this.state.currentNovel.title}"导出功能开发中...`);
    },

    // 显示帮助
    showHelp() {
        alert('GeniusWriter 帮助\n\n1. 新建小说：点击"＋新建小说"开始创作\n2. 创作页面：编辑章节内容，使用AI助手\n3. 代理中心：管理AI创作代理\n4. 设置：调整创作参数和系统设置');
    },

    // 更新标题栏
    updateTopbar(pageId) {
        const titleMap = {
            'dashboard': ['GeniusWriter', '工作台'],
            'new-novel': ['工作台', '新建小说'],
            'writing': ['工作台', '创作中'],
            'agents': ['GeniusWriter', '代理中心'],
            'settings': ['GeniusWriter', '设置']
        };

        const [parent, title] = titleMap[pageId] || ['GeniusWriter', pageId];

        const parentEl = document.getElementById('tb-parent');
        const titleEl = document.getElementById('tb-title');

        if (parentEl) parentEl.textContent = parent;
        if (titleEl) titleEl.textContent = title;

        // 更新主要按钮
        const primaryBtn = document.getElementById('tb-primary-btn');
        if (primaryBtn) {
            if (pageId === 'dashboard') {
                primaryBtn.textContent = '＋ 新建小说';
                primaryBtn.style.display = '';
            } else if (pageId === 'writing') {
                primaryBtn.textContent = '导出作品';
                primaryBtn.style.display = '';
            } else if (pageId === 'agents') {
                primaryBtn.textContent = '管理代理';
                primaryBtn.style.display = '';
            } else {
                primaryBtn.style.display = 'none';
            }
        }
    },

    // 显示错误消息
    showError(message) {
        alert('错误: ' + message);
    },

    // 显示成功消息
    showSuccess(message) {
        // 可以替换为更优雅的通知系统
        console.log('✅ ' + message);
        alert('成功: ' + message);
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    GeniusWriter.init();
});

// 导出全局对象
window.GeniusWriter = GeniusWriter;