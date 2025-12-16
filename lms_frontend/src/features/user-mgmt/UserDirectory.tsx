/**
 * UserDirectory Page
 * Main page for user management combining list and form
 * Requirements: 18.1 - User management page
 */

import * as React from 'react';
import { UserList, UserForm } from './components';
import type { UserListItem } from './api/users';

// Mock departments - in real app, this would come from an API
const MOCK_DEPARTMENTS = [
  { id: 1, name: '技术一室' },
  { id: 2, name: '技术二室' },
  { id: 3, name: '技术三室' },
  { id: 4, name: '运维室' },
];

export const UserDirectory: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserListItem | null>(null);
  
  const handleCreateClick = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };
  
  const handleEditClick = (user: UserListItem) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };
  
  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };
  
  const handleFormSuccess = () => {
    // Form will close automatically after success
    // List will refresh via React Query invalidation
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">用户管理</h1>
        <p className="mt-1 text-sm text-text-muted">
          管理平台所有用户，包括创建、编辑、停用/启用和重置密码
        </p>
      </div>
      
      {/* User list */}
      <UserList
        departments={MOCK_DEPARTMENTS}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
      />
      
      {/* User form modal */}
      <UserForm
        open={isFormOpen}
        onClose={handleFormClose}
        user={editingUser}
        departments={MOCK_DEPARTMENTS}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

UserDirectory.displayName = 'UserDirectory';

export default UserDirectory;
