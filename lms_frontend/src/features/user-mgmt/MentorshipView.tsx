/**
 * MentorshipView Page
 * Displays mentor-mentee relationship management interface
 * Requirements: 19.4 - Display mentor list and their mentees
 */

import { GraduationCap } from 'lucide-react';
import { MentorshipList } from './components/MentorshipList';

export function MentorshipView() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            师徒关系管理
          </h1>
          <p className="text-sm text-text-muted">
            管理导师与学员的师徒关系
          </p>
        </div>
      </div>

      {/* Mentorship List */}
      <MentorshipList />
    </div>
  );
}

export default MentorshipView;
