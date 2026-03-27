#!/usr/bin/env python3
"""
章节创作工作流
基于小说大纲，生成具体章节内容
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

class ChapterWritingWorkflow:
    """章节创作工作流"""
    
    def __init__(self, agent_system=None, model_clients=None):
        """初始化章节创作工作流"""
        self.agent_system = agent_system
        self.model_clients = model_clients or {}
        self.workflow_steps = [
            'validate_input',
            'prepare_context',
            'coordinate_experts',
            'generate_chapter_content',
            'review_consistency',
            'apply_refinements',
            'finalize_chapter'
        ]
        
        logger.info("章节创作工作流初始化完成")
    
    def execute(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """执行章节创作工作流"""
        logger.info(f"开始执行章节创作工作流，配置: {json.dumps(config, ensure_ascii=False)[:200]}...")
        
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
                    if step_name in ['validate_input', 'generate_chapter_content']:
                        raise Exception(f"关键步骤 {step_name} 失败: {str(e)}")
            
            # 完成工作流
            context['end_time'] = datetime.now().isoformat()
            context['success'] = len(context['errors']) == 0
            
            return self.format_final_result(context)
            
        except Exception as e:
            logger.error(f"章节创作工作流执行失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'chapter': None,
            }
    
    def step_validate_input(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """验证输入配置"""
        config = context['config']
        required_fields = ['novel_id', 'chapter_number', 'outline']
        
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
        
        # 验证章节编号
        chapter_number = config['chapter_number']
        if chapter_number < 1:
            return {
                'valid': False,
                'error': '章节编号必须大于0',
                'should_terminate': True,
            }
        
        # 验证大纲结构
        outline = config['outline']
        if not isinstance(outline, dict) or 'chapters' not in outline:
            warnings = ['大纲格式不符合预期，可能影响创作质量']
        else:
            warnings = []
        
        return {
            'valid': True,
            'warnings': warnings,
            'should_terminate': False,
        }
    
    def step_prepare_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """准备创作上下文"""
        config = context['config']
        outline = config['outline']
        
        # 获取当前章节的大纲信息
        chapter_number = config['chapter_number']
        chapter_outline = self.get_chapter_outline(outline, chapter_number)
        
        # 获取前一章摘要（如果有）
        previous_chapter_summary = self.get_previous_chapter_summary(outline, chapter_number)
        
        # 获取小说基本信息
        novel_info = {
            'title': outline.get('title', '未知小说'),
            'genre': outline.get('genre', '未知类型'),
            'writing_style': config.get('writing_style', outline.get('config', {}).get('writing_style', '通俗性')),
            'target_words': config.get('target_words', 3000),
        }
        
        # 获取人物信息
        characters = outline.get('characters', {}).get('characters', [])
        
        context.update({
            'chapter_outline': chapter_outline,
            'previous_chapter_summary': previous_chapter_summary,
            'novel_info': novel_info,
            'characters': characters,
        })
        
        return {
            'success': True,
            'chapter_outline': chapter_outline,
            'has_previous_chapter': previous_chapter_summary is not None,
            'novel_info': novel_info,
            'character_count': len(characters),
            'should_terminate': False,
        }
    
    def step_coordinate_experts(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """协调专家代理"""
        config = context['config']
        novel_info = context['novel_info']
        
        # 确定需要的专家类型
        genre = novel_info['genre']
        expert_types = self.get_expert_types_for_genre(genre)
        
        if self.agent_system:
            # 协调相关专家代理
            coordination_result = self.agent_system.coordinate_agents(
                task='chapter_writing',
                context={
                    'novel_title': novel_info['title'],
                    'chapter_number': config['chapter_number'],
                    'genre': genre,
                    'expert_types': expert_types,
                }
            )
            
            # 更新项目进度
            project_id = f"novel_{config['novel_id']}"
            self.agent_system.update_project_progress(
                project_id=project_id,
                progress=int((config['chapter_number'] - 1) / 10 * 100),  # 简化计算
                status='writing'
            )
            
            return {
                'coordinated': True,
                'expert_types': expert_types,
                'agents_involved': coordination_result.get('coordinated_agents', []),
                'should_terminate': False,
            }
        else:
            # 模拟协调
            return {
                'coordinated': True,
                'expert_types': expert_types,
                'agents_involved': ['对话专家', '场景专家', f'{genre}专家'],
                'should_terminate': False,
            }
    
    def step_generate_chapter_content(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """生成章节内容"""
        config = context['config']
        chapter_outline = context['chapter_outline']
        previous_chapter_summary = context['previous_chapter_summary']
        novel_info = context['novel_info']
        characters = context['characters']
        
        # 选择模型客户端
        model_client = self.select_model_client(config)
        
        # 构建提示
        prompt = self.build_chapter_prompt(
            novel_info=novel_info,
            chapter_number=config['chapter_number'],
            chapter_outline=chapter_outline,
            previous_chapter_summary=previous_chapter_summary,
            characters=characters,
            writing_style=novel_info['writing_style'],
            target_words=novel_info['target_words']
        )
        
        # 生成章节内容
        try:
            if model_client:
                response = model_client.generate(
                    prompt=prompt,
                    model=config.get('model', 'gpt-4'),
                    temperature=config.get('temperature', 0.7),
                    max_tokens=min(novel_info['target_words'] * 2, 8000),
                )
                chapter_content = response['text']
                usage = response.get('usage', {})
            else:
                # 模拟生成
                chapter_content = self.mock_chapter_content(
                    novel_info=novel_info,
                    chapter_number=config['chapter_number'],
                    chapter_outline=chapter_outline
                )
                usage = {'total_tokens': len(chapter_content) // 4}
            
            # 分析章节内容
            analysis = self.analyze_chapter_content(chapter_content, novel_info['target_words'])
            
            return {
                'success': True,
                'chapter_content': chapter_content,
                'word_count': analysis['word_count'],
                'token_usage': usage.get('total_tokens', 0),
                'analysis': analysis,
                'should_terminate': False,
            }
            
        except Exception as e:
            logger.error(f"生成章节内容失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'should_terminate': True,
            }
    
    def step_review_consistency(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """审阅连贯性"""
        config = context['config']
        chapter_content = context['results']['generate_chapter_content']['chapter_content']
        novel_info = context['novel_info']
        outline = config['outline']
        
        # 检查与大纲的一致性
        consistency_issues = self.check_consistency_with_outline(
            chapter_content=chapter_content,
            chapter_outline=context['chapter_outline'],
            novel_outline=outline
        )
        
        # 检查人物一致性
        character_issues = self.check_character_consistency(
            chapter_content=chapter_content,
            characters=context['characters']
        )
        
        # 检查风格一致性
        style_issues = self.check_style_consistency(
            chapter_content=chapter_content,
            writing_style=novel_info['writing_style']
        )
        
        all_issues = consistency_issues + character_issues + style_issues
        
        # 如果有代理系统，可以协调文学总监进行专业审阅
        if self.agent_system and all_issues:
            try:
                review_result = self.agent_system.execute_skill(
                    skill_name='design_review',
                    params={
                        'target': 'chapter_content',
                        'focus': ['连贯性', '人物一致性', '风格统一性'],
                    },
                    context={
                        'chapter_content': chapter_content,
                        'issues': all_issues,
                    }
                )
                
                if review_result.get('success', False):
                    review_notes = review_result.get('result', '已通过代理审阅')
                else:
                    review_notes = '代理审阅失败，使用基础检查结果'
                    
            except Exception as e:
                logger.warning(f"代理审阅失败: {e}")
                review_notes = f'代理审阅异常: {str(e)}'
        else:
            review_notes = '基础一致性检查完成'
        
        return {
            'success': True,
            'consistency_issues': consistency_issues,
            'character_issues': character_issues,
            'style_issues': style_issues,
            'total_issues': len(all_issues),
            'review_notes': review_notes,
            'should_terminate': False,
        }
    
    def step_apply_refinements(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """应用优化"""
        config = context['config']
        chapter_content = context['results']['generate_chapter_content']['chapter_content']
        issues = context['results']['review_consistency']
        
        # 如果没有问题，直接使用原内容
        if issues['total_issues'] == 0:
            refined_content = chapter_content
            refinements_applied = []
        else:
            # 应用基础优化
            refined_content, refinements_applied = self.apply_basic_refinements(
                chapter_content=chapter_content,
                issues=issues,
                target_words=context['novel_info']['target_words']
            )
        
        # 进一步优化文笔（如果配置了）
        if config.get('enhance_writing_style', False):
            enhanced_content = self.enhance_writing_style(refined_content, context['novel_info']['writing_style'])
            
            if enhanced_content and len(enhanced_content) > len(refined_content) * 0.8:  # 确保优化有效
                refined_content = enhanced_content
                refinements_applied.append('文笔优化')
        
        # 分析优化后的内容
        refined_analysis = self.analyze_chapter_content(refined_content, context['novel_info']['target_words'])
        
        return {
            'success': True,
            'refined_content': refined_content,
            'refinements_applied': refinements_applied,
            'refined_word_count': refined_analysis['word_count'],
            'improvement_percentage': self.calculate_improvement_percentage(
                original=chapter_content,
                refined=refined_content
            ),
            'should_terminate': False,
        }
    
    def step_finalize_chapter(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """最终化章节"""
        config = context['config']
        refined_content = context['results']['apply_refinements']['refined_content']
        refined_analysis = self.analyze_chapter_content(refined_content, context['novel_info']['target_words'])
        
        # 生成章节ID
        chapter_id = f"chapter_{config['novel_id']}_{config['chapter_number']:03d}"
        
        # 构建完整的章节数据
        chapter_data = {
            'chapter_id': chapter_id,
            'novel_id': config['novel_id'],
            'chapter_number': config['chapter_number'],
            'title': context['chapter_outline'].get('title', f'第{config["chapter_number"]}章'),
            'content': refined_content,
            'metadata': {
                'created_at': datetime.now().isoformat(),
                'word_count': refined_analysis['word_count'],
                'writing_style': context['novel_info']['writing_style'],
                'refinements_applied': context['results']['apply_refinements']['refinements_applied'],
                'consistency_issues': context['results']['review_consistency']['total_issues'],
            },
            'analysis': refined_analysis,
        }
        
        # 如果有代理系统，记录到项目
        if self.agent_system:
            try:
                project_id = f"novel_{config['novel_id']}"
                self.agent_system.update_project_progress(
                    project_id=project_id,
                    progress=int(config['chapter_number'] / 10 * 100),  # 简化计算
                    status='writing'
                )
            except Exception as e:
                logger.warning(f"更新项目进度失败: {e}")
        
        return {
            'success': True,
            'chapter_id': chapter_id,
            'chapter_data': chapter_data,
            'should_terminate': False,
        }
    
    def get_chapter_outline(self, outline: Dict[str, Any], chapter_number: int) -> Dict[str, Any]:
        """获取指定章节的大纲"""
        chapters = outline.get('chapters', {}).get('chapters', [])
        
        for chapter in chapters:
            if chapter.get('chapter') == chapter_number:
                return chapter
        
        # 如果没有找到，创建默认大纲
        return {
            'chapter': chapter_number,
            'title': f'第{chapter_number}章',
            'summary': f'第{chapter_number}章的内容，基于整体故事发展。',
            'key_points': ['关键情节点1', '关键情节点2'],
            'characters': ['主人公', '配角'],
            'tone': '适中',
        }
    
    def get_previous_chapter_summary(self, outline: Dict[str, Any], chapter_number: int) -> Optional[str]:
        """获取前一章摘要"""
        if chapter_number <= 1:
            return None
        
        previous_chapter = self.get_chapter_outline(outline, chapter_number - 1)
        return previous_chapter.get('summary', None)
    
    def get_expert_types_for_genre(self, genre: str) -> List[str]:
        """根据小说类型获取需要的专家类型"""
        genre_experts = {
            '历史': ['历史专家', '时代背景专家', '历史人物专家'],
            '科幻': ['科幻专家', '科技设定专家', '未来预测专家'],
            '奇幻': ['奇幻专家', '魔法体系专家', '奇幻世界专家'],
            '都市': ['都市生活专家', '现代对话专家', '社会观察专家'],
            '悬疑': ['悬疑专家', '推理逻辑专家', '悬念设置专家'],
            '武侠': ['武侠专家', '武功描写专家', '江湖文化专家'],
            '言情': ['情感描写专家', '人物关系专家', '浪漫氛围专家'],
        }
        
        return genre_experts.get(genre, ['对话专家', '场景描写专家', '情节发展专家'])
    
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
    
    def build_chapter_prompt(self, novel_info: Dict[str, Any], chapter_number: int, 
                           chapter_outline: Dict[str, Any], previous_chapter_summary: Optional[str],
                           characters: List[Dict[str, Any]], writing_style: str, target_words: int) -> str:
        """构建章节创作提示"""
        
        # 构建人物描述
        character_descriptions = []
        for char in characters[:5]:  # 最多5个主要人物
            char_desc = f"- {char.get('name', '未知人物')}: {char.get('description', '无描述')}"
            character_descriptions.append(char_desc)
        
        characters_text = '\n'.join(character_descriptions) if character_descriptions else "无详细人物信息"
        
        prompt = f"""请创作小说《{novel_info['title']}》的第{chapter_number}章：{chapter_outline.get('title', f'第{chapter_number}章')}

