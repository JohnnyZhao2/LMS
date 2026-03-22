import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileText,
  Settings,
  Save,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Loader2,
  ListOrdered,
  X,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EmptyState } from '@/components/ui/empty-state';

import { useKnowledgeDetail } from '../api/knowledge';
import { useLineTypeTags, useKnowledgeTags, useCreateTag } from '../api/get-tags';
import { useCreateKnowledge, useUpdateKnowledge } from '../api/manage-knowledge';
import { useParseDocument } from '../api/parse-document';
import { parseOutline } from '../utils';
import { showApiError } from '@/utils/error-handler';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { KnowledgeCreateRequest, KnowledgeUpdateRequest, Tag } from '@/types/api';

const RichTextEditor = lazy(() => import('./rich-text-editor').then(m => ({ default: m.RichTextEditor })));

/**
 * 知识表单组件 - 统一正文版本
 */
export const KnowledgeForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roleNavigate, getRolePath } = useRoleNavigate();
  const isEdit = !!id;

  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [title, setTitle] = useState('');
  const [lineTypeId, setLineTypeId] = useState<number | undefined>();
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: knowledgeDetail, isLoading: detailLoading } = useKnowledgeDetail(Number(id));
  const { data: lineTypeTags = [] } = useLineTypeTags();
  const { data: knowledgeTags = [] } = useKnowledgeTags();
  const createKnowledge = useCreateKnowledge();
  const updateKnowledge = useUpdateKnowledge();
  const createTag = useCreateTag();
  const parseDocument = useParseDocument();

  useEffect(() => {
    if (!knowledgeDetail || !isEdit) return;

    setTitle(knowledgeDetail.title || '');
    setLineTypeId(knowledgeDetail.line_tag?.id);
    setTagIds(knowledgeDetail.tags?.map((t) => t.id) || []);
    setSourceUrl(knowledgeDetail.source_url || '');
    setContent(knowledgeDetail.content || '');
  }, [isEdit, knowledgeDetail]);

  useEffect(() => {
    if (!isEdit && lineTypeTags.length > 0 && !lineTypeId) {
      const defaultLineType = lineTypeTags.find((t: Tag) => t.name === '其他') ?? lineTypeTags[0];
      if (defaultLineType) {
        setLineTypeId(defaultLineType.id);
      }
    }
  }, [isEdit, lineTypeTags, lineTypeId]);

  const handleClose = useCallback(() => {
    roleNavigate('knowledge');
  }, [roleNavigate]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseDocument.mutateAsync(file);
      if (!title.trim()) {
        setTitle(result.suggested_title);
      }
      setContent(result.content);
      toast.success('正文导入成功');
    } catch (error) {
      showApiError(error, '正文导入失败');
    }

    e.target.value = '';
  }, [parseDocument, title]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    if (!title.trim()) {
      newErrors.title = '请输入标题';
    }

    if (!lineTypeId) {
      newErrors.lineTypeId = '请选择条线类型';
    }

    if (!plainContent) {
      newErrors.content = '请填写正文内容';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, lineTypeId, content]);

  const buildRequestData = useCallback((): KnowledgeCreateRequest | KnowledgeUpdateRequest => {
    return {
      title,
      line_tag_id: lineTypeId!,
      tag_ids: tagIds,
      content,
      source_url: sourceUrl || undefined,
    };
  }, [title, lineTypeId, tagIds, content, sourceUrl]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      toast.error('请检查表单填写是否完整');
      return;
    }

    const requestData = buildRequestData();

    try {
      if (isEdit && id) {
        const currentId = Number(id);
        const result = await updateKnowledge.mutateAsync({ id: currentId, data: requestData });
        toast.success('保存成功');
        if (result?.id && result.id !== currentId) {
          navigate(getRolePath(`knowledge/${result.id}/edit`), { replace: true });
        }
      } else {
        const result = await createKnowledge.mutateAsync(requestData as KnowledgeCreateRequest);
        toast.success('创建成功');
        navigate(getRolePath(`knowledge/${result.id}/edit`), { replace: true });
      }
    } catch (error) {
      showApiError(error, isEdit ? '保存失败' : '创建失败');
    }
  }, [validateForm, buildRequestData, isEdit, id, updateKnowledge, createKnowledge, navigate, getRolePath]);

  const isSubmitting = createKnowledge.isPending || updateKnowledge.isPending;

  const statusInfo = useMemo(() => {
    if (!isEdit) {
      return {
        label: '新建',
        isDraft: false,
        description: '保存后将立即对所有用户可见。',
      };
    }

    return {
      label: '当前版本',
      isDraft: false,
      description: '保存修改后将创建新版本并立即对所有用户可见。',
    };
  }, [isEdit]);

  const outline = useMemo(() => parseOutline(content), [content]);

  if (isEdit && detailLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-muted z-[1000]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-1px)] -m-6 bg-muted overflow-hidden">
      <div className="flex items-center h-16 px-6 bg-background border-b border-border shrink-0 gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex items-center gap-2.5 px-3 h-10 text-text-muted hover:text-primary-500 hover:bg-primary-50 transition-all group rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold">返回列表</span>
          </Button>
          <div className="w-px h-5 bg-muted" />
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入知识标题..."
            className={cn(
              'text-lg font-semibold h-10 border border-border bg-background rounded-lg px-4 hover:border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200',
              errors.title && 'border-destructive-300 placeholder:text-destructive-300 focus:border-destructive-500 focus:ring-destructive-100'
            )}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="来源链接（可选）"
            className="w-48 h-10 text-sm"
          />
          {sourceUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => window.open(sourceUrl, '_blank')}
              title="打开来源链接"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isEdit && knowledgeDetail && (
            <div className="flex items-center gap-2 text-xs text-text-muted mr-2">
              <span>{knowledgeDetail.updated_by_name || knowledgeDetail.created_by_name}</span>
              <span>·</span>
              <span>{new Date(knowledgeDetail.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          <Badge
            className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-full text-[10px] uppercase border ${statusInfo.isDraft
              ? 'bg-warning-50 text-warning-600 border-warning-200'
              : 'bg-secondary-50 text-secondary-600 border-secondary-200'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {statusInfo.label}
          </Badge>

          <Button
            size="default"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-10 px-6 font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? '保存中...' : '保存修改'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={cn(
          'flex flex-col border-r border-border bg-background transition-all duration-300',
          outlineCollapsed ? 'w-14' : 'w-64'
        )}>
          {outlineCollapsed ? (
            <div className="flex flex-col items-center py-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOutlineCollapsed(false)}
                title="展开目录"
              >
                <PanelLeft className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-border text-sm font-semibold text-foreground shrink-0">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-primary-500" />
                  正文目录
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-text-muted hover:text-primary-500"
                  onClick={() => setOutlineCollapsed(true)}
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {outline.length > 0 ? (
                  <div className="space-y-1.5">
                    {outline.map((item, index) => {
                      const outlineKey = `${item.id}-${index}`;
                      const paddingLeft = (item.level - 1) * 12 + 8;
                      return (
                        <div
                          key={outlineKey}
                          className={cn(
                            'group flex items-center gap-3 py-3 px-4 text-xs rounded-lg cursor-pointer transition-all',
                            item.level === 1 ? 'font-semibold text-foreground bg-muted' : 'text-text-muted hover:bg-muted'
                          )}
                          style={{ paddingLeft: `${paddingLeft}px` }}
                          onClick={() => {
                            const element = document.getElementById(item.id);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                        >
                          <span className="truncate group-hover:translate-x-1 transition-transform">{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-60">
                    <EmptyState
                      icon={FileText}
                      description="暂无正文目录"
                      subDescription="在正文中添加标题后会自动生成目录"
                      iconSize="md"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-background min-w-0">
          <div className="px-8 py-4 border-b border-border flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">正文编辑</h2>
              <p className="text-xs text-text-muted mt-1">所有知识统一使用同一份富文本正文，标题自动生成目录，标签仅用于归类与筛选。</p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg cursor-pointer hover:bg-primary-100 transition-colors shrink-0">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">导入文档正文</span>
              <input
                type="file"
                accept=".docx,.pptx,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={parseDocument.isPending}
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="w-full h-full">
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <Suspense fallback={null}>
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="请输入知识正文..."
                      className="border-none ring-0 h-full min-h-[calc(100vh-160px)]"
                      contentClassName="p-6 px-8 max-w-6xl mx-auto text-base leading-relaxed"
                    />
                  </Suspense>
                </div>
                {errors.content && (
                  <div className="m-6 p-4 bg-destructive-50 border border-destructive-100 rounded-lg text-xs font-semibold text-destructive-600 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive-500 animate-pulse" />
                    {errors.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-[380px] flex flex-col bg-background border-l border-border shrink-0 overflow-y-auto">
          <div className="flex items-center h-16 px-8 bg-background border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary-500" />
              页面配置
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <section className="p-6 bg-muted rounded-2xl border border-border space-y-5">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                基础配置
              </h3>
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-foreground ml-1">所属条线</Label>
                <SearchableSelect
                  items={lineTypeTags}
                  value={lineTypeId}
                  onSelect={(v) => setLineTypeId(Number(v))}
                  onCreate={async (name) => {
                    const newTag = await createTag.mutateAsync({ name, tag_type: 'LINE', is_active: true });
                    setLineTypeId(newTag.id);
                    toast.success('新条线已创建');
                  }}
                  placeholder="选择条线..."
                  getLabel={(t) => t.name}
                  getValue={(t) => t.id}
                />
                {errors.lineTypeId && <p className="text-xs font-semibold text-destructive-500 px-1">{errors.lineTypeId}</p>}
              </div>
            </section>

            <section className="p-6 bg-muted rounded-2xl border border-border space-y-5">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                来源信息
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="来源链接（可选）"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="h-11"
                />
              </div>
            </section>

            <section className="p-6 bg-muted rounded-2xl border border-border space-y-5">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                知识标签
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-xs font-semibold text-foreground">标签</Label>
                  <span className="text-[10px] font-bold text-text-muted bg-muted px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">{tagIds.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tagIds.map(id => {
                    const tag = knowledgeTags.find(t => t.id === id);
                    return tag ? (
                      <Badge key={id} variant="info" className="h-8 px-3 text-[10px] rounded-lg border-none bg-primary-50 text-primary-600 hover:bg-destructive-50 hover:text-destructive-500 transition-all group">
                        {tag.name}
                        <X className="w-3 h-3 ml-2 cursor-pointer group-hover:scale-125 transition-transform" onClick={() => setTagIds(prev => prev.filter(i => i !== id))} />
                      </Badge>
                    ) : null;
                  })}
                </div>
                <SearchableSelect
                  items={knowledgeTags.filter(t => !tagIds.includes(t.id))}
                  onSelect={(v) => setTagIds(prev => [...prev, Number(v)])}
                  onCreate={async (name) => {
                    const newTag = await createTag.mutateAsync({ name, tag_type: 'TAG', is_active: true });
                    setTagIds(prev => [...prev, newTag.id]);
                    toast.success('标签已创建');
                  }}
                  placeholder="选择或创建标签..."
                  getLabel={(t) => t.name}
                  getValue={(t) => t.id}
                />
              </div>
            </section>

            <div className="pt-8 border-t border-border">
              <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest px-1">
                <span>当前版本</span>
                <span className="text-primary-500">PUBLISHED</span>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-xl border border-dashed border-border flex gap-3">
                <div className="w-5 h-5 flex-shrink-0 bg-primary-100 rounded-md flex items-center justify-center">
                  <Settings className="w-3 h-3 text-primary-600" />
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed font-medium">
                  {statusInfo.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeForm;
