# 知识库文档上传功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现知识库的文档上传解析功能，支持 Word/PPT/PDF 文档解析为 HTML 富文本

**Architecture:** 后端使用 Python 库（python-docx, python-pptx, pdfplumber）解析文档，提取文本内容转换为 HTML 格式；前端添加上传按钮和原始文档链接字段

**Tech Stack:** Django REST Framework, python-docx, python-pptx, pdfplumber, React, TanStack Query

---

## Task 1: 后端 - 添加 source_url 字段

**Files:**
- Modify: `lms_backend/apps/knowledge/models.py`
- Modify: `lms_backend/apps/knowledge/serializers.py`

**Step 1: 修改 Knowledge 模型添加 source_url 字段**

在 `models.py` 的 Knowledge 类中，在 `view_count` 字段后添加：

```python
# 原始文档链接
source_url = models.URLField(
    verbose_name='原始文档链接',
    max_length=500,
    blank=True,
    null=True,
    help_text='在线文档链接（腾讯文档/飞书等）'
)
```

**Step 2: 更新序列化器**

在 `serializers.py` 中：

1. `KnowledgeListSerializer.Meta.fields` 添加 `'source_url'`
2. `KnowledgeDetailSerializer.Meta.fields` 添加 `'source_url'`
3. `KnowledgeCreateSerializer.Meta.fields` 添加 `'source_url'`
4. `KnowledgeUpdateSerializer.Meta.fields` 添加 `'source_url'`

**Step 3: 创建并执行数据库迁移**

Run:
```bash
cd lms_backend && python manage.py makemigrations knowledge --settings=config.settings.development
python manage.py migrate --settings=config.settings.development
```

**Step 4: Commit**

```bash
git add lms_backend/apps/knowledge/models.py lms_backend/apps/knowledge/serializers.py lms_backend/apps/knowledge/migrations/
git commit -m "feat(knowledge): add source_url field for original document link

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 后端 - 安装文档解析依赖

**Files:**
- Modify: `lms_backend/requirements.txt`

**Step 1: 添加依赖到 requirements.txt**

```
python-docx==1.1.0
python-pptx==0.6.23
pdfplumber==0.10.3
```

**Step 2: 安装依赖**

Run:
```bash
cd lms_backend && pip install python-docx python-pptx pdfplumber
```

**Step 3: Commit**

```bash
git add lms_backend/requirements.txt
git commit -m "chore: add document parsing dependencies

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 后端 - 创建文档解析服务

**Files:**
- Create: `lms_backend/apps/knowledge/services/document_parser.py`

**Step 1: 创建 document_parser.py**

```python
"""
文档解析服务
支持解析 Word (.docx), PowerPoint (.pptx), PDF (.pdf) 文档
提取文本内容并转换为 HTML 格式
"""
import os
import re
from typing import Tuple

from django.utils.html import escape


class DocumentParserService:
    """文档解析服务"""

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
        from docx.shared import Pt

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
```

**Step 2: 确保 services 目录存在 __init__.py**

检查 `lms_backend/apps/knowledge/services/__init__.py` 是否存在，如果不存在则创建空文件。

**Step 3: Commit**

```bash
git add lms_backend/apps/knowledge/services/
git commit -m "feat(knowledge): add document parser service

Support parsing .docx, .pptx, .pdf files to HTML

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 后端 - 创建文档解析 API

**Files:**
- Create: `lms_backend/apps/knowledge/views/document.py`
- Modify: `lms_backend/apps/knowledge/views/__init__.py`
- Modify: `lms_backend/apps/knowledge/urls.py`

**Step 1: 创建 document.py 视图**

```python
"""
文档解析视图
提供文档上传解析接口
"""
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated

from core.responses import success_response, error_response
from ..services.document_parser import DocumentParserService


