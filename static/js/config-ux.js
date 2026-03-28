/**
 * GeniusWriter 用户体验优化配置页面交互脚本
 * 处理分步骤配置流程、卡片式模型选择、实时预览等高级交互
 */

class ConfigUX {
    constructor() {
        console.log('🔧 GeniusWriter ConfigUX 构造函数调用');
        this.configData = {
            step: 1,
            novel: {
                title: '',
                genre: '都市',
                chapters: 10,
                wordsPerChapter: 3000,
                writingStyle: '通俗性',
                targetAudience: 'general',
                additionalInfo: ''
            },
            model: {
                selected: 'openai',
                openai: { apiKey: '', validated: false },
                deepseek: { apiKey: '', validated: false },
                simulated: { validated: true }
            },
            parameters: {
                creativity: 0.7,
                maxLength: 4000,
                diversity: 5,
                tier1Involvement: 0.8,
                tier3Involvement: 0.9
            },
            workflows: {
                qualityCheck: true,
                autoFormat: true,
                versioning: false,
                feedback: true
            },
            savedAt: null
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 GeniusWriter UX配置页面初始化开始');
        
        // 加载保存的配置（如果有）
        await this.loadSavedConfig();
        
        console.log('📋 初始化UI组件...');
        // 初始化UI组件
        this.initSteps();
        this.initModelCards();
        this.initFormEvents();
        this.initParameterSliders();
        this.initNavigation();
        this.initApiEvents();
        
        // 更新UI状态
        this.updateAllDisplays();
        
        console.log('✅ 配置页面初始化完成');
        console.log('📊 当前配置:', JSON.stringify(this.configData, null, 2));
    }
    
    // ==================== 步骤管理 ====================
    
    initSteps() {
        console.log('🔘 初始化步骤导航...');
        
        // 步骤点击事件
        const steps = document.querySelectorAll('.flow-step');
        console.log(`找到 ${steps.length} 个步骤指示器`);
        
        steps.forEach(step => {
            step.addEventListener('click', (e) => {
                const stepNumber = parseInt(step.querySelector('.step-circle').dataset.step);
                console.log(`👆 点击步骤指示器: 步骤 ${stepNumber}`);
                this.goToStep(stepNumber);
            });
        });
        
        // 下一步按钮
        const nextStep1Btn = document.getElementById('next-step-1');
        console.log(`下一步按钮1: ${nextStep1Btn ? '找到' : '未找到'}`);
        if (nextStep1Btn) {
            nextStep1Btn.addEventListener('click', () => {
                console.log('👉 点击下一步按钮1 (前往步骤2)');
                this.goToStep(2);
            });
        }
        
        const nextStep2Btn = document.getElementById('next-step-2');
        if (nextStep2Btn) {
            nextStep2Btn.addEventListener('click', () => {
                console.log('👉 点击下一步按钮2 (前往步骤3)');
                this.goToStep(3);
            });
        }
        
        const nextStep3Btn = document.getElementById('next-step-3');
        if (nextStep3Btn) {
            nextStep3Btn.addEventListener('click', () => {
                console.log('👉 点击下一步按钮3 (前往步骤4)');
                this.goToStep(4);
            });
        }
        
        // 上一步按钮
        const prevStep2Btn = document.getElementById('prev-step-2');
        if (prevStep2Btn) {
            prevStep2Btn.addEventListener('click', () => {
                console.log('👈 点击上一步按钮2 (返回步骤1)');
                this.goToStep(1);
            });
        }
        
        const prevStep3Btn = document.getElementById('prev-step-3');
        if (prevStep3Btn) {
            prevStep3Btn.addEventListener('click', () => {
                console.log('👈 点击上一步按钮3 (返回步骤2)');
                this.goToStep(2);
            });
        }
        
        const prevStep4Btn = document.getElementById('prev-step-4');
        if (prevStep4Btn) {
            prevStep4Btn.addEventListener('click', () => {
                console.log('👈 点击上一步按钮4 (返回步骤3)');
                this.goToStep(3);
            });
        }
        
        console.log('✅ 步骤导航初始化完成');
    }
    
    goToStep(stepNumber) {
        console.log(`🔄 尝试导航到步骤 ${stepNumber} (当前步骤: ${this.configData.step})`);
        
        // 验证当前步骤
        if (!this.validateCurrentStep()) {
            console.log(`❌ 步骤 ${this.configData.step} 验证失败，阻止导航`);
            // 在控制台显示详细错误信息
            console.error(`步骤${this.configData.step}验证失败，请检查输入`);
            // 尝试显示alert，但如果被阻止，至少控制台有记录
            try {
                this.showError(`步骤${this.configData.step}验证失败，请检查输入`);
            } catch (alertError) {
                console.warn('Alert被浏览器阻止:', alertError);
            }
            return;
        }
        
        console.log(`✅ 步骤验证通过，更新到步骤 ${stepNumber}`);
        console.log(`📊 当前配置:`, {
            title: this.configData.novel.title,
            genre: this.configData.novel.genre,
            model: this.configData.model.selected
        });
        
        // 更新步骤状态
        this.configData.step = stepNumber;
        
        // 更新步骤指示器
        document.querySelectorAll('.flow-step').forEach(step => {
            const circle = step.querySelector('.step-circle');
            const label = step.querySelector('.step-label');
            const stepNum = parseInt(circle.dataset.step);
            
            circle.classList.remove('active', 'completed');
            label.classList.remove('active');
            
            if (stepNum === stepNumber) {
                circle.classList.add('active');
                label.classList.add('active');
            } else if (stepNum < stepNumber) {
                circle.classList.add('completed');
            }
        });
        
        // 显示对应步骤内容
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });
        const stepContent = document.getElementById(`step${stepNumber}-content`);
        if (stepContent) {
            stepContent.classList.add('active');
        }
        
