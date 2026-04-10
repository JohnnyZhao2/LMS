"""
知识文档应用服务
编排业务逻辑。
版本管理说明：
- 使用 resource_uuid + version_number + is_current 管理版本
- is_current=True 表示当前最新版本
"""
import os
import re
from typing import List, Optional, Tuple

from django.db import transaction
from django.utils.html import strip_tags
from django.utils.html import escape

from apps.tags.validators import (
    assign_scoped_tags,
    assign_space_tag,
    get_scoped_tag_ids_or_error,
)
from core.base_service import BaseService
from core.decorators import log_content_action
from core.exceptions import BusinessError, ErrorCodes
from core.versioning import (
    derive_resource_version,
    initialize_new_resource_version,
    is_referenced,
)

from .models import Knowledge
from .selectors import get_knowledge_by_id, get_knowledge_queryset


class KnowledgeService(BaseService):
    """知识文档应用服务"""

    # 创建新版本时需要复制的内容字段
    # 添加新的内容字段时，只需在此列表中添加即可
    VERSION_COPY_FIELDS = [
        'title',
        'content', 'related_links',
    ]

    def get_by_id(self, pk: int) -> Knowledge:
        """
        获取知识文档
        Args:
            pk: 主键
        Returns:
            知识文档对象
        Raises:
            BusinessError: 如果不存在或无权限
        """
        knowledge = get_knowledge_by_id(pk)
        self.validate_not_none(
            knowledge,
            f'知识文档 {pk} 不存在'
        )
        # 权限检查：非管理员只能访问当前版本的知识
        self.check_published_resource_access(knowledge, resource_name='知识文档')
        return knowledge

    def get_all_with_filters(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-updated_at'
    ):
        """
        获取所有知识文档（只返回当前版本）
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
        Returns:
            知识文档列表
        """
        return get_knowledge_queryset(filters=filters, search=search, ordering=ordering)

    @transaction.atomic
    @log_content_action('knowledge', 'create', 'v{version_number}')
    def create(self, data: dict) -> Knowledge:
        """
        创建知识文档
        Args:
            data: 知识文档数据
        Returns:
            创建的知识文档对象
        Raises:
            BusinessError: 如果验证失败
        """
        # 1. 业务验证
        self._validate_knowledge_data(data)
        # 2. 准备数据
        data['created_by'] = self.user
        data['updated_by'] = self.user
        initialize_new_resource_version(data)
        # 提取标签数据
        space_tag_id = data.pop('space_tag_id', None)
        tag_ids = data.pop('tag_ids', [])
        # 3. 创建知识
        knowledge = Knowledge.objects.create(**data)
        # 4. 设置标签
        assign_space_tag(knowledge, space_tag_id)
        assign_scoped_tags(knowledge, tag_ids, scope='knowledge')
        return knowledge

    @transaction.atomic
    @log_content_action('knowledge', 'update', 'v{version_number}')
    def update(self, pk: int, data: dict) -> Knowledge:
        """
        更新知识文档
        版本管理：
        - 被任务引用的当前版本：创建新版本
        - 未被任务引用的当前版本：原地更新
        - 历史版本：禁止修改，确保快照不可变
        Args:
            pk: 主键
            data: 更新数据
        Returns:
            更新后的知识文档对象
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        knowledge = self.get_by_id(pk)
        if not knowledge.is_current:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='历史版本不可修改'
            )
        self._validate_knowledge_data(
            data=data,
            fallback_content=knowledge.content,
        )
        space_tag_provided = 'space_tag_id' in data
        tag_ids_provided = 'tag_ids' in data
        space_tag_id = data.pop('space_tag_id', None) if space_tag_provided else None
        tag_ids = data.pop('tag_ids', None) if tag_ids_provided else None
        current_tag_ids = list(knowledge.tags.values_list('id', flat=True))

        changed_fields = {
            key: value
            for key, value in data.items()
            if getattr(knowledge, key, None) != value
        }
        normalized_tag_ids = (
            get_scoped_tag_ids_or_error(tag_ids or [], scope='knowledge')
            if tag_ids_provided
            else current_tag_ids
        )
        space_changed = space_tag_provided and space_tag_id != knowledge.space_tag_id
        tags_changed = (
            tag_ids_provided
            and set(normalized_tag_ids) != set(current_tag_ids)
        )
        has_changes = bool(changed_fields or space_changed or tags_changed)
        if not has_changes:
            return knowledge

        # 当前版本且被任务引用时，分叉新版本；否则原地更新
        if knowledge.is_current and self._is_referenced_by_task(knowledge.id):
            new_version_data = dict(changed_fields)
            if space_tag_provided:
                new_version_data['space_tag_id'] = space_tag_id
            if tag_ids_provided:
                new_version_data['tag_ids'] = normalized_tag_ids
            return self._create_new_version(knowledge, new_version_data)

        changed_fields['updated_by'] = self.user
        for key, value in changed_fields.items():
            setattr(knowledge, key, value)
        knowledge.save(update_fields=list(changed_fields.keys()))

        if space_changed:
            assign_space_tag(knowledge, space_tag_id, clear_when_none=True)
        if tags_changed:
            knowledge.tags.set(normalized_tag_ids)
        return knowledge

    @transaction.atomic
    @log_content_action('knowledge', 'delete', '')
    def delete(self, pk: int) -> Knowledge:
        """
        硬删除知识文档
        Args:
            pk: 主键
        Returns:
            删除前的知识文档对象
        Raises:
            BusinessError: 如果被引用无法删除
        """
        knowledge = get_knowledge_by_id(pk)
        self.validate_not_none(
            knowledge,
            f'知识文档 {pk} 不存在'
        )
        # 检查是否被引用
        if self._is_referenced_by_task(pk):
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该知识文档已被任务引用，无法删除'
            )
        # 硬删除
        knowledge.delete()
        return knowledge

    def increment_view_count(self, pk: int) -> int:
        """
        增加知识文档的阅读次数
        Args:
            pk: 主键
        Returns:
            更新后的阅读次数
        """
        knowledge = self.get_by_id(pk)
        return knowledge.increment_view_count()

    def _validate_knowledge_data(
        self,
        data: dict,
        fallback_content: Optional[str] = None,
    ) -> None:
        """验证知识文档数据"""
        effective_content = data.get('content', fallback_content or '')
        if not strip_tags(str(effective_content)).strip():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='知识文档必须填写正文内容'
            )

    def _is_referenced_by_task(self, knowledge_id: int) -> bool:
        """检查知识文档是否被任务引用"""
        from apps.tasks.models import TaskKnowledge

        return is_referenced(knowledge_id, TaskKnowledge, 'knowledge_id')

    def _create_new_version(
        self,
        source: Knowledge,
        data: dict
    ) -> Knowledge:
        """基于当前版本创建新版本"""
        # 提取标签数据
        space_tag_provided = 'space_tag_id' in data
        tag_ids_provided = 'tag_ids' in data
        space_tag_id = data.pop('space_tag_id', None) if space_tag_provided else source.space_tag_id
        tag_ids = (
            data.pop('tag_ids', None)
            if tag_ids_provided
            else list(source.tags.values_list('id', flat=True))
        )

        def finalize_new_version(new_version: Knowledge) -> None:
            assign_space_tag(new_version, space_tag_id, clear_when_none=True)
            assign_scoped_tags(new_version, tag_ids, scope='knowledge')

        return derive_resource_version(
            source,
            actor=self.user,
            copy_fields=self.VERSION_COPY_FIELDS,
            overrides=data,
            extra_fields={
                'view_count': source.view_count,
            },
            finalize=finalize_new_version,
        )


class DocumentParserService:
    """
    文档解析服务
    支持解析 Word (.docx), PowerPoint (.pptx), PDF (.pdf) 文档
    提取文本内容并转换为 HTML 格式
    """

    SUPPORTED_EXTENSIONS = {'.docx', '.pptx', '.pdf'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    def parse(self, file) -> Tuple[str, str]:
        """
        解析文档，返回 (suggested_title, html_content)

        Args:
            file: Django UploadedFile 对象

        Returns:
            Tuple[str, str]: (建议标题, HTML内容)

        Raises:
            ValueError: 文件格式不支持或文件过大
        """
        # 检查文件大小
        if file.size > self.MAX_FILE_SIZE:
            raise ValueError(f'文件大小超过限制（最大 {self.MAX_FILE_SIZE // 1024 // 1024}MB）')

        filename = file.name
        ext = os.path.splitext(filename)[1].lower()

        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f'不支持的文件格式，仅支持 {", ".join(self.SUPPORTED_EXTENSIONS)}')

        if ext == '.docx':
            return self._parse_docx(file)
        elif ext == '.pptx':
            return self._parse_pptx(file)
        elif ext == '.pdf':
            return self._parse_pdf(file)

    def _parse_docx(self, file) -> Tuple[str, str]:
        """解析 Word 文档"""
        from docx import Document

        doc = Document(file)
        html_parts = []
        title = None

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # 检测标题样式
            style_name = para.style.name if para.style else ''

            if style_name.startswith('Heading'):
                # 提取标题级别
                level_match = re.search(r'\d+', style_name)
                level = int(level_match.group()) if level_match else 1
                level = min(level, 6)  # 限制最大为 h6

                if title is None and level == 1:
                    title = text

                html_parts.append(f'<h{level}>{escape(text)}</h{level}>')
            elif style_name == 'List Bullet':
                # 无序列表项
                html_parts.append(f'<ul><li>{escape(text)}</li></ul>')
            elif style_name == 'List Number':
                # 有序列表项
                html_parts.append(f'<ol><li>{escape(text)}</li></ol>')
            else:
                # 普通段落
                html_parts.append(f'<p>{escape(text)}</p>')

        # 合并连续的列表项
        content = '\n'.join(html_parts)
        content = self._merge_consecutive_lists(content)

        return title or self._extract_title_from_filename(file.name), content

    def _parse_pptx(self, file) -> Tuple[str, str]:
        """解析 PowerPoint 文档"""
        from pptx import Presentation

        prs = Presentation(file)
        html_parts = []
        title = None

        for i, slide in enumerate(prs.slides, 1):
            slide_texts = []
            slide_title = None

            for shape in slide.shapes:
                if hasattr(shape, 'text') and shape.text.strip():
                    text = shape.text.strip()
                    # 第一个文本框通常是标题
                    if slide_title is None:
                        slide_title = text
                    else:
                        slide_texts.append(text)

            if slide_title:
                # 第一页的标题作为文档标题
                if title is None and i == 1:
                    title = slide_title

                html_parts.append(f'<h2>第 {i} 页：{escape(slide_title)}</h2>')

                for text in slide_texts:
                    # 处理多行文本
                    lines = text.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line:
                            html_parts.append(f'<p>{escape(line)}</p>')

        return title or self._extract_title_from_filename(file.name), '\n'.join(html_parts)

    def _parse_pdf(self, file) -> Tuple[str, str]:
        """解析 PDF 文档"""
        import pdfplumber

        html_parts = []
        title = None

        with pdfplumber.open(file) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    text = text.strip()
                    lines = text.split('\n')

                    # 第一页第一行作为标题
                    if title is None and i == 1 and lines:
                        title = lines[0].strip()

                    html_parts.append(f'<h2>第 {i} 页</h2>')

                    for line in lines:
                        line = line.strip()
                        if line:
                            html_parts.append(f'<p>{escape(line)}</p>')

        return title or self._extract_title_from_filename(file.name), '\n'.join(html_parts)

    def _merge_consecutive_lists(self, html: str) -> str:
        """合并连续的列表项"""
        # 合并连续的 ul
        html = re.sub(r'</ul>\s*<ul>', '', html)
        # 合并连续的 ol
        html = re.sub(r'</ol>\s*<ol>', '', html)
        return html

    def _extract_title_from_filename(self, filename: str) -> str:
        """从文件名提取标题"""
        name = os.path.splitext(filename)[0]
        return name or '未命名文档'
