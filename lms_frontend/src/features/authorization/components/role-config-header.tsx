import { Database } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { DATA_SCOPE_LABELS, DATA_SCOPE_OPTIONS } from '@/config/authorization';
import type { RoleItem, UpdateRolePayload } from '@/features/authorization/types';
import type { DataScope, Department } from '@/types/common';

interface RoleConfigHeaderProps {
  role: RoleItem;
  departments: Department[];
  isUpdatingRole: boolean;
  onUpdateRole: (payload: UpdateRolePayload) => Promise<void>;
}

export const RoleConfigHeader: React.FC<RoleConfigHeaderProps> = ({
  role,
  departments,
  isUpdatingRole,
  onUpdateRole,
}) => {
  const patchRole = (payload: Omit<UpdateRolePayload, 'roleCode'>) => {
    if (isUpdatingRole) return;
    void onUpdateRole({ roleCode: role.code, ...payload });
  };

  const handleScopeChange = (nextScope: DataScope) => {
    if (nextScope === role.data_scope) {
      return;
    }
    if (nextScope !== 'CUSTOM_DEPT') {
      void patchRole({ data_scope: nextScope, department_ids: [] });
      return;
    }
    const nextDeptIds = role.department_ids.length > 0
      ? role.department_ids
      : (departments[0] ? [departments[0].id] : []);
    if (nextDeptIds.length === 0) {
      toast.warning('暂无可选部门');
      return;
    }
    void patchRole({ data_scope: nextScope, department_ids: nextDeptIds });
  };

  const handleToggleDepartment = (departmentId: number, checked: boolean) => {
    const nextIds = checked
      ? Array.from(new Set([...role.department_ids, departmentId]))
      : role.department_ids.filter((id) => id !== departmentId);
    if (nextIds.length === 0) {
      toast.warning('自定义部门范围至少保留一个部门');
      return;
    }
    void patchRole({ department_ids: nextIds });
  };

  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-border/60 px-5 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-base font-semibold tracking-[-0.01em] text-foreground">
          {role.name}
        </h2>
        {!role.is_active ? (
          <span className="shrink-0 rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            已停用
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={role.data_scope}
          onValueChange={(value) => handleScopeChange(value as DataScope)}
          disabled={role.code === 'ADMIN' || isUpdatingRole}
        >
          <SelectTrigger
            title="数据范围"
            aria-label="数据范围"
            className="h-7 w-auto gap-1.5 rounded-lg border-border/70 bg-slate-50/70 px-2.5 text-left text-xs shadow-none hover:bg-slate-100/70"
          >
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-medium text-slate-700">
                {DATA_SCOPE_LABELS[role.data_scope]}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {DATA_SCOPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {role.data_scope === 'CUSTOM_DEPT' ? (
          <div className="inline-flex h-7 items-center gap-2.5 rounded-lg border border-border/70 bg-slate-50/70 px-2.5">
            {departments.map((department) => (
              <label
                key={department.id}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700"
              >
                <Checkbox
                  checked={role.department_ids.includes(department.id)}
                  disabled={isUpdatingRole}
                  onCheckedChange={(checked) => {
                    handleToggleDepartment(department.id, checked === true);
                  }}
                />
                <span>{department.name}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
