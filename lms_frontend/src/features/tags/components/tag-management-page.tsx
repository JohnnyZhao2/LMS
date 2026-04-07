import * as React from 'react';
import { GitMerge, Hash, Pencil, Shapes, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CircleButton } from '@/components/ui/circle-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import type { Tag, TagType } from '@/types/api';

import { useCreateTag, useDeleteTag, useMergeTag, useTags, useUpdateTag } from '../api/tags';
import { TagFormDialog } from './tag-form-dialog';


const typeLabel: Record<TagType, string> = {
  SPACE: '空间',
  TAG: '普通标签',
};

/** 空间 / 普通标签 分段选项 */
const TAG_TYPE_SEGMENT_OPTIONS: { label: string; value: TagType }[] = [
  { label: '空间', value: 'SPACE' },
  { label: '普通标签', value: 'TAG' },
];

type ApplicableScope = 'all' | 'knowledge' | 'question';

const TAG_SCOPE_SEGMENT_OPTIONS: { label: string; value: ApplicableScope }[] = [
  { label: '全部范围', value: 'all' },
  { label: '知识', value: 'knowledge' },
  { label: '题目', value: 'question' },
];

const getTagRingColor = (tag: Tag) => {
  if (tag.tag_type === 'SPACE') {
    return tag.color || 'var(--theme-primary)';
  }
  if (tag.allow_knowledge && tag.allow_question) {
    return '#111827';
  }
  if (tag.allow_knowledge) {
    return '#16a34a';
  }
  return '#2563eb';
};

