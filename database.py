#!/usr/bin/env python3
"""
GeniusWriter 数据库模块
SQLite数据库模型和操作
"""

import os
import json
import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship

# 创建SQLAlchemy实例
db = SQLAlchemy()


class Novel(db.Model):
    """小说项目表"""
    __tablename__ = 'novels'

    id = Column(String(64), primary_key=True, unique=True)
    title = Column(String(255), nullable=False)
    author = Column(String(128), default='匿名')
    genre = Column(String(50), nullable=False)
    theme = Column(String(255))
    description = Column(Text)

    # 配置参数
    chapters_count = Column(Integer, default=10)
    words_per_chapter = Column(Integer, default=3000)
    writing_style = Column(String(50), default='通俗性')
    target_model = Column(String(50), default='openai')

    # 状态信息
    status = Column(String(50), default='planning')
    progress = Column(Integer, default=0)
    total_words = Column(Integer, default=0)

    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime)

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
            self.total_words = sum(c.word_count or 0 for c in self.chapters)

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
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)

    # 内容
    summary = Column(Text)
    content = Column(Text)

    # 状态信息
    status = Column(String(50), default='pending')
    word_count = Column(Integer, default=0)

    # 模型生成信息
    model_used = Column(String(50))
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=4000)

    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime)

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
            chinese_chars = sum(1 for char in self.content if '\u4e00' <= char <= '\u9fa5')
            non_chinese = sum(1 for w in self.content.split() if not any('\u4e00' <= c <= '\u9fa5' for c in w))
            self.word_count = chinese_chars + non_chinese


class Revision(db.Model):
    """章节修订表"""
    __tablename__ = 'revisions'

    id = Column(String(64), primary_key=True, unique=True)
    chapter_id = Column(String(64), ForeignKey('chapters.id'), nullable=False, index=True)
    revision_number = Column(Integer, nullable=False)

    content = Column(Text, nullable=False)
    changes_summary = Column(Text)
    revised_by = Column(String(128), default='system')
    reason = Column(String(255))

    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self):
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
    workflow_id = Column(String(128), nullable=False, index=True)
    workflow_type = Column(String(50), nullable=False)

    input_data = Column(Text)
    output_data = Column(Text)
    status = Column(String(50), default='pending')
    error_message = Column(Text)

    execution_time = Column(Float)
    tokens_used = Column(Integer, default=0)
    model_used = Column(String(50))

    started_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)

    def to_dict(self):
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
    agent_id = Column(String(128), nullable=False, index=True)
    agent_name = Column(String(128), nullable=False)
    agent_tier = Column(Integer, default=3)

    status = Column(String(50), default='idle')
    current_task = Column(String(255))
    last_activity = Column(DateTime, default=datetime.now)

    tasks_completed = Column(Integer, default=0)
    total_execution_time = Column(Float, default=0.0)

    is_active = Column(Boolean, default=True)
    configuration = Column(Text)

    def to_dict(self):
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

    export_format = Column(String(50), nullable=False)
    include_outline = Column(Boolean, default=True)
    include_all_chapters = Column(Boolean, default=True)
    include_metadata = Column(Boolean, default=True)

    status = Column(String(50), default='pending')
    progress = Column(Integer, default=0)
    error_message = Column(Text)

    output_filename = Column(String(255))
    output_path = Column(String(512))
    file_size = Column(Integer)

    created_at = Column(DateTime, default=datetime.now)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)

    def to_dict(self):
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


# BUG FIX #5 & #7: 统一使用 uuid4 生成唯一 ID，避免高并发时时间戳 ID 碰撞
def _generate_id(prefix: str) -> str:
    """生成唯一 ID"""
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


