#!/usr/bin/env python3
"""
GeniusWriter 数据库模块
SQLite数据库模型和操作
"""

import os
import json
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

# 创建SQLAlchemy实例
db = SQLAlchemy()

# 基础模型
Base = declarative_base()

class Novel(db.Model):
    """小说项目表"""
    __tablename__ = 'novels'
    
    id = Column(String(64), primary_key=True, unique=True)
    title = Column(String(255), nullable=False)
    author = Column(String(128), default='匿名')
    genre = Column(String(50), nullable=False)  # 小说类型
    theme = Column(String(255))  # 主题
    description = Column(Text)  # 描述
    
    # 配置参数
    chapters_count = Column(Integer, default=10)  # 总章节数
    words_per_chapter = Column(Integer, default=3000)  # 每章字数
    writing_style = Column(String(50), default='通俗性')  # 写作风格
    target_model = Column(String(50), default='openai')  # 目标模型
    
    # 状态信息
    status = Column(String(50), default='planning')  # planning, writing, reviewing, completed, paused
    progress = Column(Integer, default=0)  # 进度百分比
    total_words = Column(Integer, default=0)  # 总字数
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime)  # 完成时间
    
    # 关联关系
    chapters = relationship('Chapter', backref='novel', cascade='all, delete-orphan')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'genre': self.genre,
            'theme': self.theme,
            'description': self.description,
            'chapters_count': self.chapters_count,
            'words_per_chapter': self.words_per_chapter,
            'writing_style': self.writing_style,
            'target_model': self.target_model,
            'status': self.status,
            'progress': self.progress,
            'total_words': self.total_words,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'chapters_count_actual': len(self.chapters) if self.chapters else 0,
        }
    
    def update_progress(self):
        """更新进度"""
        if self.chapters:
            completed_chapters = sum(1 for c in self.chapters if c.status == 'completed')
            self.progress = int((completed_chapters / self.chapters_count) * 100) if self.chapters_count > 0 else 0
            
            # 计算总字数
            self.total_words = sum(c.word_count or 0 for c in self.chapters)
            
            # 更新状态
            if self.progress >= 100:
                self.status = 'completed'
                self.completed_at = datetime.now()
            elif self.progress > 0:
                self.status = 'writing'
            else:
                self.status = 'planning'
    
    def get_outline(self):
        """获取小说大纲"""
        chapters_outline = []
        for chapter in sorted(self.chapters, key=lambda x: x.chapter_number):
            chapters_outline.append({
                'chapter_number': chapter.chapter_number,
                'title': chapter.title,
                'summary': chapter.summary,
                'status': chapter.status,
                'word_count': chapter.word_count,
            })
        
        return {
            'title': self.title,
            'genre': self.genre,
            'chapters_count': self.chapters_count,
            'words_per_chapter': self.words_per_chapter,
            'description': self.description,
            'chapters': chapters_outline,
        }

class Chapter(db.Model):
    """章节内容表"""
    __tablename__ = 'chapters'
    
    id = Column(String(64), primary_key=True, unique=True)
    novel_id = Column(String(64), ForeignKey('novels.id'), nullable=False, index=True)
    chapter_number = Column(Integer, nullable=False)  # 章节编号
    title = Column(String(255), nullable=False)  # 章节标题
    
    # 内容
    summary = Column(Text)  # 章节概要
    content = Column(Text)  # 章节正文内容
    
    # 状态信息
    status = Column(String(50), default='pending')  # pending, writing, completed, reviewed, published
    word_count = Column(Integer, default=0)  # 字数统计
    
    # 模型生成信息
    model_used = Column(String(50))  # 使用的模型
    temperature = Column(Float, default=0.7)  # 温度参数
    max_tokens = Column(Integer, default=4000)  # 最大token数
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime)  # 完成时间
    
    # 关联关系
    revisions = relationship('Revision', backref='chapter', cascade='all, delete-orphan')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'novel_id': self.novel_id,
            'chapter_number': self.chapter_number,
            'title': self.title,
            'summary': self.summary,
            'content': self.content,
            'status': self.status,
            'word_count': self.word_count,
            'model_used': self.model_used,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'revisions_count': len(self.revisions) if self.revisions else 0,
        }
    
    def update_word_count(self):
        """更新字数统计"""
        if self.content:
            # 简单的中文字数统计
            chinese_chars = sum(1 for char in self.content if '\u4e00-\u9fa5' in char)
            words = len(self.content.split())
            self.word_count = chinese_chars + words

