#!/usr/bin/env python3
"""
DeepSeek模型客户端
封装DeepSeek API，用于小说创作
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

logger = logging.getLogger(__name__)

class DeepSeekClient:
    """DeepSeek API客户端"""
    
    def __init__(self, api_key: str = None, base_url: str = None):
        """初始化DeepSeek客户端"""
        self.api_key = api_key or os.getenv('DEEPSEEK_API_KEY')
        self.base_url = base_url or os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1')
        
        if not self.api_key:
            logger.warning("DeepSeek API密钥未配置，将使用模拟模式")
            self.simulated = True
        else:
            self.simulated = False
            try:
                from openai import OpenAI
                import openai
                
                # 记录openai版本，便于调试
                openai_version = getattr(openai, '__version__', 'unknown')
                logger.info(f"使用openai库版本: {openai_version}")
                
                # 简单版本检测：检查openai版本号
                # openai 1.3.0使用旧式API，新版本使用新式API
                if openai_version.startswith('1.3.') or openai_version == '1.3.0' or openai_version.startswith('1.2.') or openai_version.startswith('1.1.') or openai_version.startswith('1.0.'):
                    logger.info(f"检测到openai {openai_version}版本，使用旧式API")
                    # 设置全局API密钥和base_url
                    openai.api_key = self.api_key
                    openai.base_url = self.base_url
                    # 标记为使用旧式API
                    self.use_legacy_api = True
                    self.client = None
                    logger.info("DeepSeek客户端初始化成功 (旧式API)")
                else:
                    logger.info(f"检测到openai {openai_version}版本，尝试使用新式客户端API")
                    # 对于较新版本，尝试使用标准客户端
                    try:
                        # 首先尝试不带proxies参数
                        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
                        self.use_legacy_api = False
                        logger.info("DeepSeek客户端初始化成功 (新式API，不带proxies)")
                    except TypeError as e:
                        if 'proxies' in str(e):
                            # 尝试带proxies=None
                            try:
                                self.client = OpenAI(api_key=self.api_key, base_url=self.base_url, proxies=None)
                                self.use_legacy_api = False
                                logger.info("DeepSeek客户端初始化成功 (新式API，带proxies=None)")
                            except Exception as e2:
                                logger.error(f"新式API初始化失败: {e2}")
                                raise
                        else:
                            raise
                    
            except ImportError:
                logger.warning("未安装openai库，将使用模拟模式")
                self.simulated = True
            except Exception as e:
                logger.error(f"DeepSeek客户端初始化失败: {e}")
                logger.info("将使用模拟模式")
                self.simulated = True
    
    def generate(self, 
                prompt: str, 
                model: str = "deepseek-chat", 
                temperature: float = 0.7,
                max_tokens: int = 4000,
                **kwargs) -> Dict[str, Any]:
        """生成文本"""
        
        if self.simulated:
            return self._simulate_generate(prompt, model, max_tokens)
        
        try:
            # 构建请求参数
            messages = [
                {"role": "system", "content": "你是一位专业的小说创作助手，擅长各种类型的小说创作。"},
                {"role": "user", "content": prompt}
            ]
            
            # 根据API类型调用不同的方法
            if hasattr(self, 'use_legacy_api') and self.use_legacy_api:
                logger.info(f"使用旧式API调用DeepSeek (模型: {model})")
                # 旧式API (openai 1.3.0)
                import openai
                response = openai.ChatCompletion.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                
                # 解析响应 (旧式API格式)
                result = {
                    'text': response.choices[0].message.content,
                    'model': model,
                    'usage': {
                        'prompt_tokens': response.usage.get('prompt_tokens', 0),
                        'completion_tokens': response.usage.get('completion_tokens', 0),
                        'total_tokens': response.usage.get('total_tokens', 0),
                    },
                    'finish_reason': response.choices[0].finish_reason,
                    'timestamp': datetime.now().isoformat(),
                }
            else:
                logger.info(f"使用新式客户端API调用DeepSeek (模型: {model})")
                # 新式API (openai >= 1.4.0)
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                
                # 解析响应 (新式API格式)
                result = {
                    'text': response.choices[0].message.content,
                    'model': model,
                    'usage': {
                        'prompt_tokens': response.usage.prompt_tokens,
                        'completion_tokens': response.usage.completion_tokens,
                        'total_tokens': response.usage.total_tokens,
                    },
                    'finish_reason': response.choices[0].finish_reason,
                    'timestamp': datetime.now().isoformat(),
                }
            
            logger.info(f"DeepSeek生成成功，使用 {result['usage']['total_tokens']} tokens")
            return result
            
        except Exception as e:
            logger.error(f"DeepSeek生成失败: {e}")
            # 失败时返回模拟结果
            return self._simulate_generate(prompt, model, max_tokens)
    
    def generate_with_agent(self,
                          agent_prompt: str,
                          user_prompt: str,
                          model: str = "deepseek-chat",
                          **kwargs) -> Dict[str, Any]:
        """使用代理提示生成文本"""
        full_prompt = f"{agent_prompt}\n\n用户请求: {user_prompt}"
        return self.generate(full_prompt, model, **kwargs)
    
    def generate_novel_outline(self,
                             title: str,
                             genre: str,
                             chapters: int,
                             words_per_chapter: int,
                             additional_info: str = "",
                             model: str = "deepseek-chat",
                             **kwargs) -> Dict[str, Any]:
        """生成小说大纲"""
        prompt = f"""请为小说《{title}》创作完整的大纲。

