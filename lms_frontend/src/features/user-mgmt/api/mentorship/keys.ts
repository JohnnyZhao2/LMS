/**
 * Mentorship Query Keys
 * React Query keys for mentorship data caching
 * @module features/user-mgmt/api/mentorship/keys
 */

/**
 * Query keys for mentorship
 */
export const mentorshipKeys = {
  all: ['mentorship'] as const,
  mentors: () => [...mentorshipKeys.all, 'mentors'] as const,
  mentorList: () => [...mentorshipKeys.mentors(), 'list'] as const,
  mentorMentees: (mentorId: number) => [...mentorshipKeys.mentors(), 'mentees', mentorId] as const,
  studentsWithoutMentor: () => [...mentorshipKeys.all, 'studentsWithoutMentor'] as const,
};