export const TagManagementPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('tag.create');
  const canUpdate = hasPermission('tag.update');
  const canDelete = hasPermission('tag.delete');

  const [activeTab, setActiveTab] = React.useState<TagType>('SPACE');
  const [applicableScope, setApplicableScope] = React.useState<ApplicableScope>('all');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create');
  const [editingTag, setEditingTag] = React.useState<Tag | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Tag | null>(null);
  const [selectedTagIds, setSelectedTagIds] = React.useState<number[]>([]);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = React.useState(false);
  const [mergedName, setMergedName] = React.useState('');

  React.useEffect(() => {
    if (activeTab === 'SPACE') {
      setApplicableScope('all');
    }
  }, [activeTab]);

  const { data: tags = [], isLoading } = useTags({
    tag_type: activeTab,
    search: search || undefined,
    applicable_to: activeTab === 'TAG' && applicableScope !== 'all' ? applicableScope : undefined,
  });
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const mergeTag = useMergeTag();
  const deleteTag = useDeleteTag();

  React.useEffect(() => {
    setSelectedTagIds((current) => current.filter((id) => tags.some((tag) => tag.id === id)));
  }, [tags]);

  const handleSubmit = async (payload: {
    name: string;
    tag_type: TagType;
    color?: string;
    sort_order?: number;
    allow_knowledge: boolean;
    allow_question: boolean;
  }) => {
    try {
      if (dialogMode === 'create') {
        await createTag.mutateAsync({
          ...payload,
        });
        toast.success(`${typeLabel[payload.tag_type]}已创建`);
      } else if (editingTag) {
        await updateTag.mutateAsync({
          id: editingTag.id,
          data: payload,
        });
        toast.success('标签已更新');
      }
      setActiveTab(payload.tag_type);
      setIsDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('保存失败');
      }
    }
  };

  const handleToggleTagSelection = (tagId: number) => {
    setSelectedTagIds((current) => (
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    ));
  };

  const handleMerge = async () => {
    if (selectedTagIds.length < 2 || !mergedName.trim()) return;
    try {
      await mergeTag.mutateAsync({
        source_tag_ids: selectedTagIds,
        merged_name: mergedName.trim(),
      });
      toast.success('标签已合并');
      setSelectedTagIds([]);
      setMergedName('');
      setIsMergeDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('合并失败');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTag.mutateAsync(deleteTarget.id);
      toast.success('标签已删除');
      setDeleteTarget(null);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('删除失败');
      }
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="标签管理"
        icon={<Hash />}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
        <div className="flex w-full flex-col gap-3 sm:w-auto">
          <SegmentedControl
            className="w-full max-w-sm shrink-0 sm:w-auto"
            options={TAG_TYPE_SEGMENT_OPTIONS}
            value={activeTab}
            onChange={(v) => setActiveTab(v as TagType)}
          />
          {activeTab === 'TAG' && (
            <SegmentedControl
              className="w-full max-w-sm shrink-0 sm:w-auto"
              options={TAG_SCOPE_SEGMENT_OPTIONS}
              value={applicableScope}
              onChange={(v) => setApplicableScope(v as ApplicableScope)}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setSearch(searchInput.trim());
              }
            }}
            placeholder="搜索标签名称"
            className={DESKTOP_SEARCH_INPUT_CLASSNAME}
          />
          {canUpdate && selectedTagIds.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 shrink-0 rounded-full border-white/80 px-4 text-[12px] font-semibold tracking-[0.08em] text-foreground shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
              onClick={() => {
                setMergedName('');
                setIsMergeDialogOpen(true);
              }}
            >
              <GitMerge className="h-3.5 w-3.5" />
              合并标签
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {selectedTagIds.length}
              </span>
            </Button>
          )}
          {canCreate && (
            <CircleButton
              onClick={() => {
                setDialogMode('create');
                setEditingTag(null);
                setIsDialogOpen(true);
              }}
              label={`新建${typeLabel[activeTab]}`}
              className="shrink-0"
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 16 }).map((_, index) => (
              <div
                key={index}
                className="h-12 w-32 animate-pulse rounded-full border border-border/60 bg-muted/50"
              />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <EmptyState
            icon={activeTab === 'SPACE' ? <Shapes className="h-12 w-12" /> : <Hash className="h-12 w-12" />}
            title={`暂无${typeLabel[activeTab]}`}
            description={search ? '没有匹配的标签，换个关键词试试。' : '创建后会以胶囊形式集中展示在这里。'}
            className="rounded-xl border border-dashed border-border/70 bg-muted/20"
          />
        ) : (
          <div className="flex flex-wrap content-start gap-3">
            {tags.map((tag) => {
              const accentColor = getTagRingColor(tag);
              const isSelected = selectedTagIds.includes(tag.id);

              return (
                <article
                  key={tag.id}
                  onClick={() => handleToggleTagSelection(tag.id)}
                  className={cn(
                    'group relative inline-flex min-w-0 max-w-full cursor-pointer items-center gap-2.5 rounded-full border pl-3 pr-2 py-2 text-left transition-all duration-200',
                    isSelected && 'ring-2 ring-primary/35',
                    tag.tag_type === 'SPACE'
                      ? 'border-transparent bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,246,237,0.98))] shadow-[0_12px_30px_rgba(15,23,42,0.08)]'
                      : 'border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_10px_24px_rgba(15,23,42,0.06)]',
                  )}
                  style={accentColor ? { boxShadow: `0 12px 30px color-mix(in srgb, ${accentColor} 20%, transparent)` } : undefined}
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                    style={{
                      borderColor: accentColor,
                      backgroundColor: isSelected ? accentColor : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>

                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <h3 className="max-w-[14rem] truncate pr-1 text-[13px] font-semibold text-foreground">
                      {tag.name}
                    </h3>
                    {tag.tag_type === 'SPACE' && tag.color && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold leading-none text-text-muted">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.color}
                      </span>
                    )}
                  </div>

                  {(canUpdate || canDelete) && (
                    <div className="ml-1 flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-full p-0 text-text-muted hover:bg-black/5 hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDialogMode('edit');
                            setEditingTag(tag);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-full p-0 text-text-muted hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(tag);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <TagFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        initialTagType={editingTag?.tag_type ?? activeTab}
        tag={editingTag}
        onSubmit={handleSubmit}
        isSubmitting={createTag.isPending || updateTag.isPending}
      />

      <Dialog
        open={isMergeDialogOpen}
        onOpenChange={(open) => {
          setIsMergeDialogOpen(open);
          if (!open) {
            setMergedName('');
          }
        }}
      >
        <DialogContent className="max-w-[680px] overflow-hidden border-0 bg-[linear-gradient(145deg,rgba(255,252,247,0.98),rgba(250,246,255,0.96)_48%,rgba(246,249,255,0.98))] p-0 shadow-[0_36px_90px_rgba(15,23,42,0.18)]">
          <div className="relative overflow-hidden px-7 py-7 sm:px-9 sm:py-8">
            <div className="pointer-events-none absolute -left-16 top-0 h-36 w-36 rounded-full bg-[rgba(255,153,102,0.12)] blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-10 h-32 w-32 rounded-full bg-[rgba(37,99,235,0.1)] blur-3xl" />

            <DialogHeader className="relative space-y-3">
              <DialogTitle className="text-[28px] font-semibold tracking-[-0.04em] text-foreground sm:text-[32px]">
                {activeTab === 'SPACE' ? '合并这组空间' : '合并这组标签'}
              </DialogTitle>
              <DialogDescription className="max-w-[34rem] text-[14px] leading-7 text-text-muted sm:text-[15px]">
                已选 {selectedTagIds.length} 个{activeTab === 'SPACE' ? '空间' : '普通标签'}，输入一个统一名称后，系统会把引用关系收束到同一个标签上。
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-7 space-y-6">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-text-muted">
                  已选标签
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {tags.filter((tag) => selectedTagIds.includes(tag.id)).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded-full border border-white/80 bg-white/76 px-3.5 py-2 text-[12px] font-medium text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-text-muted">
                  合并后名称
                </p>
                <Input
                  value={mergedName}
                  onChange={(event) => setMergedName(event.target.value)}
                  placeholder="输入合并后的标签名"
                  className="h-14 rounded-lg border-white/80 bg-white/84 px-5 text-[16px] font-semibold shadow-[0_16px_34px_rgba(15,23,42,0.08)] placeholder:text-text-muted/80"
                />
                <p className="text-xs leading-6 text-text-muted">
                  合并后只保留一个标签实体，其他已选标签会被移除，知识和题目的引用关系会自动迁移。
                </p>
              </div>
            </div>

            <DialogFooter className="relative mt-8 gap-3 sm:space-x-0">
              <Button
                variant="outline"
                className="rounded-full border-white/80 bg-white/72 px-5"
                onClick={() => {
                  setIsMergeDialogOpen(false);
                  setMergedName('');
                }}
              >
                取消
              </Button>
              <Button
                className="rounded-full px-6 shadow-[0_16px_34px_rgba(15,23,42,0.18)]"
                onClick={() => void handleMerge()}
                disabled={selectedTagIds.length < 2 || !mergedName.trim() || mergeTag.isPending}
              >
                {mergeTag.isPending ? '合并中...' : '确认合并'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除标签"
        description={deleteTarget ? `确认删除「${deleteTarget.name}」吗？相关知识或题目引用会被同步清理。` : ''}
        confirmText="删除"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        isConfirming={deleteTag.isPending}
      />
    </PageShell>
  );
};
