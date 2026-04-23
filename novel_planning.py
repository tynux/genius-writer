#!/usr/bin/env python3
"""
小说规划工作流
基于智能体协调系统，规划小说大纲和章节结构
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

class NovelPlanningWorkflow:
    """小说规划工作流"""
    
    def __init__(self, agent_system=None, model_clients=None):
        """初始化小说规划工作流"""
        self.agent_system = agent_system
        self.model_clients = model_clients or {}
        self.workflow_steps = [
            'validate_input',
            'coordinate_agents',
            'generate_story_concept',
            'design_characters',
            'plan_chapters',
            'review_and_refine',
            'finalize_outline'
        ]
        
        logger.info("小说规划工作流初始化完成")
    
    def execute(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """执行小说规划工作流"""
        logger.info(f"开始执行小说规划工作流，配置: {json.dumps(config, ensure_ascii=False)[:200]}...")
        
        try:
            # 创建工作流上下文
            context = {
                'config': config,
                'start_time': datetime.now().isoformat(),
                'current_step': 0,
                'results': {},
                'errors': [],
                'warnings': [],
            }
            
            # 逐步执行工作流
            for step_index, step_name in enumerate(self.workflow_steps):
                context['current_step'] = step_index + 1
                logger.info(f"执行步骤 {step_index + 1}/{len(self.workflow_steps)}: {step_name}")
                
                try:
                    step_method = getattr(self, f'step_{step_name}')
                    step_result = step_method(context)
                    context['results'][step_name] = step_result
                    
                    # 检查是否需要提前终止
                    if step_result.get('should_terminate', False):
                        logger.warning(f"工作流在步骤 {step_name} 提前终止")
                        break
                        
                except Exception as e:
                    error_msg = f"步骤 {step_name} 执行失败: {str(e)}"
                    logger.error(error_msg)
                    context['errors'].append(error_msg)
                    
                    # 如果是关键步骤失败，终止工作流
                    if step_name in ['validate_input', 'generate_story_concept']:
                        raise Exception(f"关键步骤 {step_name} 失败: {str(e)}")
            
            # 完成工作流
            context['end_time'] = datetime.now().isoformat()
            context['success'] = len(context['errors']) == 0
            
            return self.format_final_result(context)
            
        except Exception as e:
            logger.error(f"小说规划工作流执行失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'novel_id': None,
                'outline': None,
            }
    
    def step_validate_input(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """验证输入配置"""
        config = context['config']
        required_fields = ['title', 'genre', 'chapters', 'words_per_chapter']
        
        missing_fields = []
        for field in required_fields:
            if field not in config or not config[field]:
                missing_fields.append(field)
        
        if missing_fields:
            return {
                'valid': False,
                'missing_fields': missing_fields,
                'should_terminate': True,
            }
        
        # 验证数值范围
        warnings = []
        
        chapters = config['chapters']
        if chapters < 1:
            warnings.append('章节数量应大于0')
        elif chapters > 100:
            warnings.append('章节数量过多，建议不超过100章')
        
        words_per_chapter = config['words_per_chapter']
        if words_per_chapter < 500:
            warnings.append('每章字数过少，建议至少500字')
        elif words_per_chapter > 10000:
            warnings.append('每章字数过多，建议不超过10000字')
        
        return {
            'valid': True,
            'warnings': warnings,
            'should_terminate': False,
        }
    
    def step_coordinate_agents(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """协调智能体"""
        config = context['config']
        
        if self.agent_system:
            # 协调相关代理
            coordination_result = self.agent_system.coordinate_agents(
                task='novel_planning',
                context={
                    'genre': config['genre'],
                    'chapters': config['chapters'],
                    'words_per_chapter': config['words_per_chapter'],
                }
            )
            
            # 启动项目
            project_name = f"{config['title']} - 小说规划"
            project = self.agent_system.start_project(project_name, config)
            
            return {
                'coordinated': True,
                'project_id': project['id'],
                'agents_involved': coordination_result.get('coordinated_agents', []),
                'should_terminate': False,
            }
        else:
            # 模拟协调
            return {
                'coordinated': True,
                'project_id': f"project_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'agents_involved': ['创意总监', '情节设计师', '人物设计师'],
                'should_terminate': False,
            }
    
    def step_generate_story_concept(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """生成故事概念"""
        config = context['config']
        
        # 选择模型客户端
        model_client = self.select_model_client(config)
        
        # 构建提示
        prompt = self.build_story_concept_prompt(config)
        
        # 生成故事概念
        try:
            if model_client:
                response = model_client.generate(
                    prompt=prompt,
                    model=config.get('model', 'gpt-4'),
                    temperature=config.get('temperature', 0.7),
                    max_tokens=config.get('max_tokens', 2000),
                )
                story_concept = response['text']
            else:
                # 模拟生成
                story_concept = self.mock_story_concept(config)
            
            # 解析故事概念
            parsed_concept = self.parse_story_concept(story_concept)
            
            return {
                'success': True,
                'story_concept': story_concept,
                'parsed_concept': parsed_concept,
                'should_terminate': False,
            }
            
        except Exception as e:
            logger.error(f"生成故事概念失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'should_terminate': True,
            }
    
    def step_design_characters(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """设计人物角色"""
        config = context['config']
        story_concept = context['results']['generate_story_concept']['parsed_concept']
        
        # 选择模型客户端
        model_client = self.select_model_client(config)
        
        # 构建提示
        prompt = self.build_character_design_prompt(config, story_concept)
        
        # 生成人物设计
        try:
            if model_client:
                response = model_client.generate(
                    prompt=prompt,
                    model=config.get('model', 'gpt-4'),
                    temperature=config.get('temperature', 0.7),
                    max_tokens=config.get('max_tokens', 2000),
                )
                character_design = response['text']
            else:
                # 模拟生成
                character_design = self.mock_character_design(config)
            
            # 解析人物设计
            parsed_characters = self.parse_character_design(character_design)
            
            return {
                'success': True,
                'character_design': character_design,
                'parsed_characters': parsed_characters,
                'should_terminate': False,
            }
            
        except Exception as e:
            logger.error(f"设计人物角色失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'should_terminate': False,  # 非关键步骤，继续执行
            }
    
    def step_plan_chapters(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """规划章节结构"""
        config = context['config']
        story_concept = context['results']['generate_story_concept']['parsed_concept']
        characters = context['results']['design_characters']['parsed_characters']
        
        # 选择模型客户端
        model_client = self.select_model_client(config)
        
        # 构建提示
        prompt = self.build_chapter_planning_prompt(config, story_concept, characters)
        
        # 生成章节规划
        try:
            if model_client:
                response = model_client.generate(
                    prompt=prompt,
                    model=config.get('model', 'gpt-4'),
                    temperature=config.get('temperature', 0.7),
                    max_tokens=config.get('max_tokens', 3000),
                )
                chapter_plan = response['text']
            else:
                # 模拟生成
                chapter_plan = self.mock_chapter_plan(config)
            
            # 解析章节规划
            parsed_chapters = self.parse_chapter_plan(chapter_plan, config['chapters'])
            
            return {
                'success': True,
                'chapter_plan': chapter_plan,
                'parsed_chapters': parsed_chapters,
                'should_terminate': False,
            }
            
        except Exception as e:
            logger.error(f"规划章节结构失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'should_terminate': False,  # 非关键步骤，继续执行
            }
    
    def step_review_and_refine(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """审阅和优化"""
        config = context['config']
        
        # 收集所有生成的内容
        story_concept = context['results']['generate_story_concept']['parsed_concept']
        characters = context['results']['design_characters']['parsed_characters']
        chapters = context['results']['plan_chapters']['parsed_chapters']
        
        # 构建完整大纲
        full_outline = self.build_full_outline(config, story_concept, characters, chapters)
        
        # 如果有代理系统，可以协调文学总监进行审阅
        if self.agent_system:
            try:
                # 模拟代理审阅
                review_result = self.agent_system.execute_skill(
                    skill_name='design_review',
                    params={
                        'target': 'full_outline',
                        'focus': ['情节连贯性', '人物一致性', '结构合理性'],
                    },
                    context={'outline': full_outline}
                )
                
                if review_result.get('success', False):
                    # 应用审阅建议（简化处理）
                    refined_outline = self.apply_review_suggestions(full_outline, review_result)
                else:
                    refined_outline = full_outline
                    
            except Exception as e:
                logger.warning(f"代理审阅失败: {e}")
                refined_outline = full_outline
        else:
            refined_outline = full_outline
        
        return {
            'success': True,
            'original_outline': full_outline,
            'refined_outline': refined_outline,
            'should_terminate': False,
        }
    
    def step_finalize_outline(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """最终化大纲"""
        refined_outline = context['results']['review_and_refine']['refined_outline']
        
        # 生成最终的小说ID
        novel_id = f"novel_{datetime.now().strftime('%Y%m%d%H%M%S')}_{hash(refined_outline) % 10000:04d}"
        
        # 构建完整的响应
        final_outline = {
            'novel_id': novel_id,
            'metadata': {
                'created_at': datetime.now().isoformat(),
                'config': context['config'],
            },
            'content': refined_outline,
        }
        
        return {
            'success': True,
            'novel_id': novel_id,
            'final_outline': final_outline,
            'should_terminate': False,
        }
    
    def select_model_client(self, config: Dict[str, Any]):
        """选择模型客户端"""
        model_name = config.get('model', 'openai')
        
        if self.model_clients and model_name in self.model_clients:
            return self.model_clients[model_name]
        
        # 如果没有指定模型客户端，使用第一个可用的
        if self.model_clients:
            for client in self.model_clients.values():
                return client
        
        return None
    
    def build_story_concept_prompt(self, config: Dict[str, Any]) -> str:
        """构建故事概念提示"""
        title = config['title']
        genre = config['genre']
        chapters = config['chapters']
        words_per_chapter = config['words_per_chapter']
        additional_info = config.get('additional_info', '')
        writing_style = config.get('writing_style', '通俗性')
        
        prompt = f"""你是一位专业的小说策划师，请为小说《{title}》创作详细完整的故事概念。

