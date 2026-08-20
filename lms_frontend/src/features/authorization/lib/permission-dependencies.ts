import type { PermissionCatalogItem } from '@/features/authorization/types';

const buildDependencyMaps = (permissionCatalog: PermissionCatalogItem[]) => {
  const impliesMap = new Map(
    permissionCatalog.map((permission) => [permission.code, permission.implies ?? []] as const),
  );
  const requiredByMap = new Map<string, string[]>();

  for (const permission of permissionCatalog) {
    for (const impliedCode of permission.implies ?? []) {
      const dependents = requiredByMap.get(impliedCode) ?? [];
      dependents.push(permission.code);
      requiredByMap.set(impliedCode, dependents);
    }
  }

  return { impliesMap, requiredByMap };
};

const collectReachableCodes = (
  rootCodes: string[],
  adjacencyMap: Map<string, string[]>,
) => {
  const collectedCodes = new Set<string>();
  const pendingCodes = [...rootCodes];

  while (pendingCodes.length > 0) {
    const currentCode = pendingCodes.shift();
    if (!currentCode || collectedCodes.has(currentCode)) {
      continue;
    }
    collectedCodes.add(currentCode);
    pendingCodes.push(...(adjacencyMap.get(currentCode) ?? []));
  }

  return collectedCodes;
};

export const applyPermissionSelectionChange = ({
  currentEnabledCodes,
  nextChecked,
  permissionCatalog,
  permissionCode,
}: {
  currentEnabledCodes: string[];
  nextChecked: boolean;
  permissionCatalog: PermissionCatalogItem[];
  permissionCode: string;
}) => {
  const nextEnabledCodeSet = new Set(currentEnabledCodes);
  const { impliesMap, requiredByMap } = buildDependencyMaps(permissionCatalog);

  if (nextChecked) {
    collectReachableCodes([permissionCode], impliesMap).forEach((code) => nextEnabledCodeSet.add(code));
  } else {
    collectReachableCodes([permissionCode], requiredByMap).forEach((code) => nextEnabledCodeSet.delete(code));
    nextEnabledCodeSet.delete(permissionCode);
  }

  return Array.from(nextEnabledCodeSet).sort();
};