class DatabaseManager:
    """数据库管理器"""

    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)

    def init_app(self, app):
        """初始化数据库应用"""
        basedir = os.path.abspath(os.path.dirname(__file__))
        data_dir = os.path.join(basedir, 'data')
        os.makedirs(data_dir, exist_ok=True)

        db_path = os.path.join(data_dir, 'genius_writer.db')
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_recycle': 300,
            'pool_pre_ping': True,
        }

        db.init_app(app)

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

    # ---- 小说操作 ----

    def create_novel(self, novel_data):
        """创建小说项目"""
        try:
            # BUG FIX #5: 使用 uuid 生成 ID，避免时间戳碰撞
            novel_id = novel_data.get('id') or _generate_id('novel')
            novel = Novel(
                id=novel_id,
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
        try:
            novel = Novel.query.filter_by(id=novel_id).first()
            return novel.to_dict() if novel else None
        except Exception as e:
            print(f"获取小说失败: {e}")
            return None

    def update_novel(self, novel_id, update_data):
        try:
            novel = Novel.query.filter_by(id=novel_id).first()
            if not novel:
                return None
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
        try:
            query = Novel.query
            if status:
                query = query.filter_by(status=status)
            novels = query.order_by(Novel.updated_at.desc()).limit(limit).offset(offset).all()
            return [novel.to_dict() for novel in novels]
        except Exception as e:
            print(f"列出小说失败: {e}")
            return []

    # ---- 章节操作 ----

    def get_chapter(self, chapter_id):
        try:
            chapter = Chapter.query.filter_by(id=chapter_id).first()
            return chapter.to_dict() if chapter else None
        except Exception as e:
            print(f"获取章节失败: {e}")
            return None

    def get_chapter_by_number(self, novel_id, chapter_number):
        try:
            chapter = Chapter.query.filter_by(
                novel_id=novel_id,
                chapter_number=chapter_number
            ).first()
            return chapter.to_dict() if chapter else None
        except Exception as e:
            print(f"获取章节失败: {e}")
            return None

    def update_chapter(self, chapter_id, update_data):
        try:
            chapter = Chapter.query.filter_by(id=chapter_id).first()
            if not chapter:
                return None
            for key, value in update_data.items():
                if hasattr(chapter, key):
                    setattr(chapter, key, value)
            if 'content' in update_data:
                chapter.update_word_count()
            if update_data.get('content'):
                chapter.status = 'completed'
                chapter.completed_at = datetime.now()
            chapter.updated_at = datetime.now()
            db.session.commit()

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
        try:
            query = Chapter.query.filter_by(novel_id=novel_id)
            if status:
                query = query.filter_by(status=status)
            chapters = query.order_by(Chapter.chapter_number).limit(limit).offset(offset).all()
            return [chapter.to_dict() for chapter in chapters]
        except Exception as e:
            print(f"列出章节失败: {e}")
            return []

    # ---- 工作流日志 ----

    def log_workflow(self, workflow_data):
        try:
            # BUG FIX #7: 使用 uuid 生成 ID
            log = WorkflowLog(
                id=workflow_data.get('id') or _generate_id('wf'),
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

    # ---- 代理状态 ----

    def update_agent_state(self, agent_data):
        try:
            agent = AgentState.query.filter_by(agent_id=agent_data['agent_id']).first()
            is_new = False
            if not agent:
                # BUG FIX #6: 新建时先不 add，标记 is_new，避免因 id 已赋值而跳过 add
                agent = AgentState(
                    id=_generate_id('agent'),
                    agent_id=agent_data['agent_id'],
                    agent_name=agent_data.get('agent_name', agent_data['agent_id']),
                    agent_tier=agent_data.get('agent_tier', 3),
                )
                is_new = True

            agent.status = agent_data.get('status', agent.status)
            agent.current_task = agent_data.get('current_task', agent.current_task)
            agent.last_activity = datetime.now()

            if agent_data.get('task_completed'):
                agent.tasks_completed += 1
            if agent_data.get('execution_time'):
                agent.total_execution_time += agent_data['execution_time']
            if 'configuration' in agent_data:
                agent.configuration = json.dumps(agent_data['configuration'], ensure_ascii=False)
            if 'is_active' in agent_data:
                agent.is_active = agent_data['is_active']

            # BUG FIX #6: 新记录必须 add 到 session，否则不会持久化
            if is_new:
                db.session.add(agent)

            db.session.commit()
            return agent.to_dict()
        except Exception as e:
            db.session.rollback()
            print(f"更新代理状态失败: {e}")
            return None

    # ---- 导出任务 ----

    def create_export_job(self, export_data):
        try:
            job = ExportJob(
                id=export_data.get('id') or _generate_id('export'),
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
        try:
            job = ExportJob.query.filter_by(id=job_id).first()
            if not job:
                return None
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


def init_database(app):
    """初始化数据库"""
    db_manager.init_app(app)


def get_db():
    """获取数据库会话"""
    return db
