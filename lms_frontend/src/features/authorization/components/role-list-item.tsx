import { useState } from 'react';
import { Check, MoreHorizontal, Pencil, Power, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useDeleteRole } from '@/features/authorization/api/authorization';
import type { RoleItem, UpdateRolePayload } from '@/features/authorization/types';
import { cn } from '@/lib/utils';
import { showApiError } from '@/utils/error-handler';

interface RoleListItemProps {
  role: RoleItem;
  count: number;
  isActive: boolean;
  canManageRole: boolean;
  isUpdatingRole: boolean;
  onUpdateRole: (payload: UpdateRolePayload) => Promise<boolean>;
  onSelect: () => void;
  onDeleted: (roleCode: string) => void;
}

export const RoleListItem: React.FC<RoleListItemProps> = ({
  role,
  count,
  isActive,
  canManageRole,
  isUpdatingRole,
  onUpdateRole,
  onSelect,
  onDeleted,
}) => {
  const deleteRole = useDeleteRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(role.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const showRoleMenu = canManageRole && !role.is_builtin;

  const patchRole = async (payload: Omit<UpdateRolePayload, 'roleCode'>, successMessage: string): Promise<boolean> => {
    const ok = await onUpdateRole({ roleCode: role.code, ...payload });
    if (ok) toast.success(successMessage);
    return ok;
  };

  const handleSaveName = async () => {
    if (isUpdatingRole) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.warning('角色名称不能为空');
      return;
    }
    if (trimmed === role.name || await patchRole({ name: trimmed }, '角色名称已更新')) {
      setEditingName(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteRole.mutateAsync(role.code);
      setDeleteOpen(false);
      onDeleted(role.code);
      toast.success('角色已删除');
    } catch (error) {
      showApiError(error);
    }
  };

  if (editingName) {
    return (
      <div className={cn('flex h-10 w-full items-center gap-1 rounded-lg px-2', isActive ? 'bg-slate-200/65' : 'bg-slate-200/35')}>
        <Input
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleSaveName();
            } else if (event.key === 'Escape') {
              setEditingName(false);
            }
          }}
          className="h-7 min-w-0 flex-1 rounded-md px-2 text-[13px]"
          autoFocus
        />
        <button
          type="button"
          disabled={isUpdatingRole}
          onClick={() => void handleSaveName()}
          aria-label="保存角色名称"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-white/80 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditingName(false)}
          aria-label="取消重命名"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-white/80 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          'group flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isActive ? 'bg-slate-200/65 font-semibold text-foreground' : 'font-medium text-slate-600 hover:bg-slate-200/35 hover:text-foreground',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn('truncate text-[13px]', !role.is_active && 'text-text-muted')}>{role.name}</span>
          {!role.is_active ? (
            <span className="shrink-0 rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">已停用</span>
          ) : null}
        </span>

        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              isActive ? 'text-foreground/70' : 'text-slate-400',
              showRoleMenu && (menuOpen ? 'hidden' : 'group-hover:hidden'),
            )}
          >
            {count}
          </span>

          {showRoleMenu ? (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`${role.name}操作`}
                  className={cn(
                    'h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/85 hover:text-foreground focus-visible:outline-none',
                    menuOpen ? 'inline-flex bg-white/85 text-foreground' : 'hidden group-hover:inline-flex',
                  )}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                onClick={(event) => event.stopPropagation()}
                onCloseAutoFocus={(event) => event.preventDefault()}
                className="w-32 border border-border/80 p-1 shadow-md"
              >
                <DropdownMenuItem
                  className="gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium [&>svg]:size-3.5"
                  onClick={() => {
                    setNameDraft(role.name);
                    setEditingName(true);
                  }}
                >
                  <Pencil />
                  重命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isUpdatingRole}
                  className="gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium [&>svg]:size-3.5"
                  onClick={() => void patchRole({ is_active: !role.is_active }, role.is_active ? '已停用角色' : '已启用角色')}
                >
                  <Power />
                  {role.is_active ? '停用角色' : '启用角色'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 h-px bg-border/60" />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive focus:text-destructive [&>svg]:size-3.5"
                >
                  <Trash2 />
                  删除角色
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除自定义角色"
        description={`确定删除角色「${role.name}」吗？相关成员将自动解除该角色归属。`}
        confirmText="确认删除"
        confirmVariant="destructive"
        isConfirming={deleteRole.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
