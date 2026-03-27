#!/usr/bin/env python3
"""
GeniusWriter - AI小说创作Web应用
主Flask应用程序，提供Web界面和API接口
"""

import os
import json
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.DEBUG if os.getenv('DEBUG') == 'True' else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
CORS(app)

# 数据库配置和初始化
from database import init_database, db_manager, db
init_database(app)

# 应用配置
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'dev-secret-key'),
    DEBUG=os.getenv('DEBUG', 'False').lower() == 'true',
    PORT=int(os.getenv('PORT', 5000)),
    HOST=os.getenv('HOST', '0.0.0.0'),
    UPLOAD_FOLDER=os.getenv('UPLOAD_FOLDER', 'uploads'),
    MAX_CONTENT_LENGTH=int(os.getenv('MAX_CONTENT_LENGTH', 16777216)),
)

# 创建上传目录
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# 导入智能体系统和模型客户端
try:
    from agent_core import GeniusWriterAgentSystem
    from models.openai_client import OpenAIClient
    from models.deepseek_client import DeepSeekClient
    from models.huggingface_client import HuggingFaceClient
    from workflows.novel_planning import NovelPlanningWorkflow
    from workflows.chapter_writing import ChapterWritingWorkflow
    logger.info("所有模块导入成功")
except ImportError as e:
    logger.warning(f"部分模块导入失败: {e}")
    # 创建虚拟类以便应用能启动
    class GeniusWriterAgentSystem:
        def __init__(self):
            self.agents = []
            self.skills = []
    
    class OpenAIClient:
        def __init__(self, api_key=None):
            self.api_key = api_key
        
        def generate(self, prompt, **kwargs):
            return {"text": f"模拟生成: {prompt[:50]}..."}
    
    logger.info("使用模拟模块启动应用")

# 全局实例
agent_system = None
model_clients = {}
workflows = {}

def initialize_system():
    """初始化智能体系统和模型客户端"""
    global agent_system, model_clients, workflows
    
    try:
        # 初始化智能体系统
        agent_system = GeniusWriterAgentSystem()
        logger.info(f"智能体系统初始化成功，加载了 {len(agent_system.agents)} 个代理")
        
        # 初始化模型客户端
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key and openai_key.startswith('sk-'):
            model_clients['openai'] = OpenAIClient(api_key=openai_key)
            logger.info("OpenAI客户端初始化成功")
        
        deepseek_key = os.getenv('DEEPSEEK_API_KEY')
        if deepseek_key and deepseek_key.startswith('sk-'):
            model_clients['deepseek'] = DeepSeekClient(api_key=deepseek_key)
            logger.info("DeepSeek客户端初始化成功")
        
        # 初始化工作流
        workflows['novel_planning'] = NovelPlanningWorkflow(agent_system, model_clients)
        workflows['chapter_writing'] = ChapterWritingWorkflow(agent_system, model_clients)
        logger.info("工作流系统初始化成功")
        
    except Exception as e:
        logger.error(f"系统初始化失败: {e}")
        # 创建模拟实例
        agent_system = GeniusWriterAgentSystem()
        model_clients['openai'] = OpenAIClient()
        model_clients['deepseek'] = DeepSeekClient()

# 初始化系统
initialize_system()

# ========== 路由定义 ==========

@app.route('/')
def index():
    """首页"""
    return render_template('index.html')

@app.route('/config')
def config_page():
    """配置页面"""
    return render_template('config.html')

