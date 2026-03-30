import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CircleButton } from '@/components/ui/circle-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
  });
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingTag(null);
    setIsDialogOpen(true);
  };

  /** 打开编辑弹窗（供表格操作列使用，需稳定引用以便列 memo 生效） */
  const openEditDialog = React.useCallback((tag: Tag) => {
    setDialogMode('edit');
    setEditingTag(tag);
    setIsDialogOpen(true);
  }, []);

  const handleSubmit = async (payload: {
    name: string;
    color?: string;
    sort_order: number;
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

  /** 标签列表列（与全局 DataTable 行为一致） */
  const columns = React.useMemo<ColumnDef<Tag>[]>(() => {
    const base: ColumnDef<Tag>[] = [
      {
        id: 'name',
        header: '名称',
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        id: 'scope',
        header: '适用范围',
        cell: ({ row }) => {
          const tag = row.original;
          if (tag.tag_type === 'SPACE') {
            return <span className="text-sm text-text-muted">知识 / 题目</span>;
          }
          return (
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
          );
        },
      },
    ];

    if (activeTab === 'SPACE') {
      base.push({
        id: 'color',
        header: '颜色',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border border-border"
              style={{ backgroundColor: row.original.color }}
            />
            <span className="text-xs text-text-muted">{row.original.color}</span>
          </div>
        ),
      });
    }

    base.push(
      {
        id: 'sort_order',
        header: '排序',
        cell: ({ row }) => row.original.sort_order,
      },
      {
        id: 'actions',
        header: '操作',
        size: 160,
        cell: ({ row }) => {
          const tag = row.original;
          return (
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
          );
        },
      },
    );

    return base;
  }, [activeTab, canUpdate, canDelete, openEditDialog]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <SegmentedControl
          className="w-full max-w-sm shrink-0 sm:w-auto"
          options={TAG_TYPE_SEGMENT_OPTIONS}
          value={activeTab}
          onChange={(v) => setActiveTab(v as TagType)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setSearch(searchInput.trim());
              }
            }}
            placeholder="搜索标签名称"
            className="w-full min-w-64 sm:max-w-sm sm:flex-1"
          />
          {canCreate && (
            <CircleButton
              onClick={openCreateDialog}
              label={`新建${typeLabel[activeTab]}`}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col">
        <DataTable
          columns={columns}
          data={tags}
          isLoading={isLoading}
          minHeight={0}
        />
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
