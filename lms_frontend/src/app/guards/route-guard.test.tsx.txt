import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtectedRoute, RoleRouteWrapper } from './route-guard';

const useAuthMock = vi.fn();
const showApiErrorMock = vi.fn();

vi.mock('@/session/auth/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/utils/error-handler', () => ({
  showApiError: (...args: unknown[]) => showApiErrorMock(...args),
}));

const buildAuthState = (overrides: Record<string, unknown> = {}) => ({
  isAuthenticated: true,
  isLoading: false,
  isSwitching: false,
  availableRoles: [{ code: 'ADMIN', name: '管理员' }],
  currentRole: 'ADMIN',
  hasCapability: vi.fn().mockReturnValue(true),
  hasAnyCapability: vi.fn().mockReturnValue(true),
  switchRole: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderProtectedRoute = (
  path: string,
  authState: Record<string, unknown>,
  props: Omit<React.ComponentProps<typeof ProtectedRoute>, 'children'>,
) => {
  useAuthMock.mockReturnValue(authState);

  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/admin/dashboard" element={<div>admin-home</div>} />
        <Route path="/mentor/dashboard" element={<div>mentor-home</div>} />
        <Route
          path="/:role/protected"
          element={(
            <ProtectedRoute {...props}>
              <div>protected-content</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
};

const renderRoleWrapper = (path: string, authState: Record<string, unknown>) => {
  useAuthMock.mockReturnValue(authState);

  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/admin/dashboard" element={<div>admin-home</div>} />
        <Route path="/student/dashboard" element={<div>student-home</div>} />
        <Route path="/mentor/dashboard" element={<div>mentor-home</div>} />
        <Route path="/:role" element={<RoleRouteWrapper />}>
          <Route path="tasks" element={<div>tasks-page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('route-guard', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    showApiErrorMock.mockReset();
  });

  it('未登录时会跳转到登录页', () => {
    renderProtectedRoute('/admin/protected', buildAuthState({
      isAuthenticated: false,
      availableRoles: [],
      currentRole: null,
    }), {
      allowedRoles: ['ADMIN'],
    });

    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('角色不匹配时会跳转到当前可访问工作台', () => {
    renderProtectedRoute('/student/protected', buildAuthState({
      availableRoles: [{ code: 'MENTOR', name: '导师' }],
      currentRole: 'MENTOR',
    }), {
      allowedRoles: ['ADMIN'],
    });

    expect(screen.getByText('mentor-home')).toBeInTheDocument();
  });

  it('缺少权限时会回退到当前角色首页', () => {
    renderProtectedRoute('/admin/protected', buildAuthState({
      hasCapability: vi.fn().mockReturnValue(false),
      hasAnyCapability: vi.fn().mockReturnValue(false),
    }), {
      allowedRoles: ['ADMIN'],
      requiredPermissions: ['quiz.update'],
    });

    expect(screen.getByText('admin-home')).toBeInTheDocument();
  });

  it('满足 any 权限模式时允许渲染内容', () => {
    renderProtectedRoute('/admin/protected', buildAuthState({
      hasCapability: vi.fn().mockReturnValue(false),
      hasAnyCapability: vi.fn().mockReturnValue(true),
    }), {
      allowedRoles: ['ADMIN'],
      requiredPermissions: ['quiz.create', 'quiz.update'],
      permissionMode: 'any',
    });

    expect(screen.getByText('protected-content')).toBeInTheDocument();
  });

  it('非法角色段会回退到可访问首页', () => {
    renderRoleWrapper('/ghost/tasks', buildAuthState());

    expect(screen.getByText('admin-home')).toBeInTheDocument();
  });

  it('URL 角色与当前角色不一致时会触发角色切换', async () => {
    const switchRole = vi.fn().mockResolvedValue(undefined);

    renderRoleWrapper('/student/tasks', buildAuthState({
      availableRoles: [
        { code: 'ADMIN', name: '管理员' },
        { code: 'STUDENT', name: '学员' },
      ],
      currentRole: 'ADMIN',
      switchRole,
    }));

    await waitFor(() => {
      expect(switchRole).toHaveBeenCalledWith('STUDENT');
    });
  });
});