@app.route('/writing')
def writing_page():
    """创作页面"""
    return render_template('writing.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    # 检查数据库连接状态
    db_status = 'healthy'
    try:
        from database import db
        # 尝试执行简单查询
        db.session.execute('SELECT 1')
    except Exception as e:
        logger.error(f"数据库连接检查失败: {e}")
        db_status = 'unhealthy'
    
    # 检查智能体系统状态
    agent_status = 'healthy' if agent_system else 'uninitialized'
    
    # 总体状态
    overall_status = 'healthy'
    if db_status != 'healthy' or agent_status != 'healthy':
        overall_status = 'degraded'
    
    return jsonify({
        'status': overall_status,
        'timestamp': datetime.now().isoformat(),
        'components': {
            'database': db_status,
            'agent_system': agent_status,
            'models': 'healthy' if model_clients else 'uninitialized',
            'workflows': 'healthy' if workflows else 'uninitialized',
        },
        'agents_count': len(agent_system.agents) if agent_system else 0,
        'models_available': list(model_clients.keys()),
        'workflows_available': list(workflows.keys()),
    })

@app.route('/api/config', methods=['GET'])
def get_config():
    """获取当前配置"""
    config = {
        'novel': {
            'genres': ['历史', '科幻', '奇幻', '都市', '悬疑', '武侠', '言情', '军事', '玄幻', '轻小说'],
            'writing_styles': ['文学性', '通俗性', '网络文学', '传统文学', '轻小说风'],
            'defaults': {
                'chapters': 10,
                'words_per_chapter': 3000,
                'temperature': 0.7,
                'model': 'openai',
            }
        },
        'models': {
            'available': list(model_clients.keys()),
            'parameters': {
                'temperature': {'min': 0.1, 'max': 1.0, 'step': 0.1},
                'max_tokens': {'min': 500, 'max': 8000, 'step': 500},
                'top_p': {'min': 0.1, 'max': 1.0, 'step': 0.1},
            }
        },
        'agents': {
            'tier1': ['创意总监', '文学总监', '制作人'],
            'tier2': ['情节设计师', '人物设计师', '世界观设计师', '文笔编辑'],
            'tier3': ['历史专家', '科幻专家', '奇幻专家', '对话专家', '场景专家'],
        }
    }
    return jsonify(config)

@app.route('/api/novel/plan', methods=['POST'])
def plan_novel():
    """规划小说"""
    try:
        data = request.json
        logger.info(f"收到小说规划请求: {json.dumps(data, ensure_ascii=False)[:200]}...")
        
        # 验证必要参数
        required_fields = ['title', 'genre', 'chapters', 'words_per_chapter']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'缺少必要参数: {field}'}), 400
        
        # 创建小说记录
        novel_data = {
            'title': data['title'],
            'genre': data['genre'],
            'chapters': data['chapters'],
            'words_per_chapter': data['words_per_chapter'],
            'writing_style': data.get('writing_style', '通俗性'),
            'model': data.get('model', 'openai'),
            'theme': data.get('theme', ''),
            'description': data.get('description', ''),
            'author': data.get('author', '匿名'),
        }
        
        novel = db_manager.create_novel(novel_data)
        if not novel:
            return jsonify({'success': False, 'error': '创建小说记录失败'}), 500
        
        novel_id = novel['id']
        
        # 调用小说规划工作流
        if 'novel_planning' in workflows:
            workflow_data = data.copy()
            workflow_data['novel_id'] = novel_id
            result = workflows['novel_planning'].execute(workflow_data)
            
            # 如果工作流返回大纲，更新章节概要
            if result.get('success') and 'outline' in result:
                outline = result['outline']
                if 'chapters' in outline:
                    for chapter_info in outline['chapters']:
                        chapter_number = chapter_info.get('chapter')
                        if chapter_number:
                            chapter = db_manager.get_chapter_by_number(novel_id, chapter_number)
                            if chapter:
                                update_data = {
                                    'title': chapter_info.get('title', f'第{chapter_number}章'),
                                    'summary': chapter_info.get('summary', ''),
                                }
                                db_manager.update_chapter(chapter['id'], update_data)
            
            result['novel_id'] = novel_id
            result['novel'] = novel
            return jsonify(result)
        else:
            # 模拟响应
            return jsonify({
                'success': True,
                'novel_id': novel_id,
                'novel': novel,
                'outline': {
                    'summary': f"这是一部{data['genre']}小说，共{data['chapters']}章，每章约{data['words_per_chapter']}字。",
                    'characters': [
                        {'name': '主角', 'role': '主角', 'description': '故事的核心人物'},
                        {'name': '配角', 'role': '重要配角', 'description': '推动情节发展的人物'},
                    ],
                    'chapters': [
                        {'chapter': 1, 'title': '第一章 开端', 'summary': '故事开始，引入主角和背景'},
                        {'chapter': 2, 'title': '第二章 发展', 'summary': '情节展开，矛盾初现'},
                    ]
                },
                'message': '小说规划完成（数据已保存到数据库）',
            })
    
    except Exception as e:
        logger.error(f"小说规划失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novel/write-chapter', methods=['POST'])
def write_chapter():
    """创作章节"""
    try:
        data = request.json
        logger.info(f"收到章节创作请求: {json.dumps(data, ensure_ascii=False)[:200]}...")
        
        # 验证必要参数
        required_fields = ['novel_id', 'chapter_number']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'缺少必要参数: {field}'}), 400
        
        novel_id = data['novel_id']
        chapter_number = data['chapter_number']
        
        # 获取章节记录
        chapter = db_manager.get_chapter_by_number(novel_id, chapter_number)
        if not chapter:
            return jsonify({'success': False, 'error': '章节不存在'}), 404
        
        chapter_id = chapter['id']
        
        # 调用章节创作工作流
        if 'chapter_writing' in workflows:
            workflow_data = data.copy()
            workflow_data['chapter_id'] = chapter_id
            result = workflows['chapter_writing'].execute(workflow_data)
            
            # 如果工作流返回章节内容，保存到数据库
            if result.get('success') and 'chapter' in result:
                chapter_result = result['chapter']
                update_data = {
                    'title': chapter_result.get('title', f'第{chapter_number}章'),
                    'content': chapter_result.get('content', ''),
                    'word_count': chapter_result.get('word_count', 0),
                    'model_used': data.get('model', 'openai'),
                    'temperature': data.get('temperature', 0.7),
                    'max_tokens': data.get('max_tokens', 4000),
                }
                
                updated_chapter = db_manager.update_chapter(chapter_id, update_data)
                if updated_chapter:
                    result['chapter'] = updated_chapter
                    result['message'] = '章节创作完成（内容已保存到数据库）'
            
            return jsonify(result)
        else:
            # 模拟响应
            content = data.get('content') or f"这是第{chapter_number}章的内容，基于大纲进行创作。本章大约{data.get('target_words', 3000)}字，故事情节围绕大纲展开。"
            
            update_data = {
                'title': data.get('title', f'第{chapter_number}章 创作完成'),
                'content': content,
                'word_count': len(content) * 2,  # 模拟字数
                'model_used': data.get('model', 'openai'),
                'temperature': data.get('temperature', 0.7),
                'max_tokens': data.get('max_tokens', 4000),
            }
            
            updated_chapter = db_manager.update_chapter(chapter_id, update_data)
            
            if updated_chapter:
                return jsonify({
                    'success': True,
                    'chapter': updated_chapter,
                    'message': '章节创作完成（模拟数据，已保存到数据库）',
                })
            else:
                return jsonify({
                    'success': False,
                    'error': '保存章节内容失败',
                })
    
    except Exception as e:
        logger.error(f"章节创作失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/list', methods=['GET'])
def list_models():
    """列出可用模型"""
    available_models = []
    
    for name, client in model_clients.items():
        if hasattr(client, 'api_key') and client.api_key:
            available_models.append({
                'id': name,
                'name': name.capitalize(),
                'enabled': True,
            })
        else:
            available_models.append({
                'id': name,
                'name': name.capitalize(),
                'enabled': False,
                'reason': 'API密钥未配置',
            })
    
    return jsonify({'models': available_models})

@app.route('/api/models/test', methods=['POST'])
def test_model():
    """测试模型连接"""
    try:
        data = request.json
        model_id = data.get('model', 'openai')
        
        if model_id not in model_clients:
            return jsonify({'success': False, 'error': f'模型不存在: {model_id}'})
        
        client = model_clients[model_id]
        
        # 简单的测试提示
        test_prompt = "请用一句话回复：你好，世界！"
        response = client.generate(test_prompt, max_tokens=50, temperature=0.5)
        
        if response and 'text' in response:
            return jsonify({
                'success': True,
                'model': model_id,
                'response': response['text'],
                'message': '模型连接测试成功',
            })
        else:
            return jsonify({
                'success': False,
                'model': model_id,
                'error': '模型响应格式不正确',
            })
    
    except Exception as e:
        logger.error(f"模型测试失败: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/agents/list', methods=['GET'])
def list_agents():
    """列出所有代理"""
    if agent_system and hasattr(agent_system, 'agents'):
        agents_list = []
        for agent in agent_system.agents:
            agents_list.append({
                'name': getattr(agent, 'name', '未知代理'),
                'role': getattr(agent, 'role', '未知角色'),
                'description': getattr(agent, 'description', ''),
                'tier': getattr(agent, 'tier', 3),
            })
        return jsonify({'agents': agents_list})
    else:
        # 模拟数据
        return jsonify({
            'agents': [
                {'name': '创意总监', 'role': '总监层', 'description': '负责整体创意方向', 'tier': 1},
                {'name': '文学总监', 'role': '总监层', 'description': '负责文学质量和风格', 'tier': 1},
                {'name': '制作人', 'role': '总监层', 'description': '负责项目管理和协调', 'tier': 1},
                {'name': '情节设计师', 'role': '部门主管', 'description': '设计情节和故事结构', 'tier': 2},
                {'name': '人物设计师', 'role': '部门主管', 'description': '设计人物和角色关系', 'tier': 2},
                {'name': '历史专家', 'role': '专家层', 'description': '历史小说创作专家', 'tier': 3},
                {'name': '科幻专家', 'role': '专家层', 'description': '科幻小说创作专家', 'tier': 3},
            ]
        })

# ========== 数据库API端点 ==========

@app.route('/api/novels', methods=['GET'])
def get_novels():
    """获取小说列表"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        status = request.args.get('status', None)
        
        novels = db_manager.list_novels(limit=limit, offset=offset, status=status)
        return jsonify({
            'success': True,
            'novels': novels,
            'count': len(novels),
            'limit': limit,
            'offset': offset,
        })
    except Exception as e:
        logger.error(f"获取小说列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels', methods=['POST'])
def create_novel():
    """创建新小说"""
    try:
        data = request.json
        
        # 验证必要参数
        required_fields = ['title', 'genre']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'缺少必要参数: {field}'}), 400
        
        # 创建小说
        novel_data = db_manager.create_novel(data)
        if not novel_data:
            return jsonify({'success': False, 'error': '创建小说失败'}), 500
        
        return jsonify({
            'success': True,
            'novel': novel_data,
            'message': '小说创建成功',
        })
    except Exception as e:
        logger.error(f"创建小说失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>', methods=['GET'])
def get_novel(novel_id):
    """获取小说详情"""
    try:
        novel = db_manager.get_novel(novel_id)
        if not novel:
            return jsonify({'success': False, 'error': '小说不存在'}), 404
        
        return jsonify({
            'success': True,
            'novel': novel,
        })
    except Exception as e:
        logger.error(f"获取小说详情失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>', methods=['PUT'])
def update_novel(novel_id):
    """更新小说"""
    try:
        data = request.json
        
        novel = db_manager.update_novel(novel_id, data)
        if not novel:
            return jsonify({'success': False, 'error': '小说不存在或更新失败'}), 404
        
        return jsonify({
            'success': True,
            'novel': novel,
            'message': '小说更新成功',
        })
    except Exception as e:
        logger.error(f"更新小说失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>', methods=['DELETE'])
def delete_novel(novel_id):
    """删除小说"""
    try:
        success = db_manager.delete_novel(novel_id)
        if not success:
            return jsonify({'success': False, 'error': '小说不存在或删除失败'}), 404
        
        return jsonify({
            'success': True,
            'message': '小说删除成功',
        })
    except Exception as e:
        logger.error(f"删除小说失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>/chapters', methods=['GET'])
def get_novel_chapters(novel_id):
    """获取小说章节列表"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        status = request.args.get('status', None)
        
        chapters = db_manager.list_chapters(novel_id, limit=limit, offset=offset, status=status)
        return jsonify({
            'success': True,
            'novel_id': novel_id,
            'chapters': chapters,
            'count': len(chapters),
            'limit': limit,
            'offset': offset,
        })
    except Exception as e:
        logger.error(f"获取章节列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>/chapters/<int:chapter_number>', methods=['GET'])
def get_chapter(novel_id, chapter_number):
    """获取具体章节"""
    try:
        chapter = db_manager.get_chapter_by_number(novel_id, chapter_number)
        if not chapter:
            return jsonify({'success': False, 'error': '章节不存在'}), 404
        
        return jsonify({
            'success': True,
            'chapter': chapter,
        })
    except Exception as e:
        logger.error(f"获取章节失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>/chapters/<int:chapter_number>', methods=['PUT'])
def update_chapter(novel_id, chapter_number):
    """更新章节内容"""
    try:
        data = request.json
        
        # 获取章节ID
        chapter = db_manager.get_chapter_by_number(novel_id, chapter_number)
        if not chapter:
            return jsonify({'success': False, 'error': '章节不存在'}), 404
        
        # 更新章节
        updated_chapter = db_manager.update_chapter(chapter['id'], data)
        if not updated_chapter:
            return jsonify({'success': False, 'error': '更新章节失败'}), 500
        
        return jsonify({
            'success': True,
            'chapter': updated_chapter,
            'message': '章节更新成功',
        })
    except Exception as e:
        logger.error(f"更新章节失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>/outline', methods=['GET'])
def get_novel_outline(novel_id):
    """获取小说大纲"""
    try:
        novel = db_manager.get_novel(novel_id)
        if not novel:
            return jsonify({'success': False, 'error': '小说不存在'}), 404
        
        # 获取章节列表
        chapters = db_manager.list_chapters(novel_id, limit=1000)
        
        outline = {
            'title': novel['title'],
            'genre': novel['genre'],
            'description': novel['description'],
            'chapters_count': novel['chapters_count'],
            'words_per_chapter': novel['words_per_chapter'],
            'writing_style': novel['writing_style'],
            'chapters': chapters,
        }
        
        return jsonify({
            'success': True,
            'outline': outline,
        })
    except Exception as e:
        logger.error(f"获取小说大纲失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/novels/<novel_id>/progress', methods=['GET'])
def get_novel_progress(novel_id):
    """获取小说进度"""
    try:
        novel = db_manager.get_novel(novel_id)
        if not novel:
            return jsonify({'success': False, 'error': '小说不存在'}), 404
        
        return jsonify({
            'success': True,
            'progress': {
                'status': novel['status'],
                'progress_percent': novel['progress'],
                'total_words': novel['total_words'],
                'chapters_completed': novel.get('chapters_count_actual', 0),
                'chapters_total': novel['chapters_count'],
                'estimated_completion': novel.get('completed_at'),
            },
        })
    except Exception as e:
        logger.error(f"获取小说进度失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """提供上传的文件"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ========== 错误处理 ==========

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': '资源不存在'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"服务器内部错误: {error}")
    return jsonify({'error': '服务器内部错误'}), 500

# ========== 启动应用 ==========

if __name__ == '__main__':
    port = app.config['PORT']
    host = app.config['HOST']
    debug = app.config['DEBUG']
    
    logger.info(f"启动GeniusWriter应用，地址: http://{host}:{port}")
    logger.info(f"调试模式: {debug}")
    logger.info(f"可用模型: {list(model_clients.keys())}")
    
    app.run(host=host, port=port, debug=debug)