# GeniusWriter - AI小说创作智能体协调系统

参考Claude Code Game Studios架构，为小说创作量身定制的AI智能体协调平台。包含**36个专业代理**、**28个工作流技能**和**完整的三级协调架构**，支持多种大模型和小说创作风格。

## 🎯 核心特性

### 三级代理架构
1. **Tier 1 - 总监层**：创意总监、文学总监、制作人
2. **Tier 2 - 部门主管**：情节设计师、人物设计师、世界观设计师、文笔编辑等
3. **Tier 3 - 专家层**：各类型小说专家、章节创作专家、对话专家、场景描写专家等

### 小说类型专家系统
- **历史小说**：历史考据、时代背景、人物塑造专家
- **科幻小说**：世界观构建、科技设定、未来预测专家
- **奇幻小说**：魔法体系、种族设定、奇幻世界专家
- **都市言情**：现代生活、情感描写、人物关系专家
- **悬疑推理**：谜题设计、线索铺设、推理逻辑专家

### 核心技能系统
- `/start` - 引导式小说创作入门
- `/design-review` - 小说设计评审
- `/chapter-write` - 章节创作
- `/plot-plan` - 情节规划
- `/character-develop` - 人物发展

## 🚀 快速开始

### 安装与配置
```bash
# 进入工作目录
cd /root/.openclaw/workspace/genius-writer

# 安装Python依赖
pip install -r requirements.txt

# 配置大模型API密钥
cp .env.example .env
# 编辑.env文件，添加您的API密钥

# 启动Web服务器
python app.py
```

### Web界面访问
1. 启动服务后访问：http://localhost:5000
2. 配置小说参数：主题、章节长度、字数等
3. 配置大模型：选择模型、调整参数
4. 开始创作

## 🏗️ 项目结构

```
genius-writer/
├── app.py                  # Flask Web应用
├── agent_core.py           # 智能体核心协调系统
├── requirements.txt        # Python依赖
├── .env.example           # 环境变量示例
├── static/                # 静态文件
│   ├── css/
│   │   └── style.css      # 样式表
│   ├── js/
│   │   └── app.js         # 前端交互
│   └── images/            # 图片资源
├── templates/             # HTML模板
│   ├── index.html         # 主页面
│   ├── config.html        # 配置页面
│   └── writing.html       # 创作页面
├── agents/                # 代理定义
│   ├── creative-director.yaml     # 创意总监
│   ├── literary-director.yaml     # 文学总监
│   └── producer.yaml              # 制作人
├── skills/                # 技能定义
│   ├── start.yaml         # 开始创作
│   ├── design-review.yaml # 设计评审
│   └── chapter-write.yaml # 章节创作
├── models/                # 大模型集成
│   ├── openai_client.py   # OpenAI客户端
│   ├── deepseek_client.py # DeepSeek客户端
│   └── huggingface_client.py # HuggingFace客户端
└── workflows/             # 工作流定义
    ├── novel_planning.py  # 小说规划工作流
    ├── chapter_writing.py # 章节创作工作流
    └── editing_review.py  # 编辑评审工作流
```

## 📖 功能详解

### 1. 小说配置
- **主题设置**：历史、科幻、奇幻、都市、悬疑等
- **章节结构**：章节数量、每章字数、章节标题模式
- **人物设定**：主要人物、次要人物、关系网络
- **世界观**：时代背景、地理环境、社会结构

### 2. 大模型配置
- **模型选择**：GPT-4、Claude、DeepSeek、文心一言等
- **参数调整**：温度、最大令牌数、重复惩罚等
- **风格预设**：文学风格、语言风格、创作风格

### 3. 创作流程
1. **大纲生成**：基于主题生成完整小说大纲
2. **分章规划**：将大纲分解为具体章节
3. **章节创作**：逐章生成内容
4. **连贯性检查**：确保情节、人物、时间线一致
5. **润色优化**：文学性、可读性提升

### 4. 协作功能
- **多代理协作**：不同专家代理共同创作
- **版本管理**：创作历史、版本对比
- **导出功能**：Markdown、Word、PDF格式导出

## 🛠️ 技术架构

### 后端技术栈
- **Web框架**：Flask (轻量级，适合快速开发)
- **智能体系统**：基于YAML定义的代理协调系统
- **大模型集成**：支持多种API接口的统一封装
- **任务队列**：Celery或RQ处理异步创作任务

### 前端技术栈
- **基础**：HTML5、CSS3、JavaScript
- **交互**：jQuery或Vue.js简化开发
- **样式**：Bootstrap或Tailwind CSS
- **可视化**：Chart.js用于创作进度展示

### 智能体系统
- **代理定义**：YAML格式，易于扩展
- **技能系统**：模块化技能，可组合使用
- **协调机制**：基于消息的代理间通信
- **状态管理**：持久化创作状态

## 🔧 配置说明

### 环境变量
```bash
# 大模型API密钥
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
CLAUDE_API_KEY=sk-...

# 应用配置
SECRET_KEY=your-secret-key
DEBUG=False
PORT=5000
```

### 代理配置
每个代理定义包含：
- **基本信息**：名称、描述、角色
- **能力定义**：专业技能、知识范围
- **交互规则**：如何与其他代理协作
- **提示模板**：与大模型交互的提示词

## 📈 扩展开发

### 添加新代理
1. 在`agents/`目录创建新的YAML文件
2. 定义代理角色和能力
3. 注册到智能体协调系统
4. 创建对应的技能

### 添加新模型
1. 在`models/`目录创建新的客户端
2. 实现统一的模型接口
3. 添加到模型工厂
4. 更新Web界面配置

### 自定义工作流
1. 在`workflows/`目录创建新工作流
2. 定义步骤和决策点
3. 集成到主创作流程
4. 测试验证效果

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 📞 联系与支持

如有问题或建议，请提交Issue或通过其他方式联系。

---

**开始你的AI小说创作之旅吧！** 🚀