class ParseDocumentView(APIView):
    """
    文档解析接口

    POST /api/knowledge/parse-document/
    上传文档文件，解析提取文本内容返回 HTML 格式
    """
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return error_response('请上传文件', code='VALIDATION_ERROR')

        try:
            parser = DocumentParserService()
            suggested_title, content = parser.parse(file)

            ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''

            return success_response({
                'suggested_title': suggested_title,
                'content': content,
                'file_type': ext
            })
        except ValueError as e:
            return error_response(str(e), code='VALIDATION_ERROR')
        except Exception as e:
            return error_response(f'文档解析失败：{str(e)}', code='PARSE_ERROR')
```

**Step 2: 更新 views/__init__.py**

添加导入：
```python
from .document import ParseDocumentView
```

**Step 3: 更新 urls.py**

在 urlpatterns 中添加：
```python
path('parse-document/', ParseDocumentView.as_view(), name='parse-document'),
```

并在顶部导入中添加 `ParseDocumentView`。

**Step 4: Commit**

```bash
git add lms_backend/apps/knowledge/views/ lms_backend/apps/knowledge/urls.py
git commit -m "feat(knowledge): add document parsing API endpoint

POST /api/knowledge/parse-document/

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: 前端 - 更新类型定义

**Files:**
- Modify: `lms_frontend/src/types/knowledge.ts`

**Step 1: 更新类型定义**

在以下接口中添加 `source_url?: string;` 字段：

1. `KnowledgeListItem` - 在 `view_count` 后添加
2. `KnowledgeDetail` - 在 `view_count` 后添加
3. `KnowledgeCreateRequest` - 在 `summary` 后添加
4. `KnowledgeUpdateRequest` - 在 `summary` 后添加

添加新的接口：

```typescript
/**
 * 文档解析响应
 */
export interface ParseDocumentResponse {
  suggested_title: string;
  content: string;
  file_type: string;
}
```

**Step 2: Commit**

```bash
git add lms_frontend/src/types/knowledge.ts
git commit -m "feat(knowledge): add source_url and ParseDocumentResponse types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: 前端 - 创建文档解析 API

**Files:**
- Create: `lms_frontend/src/features/knowledge/api/parse-document.ts`

**Step 1: 创建 parse-document.ts**

```typescript
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ParseDocumentResponse } from '@/types/knowledge';

/**
 * 解析文档
 */
export const parseDocument = async (file: File): Promise<ParseDocumentResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ParseDocumentResponse>(
    '/knowledge/parse-document/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response;
};

/**
 * 文档解析 Hook
 */
export const useParseDocument = () => {
  return useMutation({
    mutationFn: parseDocument,
  });
};
```

**Step 2: Commit**

```bash
git add lms_frontend/src/features/knowledge/api/parse-document.ts
git commit -m "feat(knowledge): add document parsing API hook

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: 前端 - 更新知识表单组件

**Files:**
- Modify: `lms_frontend/src/features/knowledge/components/knowledge-form.tsx`

**Step 1: 添加导入**

在文件顶部添加：
```typescript
import { Upload, ExternalLink } from 'lucide-react';
import { useParseDocument } from '../api/parse-document';
```

**Step 2: 添加状态和 Hook**

在组件内部添加：
```typescript
const [sourceUrl, setSourceUrl] = useState('');
const parseDocument = useParseDocument();
```

**Step 3: 编辑模式下填充 sourceUrl**

在 `useEffect` 中添加：
```typescript
setSourceUrl(knowledgeDetail.source_url || '');
```

**Step 4: 更新 buildRequestData 函数**

在 requestData 对象中添加：
```typescript
source_url: sourceUrl || undefined,
```

**Step 5: 添加文件上传处理函数**

```typescript
const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const result = await parseDocument.mutateAsync(file);
    if (!title.trim()) {
      setTitle(result.suggested_title);
    }
    setContent(result.content);
    toast.success('文档解析成功');
  } catch (error) {
    showApiError(error, '文档解析失败');
  }

  // 清空 input 以便重复上传同一文件
  e.target.value = '';
}, [parseDocument, title]);
```

**Step 6: 在顶部导航栏标题输入框后添加原始文档链接输入框**

