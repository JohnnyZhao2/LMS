import { Search, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AssignableUser } from './task-form.types';

interface UserSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AssignableUser[];
  selectedUserIds: number[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleUser: (userId: number) => void;
  onToggleAll: (checked: boolean) => void;
  onClear: () => void;
  canRemoveAssignee: boolean;
}

export const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
  open,
  onOpenChange,
  users,
  selectedUserIds,
  searchValue,
  onSearchChange,
  onToggleUser,
  onToggleAll,
  onClear,
}) => {
  const isAllSelected = users.length > 0 && users.every(u => selectedUserIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>选择指派人员</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="搜索姓名或工号..."
              className="pl-9"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked: boolean) => onToggleAll(checked)}
            />
            <span className="text-sm">全选</span>
          </div>
          <Button
            variant="link"
            size="sm"
            className="text-destructive-500 hover:text-destructive-600"
            onClick={onClear}
          >
            清空
          </Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {users.map(user => {
            const checked = selectedUserIds.includes(user.id);
            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-muted'
                  }`}
                onClick={() => onToggleUser(user.id)}
              >
                <Checkbox checked={checked} />
                <Avatar className={checked ? 'bg-primary-500' : 'bg-muted'}>
                  <AvatarFallback className="text-white">
                    {user.username[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{user.username}</div>
                  <div className="text-xs text-text-muted">
                    {user.employee_id} | {user.department?.name || '无部门'}
                  </div>
                </div>
                {checked && <Check className="w-4 h-4 text-primary-500" />}
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between mt-4">
          <span className="text-sm text-text-muted">
            已选择 {selectedUserIds.length} 人
          </span>
          <Button onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
