/**
 * Mentorship API exports
 * @module features/user-mgmt/api/mentorship
 */

// Keys
export { mentorshipKeys } from './keys';

// Types
export type {
  MentorBasic,
  Mentee,
  MentorWithMentees,
  StudentWithoutMentor,
  AssignMentorRequest,
  RemoveMentorRequest,
} from './types';

// APIs
export { fetchMentors, useMentors } from './get-mentors';
export { fetchMentorMentees, useMentorMentees } from './get-mentor-mentees';
export { fetchStudentsWithoutMentor, useStudentsWithoutMentor } from './get-students-without-mentor';
export { assignMentor, useAssignMentorToStudent } from './assign-mentor';
export { removeMentor, useRemoveMentorFromStudent } from './remove-mentor';
