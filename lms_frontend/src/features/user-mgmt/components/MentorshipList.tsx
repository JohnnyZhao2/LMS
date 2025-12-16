/**
 * MentorshipList Component
 * Displays mentor-mentee relationships with management capabilities
 * Requirements: 19.4 - Display mentor list and their mentees
 * Requirements: 19.5 - Assign mentor to student
 * Requirements: 19.6 - Remove mentor-mentee relationship
 */

import * as React from 'react';
import { 
  Users, 
  ChevronDown, 
  ChevronRight, 
  UserPlus,
  UserMinus,
  GraduationCap,
  User,
  Search
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  useMentors, 
  useMentorMentees,
  useStudentsWithoutMentor,
  useAssignMentorToStudent,
  useRemoveMentorFromStudent,
  type MentorWithMentees,
  type Mentee,
  type StudentWithoutMentor
} from '../api/mentorship';

interface MentorshipListProps {
  className?: string;
}

interface MentorNodeProps {
  mentor: MentorWithMentees;
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveMentee: (mentee: Mentee) => void;
  onAddMentee: () => void;
}

/**
 * Single mentor node with expandable mentee list
 */
function MentorNode({ 
  mentor, 
  isExpanded, 
  onToggle,
  onRemoveMentee,
  onAddMentee
}: MentorNodeProps) {
  const { data: mentees, isLoading: menteesLoading } = useMentorMentees(
    isExpanded ? mentor.id : undefined
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Mentor Header */}
      <div className="flex items-center justify-between bg-card hover:bg-white/5 transition-colors">
        <button
          onClick={onToggle}
          className={cn(
            "flex-1 flex items-center gap-3 p-4",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-muted" />
          )}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{mentor.real_name}</span>
              <Badge variant="secondary">
                {mentor.mentee_count} 名学员
              </Badge>
              {!mentor.is_active && (
                <Badge variant="destructive">已停用</Badge>
              )}
            </div>
            <div className="text-sm text-text-muted">
              {mentor.employee_id} · {mentor.department?.name || '未分配室'}
            </div>
          </div>
        </button>
        <div className="pr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddMentee}
            title="添加学员"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mentees List */}
      {isExpanded && (
        <div className="border-t border-border bg-background/50">
          {menteesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : mentees && mentees.length > 0 ? (
            <div className="divide-y divide-border">
              {mentees.map((mentee) => (
                <MenteeRow
                  key={mentee.id}
                  mentee={mentee}
                  onRemove={() => onRemoveMentee(mentee)}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-text-muted">
              暂无学员
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MenteeRowProps {
  mentee: Mentee;
  onRemove: () => void;
}

/**
 * Single mentee row within a mentor's list
 */
function MenteeRow({ mentee, onRemove }: MenteeRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 pl-12 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
          <User className="h-4 w-4 text-secondary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{mentee.real_name}</span>
            {!mentee.is_active && (
              <Badge variant="destructive">已停用</Badge>
            )}
          </div>
          <div className="text-sm text-text-muted">
            {mentee.employee_id} · {mentee.department?.name || '未分配室'}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        title="解除师徒关系"
        className="text-danger hover:text-danger hover:bg-danger/10"
      >
        <UserMinus className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Assign Mentor Modal
 * Requirements: 19.5 - Assign mentor to student
 */
interface AssignMentorModalProps {
  open: boolean;
  onClose: () => void;
  mentor: MentorWithMentees | null;
  studentsWithoutMentor: StudentWithoutMentor[];
  studentsLoading: boolean;
}

function AssignMentorModal({ 
  open, 
  onClose, 
  mentor,
  studentsWithoutMentor,
  studentsLoading
}: AssignMentorModalProps) {
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const assignMentor = useAssignMentorToStudent();

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setSelectedStudentId('');
      setSearchTerm('');
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!mentor || !selectedStudentId) return;
    
    try {
      await assignMentor.mutateAsync({
        studentId: Number(selectedStudentId),
        data: { mentor_id: mentor.id }
      });
      onClose();
    } catch (error) {
      console.error('Failed to assign mentor:', error);
    }
  };

  // Filter students by search term
  const filteredStudents = React.useMemo(() => {
    if (!searchTerm.trim()) return studentsWithoutMentor;
    const term = searchTerm.toLowerCase();
    return studentsWithoutMentor.filter(
      student => 
        student.real_name.toLowerCase().includes(term) ||
        student.employee_id.toLowerCase().includes(term) ||
        student.username.toLowerCase().includes(term)
    );
  }, [studentsWithoutMentor, searchTerm]);

  const studentOptions = filteredStudents.map(student => ({
    value: String(student.id),
    label: `${student.real_name} (${student.employee_id}) - ${student.department?.name || '未分配室'}`
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="指定学员"
      description={mentor ? `为导师 ${mentor.real_name} 添加学员` : ''}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirm}
            loading={assignMentor.isPending}
            disabled={!selectedStudentId}
          >
            确认指定
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder="搜索学员姓名、工号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Student Select */}
        {studentsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Spinner size="md" />
          </div>
        ) : studentOptions.length > 0 ? (
          <Select
            label="选择学员"
            value={selectedStudentId}
            onChange={(value) => setSelectedStudentId(value as string)}
            options={studentOptions}
            placeholder="请选择学员"
          />
        ) : (
          <div className="text-center py-4 text-text-muted">
            {searchTerm ? '未找到匹配的学员' : '暂无未分配导师的学员'}
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Main MentorshipList Component
 * Requirements: 19.4, 19.5, 19.6
 */
export function MentorshipList({ className }: MentorshipListProps) {
  const { data: mentors, isLoading, error } = useMentors();
  const { data: studentsWithoutMentor = [], isLoading: studentsLoading } = useStudentsWithoutMentor();
  const removeMentor = useRemoveMentorFromStudent();
  
  const [expandedMentors, setExpandedMentors] = React.useState<Set<number>>(new Set());
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [selectedMentor, setSelectedMentor] = React.useState<MentorWithMentees | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false);
  const [pendingRemove, setPendingRemove] = React.useState<{
    mentee: Mentee;
    mentorName: string;
  } | null>(null);

  const toggleMentor = (mentorId: number) => {
    setExpandedMentors(prev => {
      const next = new Set(prev);
      if (next.has(mentorId)) {
        next.delete(mentorId);
      } else {
        next.add(mentorId);
      }
      return next;
    });
  };

  const handleAddMentee = (mentor: MentorWithMentees) => {
    setSelectedMentor(mentor);
    setAssignModalOpen(true);
  };

  const handleRemoveMentee = (mentee: Mentee, mentorName: string) => {
    setPendingRemove({ mentee, mentorName });
    setRemoveConfirmOpen(true);
  };

  const confirmRemoveMentee = async () => {
    if (!pendingRemove) return;
    
    try {
      await removeMentor.mutateAsync(pendingRemove.mentee.id);
      setRemoveConfirmOpen(false);
      setPendingRemove(null);
    } catch (error) {
      console.error('Failed to remove mentor:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-danger">
        加载师徒关系失败，请刷新重试
      </div>
    );
  }

  if (!mentors || mentors.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="暂无导师数据"
        description="系统中还没有导师角色的用户"
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          师徒关系
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mentors.map((mentor) => (
            <MentorNode
              key={mentor.id}
              mentor={mentor}
              isExpanded={expandedMentors.has(mentor.id)}
              onToggle={() => toggleMentor(mentor.id)}
              onRemoveMentee={(mentee) => handleRemoveMentee(mentee, mentor.real_name)}
              onAddMentee={() => handleAddMentee(mentor)}
            />
          ))}
        </div>
      </CardContent>

      {/* Assign Mentor Modal */}
      <AssignMentorModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedMentor(null);
        }}
        mentor={selectedMentor}
        studentsWithoutMentor={studentsWithoutMentor}
        studentsLoading={studentsLoading}
      />

      {/* Remove Mentor Confirmation Dialog */}
      <ConfirmDialog
        open={removeConfirmOpen}
        onClose={() => {
          setRemoveConfirmOpen(false);
          setPendingRemove(null);
        }}
        onConfirm={confirmRemoveMentee}
        title="解除师徒关系"
        description={pendingRemove 
          ? `确定解除 ${pendingRemove.mentorName} 与 ${pendingRemove.mentee.real_name} 的师徒关系吗？`
          : ''
        }
        confirmText="确认解除"
        variant="danger"
        loading={removeMentor.isPending}
      />
    </Card>
  );
}

export default MentorshipList;
