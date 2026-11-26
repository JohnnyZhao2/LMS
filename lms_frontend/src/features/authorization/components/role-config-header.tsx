import { Database } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DATA_SCOPE_LABELS, DATA_SCOPE_OPTIONS } from '@/config/authorization';
import type { RoleItem, UpdateRolePayload } from '@/features/authorization/types';
import type { DataScope, Department } from '@/types/common';

interface RoleScopeFieldsProps {
  variant: 'inline' | 'stacked';
  scope: DataScope;
  departmentIds: number[];
  departments: Department[];
  scopeDisabled?: boolean;
  departmentsDisabled?: boolean;
  onScopeChange: (scope: DataScope) => void;
  onDepartmentIdsChange: (departmentIds: number[]) => void;
}

export const RoleScopeFields: React.FC<RoleScopeFieldsProps> = ({
  variant,
  scope,
  departmentIds,
  departments,
  scopeDisabled = false,
  departmentsDisabled = false,
  onScopeChange,
  onDepartmentIdsChange,
}) => {
  const isInline = variant === 'inline';

  const selectNode = (
    <Select value={scope} onValueChange={(value) => onScopeChange(value as DataScope)} disabled={scopeDisabled}>
      <SelectTrigger
        {...(isInline ? { title: '数据范围', 'aria-label': '数据范围' } : {})}
        className={isInline
          ? 'h-7 w-auto gap-1.5 rounded-lg border-border/70 bg-slate-50/70 px-2.5 text-left text-xs shadow-none hover:bg-slate-100/70'
          : 'h-10 rounded-lg text-left text-sm [&>span]:text-left'}
      >
        {isInline ? (
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="font-medium text-slate-700">{DATA_SCOPE_LABELS[scope]}</span>
          </div>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {DATA_SCOPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className={isInline ? 'text-xs' : undefined}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const departmentsNode = scope === 'CUSTOM_DEPT' ? (
    <div className={isInline ? 'inline-flex h-7 items-center gap-2.5 rounded-lg border border-border/70 bg-slate-50/70 px-2.5' : 'flex flex-wrap gap-3'}>
      {departments.map((department) => (
        <label
          key={department.id}
          className={isInline
            ? 'inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700'
            : 'inline-flex cursor-pointer items-center gap-2 text-sm text-foreground'}
        >
          <Checkbox
            checked={departmentIds.includes(department.id)}
            disabled={departmentsDisabled}
            onCheckedChange={(checked) => {
              onDepartmentIdsChange(
                checked === true
                  ? Array.from(new Set([...departmentIds, department.id]))
                  : departmentIds.filter((id) => id !== department.id),
              );
            }}
          />
          <span>{department.name}</span>
        </label>
      ))}
    </div>
  ) : null;

  if (isInline) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {selectNode}
        {departmentsNode}
      </div>
    );
  }

  return (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-muted">数据范围</label>
        {selectNode}
      </div>
      {departmentsNode ? (
        <div>
          <label className="mb-2 block text-xs font-semibold text-text-muted">可见部门</label>
          {departmentsNode}
        </div>
      ) : null}
    </>
  );
};

interface RoleConfigHeaderProps {
  role: RoleItem;
  departments: Department[];
  isUpdatingRole: boolean;
  onUpdateRole: (payload: UpdateRolePayload) => Promise<boolean | void>;
}

export const RoleConfigHeader: React.FC<RoleConfigHeaderProps> = ({
  role,
  departments,
  isUpdatingRole,
  onUpdateRole,
}) => {
  const patchRole = (payload: Omit<UpdateRolePayload, 'roleCode'>) => {
    if (!isUpdatingRole) void onUpdateRole({ roleCode: role.code, ...payload });
  };

  const handleScopeChange = (nextScope: DataScope) => {
    if (nextScope === role.data_scope) return;
    if (nextScope !== 'CUSTOM_DEPT') {
      patchRole({ data_scope: nextScope, department_ids: [] });
      return;
    }
    const nextDeptIds = role.department_ids.length > 0 ? role.department_ids : (departments[0] ? [departments[0].id] : []);
    if (nextDeptIds.length === 0) {
      toast.warning('暂无可选部门');
      return;
    }
    patchRole({ data_scope: nextScope, department_ids: nextDeptIds });
  };

  const handleDepartmentIdsChange = (nextIds: number[]) => {
    if (nextIds.length === 0) {
      toast.warning('自定义部门范围至少保留一个部门');
      return;
    }
    patchRole({ department_ids: nextIds });
  };

  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-border/60 px-5 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-base font-semibold tracking-[-0.01em] text-foreground">{role.name}</h2>
        {!role.is_active ? (
          <span className="shrink-0 rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">已停用</span>
        ) : null}
      </div>

      <RoleScopeFields
        variant="inline"
        scope={role.data_scope}
        departmentIds={role.department_ids}
        departments={departments}
        scopeDisabled={role.code === 'ADMIN' || isUpdatingRole}
        departmentsDisabled={isUpdatingRole}
        onScopeChange={handleScopeChange}
        onDepartmentIdsChange={handleDepartmentIdsChange}
      />
    </div>
  );
};