小说类型：{genre}
章节数量：{chapters}章
每章字数：约{words_per_chapter}字
写作风格：{writing_style}
总字数：约{chapters * words_per_chapter}字

{additional_info if additional_info else "无额外要求"}

请提供以下详细内容：
1. **核心故事概念**（200-300字）
   - 一句话概括故事核心
   - 主角的核心目标
   - 故事的主要驱动力

2. **故事背景和世界观**（详细描述）
   - 时代背景（古代/现代/未来/架空）
   - 地理环境（城市/乡村/异世界）
   - 社会结构（权力体系/文化特点）
   - 特殊设定（如有魔法、科技等）

3. **主要冲突和主题**
   - 核心冲突（人与人/人与社会/人与自我/人与自然）
   - 主题思想（成长、爱情、正义、自由等）
   - 道德困境（如果有）

4. **故事结构规划**
   - 开端（第1-{max(3, chapters//5)}章）：引入主角、背景、触发事件
   - 发展（第{max(4, chapters//5+1)}-{chapters*3//4}章）：冲突升级、人物发展、次要情节
   - 高潮（第{chapters*3//4+1}-{chapters-1}章）：最终对决、核心冲突解决
   - 结局（第{chapters}章）：问题解决、人物命运、主题升华

5. **目标读者群体和预期效果**
   - 主要读者年龄段
   - 预期情感体验（悬疑紧张/温馨治愈/热血激昂等）
   - 商业价值和市场定位

请确保故事概念具有独创性、逻辑性和商业吸引力，为后续章节规划和人物设计提供坚实基础。"""
        
        return prompt
    
    def build_character_design_prompt(self, config: Dict[str, Any], story_concept: Dict[str, Any]) -> str:
        """构建人物设计提示"""
        title = config['title']
        genre = config['genre']
        chapters = config['chapters']
        words_per_chapter = config['words_per_chapter']
        
        # 提取故事概念的核心部分
        core_concept = story_concept.get('core_concept', '成长与冒险的故事')
        if isinstance(core_concept, dict):
            core_concept_text = core_concept.get('text', '成长与冒险的故事') if isinstance(core_concept, dict) else str(core_concept)
        else:
            core_concept_text = str(core_concept)
        
        prompt = f"""你是一位专业的角色设计师，请为小说《{title}》设计完整的人物体系。

小说类型：{genre}
章节数量：{chapters}章
每章字数：约{words_per_chapter}字
总字数：约{chapters * words_per_chapter}字
故事核心概念：{core_concept_text[:500]}...

请设计以下人物体系：

1. **主人公（主角）** - 故事的核心人物
   - 姓名、年龄、性别、外貌特征
   - 出身背景、家庭环境、教育经历
   - 核心性格特点（优点、缺点、矛盾点）
   - 内心欲望、恐惧、梦想
   - 初始状态 → 成长变化 → 最终状态（完整人物弧线）
   - 核心技能或特殊能力
   - 在故事中的主要作用

2. **主要配角**（至少3个重要配角）
   每个配角包括：
   - 姓名、基本背景、与主角的关系
   - 性格特点、在故事中的功能（导师、盟友、爱人、竞争对手等）
   - 个人目标、与主角的互动方式
   - 成长变化（如果有）

3. **反派角色**（如适用）
   - 姓名、背景、动机（为什么成为反派）
   - 性格特点、能力、弱点
   - 与主角的冲突本质（理念冲突/利益冲突/情感冲突）
   - 是否可能转化或和解

4. **次要人物**（功能性角色）
   - 列出必要的功能性角色（如导师、帮手、阻碍者等）
   - 简要说明每个角色的作用

5. **人物关系网**
   - 人物之间的关系图谱
   - 主要矛盾关系
   - 情感发展线（友情、爱情、亲情、师徒情等）

6. **人物与情节的关联**
   - 每个人物如何推动情节发展
   - 关键情节节点上人物的作用
   - 人物命运如何与主题呼应

请确保人物设计：
- 具有深度和复杂性，避免脸谱化
- 人物动机合理，行为符合性格
- 人物关系有张力，能制造戏剧冲突
- 支持{chapters}章的故事发展需要"""
        
        return prompt
    
    def build_chapter_planning_prompt(self, config: Dict[str, Any], story_concept: Dict[str, Any], characters: Dict[str, Any]) -> str:
        """构建章节规划提示"""
        title = config['title']
        genre = config['genre']
        chapters = config['chapters']
        words_per_chapter = config['words_per_chapter']
        total_words = chapters * words_per_chapter
        
        # 准备人物信息摘要
        characters_summary = "主要人物："
        if isinstance(characters, dict) and 'characters' in characters:
            for char in characters['characters'][:5]:  # 只显示前5个主要人物
                if isinstance(char, dict):
                    name = char.get('name', '未知人物')
                    role = char.get('role', '未知角色')
                    desc = char.get('description', '无描述')[:100]
                    characters_summary += f"\n- {name} ({role}): {desc}"
        else:
            characters_summary = str(characters)[:500]
        
        prompt = f"""你是一位专业的编剧和故事架构师，请为小说《{title}》规划详细完整的章节大纲。

小说基本信息：
- 标题：《{title}》
- 类型：{genre}
- 总章节：{chapters}章
- 每章字数：约{words_per_chapter}字
- 总字数：约{total_words}字
- 写作风格：{config.get('writing_style', '通俗性')}

故事核心概念：
{story_concept.get('core_concept', '成长与冒险的故事')[:800]}

{characters_summary}

请按照以下要求规划完整的{chapters}章大纲：

**整体故事结构（经典三幕剧）：**
1. **第一幕：开端**（第1-{max(3, chapters//5)}章，约{max(3, chapters//5) * words_per_chapter}字）
   - 引入主角和世界观
   - 建立初始状态和日常
   - 触发事件（激励事件）
   - 主角接受挑战/踏上旅程

2. **第二幕：发展**（第{max(4, chapters//5+1)}-{chapters*3//4}章，约{(chapters*3//4 - max(4, chapters//5+1) + 1) * words_per_chapter}字）
   - 冲突升级，困难增加
   - 人物成长和关系发展
   - 次要情节展开
   - 中点转折（重大发现或失败）

3. **第三幕：高潮和结局**（第{chapters*3//4+1}-{chapters}章，约{(chapters - chapters*3//4) * words_per_chapter}字）
   - 最终冲突前的准备
   - 高潮对决（情感/动作/智慧高潮）
   - 问题解决和主题揭示
   - 结局收尾和人物命运交代

**请为每一章提供详细规划：**

第1章：引入
- 章节标题（吸引人的标题）
- 开场场景（具体的时间、地点、事件）
- 主要情节（100-150字详细描述）
- 出场人物（主角必须出场，其他相关人物）
- 关键情节点（本章最重要的情节转折）
- 情感基调（紧张、温馨、悬疑等）
- 章节结尾（悬念或过渡到下章）
- 预估字数：约{words_per_chapter}字

第2章：发展
- ...（同样详细规划）

...（依次规划所有{chapters}章）

第{chapters}章：结局
- 章节标题（体现结局感的标题）
- 最终场景描述
- 主要情节（完整解决所有主线）
- 出场人物（所有重要人物结局交代）
- 关键情节点（最终解决）
- 情感基调（圆满、悲壮、开放式等）
- 章节结尾（故事最终收尾）
- 预估字数：约{words_per_chapter}字

**额外要求：**
1. 确保情节发展有节奏感，张弛有度
2. 每章都有明确的起承转合
3. 人物发展要连贯，性格变化合理
4. 伏笔和照应要精心设计
5. 情感线要自然发展
6. 考虑商业性和读者期待

请输出完整详细的{chapters}章大纲，这将直接用于后续的章节创作。"""
        
        return prompt
    
    def parse_story_concept(self, text: str) -> Dict[str, Any]:
        """解析故事概念文本"""
        # 简化解析逻辑
        return {
            'core_concept': text[:500] if len(text) > 500 else text,
            'background': '故事背景解析',
            'conflict': '主要冲突解析',
            'theme': '主题解析',
            'tone': '情感基调解析',
        }
    
    def parse_character_design(self, text: str) -> Dict[str, Any]:
        """解析人物设计文本"""
        # 简化解析逻辑
        return {
            'characters': [
                {
                    'name': '主人公',
                    'role': '主角',
                    'description': '故事的核心人物',
                    'personality': '勇敢、善良、有成长空间',
                },
                {
                    'name': '重要配角',
                    'role': '配角',
                    'description': '推动情节发展的人物',
                    'personality': '忠诚、聪明、有特色',
                },
            ]
        }
    
    def parse_chapter_plan(self, text: str, total_chapters: int) -> Dict[str, Any]:
        """解析章节规划文本"""
        chapters = []
        
        # 生成模拟章节
        for i in range(1, min(total_chapters + 1, 10)):  # 最多显示10章
            chapters.append({
                'chapter': i,
                'title': f'第{i}章 章节标题',
                'summary': f'第{i}章的内容概要，基于章节规划生成。',
                'key_points': ['关键情节点1', '关键情节点2'],
                'characters': ['主人公', '配角'],
                'tone': '紧张/轻松/感人',
            })
        
        return {
            'total_chapters': total_chapters,
            'chapters': chapters,
        }
    
    def build_full_outline(self, config: Dict[str, Any], story_concept: Dict[str, Any], 
                          characters: Dict[str, Any], chapters: Dict[str, Any]) -> Dict[str, Any]:
        """构建完整大纲"""
        return {
            'title': config['title'],
            'genre': config['genre'],
            'config': config,
            'story_concept': story_concept,
            'characters': characters,
            'chapters': chapters,
            'created_at': datetime.now().isoformat(),
        }
    
    def apply_review_suggestions(self, outline: Dict[str, Any], review_result: Dict[str, Any]) -> Dict[str, Any]:
        """应用审阅建议"""
        # 简化处理，实际应用中需要更复杂的逻辑
        outline['reviewed'] = True
        outline['reviewed_at'] = datetime.now().isoformat()
        outline['review_notes'] = '已通过代理审阅'
        
        return outline
    
    def format_final_result(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """格式化最终结果"""
        if not context['success']:
            return {
                'success': False,
                'error': '; '.join(context['errors']),
                'novel_id': None,
                'outline': None,
                'workflow_context': context,
            }
        
        final_outline = context['results']['finalize_outline']['final_outline']
        
        return {
            'success': True,
            'novel_id': final_outline['novel_id'],
            'outline': final_outline,
            'workflow_steps': len(self.workflow_steps),
            'completed_steps': context['current_step'],
            'errors': context['errors'],
            'warnings': context['warnings'],
            'execution_time': context.get('end_time', ''),
        }
    
    # 模拟生成方法（用于测试）
    def mock_story_concept(self, config: Dict[str, Any]) -> str:
        """模拟生成故事概念"""
        return f"""故事概念：《{config['title']}》

核心概念：这是一个关于成长与冒险的故事，讲述了主人公在面对挑战时的内心成长和外在世界的变化。

故事背景：设定在一个充满机遇和挑战的世界中，主人公需要克服重重困难实现自己的目标。

主要冲突：个人理想与现实限制的冲突，友情与责任的抉择。

主题：成长、勇气、友情、自我发现。

目标读者：青少年和年轻成人群体。

情感基调：积极向上，充满希望，带有适度的紧张感。"""
    
    def mock_character_design(self, config: Dict[str, Any]) -> str:
        """模拟生成人物设计"""
        return f"""人物设计：《{config['title']}》

1. 主人公 - 李明
   背景：普通家庭的年轻人，有着远大的理想
   性格：勇敢、善良、有责任心，但也有犹豫和迷茫的时候
   成长弧线：从懵懂到成熟，从逃避到担当
   关系：与家人、朋友、导师的复杂关系
   作用：故事的核心推动者

2. 重要配角 - 王雪
   背景：聪明独立的女性，有着自己的梦想和追求
   性格：坚定、智慧、有同情心
   成长弧线：从旁观者到参与者，从理性到感性
   关系：主人公的重要支持者和伙伴
   作用：推动情节发展，提供情感支持

3. 反派角色 - 张强
   背景：曾经的成功者，因挫折而变得偏执
   性格：聪明但固执，有能力但缺乏同理心
   成长弧线：从对抗到理解，从对立到和解
   关系：主人公的竞争对手和成长催化剂
   作用：制造冲突，推动主人公成长"""
    
    def mock_chapter_plan(self, config: Dict[str, Any]) -> str:
        """模拟生成章节规划"""
        chapters = config['chapters']
        
        plan = f"""章节规划：《{config['title']}》 - 共{chapters}章

第一幕：开端（第1-{max(3, chapters//5)}章）
第1章：故事的开始 - 引入主人公和背景
第2章：初次挑战 - 主人公面临第一个考验
第3章：遇见伙伴 - 结识重要的朋友和支持者

第二幕：发展（第{max(4, chapters//5+1)}-{chapters*3//4}章）
...（中间章节展开情节，发展人物关系，升级冲突）

第三幕：高潮和结局（第{chapters*3//4+1}-{chapters}章）
第{chapters-2}章：最终对决 - 解决主要冲突
第{chapters-1}章：尘埃落定 - 处理后果和反思
第{chapters}章：新的开始 - 展望未来，故事收尾

每章约{config['words_per_chapter']}字，确保情节节奏合理，人物发展充分。"""
        
        return plan