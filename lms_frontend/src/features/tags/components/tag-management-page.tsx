import * as React from 'react';
import { Pencil, Plus, Tags as TagsIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ApiError } from '@/lib/api-client';
import type { Tag, TagType } from '@/types/api';

import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '../api/tags';
import { TagFormDialog } from './tag-form-dialog';


const typeLabel: Record<TagType, string> = {
  SPACE: 'space',
  TAG: '普通标签',
};

/** space / 普通标签 分段选项 */
const TAG_TYPE_SEGMENT_OPTIONS: { label: string; value: TagType }[] = [
  { label: 'space', value: 'SPACE' },
  { label: '普通标签', value: 'TAG' },
];

export const TagManagementPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('tag.create');
  const canUpdate = hasPermission('tag.update');
  const canDelete = hasPermission('tag.delete');

  const [activeTab, setActiveTab] = React.useState<TagType>('SPACE');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create');
  const [editingTag, setEditingTag] = React.useState<Tag | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Tag | null>(null);

  const { data: tags = [], isLoading } = useTags({
    tag_type: activeTab,
    search: search || undefined,
    active_only: false,
  });
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingTag(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: Tag) => {
    setDialogMode('edit');
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (payload: {
    name: string;
    color?: string;
    sort_order: number;
    is_active: boolean;
    allow_knowledge: boolean;
    allow_question: boolean;
  }) => {
    try {
      if (dialogMode === 'create') {
        await createTag.mutateAsync({
          ...payload,
          tag_type: activeTab,
        });
        toast.success(`${typeLabel[activeTab]}已创建`);
      } else if (editingTag) {
        await updateTag.mutateAsync({
          id: editingTag.id,
          data: payload,
        });
        toast.success('标签已更新');
      }
      setIsDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('保存失败');
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
    <div className="space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-background p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            <TagsIcon className="h-3.5 w-3.5" />
            标签治理
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">标签管理</h1>
          <p className="max-w-2xl text-sm leading-6 text-text-muted">
            统一管理知识与题目的 space 和普通标签。space 全局共享，普通标签按知识/题目控制适用范围。
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setSearch(searchInput.trim());
              }
            }}
            placeholder="搜索标签名称"
            className="w-full min-w-64 sm:w-72"
          />
          <Button variant="outline" onClick={() => setSearch(searchInput.trim())}>
            搜索
          </Button>
          {canCreate && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              新建{typeLabel[activeTab]}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <SegmentedControl
          className="max-w-sm w-full"
          options={TAG_TYPE_SEGMENT_OPTIONS}
          value={activeTab}
          onChange={(v) => setActiveTab(v as TagType)}
          activeColor="blue"
        />

        <div>
          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>适用范围</TableHead>
                  {activeTab === 'SPACE' && <TableHead>颜色</TableHead>}
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-40">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-semibold">{tag.name}</TableCell>
                    <TableCell>
                      {tag.tag_type === 'SPACE' ? (
                        <span className="text-sm text-text-muted">知识 / 题目</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {tag.allow_knowledge && (
                            <span className="rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary">
                              知识
                            </span>
                          )}
                          {tag.allow_question && (
                            <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary">
                              题目
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {activeTab === 'SPACE' && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: tag.color }} />
                          <span className="text-xs text-text-muted">{tag.color}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{tag.sort_order}</TableCell>
                    <TableCell>
                      <span className={tag.is_active ? 'text-emerald-600' : 'text-text-muted'}>
                        {tag.is_active ? '启用' : '停用'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canUpdate && (
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(tag)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            编辑
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(tag)}>
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            删除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tags.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'SPACE' ? 6 : 5} className="py-12 text-center text-sm text-text-muted">
                      当前没有匹配的标签
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <TagFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        tagType={activeTab}
        tag={editingTag}
        onSubmit={handleSubmit}
        isSubmitting={createTag.isPending || updateTag.isPending}
      />

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
    </div>
  );
};
