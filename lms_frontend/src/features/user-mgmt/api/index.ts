export * from './users';
export * from './organization';
// Re-export mentorship with explicit names to avoid conflicts with users.ts
export {
  type MentorBasic,
  type Mentee,
  type MentorWithMentees,
  type StudentWithoutMentor,
  type RemoveMentorRequest,
  mentorshipKeys,
  fetchMentors,
  fetchMentorMentees,
  fetchStudentsWithoutMentor,
  removeMentor,
  useMentors,
  useMentorMentees,
  useStudentsWithoutMentor,
  useRemoveMentorFromStudent,
  // Rename conflicting exports
  type AssignMentorRequest as MentorshipAssignRequest,
  assignMentor as assignMentorToStudent,
  useAssignMentorToStudent,
} from './mentorship';
