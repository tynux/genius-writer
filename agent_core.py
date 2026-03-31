#!/usr/bin/env python3
"""
GeniusWriter智能体核心协调系统
参考Claude Code Game Studios架构，专为小说创作设计
"""

import os
import yaml
import json
import logging
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class AgentTier(Enum):
    """代理层级"""
    TIER1 = 1   # 总监层
    TIER2 = 2   # 部门主管层
    TIER3 = 3   # 专家层


@dataclass
class Agent:
    """代理定义"""
    name: str
    role: str
    tier: AgentTier
    description: str = ""
    skills: List[str] = field(default_factory=list)
    expertise: List[str] = field(default_factory=list)
    prompt_template: str = ""
    config: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'role': self.role,
            'tier': self.tier.value,
            'description': self.description,
            'skills': self.skills,
            'expertise': self.expertise,
            'config': self.config,
        }


@dataclass
class Skill:
    """技能定义"""
    name: str
    command: str
    description: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    handler: Optional[Callable] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'command': self.command,
            'description': self.description,
            'parameters': self.parameters,
        }


class GeniusWriterAgentSystem:
    """GeniusWriter智能体协调系统"""

    def __init__(self, config_path: str = None):
        self.config = self.load_config(config_path)
        # BUG FIX #8: 明确使用 Dict[str, Agent]，app.py 中遍历时用 .values()
        self.agents: Dict[str, Agent] = {}
        self.skills: Dict[str, Skill] = {}
        self.active_projects: Dict[str, Any] = {}
        self.conversation_history: List[Dict] = []

        self.load_agents()
        self.load_skills()

        logger.info(f"智能体系统初始化完成，加载了 {len(self.agents)} 个代理和 {len(self.skills)} 个技能")

    def load_config(self, config_path: str = None) -> Dict[str, Any]:
        """加载配置文件"""
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), 'agent.yaml')

        default_config = {
            'system': {
                'name': 'GeniusWriter',
                'version': '1.0.0',
                'description': 'AI小说创作智能体协调系统',
            },
            'paths': {
                'agents': 'agents',
                'skills': 'skills',
                'workflows': 'workflows',
            },
            'model_defaults': {
                'temperature': 0.7,
                'max_tokens': 4000,
                'model': 'gpt-4',
            }
        }

        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    loaded_config = yaml.safe_load(f)
                default_config.update(loaded_config)
                logger.info(f"从 {config_path} 加载配置")
            except Exception as e:
                logger.error(f"加载配置文件失败: {e}，使用默认配置")
                # BUG FIX #9: 加载失败时也要 return default_config，不能隐式返回 None

        return default_config  # BUG FIX #9: 无论是否成功加载文件，都返回 default_config

    def load_agents(self):
        """加载所有代理定义"""
        agents_dir = os.path.join(os.path.dirname(__file__), self.config['paths']['agents'])

        if not os.path.exists(agents_dir):
            logger.warning(f"代理目录不存在: {agents_dir}，创建默认代理")
            self.create_default_agents()
            return

        for filename in os.listdir(agents_dir):
            if filename.endswith('.yaml') or filename.endswith('.yml'):
                filepath = os.path.join(agents_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        agent_data = yaml.safe_load(f)

                    agent = Agent(
                        name=agent_data.get('name', filename[:-5]),
                        role=agent_data.get('role', ''),
                        tier=AgentTier(agent_data.get('tier', 3)),
                        description=agent_data.get('description', ''),
                        skills=agent_data.get('skills', []),
                        expertise=agent_data.get('expertise', []),
                        prompt_template=agent_data.get('prompt_template', ''),
                        config=agent_data.get('config', {}),
                    )
                    self.agents[agent.name] = agent
                    logger.info(f"加载代理: {agent.name} ({agent.role})")
                except Exception as e:
                    logger.error(f"加载代理文件失败 {filename}: {e}")

        if len(self.agents) == 0:
            logger.warning("未加载到任何代理，创建默认代理")
            self.create_default_agents()

    def create_default_agents(self):
        """创建默认代理集合"""
        default_agents = [
            # Tier 1
            Agent(
                name='creative_director',
                role='创意总监',
                tier=AgentTier.TIER1,
                description='负责整体创意方向、故事概念和艺术风格',
                skills=['story_concept', 'theme_development', 'style_guidance'],
                expertise=['创意策划', '故事概念', '艺术指导'],
                prompt_template="你是一位经验丰富的创意总监，擅长..."
            ),
            Agent(
                name='literary_director',
                role='文学总监',
                tier=AgentTier.TIER1,
                description='负责文学质量、语言风格和叙事技巧',
                skills=['literary_review', 'style_consistency', 'narrative_technique'],
                expertise=['文学批评', '语言风格', '叙事技巧'],
                prompt_template="你是一位资深的文学总监，精通..."
            ),
            Agent(
                name='producer',
                role='制作人',
                tier=AgentTier.TIER1,
                description='负责项目管理、进度协调和资源分配',
                skills=['project_management', 'coordination', 'resource_allocation'],
                expertise=['项目管理', '团队协调', '进度控制'],
                prompt_template="你是一位高效的项目制作人，擅长..."
            ),
            # Tier 2
            Agent(
                name='plot_designer',
                role='情节设计师',
                tier=AgentTier.TIER2,
                description='设计情节结构、故事弧线和冲突发展',
                skills=['plot_structure', 'story_arc', 'conflict_development'],
                expertise=['情节设计', '故事结构', '冲突构建'],
                prompt_template="你是一位专业的情节设计师，擅长..."
            ),
            Agent(
                name='character_designer',
                role='人物设计师',
                tier=AgentTier.TIER2,
                description='设计人物角色、性格发展和关系网络',
                skills=['character_creation', 'personality_development', 'relationship_building'],
                expertise=['人物塑造', '性格发展', '关系网络'],
                prompt_template="你是一位专业的人物设计师，擅长..."
            ),
            Agent(
                name='world_builder',
                role='世界观设计师',
                tier=AgentTier.TIER2,
                description='构建故事世界、时代背景和社会结构',
                skills=['world_building', 'historical_context', 'societal_structure'],
                expertise=['世界观构建', '历史背景', '社会结构'],
                prompt_template="你是一位专业的世界观设计师，擅长..."
            ),
            # Tier 3
            Agent(
                name='historical_expert',
                role='历史小说专家',
                tier=AgentTier.TIER3,
                description='历史考据、时代还原和历史人物塑造专家',
                skills=['historical_research', 'period_accuracy', 'historical_characterization'],
                expertise=['历史考据', '时代还原', '历史人物'],
                prompt_template="你是一位历史小说专家，精通..."
            ),
            Agent(
                name='scifi_expert',
                role='科幻小说专家',
                tier=AgentTier.TIER3,
                description='科幻设定、未来科技和宇宙观构建专家',
                skills=['sci_fi_setting', 'future_tech', 'cosmology_building'],
                expertise=['科幻设定', '未来科技', '宇宙观'],
                prompt_template="你是一位科幻小说专家，精通..."
            ),
            Agent(
                name='dialogue_expert',
                role='对话专家',
                tier=AgentTier.TIER3,
                description='对话创作、语言特色和人物声音塑造专家',
                skills=['dialogue_writing', 'language_style', 'voice_characterization'],
                expertise=['对话创作', '语言特色', '人物声音'],
                prompt_template="你是一位对话专家，精通..."
            ),
        ]

        for agent in default_agents:
            self.agents[agent.name] = agent

    def load_skills(self):
        """加载所有技能定义"""
        skills_dir = os.path.join(os.path.dirname(__file__), self.config['paths']['skills'])

        if not os.path.exists(skills_dir):
            logger.warning(f"技能目录不存在: {skills_dir}，创建默认技能")
            self.create_default_skills()
            return

        for filename in os.listdir(skills_dir):
            if filename.endswith('.yaml') or filename.endswith('.yml'):
                filepath = os.path.join(skills_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        skill_data = yaml.safe_load(f)

                    skill = Skill(
                        name=skill_data.get('name', filename[:-5]),
                        command=skill_data.get('command', ''),
                        description=skill_data.get('description', ''),
                        parameters=skill_data.get('parameters', {}),
                    )
                    self.skills[skill.name] = skill
                    logger.info(f"加载技能: {skill.name} ({skill.command})")
                except Exception as e:
                    logger.error(f"加载技能文件失败 {filename}: {e}")

        if len(self.skills) == 0:
            logger.warning("未加载到任何技能，创建默认技能")
            self.create_default_skills()

    def create_default_skills(self):
        """创建默认技能集合"""
        default_skills = [
            Skill(
                name='start_novel',
                command='/start',
                description='引导式小说创作入门，根据用户起始点自适应',
                parameters={
                    'genre': {'type': 'string', 'required': True},
                    'theme': {'type': 'string', 'required': False},
                    'target_length': {'type': 'number', 'required': False},
                }
            ),
            Skill(
                name='design_review',
                command='/design-review',
                description='小说设计评审，包括情节、人物、世界观等',
                parameters={
                    'target': {'type': 'string', 'required': True},
                    'focus': {'type': 'array', 'required': False},
                }
            ),
            Skill(
                name='write_chapter',
                command='/write-chapter',
                description='章节创作，基于大纲生成具体内容',
                parameters={
                    'chapter_number': {'type': 'number', 'required': True},
                    'outline': {'type': 'string', 'required': True},
                    'target_words': {'type': 'number', 'required': False},
                }
            ),
            Skill(
                name='plot_plan',
                command='/plot-plan',
                description='情节规划，设计故事结构和冲突发展',
                parameters={
                    'chapters': {'type': 'number', 'required': True},
                    'genre': {'type': 'string', 'required': True},
                }
            ),
            Skill(
                name='character_develop',
                command='/character-develop',
                description='人物发展，设计角色性格和关系网络',
                parameters={
                    'main_characters': {'type': 'number', 'required': True},
                    'complexity': {'type': 'string', 'required': False},
                }
            ),
        ]

        for skill in default_skills:
            self.skills[skill.name] = skill

    def get_agent(self, agent_name: str) -> Optional[Agent]:
        return self.agents.get(agent_name)

    def get_agents_by_tier(self, tier: AgentTier) -> List[Agent]:
        return [agent for agent in self.agents.values() if agent.tier == tier]

    def get_skill(self, skill_name: str) -> Optional[Skill]:
        return self.skills.get(skill_name)

    def execute_skill(self, skill_name: str, params: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """执行技能"""
        skill = self.get_skill(skill_name)
        if not skill:
            return {'success': False, 'error': f'技能不存在: {skill_name}'}

        for param_name, param_config in skill.parameters.items():
            if param_config.get('required', False) and param_name not in params:
                return {'success': False, 'error': f'缺少必要参数: {param_name}'}

        try:
            self.conversation_history.append({
                'type': 'skill_execution',
                'skill': skill_name,
                'params': params,
                'timestamp': self.get_timestamp(),
            })

            result = {
                'success': True,
                'skill': skill_name,
                'result': f'技能 {skill_name} 执行成功（模拟）',
                'data': {
                    'executed': True,
                    'timestamp': self.get_timestamp(),
                }
            }

            logger.info(f"执行技能: {skill_name}，参数: {params}")
            return result

        except Exception as e:
            logger.error(f"执行技能失败 {skill_name}: {e}")
            return {'success': False, 'error': str(e)}

    def coordinate_agents(self, task: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """协调多个代理完成任务"""
        logger.info(f"开始协调代理完成任务: {task}")

        if 'planning' in task or 'design' in task:
            tier1_agents = self.get_agents_by_tier(AgentTier.TIER1)
            tier2_agents = self.get_agents_by_tier(AgentTier.TIER2)
            selected_agents = tier1_agents + tier2_agents
        elif 'writing' in task or 'chapter' in task:
            tier2_agents = self.get_agents_by_tier(AgentTier.TIER2)
            tier3_agents = self.get_agents_by_tier(AgentTier.TIER3)
            selected_agents = tier2_agents + tier3_agents
        else:
            selected_agents = list(self.agents.values())

        coordination_result = {
            'success': True,
            'task': task,
            'coordinated_agents': [agent.name for agent in selected_agents],
            'steps': [],
            'result': '代理协调完成（模拟）',
        }

        self.conversation_history.append({
            'type': 'coordination',
            'task': task,
            'agents': [agent.name for agent in selected_agents],
            'timestamp': self.get_timestamp(),
        })

        logger.info(f"协调了 {len(selected_agents)} 个代理完成任务: {task}")
        return coordination_result

    def start_project(self, project_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """启动新项目"""
        project_id = f"project_{self.get_timestamp()}"
        project = {
            'id': project_id,
            'name': project_name,
            'config': config,
            'status': 'active',
            'created_at': self.get_timestamp(),
            'updated_at': self.get_timestamp(),
            'agents_involved': [],
            'progress': 0,
        }
        self.active_projects[project_id] = project

        self.conversation_history.append({
            'type': 'project_start',
            'project_id': project_id,
            'project_name': project_name,
            'timestamp': self.get_timestamp(),
        })

        logger.info(f"启动新项目: {project_name} (ID: {project_id})")
        return project

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        return self.active_projects.get(project_id)

    def update_project_progress(self, project_id: str, progress: int, status: str = None) -> bool:
        if project_id not in self.active_projects:
            return False
        project = self.active_projects[project_id]
        project['progress'] = progress
        project['updated_at'] = self.get_timestamp()
        if status:
            project['status'] = status
        return True

    def get_conversation_history(self, limit: int = 100) -> List[Dict]:
        return self.conversation_history[-limit:] if limit > 0 else self.conversation_history

    def clear_conversation_history(self):
        self.conversation_history = []

    @staticmethod
    def get_timestamp() -> str:
        from datetime import datetime
        return datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'system': self.config['system'],
            'agents_count': len(self.agents),
            'skills_count': len(self.skills),
            'active_projects_count': len(self.active_projects),
            'conversation_history_count': len(self.conversation_history),
        }


# 单例实例
_global_instance = None


def get_global_instance(config_path: str = None) -> GeniusWriterAgentSystem:
    """获取全局智能体系统实例"""
    global _global_instance
    if _global_instance is None:
        _global_instance = GeniusWriterAgentSystem(config_path)
    return _global_instance
