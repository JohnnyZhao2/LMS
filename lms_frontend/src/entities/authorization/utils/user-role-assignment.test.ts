import { describe, expect, it } from 'vitest';
import {
  getNextAssignableRoleCodes,
  getNextUserPermissionEditorRoleCode,
} from './user-role-assignment';

describe('getNextUserPermissionEditorRoleCode', () => {
  it('增删学员角色时保留当前业务角色编辑上下文', () => {
    expect(getNextUserPermissionEditorRoleCode({
      currentRoleCode: 'DEPT_MANAGER',
      nextRoleCodes: ['STUDENT', 'DEPT_MANAGER'],
      toggledRoleCode: 'STUDENT',
    })).toBe('DEPT_MANAGER');

    expect(getNextUserPermissionEditorRoleCode({
      currentRoleCode: 'DEPT_MANAGER',
      nextRoleCodes: ['DEPT_MANAGER'],
      toggledRoleCode: 'STUDENT',
    })).toBe('DEPT_MANAGER');
  });

  it('没有业务角色时不进入学员权限编辑上下文', () => {
    expect(getNextUserPermissionEditorRoleCode({
      currentRoleCode: 'STUDENT',
      nextRoleCodes: ['STUDENT'],
      toggledRoleCode: 'STUDENT',
    })).toBeNull();
  });

  it('切换业务角色时进入新的业务角色编辑上下文', () => {
    expect(getNextUserPermissionEditorRoleCode({
      currentRoleCode: 'MENTOR',
      nextRoleCodes: ['STUDENT', 'DEPT_MANAGER'],
      toggledRoleCode: 'DEPT_MANAGER',
    })).toBe('DEPT_MANAGER');
  });
});

describe('getNextAssignableRoleCodes', () => {
  it('添加业务角色时保留已有学员角色', () => {
    expect(getNextAssignableRoleCodes(['STUDENT'], 'MENTOR')).toEqual(['STUDENT', 'MENTOR']);
  });

  it('切换业务角色时只替换非学员角色', () => {
    expect(getNextAssignableRoleCodes(['STUDENT', 'MENTOR'], 'DEPT_MANAGER')).toEqual([
      'STUDENT',
      'DEPT_MANAGER',
    ]);
  });

  it('切换学员角色时不影响已有业务角色', () => {
    expect(getNextAssignableRoleCodes(['STUDENT', 'ADMIN'], 'STUDENT')).toEqual(['ADMIN']);
    expect(getNextAssignableRoleCodes(['ADMIN'], 'STUDENT')).toEqual(['STUDENT', 'ADMIN']);
  });
});
