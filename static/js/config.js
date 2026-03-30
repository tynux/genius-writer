/**
 * GeniusWriter 配置页面交互脚本
 * 处理配置页面的所有交互逻辑
 */

class ConfigPage {
    constructor() {
        this.configData = {
            novel: {},
            models: {},
            agents: {},
            workflows: {
                qualityCheck: true,
                autoFormat: true,
                versioning: false
            }
        };
        
        this.currentConfig = {};
        this.availableModels = [];
        this.init();
    }
    
    async init() {
        console.log('配置页面初始化');
        
        // 加载系统配置
        await this.loadSystemConfig();
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 初始化表单交互
        this.initFormInteractions();
        
        // 检查现有配置
        await this.loadSavedConfig();
        
        // 更新预览
        this.updatePreview();
        
        console.log('配置页面初始化完成');
    }
    
    async loadSystemConfig() {
        try {
            const response = await window.app.apiRequest('/api/config');
            if (response) {
                this.systemConfig = response;
                this.renderModelSelection(response.models);
                this.updateStats();
            }
        } catch (error) {
            console.error('加载系统配置失败:', error);
            this.showError('无法加载系统配置，请刷新页面重试');
        }
    }
    
    async loadSavedConfig() {
        try {
            // 从localStorage加载保存的配置
            const savedConfig = localStorage.getItem('geniuswriter_config');
            if (savedConfig) {
                this.currentConfig = JSON.parse(savedConfig);
                this.populateForm(this.currentConfig);
                this.showSuccess('已加载保存的配置');
            }
        } catch (error) {
            console.error('加载保存的配置失败:', error);
        }
    }
    
    renderModelSelection(modelsConfig) {
        const container = document.getElementById('model-selection');
        if (!container) return;
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建模型选项
        const modelOptions = [
            { id: 'openai', name: 'OpenAI', icon: 'fa-robot', color: '#10a37f' },
            { id: 'deepseek', name: 'DeepSeek', icon: 'fa-brain', color: '#4361ee' },
            { id: 'claude', name: 'Claude', icon: 'fa-user-tie', color: '#d97706' },
            { id: 'simulated', name: '模拟模式', icon: 'fa-desktop', color: '#6b7280' }
        ];
        
        modelOptions.forEach(model => {
            const option = document.createElement('div');
            option.className = 'model-option';
            option.dataset.modelId = model.id;
            
            // 检查是否可用
            const isAvailable = model.id === 'simulated' || 
                               (modelsConfig.available && modelsConfig.available.includes(model.id));
            
            if (!isAvailable) {
                option.classList.add('disabled');
                option.title = '模型不可用';
            }
            
            option.innerHTML = `
                <i class="fas ${model.icon}" style="color: ${model.color}"></i>
                <div>${model.name}</div>
            `;
            
            option.addEventListener('click', () => {
                if (!isAvailable) return;
                this.selectModel(model.id);
            });
            
            container.appendChild(option);
        });
        
        // 默认选择第一个可用模型
        const firstAvailable = modelOptions.find(m => m.id === 'simulated' || 
            (modelsConfig.available && modelsConfig.available.includes(m.id)));
        if (firstAvailable) {
            this.selectModel(firstAvailable.id);
        }
    }
    