小说类型：{genre}
章节数量：{chapters}章
每章字数：约{words_per_chapter}字

{additional_info if additional_info else "无额外要求"}

请按照以下格式提供大纲：
1. 故事概要（200-300字）
2. 主要人物介绍（至少3个主要人物）
3. 章节安排（列出所有章节的标题和简要内容）
4. 核心冲突和主题
5. 预期读者群体

请确保大纲具有逻辑性和可读性，适合后续章节创作。"""
        
        return self.generate(prompt, model, **kwargs)
    
    def generate_chapter(self,
                       novel_title: str,
                       chapter_number: int,
                       chapter_title: str,
                       chapter_outline: str,
                       previous_chapter_summary: str = "",
                       target_words: int = 3000,
                       writing_style: str = "文学性",
                       model: str = "deepseek-chat",
                       **kwargs) -> Dict[str, Any]:
        """生成小说章节"""
        prompt = f"""请创作小说《{novel_title}》的第{chapter_number}章：{chapter_title}

本章大纲：{chapter_outline}

目标字数：约{target_words}字
写作风格：{writing_style}

{"上一章摘要：" + previous_chapter_summary if previous_chapter_summary else "这是小说的开头章节。"}

请创作完整的章节内容，包括：
1. 场景描写
2. 人物对话
3. 情节发展
4. 心理描写（如适用）
5. 章节结尾（为下一章铺垫）

请确保章节内容流畅自然，符合小说整体风格，并控制字数在目标范围内。"""
        
        return self.generate(prompt, model, max_tokens=min(target_words * 2, 8000), **kwargs)
    
    def review_and_edit(self,
                      text: str,
                      focus_areas: List[str] = None,
                      model: str = "deepseek-chat",
                      **kwargs) -> Dict[str, Any]:
        """审阅和编辑文本"""
        if focus_areas is None:
            focus_areas = ["文学质量", "情节连贯性", "人物一致性", "语言表达"]
        
        focus_text = "、".join(focus_areas)
        prompt = f"""请审阅以下小说文本，并给出改进建议：

{text}

请重点关注的方面：{focus_text}

请按照以下格式提供反馈：
1. 总体评价
2. 具体问题（按关注方面分类）
3. 修改建议
4. 修改后的文本（可选）

请确保反馈具体、有建设性，并提供实际的改进建议。"""
        
        return self.generate(prompt, model, **kwargs)
    
    def analyze_writing_style(self,
                            text: str,
                            model: str = "deepseek-chat",
                            **kwargs) -> Dict[str, Any]:
        """分析写作风格"""
        prompt = f"""请分析以下文本的写作风格：

{text}

请分析以下方面：
1. 语言特点（词汇、句式、修辞手法）
2. 叙事视角和节奏
3. 情感表达方式
4. 与同类作品的风格对比
5. 风格改进建议

请提供详细的分析，并举例说明。"""
        
        return self.generate(prompt, model, **kwargs)
    
    def continue_writing(self,
                       previous_text: str,
                       direction: str = "",
                       target_words: int = 1000,
                       model: str = "deepseek-chat",
                       **kwargs) -> Dict[str, Any]:
        """续写文本"""
        prompt = f"""请继续创作以下文本：

