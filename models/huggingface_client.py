#!/usr/bin/env python3
"""
HuggingFace模型客户端
封装HuggingFace Inference API，用于小说创作
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class HuggingFaceClient:
    """HuggingFace Inference API 客户端"""

    def __init__(self, api_key: str = None, model_id: str = None):
        self.api_key = api_key or os.getenv('HUGGINGFACE_API_KEY')
        self.model_id = model_id or os.getenv(
            'HUGGINGFACE_MODEL_ID', 'mistralai/Mistral-7B-Instruct-v0.2'
        )
        self.base_url = 'https://api-inference.huggingface.co/models'

        if not self.api_key:
            logger.warning("HuggingFace API密钥未配置，将使用模拟模式")
            self.simulated = True
        else:
            self.simulated = False
            try:
                import requests  # noqa: F401
                logger.info(f"HuggingFace客户端初始化成功，模型: {self.model_id}")
            except ImportError:
                logger.warning("未安装requests库，将使用模拟模式")
                self.simulated = True

    def generate(
        self,
        prompt: str,
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs,
    ) -> Dict[str, Any]:
        """生成文本"""
        if self.simulated:
            return self._simulate_generate(prompt, max_tokens)

        try:
            import requests

            model_id = model or self.model_id
            url = f"{self.base_url}/{model_id}"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
            }
            payload = {
                'inputs': prompt,
                'parameters': {
                    'max_new_tokens': max_tokens,
                    'temperature': temperature,
                    'do_sample': True,
                    'return_full_text': False,
                },
            }
            response = requests.post(url, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()

            if isinstance(result, list) and result:
                generated = result[0].get('generated_text', '')
            elif isinstance(result, dict):
                generated = result.get('generated_text', '')
            else:
                generated = str(result)

            return {
                'text': generated,
                'model': model_id,
                'tokens_used': len(generated) // 4,
            }

        except Exception as e:
            logger.error(f"HuggingFace生成失败: {e}")
            return self._simulate_generate(prompt, max_tokens)

    def _simulate_generate(self, prompt: str, max_tokens: int = 2000) -> Dict[str, Any]:
        """模拟生成（无API密钥时使用）"""
        preview = prompt[:80].replace('\n', ' ')
        simulated_text = (
            f"（HuggingFace模拟模式）基于提示「{preview}...」生成的内容。"
            f"请配置 HUGGINGFACE_API_KEY 以启用真实生成。"
        )
        return {
            'text': simulated_text,
            'model': self.model_id,
            'tokens_used': 0,
            'simulated': True,
        }
