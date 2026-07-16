import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { PermissionCatalogItem, PermissionCatalogView } from '@/types/authorization';

interface PermissionCatalogQuery {
  module?: string;
  view?: PermissionCatalogView;
}

export const getPermissionCatalog = ({ module, view }: PermissionCatalogQuery = {}) =>
  apiClient.get<PermissionCatalogItem[]>(
    `/authorization/permissions/${buildQueryString({ module, view })}`,
  );

export const usePermissionCatalog = (query: PermissionCatalogQuery = {}, enabled = true) => {
  const currentRole = useCurrentRole();
  const { module, view } = query;
  return useQuery({
    queryKey: queryKeys.authorization.permissionCatalog({ currentRole, module, view }),
    queryFn: () => getPermissionCatalog({ module, view }),
    enabled: currentRole !== null && enabled,
  });
};