class Revision(db.Model):
    """章节修订表"""
    __tablename__ = 'revisions'
    
    id = Column(String(64), primary_key=True, unique=True)
    chapter_id = Column(String(64), ForeignKey('chapters.id'), nullable=False, index=True)
    revision_number = Column(Integer, nullable=False)  # 修订版本号
    
    # 内容
    content = Column(Text, nullable=False)  # 修订内容
    changes_summary = Column(Text)  # 修改摘要
    
    # 修订信息
    revised_by = Column(String(128), default='system')  # 修订者
    reason = Column(String(255))  # 修订原因
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'chapter_id': self.chapter_id,
            'revision_number': self.revision_number,
            'content': self.content,
            'changes_summary': self.changes_summary,
            'revised_by': self.revised_by,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class WorkflowLog(db.Model):
    """工作流日志表"""
    __tablename__ = 'workflow_logs'
    
    id = Column(String(64), primary_key=True, unique=True)
    workflow_id = Column(String(128), nullable=False, index=True)  # 工作流ID
    workflow_type = Column(String(50), nullable=False)  # 工作流类型
    
    # 执行信息
    input_data = Column(Text)  # 输入数据（JSON）
    output_data = Column(Text)  # 输出数据（JSON）
    status = Column(String(50), default='pending')  # pending, running, completed, failed
    error_message = Column(Text)  # 错误信息
    
    # 性能指标
    execution_time = Column(Float)  # 执行时间（秒）
    tokens_used = Column(Integer, default=0)  # 使用的token数
    model_used = Column(String(50))  # 使用的模型
    
    # 时间戳
    started_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'workflow_type': self.workflow_type,
            'status': self.status,
            'execution_time': self.execution_time,
            'tokens_used': self.tokens_used,
            'model_used': self.model_used,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'has_error': bool(self.error_message),
        }

class AgentState(db.Model):
    """代理状态表"""
    __tablename__ = 'agent_states'
    
    id = Column(String(64), primary_key=True, unique=True)
    agent_id = Column(String(128), nullable=False, index=True)  # 代理ID
    agent_name = Column(String(128), nullable=False)  # 代理名称
    agent_tier = Column(Integer, default=3)  # 代理层级
    
    # 状态信息
    status = Column(String(50), default='idle')  # idle, busy, error, disabled
    current_task = Column(String(255))  # 当前任务
    last_activity = Column(DateTime, default=datetime.now)  # 最后活动时间
    
    # 性能统计
    tasks_completed = Column(Integer, default=0)  # 完成任务数
    total_execution_time = Column(Float, default=0.0)  # 总执行时间
    
    # 配置
    is_active = Column(Boolean, default=True)  # 是否激活
    configuration = Column(Text)  # 配置信息（JSON）
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'agent_name': self.agent_name,
            'agent_tier': self.agent_tier,
            'status': self.status,
            'current_task': self.current_task,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'tasks_completed': self.tasks_completed,
            'total_execution_time': self.total_execution_time,
            'is_active': self.is_active,
            'has_configuration': bool(self.configuration),
        }

class ExportJob(db.Model):
    """导出任务表"""
    __tablename__ = 'export_jobs'
    
    id = Column(String(64), primary_key=True, unique=True)
    novel_id = Column(String(64), ForeignKey('novels.id'), nullable=False, index=True)
    
    # 导出配置
    export_format = Column(String(50), nullable=False)  # markdown, word, pdf, html, epub
    include_outline = Column(Boolean, default=True)  # 是否包含大纲
    include_all_chapters = Column(Boolean, default=True)  # 是否包含所有章节
    include_metadata = Column(Boolean, default=True)  # 是否包含元数据
    
    # 状态信息
    status = Column(String(50), default='pending')  # pending, processing, completed, failed
    progress = Column(Integer, default=0)  # 进度百分比
    error_message = Column(Text)  # 错误信息
    
    # 输出信息
    output_filename = Column(String(255))  # 输出文件名
    output_path = Column(String(512))  # 输出路径
    file_size = Column(Integer)  # 文件大小（字节）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'novel_id': self.novel_id,
            'export_format': self.export_format,
            'include_outline': self.include_outline,
            'include_all_chapters': self.include_all_chapters,
            'include_metadata': self.include_metadata,
            'status': self.status,
            'progress': self.progress,
            'output_filename': self.output_filename,
            'file_size': self.file_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'has_error': bool(self.error_message),
        }

