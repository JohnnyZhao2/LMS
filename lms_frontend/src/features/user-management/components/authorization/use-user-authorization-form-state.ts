import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type {
  AuthorizationFormState,
  PermissionCatalogItem,
  ScopeType,
  UserAuthorizationState,
} from '@/types/authorization';
import { showApiError } from '@/lib/api-error-handler';
import { applyPermissionSelectionChange } from '@/features/user-management/utils/permission-dependencies';
import {
  reconcileAuthorizationScopes,
  sameAuthorizationFormState,
  toAuthorizationFormState,
  toUserAuthorizationPayload,
} from '@/features/user-management/components/authorization/user-form.utils';
import type { PermissionState } from '@/features/user-management/components/authorization/user-form.utils';
import type { RoleScopeSelection } from '@/features/user-management/components/authorization/user-permission-scope.utils';

interface UseUserAuthorizationFormStateParams {
  authorization: UserAuthorizationState | undefined;
  permissionCatalog: PermissionCatalogItem[];
  canManage: boolean;
  replaceAuthorization: (data: UserAuthorizationState) => Promise<UserAuthorizationState>;
}

interface UseUserAuthorizationFormStateResult {
  draftState: AuthorizationFormState | null;
  isSaving: boolean;
  getPermissionState: (permissionCode: string) => PermissionState;
  handlePermissionToggle: (permissionCode: string, nextChecked: boolean) => void;
  updateScopeSelection: (scopeGroupKey: string, selection: RoleScopeSelection) => void;
  getScopeSelection: (scopeGroupKey: string) => RoleScopeSelection;
  isPermissionSaving: (permissionCode: string) => boolean;
}

/**
 * 用户最终授权：改完立刻 PUT，无本地草稿保存按钮。
 */