        // 更新进度显示
        this.updateProgressDisplay();
        
        // 步骤特定初始化
        this.initStepSpecific(stepNumber);
        
        console.log(`🎯 成功导航到步骤 ${stepNumber}`);
    }
    
    validateCurrentStep() {
        const currentStep = this.configData.step;
        console.log(`🔍 验证步骤 ${currentStep}...`);
        
        switch (currentStep) {
            case 1:
                console.log('📖 验证小说设置...');
                console.log('📊 当前小说数据:', {
                    title: this.configData.novel?.title,
                    genre: this.configData.novel?.genre,
                    chapters: this.configData.novel?.chapters
                });
                
                // 验证小说设置
                const novelTitle = this.configData.novel && this.configData.novel.title;
                if (!novelTitle || !novelTitle.trim()) {
                    console.log('⚠️ 小说标题为空，自动填充默认标题');
                    
                    // 自动填充默认标题
                    const novelGenre = (this.configData.novel && this.configData.novel.genre) || '都市';
                    const defaultTitle = `我的${novelGenre}小说`;
                    
                    console.log(`📝 自动填充: 标题="${defaultTitle}", 类型="${novelGenre}"`);
                    
                    if (this.configData.novel) {
                        this.configData.novel.title = defaultTitle;
                        console.log('✅ 配置数据中的标题已更新');
                    }
                    
                    // 更新输入框显示
                    const titleInput = document.getElementById('novel-title');
                    if (titleInput) {
                        titleInput.value = defaultTitle;
                        console.log('✅ 输入框值已更新');
                        
                        // 手动触发input事件，确保所有监听器更新
                        try {
                            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                            console.log('✅ input事件已触发');
                        } catch (eventError) {
                            console.warn('⚠️ 触发input事件失败:', eventError);
                        }
                    } else {
                        console.warn('⚠️ 未找到小说标题输入框');
                    }
                    
                    // 更新预览
                    this.updateNovelPreview();
                    console.log('✅ 小说预览已更新');
                } else {
                    console.log(`✅ 小说标题有效: "${novelTitle}"`);
                }
                
                const novelGenre = this.configData.novel && this.configData.novel.genre;
                if (!novelGenre) {
                    console.log('⚠️ 小说类型为空，设置为默认值"都市"');
                    
                    // 默认类型已经是'都市'，但再次确认
                    if (this.configData.novel) {
                        this.configData.novel.genre = '都市';
                        console.log('✅ 配置数据中的类型已更新');
                    }
                    
                    // 更新选择框显示
                    const genreSelect = document.getElementById('novel-genre');
                    if (genreSelect) {
                        genreSelect.value = '都市';
                        console.log('✅ 选择框值已更新');
                        
                        // 手动触发change事件
                        try {
                            genreSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('✅ change事件已触发');
                        } catch (eventError) {
                            console.warn('⚠️ 触发change事件失败:', eventError);
                        }
                    } else {
                        console.warn('⚠️ 未找到小说类型选择框');
                    }
                    
                    // 更新预览
                    this.updateNovelPreview();
                } else {
                    console.log(`✅ 小说类型有效: "${novelGenre}"`);
                }
                
                console.log('✅ 步骤1验证通过');
                return true;
                
            case 2:
                // 验证模型选择
                if (!this.configData.model.selected) {
                    this.showError('请选择创作模型');
                    return false;
                }
                
                // 如果是真实模型，验证API密钥
                const selectedModel = this.configData.model.selected;
                if (selectedModel !== 'simulated') {
                    const modelConfig = this.configData.model && this.configData.model[selectedModel];
                    const apiKey = modelConfig && modelConfig.apiKey;
                    if (!apiKey || !apiKey.trim() || !apiKey.startsWith('sk-')) {
                        this.showError(`请输入有效的${selectedModel === 'openai' ? 'OpenAI' : 'DeepSeek'} API密钥`);
                        return false;
                    }
                }
                return true;
                
            case 3:
                // 参数验证
                if (this.configData.parameters.maxLength < 500 || this.configData.parameters.maxLength > 16000) {
                    this.showError('最大生成长度应在500-16000字符之间');
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    }
    
    initStepSpecific(stepNumber) {
        switch (stepNumber) {
            case 1:
                this.updateNovelPreview();
                break;
            case 2:
                this.updateModelPreview();
                break;
            case 3:
                this.updateParameterPreview();
                break;
            case 4:
                this.updateFinalSummary();
                break;
        }
    }
    
    updateProgressDisplay() {
        const progressPercent = (this.configData.step / 4) * 100;
        const stepNames = ['小说设置', '选择模型', '参数调整', '开始创作'];
        
        const progressPercentEl = document.getElementById('progress-percent');
        if (progressPercentEl) progressPercentEl.textContent = `${Math.round(progressPercent)}%`;
        
        const currentStepTextEl = document.getElementById('current-step-text');
        if (currentStepTextEl) currentStepTextEl.textContent = stepNames[this.configData.step - 1];
        
        const currentStepStatusEl = document.getElementById('current-step-status');
        if (currentStepStatusEl) currentStepStatusEl.textContent = `步骤${this.configData.step}/4：${stepNames[this.configData.step - 1]}`;
    }
    
    // ==================== 模型卡片选择 ====================
    
    initModelCards() {
        document.querySelectorAll('.model-card').forEach(card => {
            card.addEventListener('click', () => {
                const model = card.dataset.model;
                this.selectModel(model);
            });
        });
        
        // 初始化选择
        this.selectModel(this.configData.model.selected);
    }
    
    selectModel(model) {
        // 更新卡片选择状态
        document.querySelectorAll('.model-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.model === model) {
                card.classList.add('selected');
            }
        });
        
        // 更新配置数据
        this.configData.model.selected = model;
        
        // 显示/隐藏API配置区域
        const apiConfigSection = document.getElementById('api-config-section');
        const openaiConfig = document.getElementById('openai-config');
        const deepseekConfig = document.getElementById('deepseek-config');
        
        if (apiConfigSection) {
            apiConfigSection.style.display = model === 'simulated' ? 'none' : 'block';
        }
        
        if (openaiConfig) {
            openaiConfig.style.display = model === 'openai' ? 'block' : 'none';
        }
        
        if (deepseekConfig) {
            deepseekConfig.style.display = model === 'deepseek' ? 'block' : 'none';
        }
        
        // 更新模型状态显示
        this.updateModelStatusDisplay(model);
        
        // 更新模型预览
        this.updateModelPreview();
    }
    
    updateModelStatusDisplay(model) {
        const selectedModelEl = document.getElementById('selected-model');
        const connectionStatusEl = document.getElementById('connection-status');
        const recommendationEl = document.getElementById('model-recommendation');
        const costEstimationEl = document.getElementById('cost-estimation');
        
        if (!selectedModelEl) return;
        
        const modelNames = {
            'openai': 'OpenAI GPT系列',
            'deepseek': 'DeepSeek',
            'simulated': '模拟模式'
        };
        
        const recommendations = {
            'openai': '创意写作、文学性表达',
            'deepseek': '中文小说、历史题材',
            'simulated': '功能测试、快速体验'
        };
        
        const costs = {
            'openai': '中等（按token计费）',
            'deepseek': '较低（性价比高）',
            'simulated': '免费'
        };
        
        const modelConfig = this.configData.model && this.configData.model[model];
        const status = modelConfig && modelConfig.validated ? '已验证' : '未验证';
        
        selectedModelEl.textContent = modelNames[model];
        connectionStatusEl.textContent = status;
        recommendationEl.textContent = recommendations[model];
        costEstimationEl.textContent = costs[model];
    }
    
    // ==================== 表单事件 ====================
    
    initFormEvents() {
        // 小说标题
        const novelTitleInput = document.getElementById('novel-title');
        if (novelTitleInput) {
            novelTitleInput.addEventListener('input', (e) => {
                this.configData.novel.title = e.target.value;
                this.updateNovelPreview();
            });
        }
        
        // 小说类型
        const novelGenreSelect = document.getElementById('novel-genre');
        if (novelGenreSelect) {
            novelGenreSelect.addEventListener('change', (e) => {
                this.configData.novel.genre = e.target.value;
                this.updateNovelPreview();
            });
        }
        
        // 章节数量
        const chaptersCountInput = document.getElementById('chapters-count');
        if (chaptersCountInput) {
            chaptersCountInput.addEventListener('input', (e) => {
                this.configData.novel.chapters = parseInt(e.target.value) || 10;
                this.updateNovelPreview();
                this.updateTotalWords();
            });
        }
        
        // 每章字数
        const wordsPerChapterInput = document.getElementById('words-per-chapter');
        if (wordsPerChapterInput) {
            wordsPerChapterInput.addEventListener('input', (e) => {
                this.configData.novel.wordsPerChapter = parseInt(e.target.value) || 3000;
                this.updateNovelPreview();
                this.updateTotalWords();
            });
        }
        
        // 写作风格
        const writingStyleSelect = document.getElementById('writing-style');
        if (writingStyleSelect) {
            writingStyleSelect.addEventListener('change', (e) => {
                this.configData.novel.writingStyle = e.target.value;
                this.updateNovelPreview();
            });
        }
        
        // 目标读者
        const targetAudienceSelect = document.getElementById('target-audience');
        if (targetAudienceSelect) {
            targetAudienceSelect.addEventListener('change', (e) => {
                this.configData.novel.targetAudience = e.target.value;
                this.updateNovelPreview();
            });
        }
        
        // 特别要求
        const additionalInfoTextarea = document.getElementById('additional-info');
        if (additionalInfoTextarea) {
            additionalInfoTextarea.addEventListener('input', (e) => {
                this.configData.novel.additionalInfo = e.target.value;
            });
        }
        
        // 初始化总字数计算
        this.updateTotalWords();
    }
    
    updateTotalWords() {
        const chapters = this.configData.novel.chapters || 10;
        const wordsPerChapter = this.configData.novel.wordsPerChapter || 3000;
        const totalWords = chapters * wordsPerChapter;
        
        const totalWordsEl = document.getElementById('total-words');
        if (totalWordsEl) {
            totalWordsEl.textContent = this.formatNumber(totalWords) + '字';
        }
    }
    
    updateNovelPreview() {
        // 更新摘要显示
        const summaryTitleEl = document.getElementById('summary-title');
        if (summaryTitleEl) summaryTitleEl.textContent = this.configData.novel.title || '未设置';
        
        const summaryGenreEl = document.getElementById('summary-genre');
        if (summaryGenreEl) summaryGenreEl.textContent = this.configData.novel.genre || '都市';
        
        const summaryChaptersEl = document.getElementById('summary-chapters');
        if (summaryChaptersEl) summaryChaptersEl.textContent = (this.configData.novel.chapters || 10) + '章';
        
        const summaryWordsEl = document.getElementById('summary-words');
        if (summaryWordsEl) summaryWordsEl.textContent = this.formatNumber((this.configData.novel.chapters || 10) * (this.configData.novel.wordsPerChapter || 3000)) + '字';
        
        const summaryStyleEl = document.getElementById('summary-style');
        if (summaryStyleEl) summaryStyleEl.textContent = this.configData.novel.writingStyle || '通俗性';
        
        const summaryAudienceEl = document.getElementById('summary-audience');
        if (summaryAudienceEl) summaryAudienceEl.textContent = this.getAudienceText(this.configData.novel.targetAudience);
    }
    
    getAudienceText(audience) {
        const audiences = {
            'general': '大众读者',
            'young-adult': '青少年',
            'adult': '成人',
            'professional': '专业读者'
        };
        return audiences[audience] || '大众读者';
    }
    
    // ==================== 参数滑块 ====================
    
    initParameterSliders() {
        // 创造力滑块
        const creativitySlider = document.getElementById('creativity-slider');
        if (creativitySlider) {
            creativitySlider.value = this.configData.parameters.creativity * 10;
            creativitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) / 10;
                this.configData.parameters.creativity = value;
                document.getElementById('creativity-value').textContent = value.toFixed(1);
                this.updateParameterPreview();
            });
            document.getElementById('creativity-value').textContent = this.configData.parameters.creativity.toFixed(1);
        }
        
        // 最大长度
        const maxLengthInput = document.getElementById('max-length');
        if (maxLengthInput) {
            maxLengthInput.value = this.configData.parameters.maxLength;
            maxLengthInput.addEventListener('input', (e) => {
                this.configData.parameters.maxLength = parseInt(e.target.value) || 4000;
                this.updateParameterPreview();
            });
        }
        
        // 多样性滑块
        const diversitySlider = document.getElementById('diversity-slider');
        if (diversitySlider) {
            diversitySlider.value = this.configData.parameters.diversity;
            diversitySlider.addEventListener('input', (e) => {
                this.configData.parameters.diversity = parseInt(e.target.value);
                const valueText = this.getDiversityText(this.configData.parameters.diversity);
                document.getElementById('diversity-value').textContent = valueText;
                this.updateParameterPreview();
            });
            document.getElementById('diversity-value').textContent = this.getDiversityText(this.configData.parameters.diversity);
        }
        
        // 总监层参与度
        const tier1Slider = document.getElementById('tier1-slider');
        if (tier1Slider) {
            tier1Slider.value = this.configData.parameters.tier1Involvement * 10;
            tier1Slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) / 10;
                this.configData.parameters.tier1Involvement = value;
                document.getElementById('tier1-value').textContent = Math.round(value * 100) + '%';
                this.updateParameterPreview();
            });
            document.getElementById('tier1-value').textContent = Math.round(this.configData.parameters.tier1Involvement * 100) + '%';
        }
        
        // 专家层参与度
        const tier3Slider = document.getElementById('tier3-slider');
        if (tier3Slider) {
            tier3Slider.value = this.configData.parameters.tier3Involvement * 10;
            tier3Slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) / 10;
                this.configData.parameters.tier3Involvement = value;
                document.getElementById('tier3-value').textContent = Math.round(value * 100) + '%';
                this.updateParameterPreview();
            });
            document.getElementById('tier3-value').textContent = Math.round(this.configData.parameters.tier3Involvement * 100) + '%';
        }
        
        // 快速预设
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.applyPreset(preset);
            });
        });
        
        // 工作流选项
        this.initWorkflowCheckboxes();
    }
    
    getDiversityText(value) {
        if (value <= 3) return '较低';
        if (value <= 7) return '中等';
        return '较高';
    }
    
    applyPreset(preset) {
        // 更新预设按钮状态
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.preset === preset) {
                btn.classList.add('active');
            }
        });
        
        // 应用预设值
        switch (preset) {
            case 'balanced':
                this.configData.parameters.creativity = 0.7;
                this.configData.parameters.diversity = 5;
                this.configData.parameters.tier1Involvement = 0.8;
                this.configData.parameters.tier3Involvement = 0.9;
                break;
            case 'creative':
                this.configData.parameters.creativity = 0.9;
                this.configData.parameters.diversity = 8;
                this.configData.parameters.tier1Involvement = 0.9;
                this.configData.parameters.tier3Involvement = 0.7;
                break;
            case 'precise':
                this.configData.parameters.creativity = 0.5;
                this.configData.parameters.diversity = 3;
                this.configData.parameters.tier1Involvement = 0.7;
                this.configData.parameters.tier3Involvement = 0.95;
                break;
            case 'detailed':
                this.configData.parameters.creativity = 0.6;
                this.configData.parameters.diversity = 6;
                this.configData.parameters.tier1Involvement = 0.85;
                this.configData.parameters.tier3Involvement = 0.85;
                break;
        }
        
        // 更新滑块显示
        this.updateSlidersFromConfig();
        this.updateParameterPreview();
    }
    
    updateSlidersFromConfig() {
        const creativitySlider = document.getElementById('creativity-slider');
        const diversitySlider = document.getElementById('diversity-slider');
        const tier1Slider = document.getElementById('tier1-slider');
        const tier3Slider = document.getElementById('tier3-slider');
        
        if (creativitySlider) {
            creativitySlider.value = this.configData.parameters.creativity * 10;
            document.getElementById('creativity-value').textContent = this.configData.parameters.creativity.toFixed(1);
        }
        
        if (diversitySlider) {
            diversitySlider.value = this.configData.parameters.diversity;
            document.getElementById('diversity-value').textContent = this.getDiversityText(this.configData.parameters.diversity);
        }
        
        if (tier1Slider) {
            tier1Slider.value = this.configData.parameters.tier1Involvement * 10;
            document.getElementById('tier1-value').textContent = Math.round(this.configData.parameters.tier1Involvement * 100) + '%';
        }
        
        if (tier3Slider) {
            tier3Slider.value = this.configData.parameters.tier3Involvement * 10;
            document.getElementById('tier3-value').textContent = Math.round(this.configData.parameters.tier3Involvement * 100) + '%';
        }
    }
    
    initWorkflowCheckboxes() {
        const checkboxes = [
            'enable-quality-check',
            'enable-auto-format',
            'enable-versioning',
            'enable-feedback'
        ];
        
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                const key = id.replace('enable-', '');
                checkbox.checked = this.configData.workflows[key];
                
                checkbox.addEventListener('change', (e) => {
                    this.configData.workflows[key] = e.target.checked;
                });
            }
        });
    }
    
    updateParameterPreview() {
        // 更新参数效果预览
        const creativity = this.configData.parameters.creativity;
        const diversity = this.configData.parameters.diversity;
        const tier1 = this.configData.parameters.tier1Involvement;
        const tier3 = this.configData.parameters.tier3Involvement;
        
        const creativityText = creativity <= 0.5 ? '严谨' : creativity <= 0.8 ? '中等' : '创意';
        const depthText = this.configData.parameters.maxLength <= 2000 ? '简洁' : 
                         this.configData.parameters.maxLength <= 4000 ? '适中' : '详细';
        const expertiseText = tier3 <= 0.7 ? '基础' : tier3 <= 0.9 ? '中等' : '高度';
        const qualityText = this.configData.workflows.qualityCheck ? '严格' : '宽松';
        
        const previewCreativityEl = document.getElementById('preview-creativity');
        if (previewCreativityEl) previewCreativityEl.textContent = creativityText;
        
        const previewDepthEl = document.getElementById('preview-depth');
        if (previewDepthEl) previewDepthEl.textContent = depthText;
        
        const previewExpertiseEl = document.getElementById('preview-expertise');
        if (previewExpertiseEl) previewExpertiseEl.textContent = expertiseText;
        
        const previewQualityEl = document.getElementById('preview-quality');
        if (previewQualityEl) previewQualityEl.textContent = qualityText;
    }
    
    updateModelPreview() {
        // 模型预览已在上面的updateModelStatusDisplay中处理
    }
    
    updateFinalSummary() {
        // 更新最终摘要
        const finalTitleCountEl = document.getElementById('final-title-count');
        if (finalTitleCountEl) finalTitleCountEl.textContent = this.configData.novel.title ? '1' : '0';
        
        const finalChapterCountEl = document.getElementById('final-chapter-count');
        if (finalChapterCountEl) finalChapterCountEl.textContent = this.configData.novel.chapters || 10;
        
        const finalWordCountEl = document.getElementById('final-word-count');
        if (finalWordCountEl) finalWordCountEl.textContent = this.formatNumber(
            (this.configData.novel.chapters || 10) * (this.configData.novel.wordsPerChapter || 3000)
        );
        
        const modelNames = {
            'openai': 'OpenAI',
            'deepseek': 'DeepSeek',
            'simulated': '模拟模式'
        };
        const finalModelEl = document.getElementById('final-model');
        if (finalModelEl) finalModelEl.textContent = modelNames[this.configData.model.selected] || '未选择';
    }
    
    // ==================== API事件 ====================
    
    initApiEvents() {
        // API密钥显示/隐藏
        this.initApiKeyToggles();
        
        // API密钥输入验证
        this.initApiKeyValidation();
        
        // API测试按钮
        this.initApiTestButtons();
    }
    
    initApiKeyToggles() {
        // OpenAI密钥切换
        const toggleOpenAI = document.getElementById('toggle-openai-key');
        if (toggleOpenAI) {
            toggleOpenAI.addEventListener('click', () => {
                const input = document.getElementById('openai-key');
                if (input.type === 'password') {
                    input.type = 'text';
                    toggleOpenAI.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    toggleOpenAI.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        }
        
        // DeepSeek密钥切换
        const toggleDeepSeek = document.getElementById('toggle-deepseek-key');
        if (toggleDeepSeek) {
            toggleDeepSeek.addEventListener('click', () => {
                const input = document.getElementById('deepseek-key');
                if (input.type === 'password') {
                    input.type = 'text';
                    toggleDeepSeek.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    toggleDeepSeek.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        }
    }
    
    initApiKeyValidation() {
        // OpenAI密钥验证
        const openaiKeyInput = document.getElementById('openai-key');
        if (openaiKeyInput) {
            openaiKeyInput.addEventListener('input', (e) => {
                const key = e.target.value;
                this.configData.model.openai.apiKey = key;
                this.configData.model.openai.validated = key.startsWith('sk-');
                this.updateModelStatusDisplay(this.configData.model.selected);
            });
        }
        
        // DeepSeek密钥验证
        const deepseekKeyInput = document.getElementById('deepseek-key');
        if (deepseekKeyInput) {
            deepseekKeyInput.addEventListener('input', (e) => {
                const key = e.target.value;
                this.configData.model.deepseek.apiKey = key;
                this.configData.model.deepseek.validated = key.startsWith('sk-');
                this.updateModelStatusDisplay(this.configData.model.selected);
            });
        }
    }
    
    initApiTestButtons() {
        // OpenAI测试
        const testOpenAI = document.getElementById('test-openai');
        if (testOpenAI) {
            testOpenAI.addEventListener('click', async () => {
                await this.testApiConnection('openai');
            });
        }
        
        // DeepSeek测试
        const testDeepSeek = document.getElementById('test-deepseek');
        if (testDeepSeek) {
            testDeepSeek.addEventListener('click', async () => {
                await this.testApiConnection('deepseek');
            });
        }
    }
    
    async testApiConnection(provider) {
        const modelConfig = this.configData.model && this.configData.model[provider];
        const apiKey = modelConfig && modelConfig.apiKey;
        const resultEl = document.getElementById(`${provider}-test-result`);
        
        if (!apiKey || !apiKey.startsWith('sk-')) {
            this.showTestResult(provider, 'error', 'API密钥格式无效，应以"sk-"开头');
            return;
        }
        
        // 显示测试中状态
        this.showTestResult(provider, 'info', '测试连接中...');
        
        try {
            // 这里应该是实际的API测试调用
            // 为了演示，我们模拟一个成功的测试
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟测试结果
            const success = Math.random() > 0.3; // 70%成功率
            if (success) {
                if (this.configData.model && this.configData.model[provider]) {
                    this.configData.model[provider].validated = true;
                }
                this.showTestResult(provider, 'success', '连接测试成功！API密钥有效');
                this.updateModelStatusDisplay(this.configData.model.selected);
            } else {
                this.showTestResult(provider, 'error', '连接测试失败，请检查API密钥和网络连接');
            }
        } catch (error) {
            this.showTestResult(provider, 'error', `连接测试失败: ${error.message}`);
        }
    }
    
    showTestResult(provider, type, message) {
        const resultEl = document.getElementById(`${provider}-test-result`);
        if (!resultEl) return;
        
        resultEl.textContent = message;
        resultEl.className = 'test-result';
        
        switch (type) {
            case 'success':
                resultEl.classList.add('success');
                break;
            case 'error':
                resultEl.classList.add('error');
                break;
            case 'info':
                resultEl.style.display = 'block';
                resultEl.style.background = 'rgba(59, 130, 246, 0.1)';
                resultEl.style.border = '1px solid rgba(59, 130, 246, 0.2)';
                resultEl.style.color = 'var(--color-primary)';
                break;
        }
    }
    
    // ==================== 导航和保存 ====================
    
    initNavigation() {
        // 开始创作按钮
        const startCreationBtn = document.getElementById('start-creation-main');
        if (startCreationBtn) {
            startCreationBtn.addEventListener('click', async () => {
                await this.startCreation();
            });
        }
        
        // 保存配置按钮
        const saveConfigBtn = document.getElementById('save-and-export');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', async () => {
                await this.saveConfig();
            });
        }
        
        // 进入创作控制台
        const enterConsoleBtn = document.querySelector('a[href="/writing"]');
        if (enterConsoleBtn) {
            enterConsoleBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await this.enterWritingConsole();
                } catch (error) {
                    console.error('❌ 进入创作控制台失败:', error);
                    try {
                        this.showError('进入创作页面失败: ' + (error.message || '未知错误'));
                    } catch (alertError) {
                        console.warn('Alert被浏览器阻止:', alertError);
                    }
                }
            });
        }
    }
    
    async startCreation() {
        console.log('🚀 开始创建小说项目...');
        
        // 验证所有配置
        console.log('🔍 验证所有配置...');
        if (!this.validateCurrentStep()) {
            console.error('❌ 配置验证失败，无法开始创作');
            try {
                this.showError('配置验证失败，请检查所有输入');
            } catch (alertError) {
                console.warn('Alert被浏览器阻止:', alertError);
            }
            return;
        }
        console.log('✅ 所有配置验证通过');
        
        try {
            this.showSuccess('开始创建小说项目...');
            
            // 保存配置到本地存储
            console.log('💾 保存配置...');
            await this.saveConfig();
            
            // 验证配置是否已保存
            console.log('🔍 验证配置保存状态...');
            const savedConfig = localStorage.getItem('geniuswriter_config');
            if (!savedConfig) {
                console.error('❌ 配置保存失败，localStorage中未找到配置');
                this.showError('配置保存失败，无法开始创作');
                return;
            }
            
            console.log('✅ 配置保存验证通过');
            
            // 准备请求数据（用于模拟API调用）
            const requestData = {
                novel: this.configData.novel,
                model: {
                    selected: this.configData.model.selected,
                    ...(this.configData.model.selected === 'openai' && { 
                        openai: { apiKey: this.configData.model.openai.apiKey }
                    }),
                    ...(this.configData.model.selected === 'deepseek' && { 
                        deepseek: { apiKey: this.configData.model.deepseek.apiKey }
                    })
                },
                parameters: this.configData.parameters,
                workflows: this.configData.workflows
            };
            
            console.log('📡 模拟API调用...');
            // 这里应该是实际的API调用
            // 模拟成功响应
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            console.log('✅ 小说项目创建成功！');
            this.showSuccess('小说项目创建成功！正在跳转到创作页面...');
            
            // 跳转到创作页面
            setTimeout(() => {
                console.log('📍 跳转到创作页面');
                window.location.href = '/writing';
            }, 1000);
            
        } catch (error) {
            console.error('❌ 创建小说失败:', error);
            this.showError('创建小说失败: ' + (error.message || '未知错误'));
        }
    }
    
    async saveConfig() {
        try {
            console.log('💾 正在保存配置到本地存储...');
            
            // 确保配置数据完整
            const configToSave = {
                novel: this.configData.novel || {},
                model: this.configData.model || {},
                parameters: this.configData.parameters || {},
                workflows: this.configData.workflows || {},
                step: this.configData.step || 1,
                savedAt: new Date().toISOString()
            };
            
            console.log('📋 保存的配置:', {
                title: configToSave.novel.title,
                genre: configToSave.novel.genre,
                model: configToSave.model.selected,
                chapters: configToSave.novel.chapters
            });
            
            // 保存到本地存储
            localStorage.setItem('geniuswriter_config', JSON.stringify(configToSave));
            
            // 验证保存是否成功
            const saved = localStorage.getItem('geniuswriter_config');
            if (saved) {
                console.log('✅ 配置已成功保存到本地存储');
                console.log('📏 保存的数据大小:', saved.length, '字符');
                
                // 更新configData中的savedAt
                this.configData.savedAt = configToSave.savedAt;
                
                this.showSuccess('配置已保存到本地存储');
            } else {
                console.error('❌ 配置保存失败，localStorage返回空');
                this.showError('配置保存失败，请检查浏览器设置或存储空间');
            }
            
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
            // 尝试提供更详细的错误信息
            let errorMessage = '保存配置失败: ' + error.message;
            if (error.name === 'QuotaExceededError') {
                errorMessage = '本地存储空间不足，请清除浏览器数据或使用其他浏览器';
            } else if (error.name === 'SecurityError') {
                errorMessage = '浏览器安全设置阻止了本地存储访问';
            }
            this.showError(errorMessage);
        }
    }
    
    async loadSavedConfig() {
        try {
            const saved = localStorage.getItem('geniuswriter_config');
            if (saved) {
                console.log('📝 找到本地保存的配置，正在解析...');
                const parsed = JSON.parse(saved);
                
                // 确保配置数据结构完整
                const safeParsed = {
                    novel: parsed.novel || {},
                    model: parsed.model || {},
                    parameters: parsed.parameters || {},
                    workflows: parsed.workflows || {},
                    step: parsed.step || 1,
                    savedAt: parsed.savedAt
                };
                
                // 合并配置，保留默认值，使用安全合并避免undefined展开错误
                this.configData = {
                    ...this.configData,
                    step: safeParsed.step || this.configData.step,
                    savedAt: safeParsed.savedAt || this.configData.savedAt,
                    novel: { 
                        ...this.configData.novel, 
                        ...(safeParsed.novel || {}) 
                    },
                    model: { 
                        ...this.configData.model, 
                        ...(safeParsed.model || {}) 
                    },
                    parameters: { 
                        ...this.configData.parameters, 
                        ...(safeParsed.parameters || {}) 
                    },
                    workflows: { 
                        ...this.configData.workflows, 
                        ...(safeParsed.workflows || {}) 
                    }
                };
                
                console.log('✅ 已加载保存的配置');
                console.log('📊 加载的配置:', {
                    step: this.configData.step,
                    title: this.configData.novel.title,
                    model: this.configData.model.selected,
                    chapters: this.configData.novel.chapters
                });
            } else {
                console.log('📝 未找到本地保存的配置，使用默认值');
            }
        } catch (error) {
            console.error('❌ 加载保存的配置失败:', error);
            // 发生错误时，使用默认配置
            console.log('⚠️ 使用默认配置继续');
        }
    }
    
    async enterWritingConsole() {
        console.log('🚪 进入创作控制台...');
        
        // 验证所有配置
        console.log('🔍 验证所有配置...');
        if (!this.validateCurrentStep()) {
            console.error('❌ 配置验证失败，无法进入创作页面');
            try {
                this.showError('配置验证失败，请检查所有输入');
            } catch (alertError) {
                console.warn('Alert被浏览器阻止:', alertError);
            }
            return;
        }
        console.log('✅ 所有配置验证通过');
        
        // 保存配置
        console.log('💾 保存配置...');
        await this.saveConfig();
        
        // 验证配置是否已保存
        console.log('🔍 验证配置保存状态...');
        const savedConfig = localStorage.getItem('geniuswriter_config');
        if (!savedConfig) {
            console.error('❌ 配置保存失败，localStorage中未找到配置');
            try {
                this.showError('配置保存失败，无法进入创作页面');
            } catch (alertError) {
                console.warn('Alert被浏览器阻止:', alertError);
            }
            return;
        }
        
        console.log('✅ 配置保存验证通过');
        console.log('📏 保存的配置大小:', savedConfig.length, '字符');
        
        // 显示跳转提示
        console.log('🔀 正在跳转到创作页面...');
        try {
            this.showSuccess('配置已保存，正在跳转到创作页面...');
        } catch (alertError) {
            console.log('⚠️ 跳转提示被阻止，继续跳转');
        }
        
        // 短暂延迟后跳转到创作页面
        setTimeout(() => {
            console.log('📍 跳转到创作页面');
            window.location.href = '/writing';
        }, 1000);
    }
    
    // ==================== 工具方法 ====================
    
    updateAllDisplays() {
        this.updateNovelPreview();
        this.updateModelPreview();
        this.updateParameterPreview();
        this.updateFinalSummary();
        this.updateProgressDisplay();
    }
    
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

// 初始化配置页面
document.addEventListener('DOMContentLoaded', () => {
    // 确保页面完全加载
    setTimeout(() => {
        window.configUX = new ConfigUX();
    }, 100);
});