    selectModel(modelId) {
        // 移除所有选择状态
        document.querySelectorAll('.model-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // 添加选择状态
        const selectedOption = document.querySelector(`.model-option[data-model-id="${modelId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // 更新配置
        this.configData.models.selected = modelId;
        
        // 更新状态显示
        this.updateModelStatus(modelId);
    }
    
    updateModelStatus(modelId) {
        const statusEl = document.getElementById('model-status');
        if (!statusEl) return;
        
        let statusText = '';
        let statusClass = '';
        
        switch (modelId) {
            case 'openai':
                statusText = '已选择 OpenAI GPT 模型';
                statusClass = 'info';
                break;
            case 'deepseek':
                statusText = '已选择 DeepSeek 模型';
                statusClass = 'info';
                break;
            case 'claude':
                statusText = '已选择 Claude 模型';
                statusClass = 'info';
                break;
            case 'simulated':
                statusText = '使用模拟模式，无需API密钥';
                statusClass = 'warning';
                break;
            default:
                statusText = '请选择模型';
                statusClass = 'unknown';
        }
        
        statusEl.textContent = statusText;
        statusEl.className = `model-status ${statusClass}`;
    }
    
    initEventListeners() {
        // 表单输入事件
        this.initFormEvents();
        
        // 按钮事件
        this.initButtonEvents();
        
        // 滑块事件
        this.initSliderEvents();
        
        // API密钥显示/隐藏
        this.initApiKeyEvents();
    }
    
    initFormEvents() {
        // 小说标题
        const titleInput = document.getElementById('novel-title');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.configData.novel.title = titleInput.value;
                this.updatePreview();
                this.updateConfigStatus();
            });
        }
        
        // 小说类型
        const genreSelect = document.getElementById('novel-genre');
        if (genreSelect) {
            genreSelect.addEventListener('change', () => {
                this.configData.novel.genre = genreSelect.value;
                this.updatePreview();
                this.updateConfigStatus();
            });
        }
        
        // 章节数量
        const chaptersInput = document.getElementById('chapters-count');
        if (chaptersInput) {
            chaptersInput.addEventListener('input', () => {
                const chapters = parseInt(chaptersInput.value) || 10;
                this.configData.novel.chapters = chapters;
                this.updateWordCount();
                this.updatePreview();
                this.updateConfigStatus();
            });
        }
        
        // 每章字数
        const wordsInput = document.getElementById('words-per-chapter');
        if (wordsInput) {
            wordsInput.addEventListener('input', () => {
                const words = parseInt(wordsInput.value) || 3000;
                this.configData.novel.wordsPerChapter = words;
                this.updateWordCount();
                this.updatePreview();
                this.updateConfigStatus();
            });
        }
        
        // 写作风格
        const styleSelect = document.getElementById('writing-style');
        if (styleSelect) {
            styleSelect.addEventListener('change', () => {
                this.configData.novel.writingStyle = styleSelect.value;
                this.updatePreview();
                this.updateConfigStatus();
            });
        }
        
        // 额外要求
        const additionalInput = document.getElementById('additional-info');
        if (additionalInput) {
            additionalInput.addEventListener('input', () => {
                this.configData.novel.additionalInfo = additionalInput.value;
                this.updateConfigStatus();
            });
        }
        
        // 工作流复选框处理
        this.initCheckboxEvents();
        
        // 模型选择切换
        this.initModelSelectionEvents();
    }
    
    initModelSelectionEvents() {
        // 获取所有模型radio按钮
        const modelRadios = document.querySelectorAll('input[name="primary-model"]');
        if (modelRadios.length === 0) return;
        
        // 为每个radio按钮添加change事件
        modelRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.handleModelChange(e.target.value);
                }
            });
        });
        
        // 初始化显示当前选中的模型配置
        const selectedRadio = document.querySelector('input[name="primary-model"]:checked');
        if (selectedRadio) {
            this.handleModelChange(selectedRadio.value);
        }
    }
    
    handleModelChange(selectedModel) {
        console.log('模型切换至:', selectedModel);
        
        // 更新配置数据
        this.configData.models.selected = selectedModel;
        
        // 显示/隐藏模型配置区域
        const openaiConfig = document.getElementById('openai-config');
        const deepseekConfig = document.getElementById('deepseek-config');
        
        if (openaiConfig) {
            openaiConfig.style.display = selectedModel === 'openai' ? 'block' : 'none';
        }
        
        if (deepseekConfig) {
            deepseekConfig.style.display = selectedModel === 'deepseek' ? 'block' : 'none';
        }
        
        // 更新模型状态显示
        this.updateModelStatusDisplay(selectedModel);
    }
    
    updateModelStatusDisplay(selectedModel) {
        const openaiStatus = document.getElementById('openai-status');
        const deepseekStatus = document.getElementById('deepseek-status');
        
        if (selectedModel === 'openai') {
            if (openaiStatus) {
                openaiStatus.textContent = '已选择';
                openaiStatus.className = 'text-sm text-green-600';
            }
            if (deepseekStatus) {
                deepseekStatus.textContent = '未选择';
                deepseekStatus.className = 'text-sm text-gray-600';
            }
        } else if (selectedModel === 'deepseek') {
            if (openaiStatus) {
                openaiStatus.textContent = '未选择';
                openaiStatus.className = 'text-sm text-gray-600';
            }
            if (deepseekStatus) {
                deepseekStatus.textContent = '已选择';
                deepseekStatus.className = 'text-sm text-green-600';
            }
        }
    }
    
    initButtonEvents() {
        // 保存小说配置
        const saveNovelBtn = document.getElementById('save-novel-config');
        if (saveNovelBtn) {
            saveNovelBtn.addEventListener('click', () => this.saveNovelConfig());
        }
        
        // 重置小说配置
        const resetNovelBtn = document.getElementById('reset-novel-config');
        if (resetNovelBtn) {
            resetNovelBtn.addEventListener('click', () => this.resetNovelConfig());
        }
        
        // 测试模型连接
        const testModelsBtn = document.getElementById('test-models');
        if (testModelsBtn) {
            testModelsBtn.addEventListener('click', () => this.testModelConnection());
        }
        
        // 保存所有配置
        const saveAllBtn = document.getElementById('save-all-config');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => this.saveAllConfig());
        }
        
        // 开始创作
        const startCreationBtn = document.getElementById('start-creation');
        if (startCreationBtn) {
            startCreationBtn.addEventListener('click', () => this.startCreation());
        }
        
        // 返回首页
        const backBtn = document.getElementById('back-to-home');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/';
            });
        }
    }
    
    initSliderEvents() {
        // 温度滑块
        const tempSlider = document.getElementById('temperature');
        const tempValue = document.getElementById('temperature-value');
        if (tempSlider && tempValue) {
            tempSlider.addEventListener('input', () => {
                const value = parseFloat(tempSlider.value);
                tempValue.textContent = value.toFixed(1);
                this.configData.models.temperature = value;
                this.updateConfigStatus();
            });
        }
        
        // 最大tokens滑块
        const tokensSlider = document.getElementById('max-tokens');
        const tokensValue = document.getElementById('max-tokens-value');
        if (tokensSlider && tokensValue) {
            tokensSlider.addEventListener('input', () => {
                const value = parseInt(tokensSlider.value);
                tokensValue.textContent = this.formatNumber(value) + ' tokens';
                this.configData.models.maxTokens = value;
                this.updateConfigStatus();
            });
        }
        
        // 总监层参与度
        const tier1Slider = document.getElementById('tier1-involvement');
        const tier1Value = document.getElementById('tier1-value');
        if (tier1Slider && tier1Value) {
            tier1Slider.addEventListener('input', () => {
                const value = parseInt(tier1Slider.value);
                tier1Value.textContent = value + '%';
                this.configData.agents.tier1Involvement = value;
                this.updateConfigStatus();
            });
        }
        
        // 专家层参与度
        const tier3Slider = document.getElementById('tier3-involvement');
        const tier3Value = document.getElementById('tier3-value');
        if (tier3Slider && tier3Value) {
            tier3Slider.addEventListener('input', () => {
                const value = parseInt(tier3Slider.value);
                tier3Value.textContent = value + '%';
                this.configData.agents.tier3Involvement = value;
                this.updateConfigStatus();
            });
        }
    }
    
    initApiKeyEvents() {
        // OpenAI密钥显示/隐藏切换
        const toggleOpenaiKeyBtn = document.getElementById('toggle-openai-key');
        if (toggleOpenaiKeyBtn) {
            toggleOpenaiKeyBtn.addEventListener('click', () => {
                const openaiKeyInput = document.getElementById('openai-key');
                if (openaiKeyInput) {
                    if (openaiKeyInput.type === 'password') {
                        openaiKeyInput.type = 'text';
                        toggleOpenaiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                    } else {
                        openaiKeyInput.type = 'password';
                        toggleOpenaiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
                    }
                }
            });
        }
        
        // DeepSeek密钥显示/隐藏切换
        const toggleDeepseekKeyBtn = document.getElementById('toggle-deepseek-key');
        if (toggleDeepseekKeyBtn) {
            toggleDeepseekKeyBtn.addEventListener('click', () => {
                const deepseekKeyInput = document.getElementById('deepseek-key');
                if (deepseekKeyInput) {
                    if (deepseekKeyInput.type === 'password') {
                        deepseekKeyInput.type = 'text';
                        toggleDeepseekKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                    } else {
                        deepseekKeyInput.type = 'password';
                        toggleDeepseekKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
                    }
                }
            });
        }
        
        // API密钥输入验证
        const openaiKeyInput = document.getElementById('openai-key');
        if (openaiKeyInput) {
            openaiKeyInput.addEventListener('input', () => {
                this.validateApiKey('openai', openaiKeyInput.value);
            });
        }
        
        const deepseekKeyInput = document.getElementById('deepseek-key');
        if (deepseekKeyInput) {
            deepseekKeyInput.addEventListener('input', () => {
                this.validateApiKey('deepseek', deepseekKeyInput.value);
            });
        }
    }
    
    initFormInteractions() {
        // 初始化字数计算
        this.updateWordCount();
        
        // 初始化滑块值显示
        this.initSliderValues();
    }
    
    initSliderValues() {
        // 温度滑块
        const tempSlider = document.getElementById('temperature');
        const tempValue = document.getElementById('temp-value');
        if (tempSlider && tempValue) {
            // 滑块范围是0-20，对应0.0-2.0
            const tempValueNum = parseFloat(tempSlider.value) / 10;
            tempValue.textContent = tempValueNum.toFixed(1);
            this.configData.models.temperature = tempValueNum;
            
            // 添加滑块change事件
            tempSlider.addEventListener('input', () => {
                const newTempValue = parseFloat(tempSlider.value) / 10;
                tempValue.textContent = newTempValue.toFixed(1);
                this.configData.models.temperature = newTempValue;
                this.updateConfigStatus();
            });
        }
        
        // 最大tokens输入框（不是滑块）
        const tokensInput = document.getElementById('max-tokens');
        if (tokensInput) {
            this.configData.models.maxTokens = parseInt(tokensInput.value) || 4000;
            
            // 添加输入事件
            tokensInput.addEventListener('input', () => {
                this.configData.models.maxTokens = parseInt(tokensInput.value) || 4000;
                this.updateConfigStatus();
            });
        }
        
        // 总监层参与度
        const tier1Slider = document.getElementById('tier1-involvement');
        const tier1Value = document.getElementById('tier1-value');
        if (tier1Slider && tier1Value) {
            // 滑块值0-10对应0%-100%
            const tier1Percent = parseInt(tier1Slider.value) * 10;
            tier1Value.textContent = tier1Percent + '%';
            this.configData.agents.tier1Involvement = tier1Percent / 100; // 存储为小数0-1.0
            
            // 添加滑块事件
            tier1Slider.addEventListener('input', () => {
                const newTier1Percent = parseInt(tier1Slider.value) * 10;
                tier1Value.textContent = newTier1Percent + '%';
                this.configData.agents.tier1Involvement = newTier1Percent / 100;
                this.updateConfigStatus();
            });
        }
        
        // 专家层参与度
        const tier3Slider = document.getElementById('tier3-involvement');
        const tier3Value = document.getElementById('tier3-value');
        if (tier3Slider && tier3Value) {
            // 滑块值0-10对应0%-100%
            const tier3Percent = parseInt(tier3Slider.value) * 10;
            tier3Value.textContent = tier3Percent + '%';
            this.configData.agents.tier3Involvement = tier3Percent / 100; // 存储为小数0-1.0
            
            // 添加滑块事件
            tier3Slider.addEventListener('input', () => {
                const newTier3Percent = parseInt(tier3Slider.value) * 10;
                tier3Value.textContent = newTier3Percent + '%';
                this.configData.agents.tier3Involvement = newTier3Percent / 100;
                this.updateConfigStatus();
            });
        }
    }
    
    updateWordCount() {
        const chaptersInput = document.getElementById('chapters-count');
        const wordsInput = document.getElementById('words-per-chapter');
        const totalWordsEl = document.getElementById('total-words');
        
        if (chaptersInput && wordsInput && totalWordsEl) {
            const chapters = parseInt(chaptersInput.value) || 10;
            const wordsPerChapter = parseInt(wordsInput.value) || 3000;
            const totalWords = chapters * wordsPerChapter;
            
            totalWordsEl.textContent = this.formatNumber(totalWords) + '字';
            this.configData.novel.totalWords = totalWords;
        }
    }
    
    updatePreview() {
        // 更新预览区域
        const previewTitle = document.getElementById('preview-title');
        const previewGenre = document.getElementById('preview-genre');
        const previewChapters = document.getElementById('preview-chapters');
        const previewWords = document.getElementById('preview-words');
        const previewStyle = document.getElementById('preview-style');
        
        if (previewTitle) {
            previewTitle.textContent = this.configData.novel.title || '未设置';
        }
        
        if (previewGenre) {
            previewGenre.textContent = this.configData.novel.genre || '都市';
        }
        
        if (previewChapters) {
            const chapters = this.configData.novel.chapters || 10;
            previewChapters.textContent = chapters + '章';
        }
        
        if (previewWords) {
            const totalWords = this.configData.novel.totalWords || 30000;
            previewWords.textContent = this.formatNumber(totalWords) + '字';
        }
        
        if (previewStyle) {
            previewStyle.textContent = this.configData.novel.writingStyle || '通俗性';
        }
    }
    
    updateConfigStatus() {
        // 更新配置状态显示
        const statusItems = document.querySelectorAll('.status-item');
        
        // 小说配置状态
        const novelConfigComplete = this.configData.novel.title && 
                                  this.configData.novel.genre && 
                                  this.configData.novel.chapters;
        
        if (statusItems.length >= 1) {
            const dot = statusItems[0].querySelector('.status-dot');
            const text = statusItems[0].querySelector('span:last-child');
            
            if (dot && text) {
                if (novelConfigComplete) {
                    dot.className = 'status-dot success';
                    text.textContent = '小说配置：已保存';
                } else {
                    dot.className = 'status-dot unknown';
                    text.textContent = '小说配置：未保存';
                }
            }
        }
        
        // 模型连接状态
        const modelSelected = this.configData.models.selected;
        const modelConnected = modelSelected === 'simulated' || 
                              (modelSelected && this.configData.models[modelSelected + 'Validated']);
        
        if (statusItems.length >= 2) {
            const dot = statusItems[1].querySelector('.status-dot');
            const text = statusItems[1].querySelector('span:last-child');
            
            if (dot && text) {
                if (modelConnected) {
                    dot.className = 'status-dot success';
                    text.textContent = '模型连接：已测试';
                } else if (modelSelected) {
                    dot.className = 'status-dot warning';
                    text.textContent = '模型连接：未测试';
                } else {
                    dot.className = 'status-dot unknown';
                    text.textContent = '模型连接：未选择';
                }
            }
        }
        
        // 智能体系统状态
        if (statusItems.length >= 3) {
            const dot = statusItems[2].querySelector('.status-dot');
            const text = statusItems[2].querySelector('span:last-child');
            
            if (dot && text) {
                if (this.configData.agents.tier1Involvement !== undefined) {
                    dot.className = 'status-dot success';
                    text.textContent = '智能体系统：已配置';
                } else {
                    dot.className = 'status-dot unknown';
                    text.textContent = '智能体系统：未初始化';
                }
            }
        }
        
        // 更新页脚摘要
        this.updateFooterSummary();
    }
    
    updateFooterSummary() {
        const summaryEl = document.getElementById('current-config-summary');
        if (!summaryEl) return;
        
        if (this.configData.novel.title) {
            const genre = this.configData.novel.genre || '都市';
            const chapters = this.configData.novel.chapters || 10;
            const model = this.configData.models.selected || '未选择';
            
            summaryEl.textContent = `${this.configData.novel.title} (${genre}, ${chapters}章, ${model})`;
        } else {
            summaryEl.textContent = '未保存配置';
        }
    }
    
    updateStats() {
        // 更新配置页面的统计信息
        const config = this.systemConfig;
        if (!config) return;
        
        // 更新可用模型数量
        const modelCount = config.models?.available?.length || 0;
        const modelCountEl = document.querySelector('.model-count');
        if (modelCountEl) {
            modelCountEl.textContent = modelCount;
        }
        
        // 更新代理数量
        const agentCount = config.agents ? 
            (config.agents.tier1?.length || 0) + 
            (config.agents.tier2?.length || 0) + 
            (config.agents.tier3?.length || 0) : 0;
        
        const agentCountEl = document.querySelector('.agent-count');
        if (agentCountEl) {
            agentCountEl.textContent = agentCount;
        }
    }
    
    validateApiKey(provider, key) {
        const statusEl = document.getElementById(`${provider}-status`);
        const statusTextEl = document.getElementById(`${provider}-status-text`);
        
        if (!statusEl || !statusTextEl) return;
        
        // 简单验证
        if (!key || key.trim() === '') {
            statusEl.className = 'status-indicator unknown';
            statusTextEl.textContent = '未设置';
            this.configData.models[provider + 'Validated'] = false;
            return;
        }
        
        // OpenAI密钥格式验证
        if (provider === 'openai' && key.startsWith('sk-')) {
            statusEl.className = 'status-indicator success';
            statusTextEl.textContent = '格式正确';
            this.configData.models.openaiValidated = true;
        }
        // DeepSeek密钥格式验证
        else if (provider === 'deepseek' && key.startsWith('sk-')) {
            statusEl.className = 'status-indicator success';
            statusTextEl.textContent = '格式正确';
            this.configData.models.deepseekValidated = true;
        }
        // 其他格式
        else {
            statusEl.className = 'status-indicator error';
            statusTextEl.textContent = '格式错误';
            this.configData.models[provider + 'Validated'] = false;
        }
        
        this.updateConfigStatus();
    }
    
    async testModelConnection() {
        const selectedModel = this.configData.models.selected;
        if (!selectedModel) {
            window.app.showError('请先选择模型');
            return;
        }
        
        if (selectedModel === 'simulated') {
            window.app.showSuccess('模拟模式无需测试连接');
            this.configData.models.simulatedValidated = true;
            this.updateConfigStatus();
            return;
        }
        
        // 检查API密钥
        const apiKeyInput = document.getElementById(`${selectedModel}-key`);
        if (!apiKeyInput || !apiKeyInput.value.trim()) {
            window.app.showError(`请先设置${selectedModel.toUpperCase()} API密钥`);
            return;
        }
        
        try {
            window.app.showSuccess('正在测试模型连接...');
            
            const response = await window.app.apiRequest('/api/models/test', {
                method: 'POST',
                body: JSON.stringify({ model: selectedModel })
            });
            
            if (response.success) {
                window.app.showSuccess(`模型连接测试成功: ${response.message}`);
                this.configData.models[selectedModel + 'Validated'] = true;
                this.updateConfigStatus();
            } else {
                window.app.showError(`模型连接测试失败: ${response.error || response.message}`);
                this.configData.models[selectedModel + 'Validated'] = false;
            }
            
        } catch (error) {
            console.error('模型连接测试失败:', error);
            window.app.showError('模型连接测试失败，请检查网络连接');
        }
    }
    
    async saveNovelConfig() {
        // 收集小说配置
        const novelConfig = {
            title: document.getElementById('novel-title')?.value || '',
            genre: document.getElementById('novel-genre')?.value || '都市',
            chapters: parseInt(document.getElementById('chapters-count')?.value) || 10,
            wordsPerChapter: parseInt(document.getElementById('words-per-chapter')?.value) || 3000,
            writingStyle: document.getElementById('writing-style')?.value || '通俗性',
            additionalInfo: document.getElementById('additional-info')?.value || ''
        };
        
        // 验证必要字段
        if (!novelConfig.title.trim()) {
            window.app.showError('请输入小说标题');
            return;
        }
        
        if (novelConfig.chapters < 1 || novelConfig.chapters > 100) {
            window.app.showError('章节数量应在1-100之间');
            return;
        }
        
        if (novelConfig.wordsPerChapter < 500 || novelConfig.wordsPerChapter > 10000) {
            window.app.showError('每章字数应在500-10000之间');
            return;
        }
        
        // 保存到当前配置
        this.configData.novel = novelConfig;
        
        // 更新预览和状态
        this.updatePreview();
        this.updateConfigStatus();
        
        window.app.showSuccess('小说配置已保存');
    }
    
    resetNovelConfig() {
        if (!confirm('确定要重置小说配置吗？所有设置将恢复默认值。')) {
            return;
        }
        
        // 重置表单
        document.getElementById('novel-title').value = '';
        document.getElementById('novel-genre').value = '都市';
        document.getElementById('chapters-count').value = 10;
        document.getElementById('words-per-chapter').value = 3000;
        document.getElementById('writing-style').value = '通俗性';
        document.getElementById('additional-info').value = '';
        
        // 重置配置数据
        this.configData.novel = {};
        
        // 更新预览和状态
        this.updateWordCount();
        this.updatePreview();
        this.updateConfigStatus();
        
        window.app.showSuccess('小说配置已重置');
    }
    
    populateForm(config) {
        // 填充小说配置
        if (config.novel) {
            document.getElementById('novel-title').value = config.novel.title || '';
            document.getElementById('novel-genre').value = config.novel.genre || '都市';
            document.getElementById('chapters-count').value = config.novel.chapters || 10;
            document.getElementById('words-per-chapter').value = config.novel.wordsPerChapter || 3000;
            document.getElementById('writing-style').value = config.novel.writingStyle || '通俗性';
            document.getElementById('additional-info').value = config.novel.additionalInfo || '';
        }
        
        // 填充模型配置
        if (config.models) {
            // 选择模型
            if (config.models.selected) {
                this.selectModel(config.models.selected);
            }
            
            // 设置API密钥
            if (config.models.openaiKey) {
                document.getElementById('openai-key').value = config.models.openaiKey;
            }
            
            if (config.models.deepseekKey) {
                document.getElementById('deepseek-key').value = config.models.deepseekKey;
            }
            
            // 设置模型参数
            if (config.models.temperature !== undefined) {
                document.getElementById('temperature').value = config.models.temperature;
                document.getElementById('temperature-value').textContent = config.models.temperature.toFixed(1);
            }
            
            if (config.models.maxTokens !== undefined) {
                document.getElementById('max-tokens').value = config.models.maxTokens;
                document.getElementById('max-tokens-value').textContent = 
                    this.formatNumber(config.models.maxTokens) + ' tokens';
            }
        }
        
        // 填充智能体配置
        if (config.agents) {
            if (config.agents.tier1Involvement !== undefined) {
                document.getElementById('tier1-involvement').value = config.agents.tier1Involvement;
                document.getElementById('tier1-value').textContent = config.agents.tier1Involvement + '%';
            }
            
            if (config.agents.tier3Involvement !== undefined) {
                document.getElementById('tier3-involvement').value = config.agents.tier3Involvement;
                document.getElementById('tier3-value').textContent = config.agents.tier3Involvement + '%';
            }
        }
        
        // 更新配置数据
        this.configData = { ...this.configData, ...config };
        
        // 更新状态
        this.updateWordCount();
        this.updatePreview();
        this.updateConfigStatus();
    }
    
    async saveAllConfig() {
        // 收集所有配置
        const allConfig = {
            novel: this.configData.novel,
            models: this.configData.models,
            agents: this.configData.agents,
            savedAt: new Date().toISOString()
        };
        
        // 验证必要配置
        if (!allConfig.novel.title) {
            window.app.showError('请先完成小说配置');
            return;
        }
        
        // 保存到localStorage
        try {
            localStorage.setItem('geniuswriter_config', JSON.stringify(allConfig));
            this.currentConfig = allConfig;
            
            // 也保存到服务器（如果有后端存储）
            await this.saveToServer(allConfig);
            
            window.app.showSuccess('所有配置已保存');
            this.updateConfigStatus();
            
        } catch (error) {
            console.error('保存配置失败:', error);
            window.app.showError('保存配置失败: ' + error.message);
        }
    }
    
    async saveToServer(config) {
        // 这里可以添加保存到服务器的逻辑
        // 目前是模拟保存
        return new Promise(resolve => {
            setTimeout(() => resolve({ success: true }), 500);
        });
    }
    
    async startCreation() {
        // 检查配置完整性
        if (!this.configData.novel.title) {
            window.app.showError('请先完成小说配置');
            return;
        }
        
        if (!this.configData.models.selected) {
            window.app.showError('请选择创作模型');
            return;
        }
        
        // 如果是真实模型，检查API密钥
        const selectedModel = this.configData.models.selected;
        if (selectedModel !== 'simulated') {
            const apiKeyValid = this.configData.models[selectedModel + 'Validated'];
            if (!apiKeyValid) {
                window.app.showError(`请先验证${selectedModel.toUpperCase()} API密钥`);
                return;
            }
        }
        
        try {
            window.app.showSuccess('开始小说创作...');
            
            // 调用小说规划API
            const planData = {
                title: this.configData.novel.title,
                genre: this.configData.novel.genre,
                chapters: this.configData.novel.chapters,
                words_per_chapter: this.configData.novel.wordsPerChapter,
                writing_style: this.configData.novel.writingStyle,
                additional_info: this.configData.novel.additionalInfo,
                model: this.configData.models.selected,
                temperature: this.configData.models.temperature,
                max_tokens: this.configData.models.maxTokens
            };
            
            const response = await window.app.apiRequest('/api/novel/plan', {
                method: 'POST',
                body: JSON.stringify(planData)
            });
            
            if (response.success) {
                // 保存小说ID到localStorage，供创作页面读取
                this.currentNovelId = response.novel_id;
                localStorage.setItem('geniuswriter_novel_id', response.novel_id);

                // 同时把完整配置也持久化一次（确保最新）
                localStorage.setItem('geniuswriter_config', JSON.stringify(this.configData));

                // 跳转到创作页面
                window.location.href = '/writing';
            } else {
                window.app.showError('小说规划失败: ' + (response.error || '未知错误'));
            }
            
        } catch (error) {
            console.error('开始创作失败:', error);
            window.app.showError('开始创作失败，请检查网络连接');
        }
    }
    
    initCheckboxEvents() {
        // 质量检查复选框
        const qualityCheckbox = document.getElementById('enable-quality-check');
        if (qualityCheckbox) {
            this.configData.workflows.qualityCheck = qualityCheckbox.checked;
            qualityCheckbox.addEventListener('change', () => {
                this.configData.workflows.qualityCheck = qualityCheckbox.checked;
                this.updateConfigStatus();
            });
        }
        
        // 自动格式化复选框
        const autoFormatCheckbox = document.getElementById('enable-auto-format');
        if (autoFormatCheckbox) {
            this.configData.workflows.autoFormat = autoFormatCheckbox.checked;
            autoFormatCheckbox.addEventListener('change', () => {
                this.configData.workflows.autoFormat = autoFormatCheckbox.checked;
                this.updateConfigStatus();
            });
        }
        
        // 版本管理复选框
        const versioningCheckbox = document.getElementById('enable-versioning');
        if (versioningCheckbox) {
            this.configData.workflows.versioning = versioningCheckbox.checked;
            versioningCheckbox.addEventListener('change', () => {
                this.configData.workflows.versioning = versioningCheckbox.checked;
                this.updateConfigStatus();
            });
        }
    }
    
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    showError(message) {
        window.app.showError(message);
    }
    
    showSuccess(message) {
        window.app.showSuccess(message);
    }
}

// 初始化配置页面
document.addEventListener('DOMContentLoaded', () => {
    // 确保主应用已初始化
    if (window.app) {
        window.configPage = new ConfigPage();
    } else {
        // 如果主应用未初始化，等待一下
        setTimeout(() => {
            if (window.app) {
                window.configPage = new ConfigPage();
            } else {
                console.error('无法初始化配置页面：主应用未加载');
            }
        }, 1000);
    }
});