export const useUserAuthorizationFormState = ({
  authorization,
  permissionCatalog,
  canManage,
  replaceAuthorization,
}: UseUserAuthorizationFormStateParams): UseUserAuthorizationFormStateResult => {
  const [draftState, setDraftState] = useState<AuthorizationFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingPermissionCodes, setSavingPermissionCodes] = useState<string[]>([]);
  const draftStateRef = useRef<AuthorizationFormState | null>(null);

  const syncFromAuthorization = useCallback((nextAuthorization: UserAuthorizationState) => {
    const nextState = toAuthorizationFormState(nextAuthorization);
    if (
      draftStateRef.current
      && sameAuthorizationFormState(draftStateRef.current, nextState)
    ) {
      return;
    }
    draftStateRef.current = nextState;
    setDraftState(nextState);
  }, []);

  useEffect(() => {
    if (!authorization) {
      return;
    }
    if (isSaving) {
      return;
    }
    syncFromAuthorization(authorization);
  }, [authorization, isSaving, syncFromAuthorization]);

  const isPermissionSaving = useCallback(
    (permissionCode: string) => savingPermissionCodes.includes(permissionCode),
    [savingPermissionCodes],
  );

  const getScopeSelection = useCallback(
    (scopeGroupKey: string): RoleScopeSelection => {
      const scope = draftState?.scopes.find((item) => item.scopeGroupKey === scopeGroupKey);
      if (!scope) {
        return { scopeType: null, targetUserIds: [] };
      }
      return {
        scopeType: scope.scopeType,
        targetUserIds: scope.targetUserIds,
      };
    },
    [draftState],
  );

  const getPermissionState = useCallback(
    (permissionCode: string): PermissionState => {
      const checked = Boolean(draftState?.permissionCodes.includes(permissionCode));

      if (!canManage) {
        return {
          checked,
          locked: true,
          enableBlockedReason: '当前账号没有用户授权更新权限',
          disableBlockedReason: '当前账号没有用户授权更新权限',
        };
      }

      return {
        checked,
        locked: false,
        enableBlockedReason: null,
        disableBlockedReason: null,
      };
    },
    [canManage, draftState],
  );

  const validateState = useCallback(
    (state: AuthorizationFormState): string[] => {
      const errors: string[] = [];
      const enabledSet = new Set(state.permissionCodes);

      permissionCatalog.forEach((permission) => {
        if (!enabledSet.has(permission.code)) {
          return;
        }
        if (permission.scope_kind === 'NONE' || !permission.scope_group_key) {
          return;
        }
        const scope = state.scopes.find(
          (item) => item.scopeGroupKey === permission.scope_group_key,
        );
        if (!scope) {
          errors.push(`${permission.name}缺少范围配置`);
          return;
        }
        if (
          scope.scopeType === 'EXPLICIT_USERS'
          && scope.targetUserIds.length === 0
        ) {
          errors.push(`${permission.name}需指定至少一个用户`);
        }
      });

      return Array.from(new Set(errors));
    },
    [permissionCatalog],
  );

  const persistState = useCallback(
    async ({
      nextState,
      previousState,
      permissionCodes = [],
    }: {
      nextState: AuthorizationFormState;
      previousState: AuthorizationFormState;
      permissionCodes?: string[];
    }) => {
      const errors = validateState(nextState);
      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }

      draftStateRef.current = nextState;
      setDraftState(nextState);
      setIsSaving(true);
      if (permissionCodes.length > 0) {
        setSavingPermissionCodes((prev) => [...prev, ...permissionCodes]);
      }

      try {
        const saved = await replaceAuthorization(
          toUserAuthorizationPayload(nextState),
        );
        syncFromAuthorization(saved);
      } catch (error) {
        draftStateRef.current = previousState;
        setDraftState(previousState);
        showApiError(error);
      } finally {
        setIsSaving(false);
        if (permissionCodes.length > 0) {
          setSavingPermissionCodes((prev) =>
            prev.filter((code) => !permissionCodes.includes(code)),
          );
        }
      }
    },
    [replaceAuthorization, syncFromAuthorization, validateState],
  );

  const handlePermissionToggle = useCallback(
    (permissionCode: string, nextChecked: boolean) => {
      const currentState = draftStateRef.current;
      if (!currentState || isSaving || !canManage) {
        return;
      }

      const permissionState = getPermissionState(permissionCode);
      const blockedReason = nextChecked
        ? permissionState.enableBlockedReason
        : permissionState.disableBlockedReason;
      if (blockedReason) {
        toast.error(blockedReason);
        return;
      }

      const nextPermissionCodes = applyPermissionSelectionChange({
        currentEnabledCodes: currentState.permissionCodes,
        nextChecked,
        permissionCatalog,
        permissionCode,
      });

      const nextCodeSet = new Set(nextPermissionCodes);
      const reconciledCodes = Array.from(nextCodeSet).sort();
      const changedCodes = permissionCatalog
        .filter(
          (permission) =>
            currentState.permissionCodes.includes(permission.code)
            !== nextCodeSet.has(permission.code),
        )
        .map((permission) => permission.code);

      const nextState: AuthorizationFormState = {
        ...currentState,
        permissionCodes: reconciledCodes,
        scopes: reconcileAuthorizationScopes({
          permissionCatalog,
          permissionCodes: reconciledCodes,
          currentScopes: currentState.scopes,
          roleCode: currentState.roleCode,
        }),
      };

      void persistState({
        nextState,
        previousState: currentState,
        permissionCodes: changedCodes.length > 0 ? changedCodes : [permissionCode],
      });
    },
    [
      canManage,
      getPermissionState,
      isSaving,
      permissionCatalog,
      persistState,
    ],
  );

  const updateScopeSelection = useCallback(
    (scopeGroupKey: string, selection: RoleScopeSelection) => {
      const currentState = draftStateRef.current;
      if (!currentState || !canManage) {
        return;
      }

      const nextScopeType = selection.scopeType;
      if (!nextScopeType) {
        return;
      }

      const nextScopes = [...currentState.scopes];
      const existingIndex = nextScopes.findIndex(
        (scope) => scope.scopeGroupKey === scopeGroupKey,
      );
      const nextScope = {
        scopeGroupKey,
        scopeType: nextScopeType as ScopeType,
        targetUserIds:
          nextScopeType === 'EXPLICIT_USERS' ? selection.targetUserIds : [],
      };

      if (existingIndex >= 0) {
        nextScopes[existingIndex] = nextScope;
      } else {
        nextScopes.push(nextScope);
      }

      const nextState: AuthorizationFormState = {
        ...currentState,
        scopes: nextScopes.sort((left, right) =>
          left.scopeGroupKey.localeCompare(right.scopeGroupKey),
        ),
      };

      if (
        nextScopeType === 'EXPLICIT_USERS'
        && selection.targetUserIds.length === 0
      ) {
        toast.error('指定用户范围至少保留一人');
        return;
      }

      if (isSaving) {
        return;
      }

      void persistState({
        nextState,
        previousState: currentState,
      });
    },
    [canManage, isSaving, persistState],
  );

  return {
    draftState,
    isSaving,
    getPermissionState,
    handlePermissionToggle,
    updateScopeSelection,
    getScopeSelection,
    isPermissionSaving,
  };
};
