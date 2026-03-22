import { useState, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Eye,
  Calendar,
  User,
  Trash2,
  CheckCircle,
  ExternalLink,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';

import { useStudentTaskKnowledgeDetail } from '../api/get-student-task-knowledge-detail';
import { useKnowledgeDetail } from '../api/knowledge';
import { useDeleteKnowledge } from '../api/manage-knowledge';
import { useCompleteLearning } from '@/features/tasks/api/complete-learning';
import { useStudentLearningTaskDetail } from '@/features/tasks/api/get-task-detail';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { KnowledgeDetail as KnowledgeDetailType } from '@/types/api';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { showApiError } from '@/utils/error-handler';
import dayjs from '@/lib/dayjs';

export const KnowledgeDetailMyMind: React.FC = () => {
  const { id, role } = useParams<{ id: string; role: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getRolePath } = useRoleNavigate();

  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; type: 'delete' | null }>({
    visible: false,
    type: null,
  });

  const searchParams = new URLSearchParams(location.search);
  const taskKnowledgeId = Number(searchParams.get('taskKnowledgeId') || 0);
  const taskId = Number(searchParams.get('task') || 0);
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const { currentRole, hasPermission } = useAuth();
  const effectiveRole = (role?.toUpperCase() as typeof currentRole) || currentRole;
  const isStudent = effectiveRole === 'STUDENT';