{previous_text}

{"续写方向：" + direction if direction else "请自然延续故事情节"}

目标字数：约{target_words}字

请确保续写内容与原文风格一致，情节连贯自然。"""
        
        return self.generate(prompt, model, max_tokens=min(target_words * 2, 8000), **kwargs)
    
    def _simulate_generate(self, prompt: str, model: str, max_tokens: int) -> Dict[str, Any]:
        """模拟生成文本（用于测试或API不可用时）"""
        logger.info(f"模拟生成，模型: {model}, 提示长度: {len(prompt)}")
        
        # 简单的模拟逻辑
        if "大纲" in prompt or "outline" in prompt.lower():
            text = f"""模拟生成的小说大纲（DeepSeek模型）：

故事概要：这是一个模拟的小说大纲，用于测试目的。小说讲述了主人公的成长故事，包含冒险、友情和爱情等元素。

主要人物：
1. 李明 - 主人公，勇敢善良的年轻人
2. 王雪 - 女主角，聪明独立的女性
3. 张老师 - 导师角色，经验丰富的长者

章节安排：
第1章：开端 - 引入主人公和背景
第2章：冒险开始 - 主人公踏上旅程
第3章：遇见同伴 - 结识重要伙伴
...（共{min(10, max_tokens//100)}章）

核心冲突：个人成长与社会责任的矛盾
主题：勇气、友情、自我发现
预期读者群体：青少年和年轻成人"""
        
        elif "章节" in prompt or "chapter" in prompt.lower():
            text = f"""模拟生成的章节内容（DeepSeek模型）：

这是模拟的小说章节内容，用于测试目的。本章大约{min(max_tokens//2, 2000)}字，包含了场景描写、人物对话和情节发展。

清晨的阳光透过窗帘洒进房间，主人公缓缓睁开眼睛。新的一天开始了，充满了未知和可能。

"该出发了，"他对自己说，声音在安静的房间里显得格外清晰。

窗外，城市已经开始苏醒，车流声、人声交织成生活的交响曲。主人公知道，今天的旅程将改变他的一生。

（本章完，为下一章铺垫）"""
        
        else:
            text = f"""模拟生成的文本（DeepSeek模型）：

这是对以下提示的模拟响应：

{prompt[:100]}...

模拟生成的文本内容，用于测试目的。这段文本展示了AI生成的能力，但实际上是由模拟逻辑生成的。

在真实环境中，这将是由{model}模型生成的高质量内容。"""
        
        # 截断到合适的长度
        if len(text) > max_tokens * 2:
            text = text[:max_tokens * 2]
        
        return {
            'text': text,
            'model': f"{model} (模拟)",
            'usage': {
                'prompt_tokens': len(prompt) // 4,
                'completion_tokens': len(text) // 4,
                'total_tokens': (len(prompt) + len(text)) // 4,
            },
            'finish_reason': 'stop',
            'timestamp': datetime.now().isoformat(),
            'simulated': True,
        }
    
    def test_connection(self) -> Dict[str, Any]:
        """测试API连接"""
        if self.simulated:
            return {
                'success': True,
                'model': '模拟模式',
                'message': '运行在模拟模式下，API连接测试跳过',
                'simulated': True,
            }
        
        try:
            # 简单的测试请求
            test_prompt = "请用一句话回答：你好，世界！"
            response = self.generate(test_prompt, model="deepseek-chat", max_tokens=50)
            
            if response and 'text' in response:
                return {
                    'success': True,
                    'model': 'DeepSeek API',
                    'message': 'API连接正常',
                    'response_sample': response['text'],
                }
            else:
                return {
                    'success': False,
                    'model': 'DeepSeek API',
                    'message': 'API响应格式不正确',
                }
                
        except Exception as e:
            logger.error(f"API连接测试失败: {e}")
            return {
                'success': False,
                'model': 'DeepSeek API',
                'message': f'API连接失败: {str(e)}',
            }


# 工厂函数
def create_deepseek_client(api_key: str = None, base_url: str = None) -> DeepSeekClient:
    """创建DeepSeek客户端实例"""
    return DeepSeekClient(api_key=api_key, base_url=base_url)