在标题 Input 后、状态信息前添加：
```tsx
<div className="flex items-center gap-2 shrink-0">
  <Input
    value={sourceUrl}
    onChange={(e) => setSourceUrl(e.target.value)}
    placeholder="原始文档链接..."
    className="w-48 h-10 text-sm"
  />
  {sourceUrl && (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10"
      onClick={() => window.open(sourceUrl, '_blank')}
      title="打开原始文档"
    >
      <ExternalLink className="w-4 h-4" />
    </Button>
  )}
</div>
```

**Step 7: 在编辑区顶部添加上传按钮**

在中间编辑区的开始处（knowledgeType 判断之前）添加上传按钮区域：
```tsx
{/* 文档上传区域 - 仅在非应急类型时显示 */}
{knowledgeType === 'OTHER' && (
  <div className="px-8 py-4 border-b border-border">
    <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg cursor-pointer hover:bg-primary-100 transition-colors">
      <Upload className="w-4 h-4" />
      <span className="text-sm font-medium">上传文档解析</span>
      <input
        type="file"
        accept=".docx,.pptx,.pdf"
        onChange={handleFileUpload}
        className="hidden"
        disabled={parseDocument.isPending}
      />
    </label>
    <span className="ml-3 text-xs text-text-muted">
      支持 .docx, .pptx, .pdf 格式
    </span>
    {parseDocument.isPending && (
      <span className="ml-3 text-xs text-primary-600">
        <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
        解析中...
      </span>
    )}
  </div>
)}
```

**Step 8: Commit**

```bash
git add lms_frontend/src/features/knowledge/components/knowledge-form.tsx
git commit -m "feat(knowledge): add document upload and source_url to form

- Add file upload button for parsing documents
- Add source_url input field in header
- Support .docx, .pptx, .pdf formats

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: 前端 - 更新知识详情页

**Files:**
- Modify: `lms_frontend/src/features/knowledge/components/knowledge-detail.tsx`

**Step 1: 在标题旁添加查看原始文档按钮**

找到标题显示的位置，在标题后添加：
```tsx
{knowledge.source_url && (
  <Button
    variant="ghost"
    size="sm"
    className="ml-2 text-primary-600 hover:text-primary-700"
    onClick={() => window.open(knowledge.source_url, '_blank')}
  >
    <ExternalLink className="w-4 h-4 mr-1" />
    查看原始文档
  </Button>
)}
```

**Step 2: 添加导入**

```typescript
import { ExternalLink } from 'lucide-react';
```

**Step 3: Commit**

```bash
git add lms_frontend/src/features/knowledge/components/knowledge-detail.tsx
git commit -m "feat(knowledge): add source_url link to detail page

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: 测试验证

**Step 1: 启动后端服务**

Run:
```bash
cd lms_backend && python manage.py runserver --settings=config.settings.development
```

**Step 2: 启动前端服务**

Run:
```bash
cd lms_frontend && npm run dev
```

**Step 3: 手动测试**

1. 访问知识创建页面
2. 上传一个 .docx 文件，验证解析结果
3. 填写原始文档链接，保存
4. 查看知识详情页，验证链接显示和跳转

**Step 4: 最终 Commit**

```bash
git add -A
git commit -m "feat(knowledge): complete document upload feature

- Backend: document parser service for .docx, .pptx, .pdf
- Backend: parse-document API endpoint
- Backend: source_url field for original document link
- Frontend: file upload button in knowledge form
- Frontend: source_url input and display

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## 实现检查清单

- [ ] Task 1: 后端 - 添加 source_url 字段
- [ ] Task 2: 后端 - 安装文档解析依赖
- [ ] Task 3: 后端 - 创建文档解析服务
- [ ] Task 4: 后端 - 创建文档解析 API
- [ ] Task 5: 前端 - 更新类型定义
- [ ] Task 6: 前端 - 创建文档解析 API
- [ ] Task 7: 前端 - 更新知识表单组件
- [ ] Task 8: 前端 - 更新知识详情页
- [ ] Task 9: 测试验证
