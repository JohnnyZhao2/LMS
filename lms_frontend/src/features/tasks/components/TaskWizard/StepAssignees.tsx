/**
 * StepAssignees - Task creation wizard step 3
 * Requirements: 14.9, 14.10, 14.11, 14.12
 * - Filter students based on current role
 * - Support select all and batch selection
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Users, Search, Check, X, UserCheck } from 'lucide-react';
import { useAssignableStudents, type AssignableStudent } from '../../api/task-management';
import { useCurrentRole } from '@/stores/auth';

export interface AssigneesData {
  assignee_ids: number[];
}

interface StepAssigneesProps {
  data: AssigneesData;
  onChange: (data: AssigneesData) => void;
  errors?: {
    assignee_ids?: string;
  };
}

export function StepAssignees({ data, onChange, errors }: StepAssigneesProps) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  
  const currentRole = useCurrentRole();
  const { data: students, isLoading } = useAssignableStudents();

  // Get unique departments for filtering
  const departments = useMemo(() => {
    if (!students) return [];
    const deptMap = new Map<number, string>();
    students.forEach(s => {
      if (s.department) {
        deptMap.set(s.department.id, s.department.name);
      }
    });
    return Array.from(deptMap.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  // Filter students by search and department
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => {
      const matchesSearch = !search || 
        s.real_name.toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase()) ||
        s.employee_id.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !departmentFilter || s.department?.id === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [students, search, departmentFilter]);

  const handleToggle = (id: number) => {
    const newIds = data.assignee_ids.includes(id)
      ? data.assignee_ids.filter(a => a !== id)
      : [...data.assignee_ids, id];
    onChange({ assignee_ids: newIds });
  };

  const handleSelectAll = () => {
    const allIds = filteredStudents.map(s => s.id);
    const allSelected = allIds.every(id => data.assignee_ids.includes(id));
    
    if (allSelected) {
      // Deselect all filtered students
      onChange({ 
        assignee_ids: data.assignee_ids.filter(id => !allIds.includes(id)) 
      });
    } else {
      // Select all filtered students
      const newIds = [...new Set([...data.assignee_ids, ...allIds])];
      onChange({ assignee_ids: newIds });
    }
  };

  const clearSelection = () => {
    onChange({ assignee_ids: [] });
  };

  const allFilteredSelected = filteredStudents.length > 0 && 
    filteredStudents.every(s => data.assignee_ids.includes(s.id));

  // Role description for context
  const getRoleDescription = () => {
    switch (currentRole) {
      case 'MENTOR':
        return '显示您名下的学员';
      case 'DEPT_MANAGER':
        return '显示本室的学员';
      case 'ADMIN':
        return '显示全平台学员';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            选择学员
            <span className="text-red-400 text-sm">*</span>
          </h3>
          <p className="text-sm text-text-muted mt-1">{getRoleDescription()}</p>
        </div>
        {data.assignee_ids.length > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-text-muted hover:text-white flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            清除选择 ({data.assignee_ids.length})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索姓名、用户名或工号..."
            className="pl-10"
          />
        </div>

        {/* Department Filter (only show if there are multiple departments) */}
        {departments.length > 1 && (
          <select
            value={departmentFilter || ''}
            onChange={(e) => setDepartmentFilter(e.target.value ? Number(e.target.value) : null)}
            className="bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">全部部门</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Select All */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
        <button
          type="button"
          onClick={handleSelectAll}
          className="flex items-center gap-2 text-sm text-white hover:text-primary transition-colors"
        >
          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
            allFilteredSelected ? 'bg-primary border-primary' : 'border-white/30'
          }`}>
            {allFilteredSelected && <Check className="h-3 w-3 text-black" />}
          </div>
          {allFilteredSelected ? '取消全选' : '全选当前列表'}
        </button>
        <span className="text-sm text-text-muted">
          已选择 {data.assignee_ids.length} / {students?.length || 0} 人
        </span>
      </div>

      {/* Student List */}
      <div className="max-h-80 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3 bg-black/20">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            {search || departmentFilter ? '未找到匹配的学员' : '暂无可分配的学员'}
          </div>
        ) : (
          filteredStudents.map((student) => (
            <StudentItem
              key={student.id}
              student={student}
              selected={data.assignee_ids.includes(student.id)}
              onToggle={() => handleToggle(student.id)}
            />
          ))
        )}
      </div>

      {errors?.assignee_ids && (
        <p className="text-sm text-red-400">{errors.assignee_ids}</p>
      )}

      {/* Selected Summary */}
      {data.assignee_ids.length > 0 && (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            已选择学员 ({data.assignee_ids.length})
          </h4>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {data.assignee_ids.slice(0, 20).map(id => {
              const student = students?.find(s => s.id === id);
              return student ? (
                <Badge key={id} variant="secondary" className="flex items-center gap-1">
                  {student.real_name}
                  <button
                    type="button"
                    onClick={() => handleToggle(id)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null;
            })}
            {data.assignee_ids.length > 20 && (
              <Badge variant="secondary">
                +{data.assignee_ids.length - 20} 更多
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Student Item Component
interface StudentItemProps {
  student: AssignableStudent;
  selected: boolean;
  onToggle: () => void;
}

function StudentItem({ student, selected, onToggle }: StudentItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
        selected 
          ? 'border-primary bg-primary/10' 
          : 'border-transparent hover:bg-white/5'
      }`}
    >
      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
        selected ? 'bg-primary border-primary' : 'border-white/30'
      }`}>
        {selected && <Check className="h-3 w-3 text-black" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{student.real_name}</span>
          <span className="text-sm text-text-muted">@{student.username}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
          <span>工号: {student.employee_id}</span>
          {student.department && (
            <span>{student.department.name}</span>
          )}
        </div>
      </div>
    </button>
  );
}
