"""
知识文档应用服务
编排业务逻辑。
版本管理说明：
- 使用 resource_uuid + version_number + is_current 管理版本
- is_current=True 表示当前最新版本
"""
import os
import re
import uuid
from typing import List, Optional, Tuple

from django.db import transaction
from django.utils.html import strip_tags
from django.utils.html import escape

from apps.tags.models import Tag
from core.base_service import BaseService
from core.decorators import log_content_action
from core.exceptions import BusinessError, ErrorCodes

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
    ) -> List[Knowledge]:
        """
        获取所有知识文档（只返回当前版本）
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
        Returns:
            知识文档列表
        """
        qs = get_knowledge_queryset(filters=filters, search=search, ordering=ordering)
        return list(qs)

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
        data['is_current'] = True
        # 处理版本号（创建只允许新资源）
        data.pop('resource_uuid', None)
        data['resource_uuid'] = uuid.uuid4()
        data['version_number'] = 1
        # 提取标签数据
        line_tag_id = data.pop('line_tag_id', None)
        tag_ids = data.pop('tag_ids', [])
        # 3. 创建知识
        knowledge = Knowledge.objects.create(**data)
        Knowledge.objects.filter(
            resource_uuid=knowledge.resource_uuid
        ).exclude(pk=knowledge.pk).update(is_current=False)
        # 4. 设置标签
        self._set_tags(knowledge, line_tag_id, tag_ids)
        return knowledge

    @transaction.atomic
    @log_content_action('knowledge', 'update', 'v{version_number}')
    def update(self, pk: int, data: dict) -> Knowledge:
        """
        更新知识文档
        版本管理：每次更新都创建新版本，旧版本保持不变
        Args:
            pk: 主键
            data: 更新数据
        Returns:
            更新后的知识文档对象
        Raises:
            BusinessError: 如果验证失败或无法更新
        """
        knowledge = self.get_by_id(pk)
        # 当前版本需要创建新版本
        if knowledge.is_current:
            return self._create_new_version(knowledge, data)
        # 非当前版本直接更新（历史版本的修正）
        self._validate_knowledge_data(
            data=data,
            fallback_content=knowledge.content,
        )
        # 提取标签数据
        line_tag_id = data.pop('line_tag_id', None)
        tag_ids = data.pop('tag_ids', None)
        data['updated_by'] = self.user
        if data:
            for key, value in data.items():
                setattr(knowledge, key, value)
            knowledge.save(update_fields=list(data.keys()))
        # 更新标签
        if line_tag_id is not None or tag_ids is not None:
            self._set_tags(knowledge, line_tag_id, tag_ids)
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
        knowledge = get_knowledge_by_id(pk)
        self.validate_not_none(
            knowledge,
            f'知识文档 {pk} 不存在'
        )
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

    def _set_tags(
        self,
        knowledge: Knowledge,
        line_tag_id: Optional[int],
        tag_ids: Optional[List[int]],
    ) -> None:
        """设置标签"""
        if line_tag_id is not None:
            knowledge.line_tag = self._get_line_tag_or_error(line_tag_id)
            knowledge.save(update_fields=['line_tag'])
        if tag_ids is not None:
            knowledge.tags.set(self._get_tag_ids_or_error(tag_ids))

    def _get_line_tag_or_error(self, line_tag_id: int) -> Tag:
        """获取并校验条线标签。"""
        line_tag = Tag.objects.filter(
            id=line_tag_id,
            tag_type='LINE',
            is_active=True,
        ).first()
        if not line_tag:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的条线标签ID'
            )
        return line_tag

    def _get_tag_ids_or_error(self, tag_ids: List[int]) -> List[int]:
        """获取并校验知识标签 ID 列表。"""
        if not tag_ids:
            return []

        valid_tag_ids = set(
            Tag.objects.filter(
                id__in=tag_ids,
                tag_type='TAG',
                is_active=True,
                allow_knowledge=True,
            ).values_list('id', flat=True)
        )
        invalid_tag_ids = [tag_id for tag_id in tag_ids if tag_id not in valid_tag_ids]
        if invalid_tag_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='包含无效的知识标签ID',
                details={'invalid_tag_ids': invalid_tag_ids},
            )

        deduped_tag_ids = []
        seen_ids = set()
        for tag_id in tag_ids:
            if tag_id in seen_ids:
                continue
            seen_ids.add(tag_id)
            deduped_tag_ids.append(tag_id)
        return deduped_tag_ids

    def _is_referenced_by_task(self, knowledge_id: int) -> bool:
        """检查知识文档是否被任务引用"""
        try:
            from apps.tasks.models import TaskKnowledge
            return TaskKnowledge.objects.filter(knowledge_id=knowledge_id).exists()
        except ImportError:
            return False

    def _create_new_version(
        self,
        source: Knowledge,
        data: dict
    ) -> Knowledge:
        """基于当前版本创建新版本"""
        # 获取下一个版本号
        next_version = Knowledge.next_version_number(source.resource_uuid)
        # 提取标签数据
        line_tag_id = data.pop('line_tag_id', None)
        tag_ids = data.pop('tag_ids', None)
        # 准备新版本数据：自动复制所有内容字段
        new_version_data = {
            'resource_uuid': source.resource_uuid,
            'version_number': next_version,
            'is_current': True,
            'created_by': self.user,
            'updated_by': self.user,
            'view_count': source.view_count,
        }
        # 从 VERSION_COPY_FIELDS 自动复制字段，优先使用更新数据
        for field in self.VERSION_COPY_FIELDS:
            new_version_data[field] = data.get(field, getattr(source, field, None))
        # 先取消旧版本的 is_current，避免唯一约束冲突
        Knowledge.objects.filter(
            resource_uuid=source.resource_uuid,
            is_current=True
        ).update(is_current=False)
        # 创建新版本
        new_version = Knowledge.objects.create(**new_version_data)
        # 设置标签：按字段粒度处理，未传字段继承 source
        inherited_line_tag_id = line_tag_id if line_tag_id is not None else source.line_tag_id
        inherited_tag_ids = (
            tag_ids
            if tag_ids is not None
            else list(source.tags.values_list('id', flat=True))
        )
        self._set_tags(
            new_version,
            inherited_line_tag_id,
            inherited_tag_ids,
        )
        return new_version


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