小说类型：{novel_info['genre']}
写作风格：{writing_style}
目标字数：约{target_words}字

本章大纲：
{chapter_outline.get('summary', '无详细大纲')}

关键情节点：
{', '.join(chapter_outline.get('key_points', ['无关键点']))}

出场人物：
{characters_text}

情感基调：{chapter_outline.get('tone', '适中')}

{"上一章摘要：" + previous_chapter_summary if previous_chapter_summary else "这是小说的开头章节。"}

请创作完整的章节内容，要求：
1. 遵循本章大纲和关键情节点
2. 保持人物性格和关系的一致性
3. 使用指定的写作风格
4. 控制字数在目标范围内
5. 章节结尾自然过渡，为下一章铺垫
6. 包含适当的场景描写、人物对话和心理描写

请确保章节内容流畅自然，情节发展合理，符合小说整体风格。"""
        
        return prompt
    
    def analyze_chapter_content(self, content: str, target_words: int) -> Dict[str, Any]:
        """分析章节内容"""
        # 简单分析
        word_count = len(content)
        
        # 检查段落结构
        paragraphs = content.split('\n\n')
        paragraph_count = len([p for p in paragraphs if p.strip()])
        
        # 检查对话比例（简单统计）
        dialogue_lines = sum(1 for line in content.split('\n') if ':"' in line or ':"' in line or '说：' in line or '问道：' in line)
        total_lines = len(content.split('\n'))
        dialogue_ratio = dialogue_lines / max(total_lines, 1)
        
        # 评估字数符合度
        word_target_ratio = word_count / max(target_words, 1)
        
        return {
            'word_count': word_count,
            'paragraph_count': paragraph_count,
            'dialogue_ratio': round(dialogue_ratio, 2),
            'word_target_ratio': round(word_target_ratio, 2),
            'assessment': '良好' if 0.7 <= word_target_ratio <= 1.3 else '需要调整',
        }
    
    def check_consistency_with_outline(self, chapter_content: str, chapter_outline: Dict[str, Any], 
                                     novel_outline: Dict[str, Any]) -> List[str]:
        """检查与大纲的一致性"""
        issues = []
        
        # 检查关键情节点
        key_points = chapter_outline.get('key_points', [])
        for point in key_points:
            if point not in chapter_content:
                issues.append(f"关键情节点未体现: {point}")
        
        # 检查出场人物
        expected_characters = chapter_outline.get('characters', [])
        for character in expected_characters:
            if character not in chapter_content:
                issues.append(f"预期人物未出场: {character}")
        
        return issues
    
    def check_character_consistency(self, chapter_content: str, characters: List[Dict[str, Any]]) -> List[str]:
        """检查人物一致性"""
        issues = []
        
        for character in characters:
            char_name = character.get('name', '')
            if char_name and char_name in chapter_content:
                # 可以添加更复杂的人物一致性检查
                pass
        
        return issues
    
    def check_style_consistency(self, chapter_content: str, writing_style: str) -> List[str]:
        """检查风格一致性"""
        issues = []
        
        # 简单检查
        if writing_style == '文学性' and len(chapter_content) < 1000:
            issues.append("文学性风格建议更丰富的描写")
        
        return issues
    
    def apply_basic_refinements(self, chapter_content: str, issues: Dict[str, Any], target_words: int) -> Tuple[str, List[str]]:
        """应用基础优化"""
        refinements_applied = []
        refined_content = chapter_content
        
        # 调整字数（如果需要）
        current_words = len(refined_content)
        if current_words < target_words * 0.7:
            # 增加内容
            additional_text = f"\n\n【需要进一步丰富内容，以达到约{target_words}字的目标】"
            refined_content += additional_text
            refinements_applied.append('补充内容')
        elif current_words > target_words * 1.3:
            # 标记过长，实际应用中需要更复杂的处理
            refinements_applied.append('内容过长需要精简')
        
        # 处理一致性问题
        if issues['total_issues'] > 0:
            refinements_applied.append('处理一致性问题')
            # 在实际应用中，这里应该调用模型进行具体的修正
        
        return refined_content, refinements_applied
    
    def enhance_writing_style(self, content: str, writing_style: str) -> Optional[str]:
        """优化文笔"""
        # 在实际应用中，这里应该调用模型进行文笔优化
        # 这里只是模拟
        
        if writing_style == '文学性':
            # 模拟文学性优化
            enhanced = content
            # 实际应用中应该调用模型
            return enhanced
        
        return None
    
    def calculate_improvement_percentage(self, original: str, refined: str) -> float:
        """计算改进百分比"""
        # 简化计算，实际应用中需要更复杂的评估
        original_quality = len(original) / 1000  # 简化质量指标
        refined_quality = len(refined) / 1000
        
        if original_quality == 0:
            return 0.0
        
        improvement = (refined_quality - original_quality) / original_quality * 100
        return round(max(min(improvement, 100), 0), 2)
    
    def format_final_result(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """格式化最终结果"""
        if not context['success']:
            return {
                'success': False,
                'error': '; '.join(context['errors']),
                'chapter': None,
                'workflow_context': context,
            }
        
        chapter_data = context['results']['finalize_chapter']['chapter_data']
        
        return {
            'success': True,
            'chapter': chapter_data,
            'workflow_steps': len(self.workflow_steps),
            'completed_steps': context['current_step'],
            'errors': context['errors'],
            'warnings': context['warnings'],
            'execution_time': context.get('end_time', ''),
        }
    
    # 模拟生成方法（用于测试）
    def mock_chapter_content(self, novel_info: Dict[str, Any], chapter_number: int, 
                           chapter_outline: Dict[str, Any]) -> str:
        """模拟生成章节内容"""
        title = chapter_outline.get('title', f'第{chapter_number}章')
        summary = chapter_outline.get('summary', '本章内容概要')
        target_words = novel_info['target_words']
        
        return f"""《{novel_info['title']}》 - {title}

{summary}

清晨的第一缕阳光透过窗帘的缝隙，照在主人公的脸上。他缓缓睁开眼睛，新的一天开始了。

"今天会是重要的一天，"他对自己说，声音中带着一丝期待和紧张。

窗外，城市已经开始苏醒。远处传来车流的声音，近处是邻居家的动静。一切如常，却又似乎有什么不同。

（本章大约{target_words}字，包含场景描写、人物对话和情节发展。本章基于大纲创作，确保与整体故事保持一致。）

随着情节的推进，主人公面临新的选择和挑战。每一个决定都可能影响未来的道路，每一个相遇都可能改变命运的轨迹。

（本章完，为下一章的发展做好铺垫。）"""