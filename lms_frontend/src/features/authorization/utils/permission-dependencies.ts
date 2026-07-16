import type { PermissionCatalogItem } from '@/types/authorization';

const appendUnique = (target: string[], value: string) => {
  if (!target.includes(value)) {
    target.push(value);
  }
};

const buildDependencyMaps = (permissionCatalog: PermissionCatalogItem[]) => {
  const impliesMap = new Map<string, string[]>();
  const requiredByMap = new Map<string, string[]>();

  permissionCatalog.forEach((permission) => {
    impliesMap.set(permission.code, permission.implies ?? []);
  });

  permissionCatalog.forEach((permission) => {
    (permission.implies ?? []).forEach((impliedCode) => {
      const currentDependents = requiredByMap.get(impliedCode) ?? [];
      appendUnique(currentDependents, permission.code);
      requiredByMap.set(impliedCode, currentDependents);
    });
  });

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
    (adjacencyMap.get(currentCode) ?? []).forEach((nextCode) => pendingCodes.push(nextCode));
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
