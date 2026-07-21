import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Department } from '@/types/common';

export const allowedDepartmentOrder: Department['code'][] = ['DEPT1', 'DEPT2'];
export const allowedDepartmentCodes = new Set(allowedDepartmentOrder);

const departmentDisplayNameMap: Record<string, string> = {
  DEPT1: '一室',
  DEPT2: '二室',
};

export const isAllowedDepartmentCode = (code?: string | null): code is Department['code'] =>
  Boolean(code) && allowedDepartmentCodes.has(code as Department['code']);

const normalizeDepartments = (departments: Department[]) =>
  departments
    .filter((department) => allowedDepartmentCodes.has(department.code))
    .map((department) => ({
      ...department,
      name: departmentDisplayNameMap[department.code] ?? department.name,
    }))
    .sort(
      (left, right) =>
        allowedDepartmentOrder.indexOf(left.code) - allowedDepartmentOrder.indexOf(right.code),
    );

export const getDepartments = () => apiClient.get<Department[]>('/users/departments/');

export const useDepartments = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.users.departments(currentRole),
    queryFn: getDepartments,
    select: normalizeDepartments,
    enabled: currentRole !== null,
  });
};