# 数据库操作类
class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """初始化数据库应用"""
        # 配置数据库
        basedir = os.path.abspath(os.path.dirname(__file__))
        db_path = os.path.join(basedir, 'data', 'genius_writer.db')
        
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_recycle': 300,
            'pool_pre_ping': True,
        }
        
        # 初始化SQLAlchemy
        db.init_app(app)
        
        # 创建数据库表
        with app.app_context():
            self.create_tables()
        
        print(f"数据库初始化完成: {db_path}")
    
    def create_tables(self):
        """创建数据库表"""
        try:
            db.create_all()
            print("数据库表创建成功")
        except Exception as e:
            print(f"数据库表创建失败: {e}")
    
    # 小说操作方法
    def create_novel(self, novel_data):
        """创建小说项目"""
        try:
            novel = Novel(
                id=novel_data.get('id') or f"novel_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                title=novel_data['title'],
                genre=novel_data.get('genre', '都市'),
                theme=novel_data.get('theme', ''),
                description=novel_data.get('description', ''),
                chapters_count=novel_data.get('chapters', 10),
                words_per_chapter=novel_data.get('words_per_chapter', 3000),
                writing_style=novel_data.get('writing_style', '通俗性'),
                target_model=novel_data.get('model', 'openai'),
                author=novel_data.get('author', '匿名'),
                status='planning',
                progress=0,
                total_words=0,
            )
            
            db.session.add(novel)
            db.session.commit()
            
            # 创建初始章节记录
            self.create_initial_chapters(novel)
            
            return novel.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"创建小说失败: {e}")
            return None
    
    def create_initial_chapters(self, novel):
        """为小说创建初始章节记录"""
        try:
            chapters = []
            for i in range(1, novel.chapters_count + 1):
                chapter = Chapter(
                    id=f"{novel.id}_ch{i:03d}",
                    novel_id=novel.id,
                    chapter_number=i,
                    title=f"第{i}章",
                    summary=f"第{i}章概要",
                    status='pending',
                    word_count=0,
                )
                chapters.append(chapter)
            
            db.session.add_all(chapters)
            db.session.commit()
            return len(chapters)
        except Exception as e:
            db.session.rollback()
            print(f"创建初始章节失败: {e}")
            return 0
    
    def get_novel(self, novel_id):
        """获取小说项目"""
        try:
            novel = Novel.query.filter_by(id=novel_id).first()
            if novel:
                return novel.to_dict()
            return None
        except Exception as e:
            print(f"获取小说失败: {e}")
            return None
    
    def update_novel(self, novel_id, update_data):
        """更新小说项目"""
        try:
            novel = Novel.query.filter_by(id=novel_id).first()
            if not novel:
                return None
            
            # 更新字段
            for key, value in update_data.items():
                if hasattr(novel, key):
                    setattr(novel, key, value)
            
            novel.updated_at = datetime.now()
            db.session.commit()
            
            return novel.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"更新小说失败: {e}")
            return None
    
    def delete_novel(self, novel_id):
        """删除小说项目"""
        try:
            novel = Novel.query.filter_by(id=novel_id).first()
            if not novel:
                return False
            
            db.session.delete(novel)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"删除小说失败: {e}")
            return False
    
    def list_novels(self, limit=50, offset=0, status=None):
        """列出小说项目"""
        try:
            query = Novel.query
            
            if status:
                query = query.filter_by(status=status)
            
            novels = query.order_by(Novel.updated_at.desc()).limit(limit).offset(offset).all()
            return [novel.to_dict() for novel in novels]
        except Exception as e:
            print(f"列出小说失败: {e}")
            return []
    
    # 章节操作方法
    def get_chapter(self, chapter_id):
        """获取章节"""
        try:
            chapter = Chapter.query.filter_by(id=chapter_id).first()
            if chapter:
                return chapter.to_dict()
            return None
        except Exception as e:
            print(f"获取章节失败: {e}")
            return None
    
    def get_chapter_by_number(self, novel_id, chapter_number):
        """根据章节编号获取章节"""
        try:
            chapter = Chapter.query.filter_by(
                novel_id=novel_id, 
                chapter_number=chapter_number
            ).first()
            if chapter:
                return chapter.to_dict()
            return None
        except Exception as e:
            print(f"获取章节失败: {e}")
            return None
    
    def update_chapter(self, chapter_id, update_data):
        """更新章节"""
        try:
            chapter = Chapter.query.filter_by(id=chapter_id).first()
            if not chapter:
                return None
            
            # 更新字段
            for key, value in update_data.items():
                if hasattr(chapter, key):
                    setattr(chapter, key, value)
            
            # 更新字数统计
            if 'content' in update_data:
                chapter.update_word_count()
            
            # 更新状态
            if update_data.get('content'):
                chapter.status = 'completed'
                chapter.completed_at = datetime.now()
            
            chapter.updated_at = datetime.now()
            db.session.commit()
            
            # 更新小说的进度
            novel = Novel.query.filter_by(id=chapter.novel_id).first()
            if novel:
                novel.update_progress()
                db.session.commit()
            
            return chapter.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"更新章节失败: {e}")
            return None
    
    def list_chapters(self, novel_id, limit=100, offset=0, status=None):
        """列出章节"""
        try:
            query = Chapter.query.filter_by(novel_id=novel_id)
            
            if status:
                query = query.filter_by(status=status)
            
            chapters = query.order_by(Chapter.chapter_number).limit(limit).offset(offset).all()
            return [chapter.to_dict() for chapter in chapters]
        except Exception as e:
            print(f"列出章节失败: {e}")
            return []
    
    # 工作流日志方法
    def log_workflow(self, workflow_data):
        """记录工作流日志"""
        try:
            log = WorkflowLog(
                id=workflow_data.get('id') or f"wf_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                workflow_id=workflow_data['workflow_id'],
                workflow_type=workflow_data['workflow_type'],
                input_data=json.dumps(workflow_data.get('input_data', {}), ensure_ascii=False),
                output_data=json.dumps(workflow_data.get('output_data', {}), ensure_ascii=False),
                status=workflow_data.get('status', 'completed'),
                error_message=workflow_data.get('error_message'),
                execution_time=workflow_data.get('execution_time'),
                tokens_used=workflow_data.get('tokens_used', 0),
                model_used=workflow_data.get('model_used'),
                started_at=datetime.fromisoformat(workflow_data['started_at']) if 'started_at' in workflow_data else datetime.now(),
                completed_at=datetime.fromisoformat(workflow_data['completed_at']) if 'completed_at' in workflow_data else datetime.now(),
            )
            
            db.session.add(log)
            db.session.commit()
            return log.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"记录工作流日志失败: {e}")
            return None
    
    # 代理状态方法
    def update_agent_state(self, agent_data):
        """更新代理状态"""
        try:
            agent = AgentState.query.filter_by(agent_id=agent_data['agent_id']).first()
            
            if not agent:
                # 创建新代理记录
                agent = AgentState(
                    id=f"agent_{agent_data['agent_id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    agent_id=agent_data['agent_id'],
                    agent_name=agent_data.get('agent_name', agent_data['agent_id']),
                    agent_tier=agent_data.get('agent_tier', 3),
                )
            
            # 更新状态
            agent.status = agent_data.get('status', agent.status)
            agent.current_task = agent_data.get('current_task', agent.current_task)
            agent.last_activity = datetime.now()
            
            # 更新统计
            if agent_data.get('task_completed'):
                agent.tasks_completed += 1
            
            if agent_data.get('execution_time'):
                agent.total_execution_time += agent_data['execution_time']
            
            # 更新配置
            if 'configuration' in agent_data:
                agent.configuration = json.dumps(agent_data['configuration'], ensure_ascii=False)
            
            if 'is_active' in agent_data:
                agent.is_active = agent_data['is_active']
            
            if agent.id is None:
                db.session.add(agent)
            
            db.session.commit()
            return agent.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"更新代理状态失败: {e}")
            return None
    
    # 导出任务方法
    def create_export_job(self, export_data):
        """创建导出任务"""
        try:
            job = ExportJob(
                id=export_data.get('id') or f"export_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                novel_id=export_data['novel_id'],
                export_format=export_data['export_format'],
                include_outline=export_data.get('include_outline', True),
                include_all_chapters=export_data.get('include_all_chapters', True),
                include_metadata=export_data.get('include_metadata', True),
                status='pending',
                progress=0,
                created_at=datetime.now(),
            )
            
            db.session.add(job)
            db.session.commit()
            return job.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"创建导出任务失败: {e}")
            return None
    
    def update_export_job(self, job_id, update_data):
        """更新导出任务"""
        try:
            job = ExportJob.query.filter_by(id=job_id).first()
            if not job:
                return None
            
            # 更新字段
            for key, value in update_data.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            
            if update_data.get('status') == 'processing' and not job.started_at:
                job.started_at = datetime.now()
            elif update_data.get('status') == 'completed' and not job.completed_at:
                job.completed_at = datetime.now()
            
            db.session.commit()
            return job.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"更新导出任务失败: {e}")
            return None

# 全局数据库管理器实例
db_manager = DatabaseManager()

# 便捷函数
def init_database(app):
    """初始化数据库"""
    db_manager.init_app(app)

def get_db():
    """获取数据库会话"""
    return db