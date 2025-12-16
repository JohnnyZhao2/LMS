/**
 * OrganizationView Page
 * Displays organization structure management interface
 * Requirements: 19.1 - Display room list and members
 */

import { Building2 } from 'lucide-react';
import { DepartmentTree } from './components/DepartmentTree';

export function OrganizationView() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            组织架构管理
          </h1>
          <p className="text-sm text-text-muted">
            管理部门/室结构和成员归属
          </p>
        </div>
      </div>

      {/* Department Tree */}
      <DepartmentTree />
    </div>
  );
}

export default OrganizationView;
