import { render, screen } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from './login';

const useAuthMock = vi.fn();

vi.mock('@/session/auth/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/components/layouts/auth-layout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/auth/components/login-form', () => ({
  LoginForm: () => <div>login-form</div>,
}));

const renderLoginRoute = (path: string) => render(
  <MemoryRouter
    initialEntries={[path]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/dashboard" element={<div>admin-home</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('已登录且无一视通回调 code 时跳转到当前工作台', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      availableRoles: [{ code: 'ADMIN', name: '管理员' }],
      currentRole: 'ADMIN',
    });

    renderLoginRoute('/login');

    expect(screen.getByText('admin-home')).toBeInTheDocument();
  });

  it('带一视通回调 code 时保留登录页处理换 token 流程', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      availableRoles: [{ code: 'ADMIN', name: '管理员' }],
      currentRole: 'ADMIN',
    });

    renderLoginRoute('/login?code=one-account-code');

    expect(screen.getByText('login-form')).toBeInTheDocument();
  });
});
