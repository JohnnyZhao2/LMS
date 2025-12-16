/**
 * Mentorship Management API
 * API functions for mentor-mentee relationship management
 * Requirements: 19.4 - Display mentor list and their mentees
 * Requirements: 19.5 - Assign mentor to student
 * Requirements: 19.6 - Remove mentor-mentee relationship
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { RoleCode } from '@/config/roles';

// ============================================
// Types
// ============================================

export interface MentorBasic {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
}

export interface Mentee {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  department: {
    id: number;
    name: string;
  } | null;
  roles: Array<{
    code: RoleCode;
    name: string;
  }>;
}

export interface MentorWithMentees {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  department: {
    id: number;
    name: string;
  } | null;
  mentee_count: number;
}

export interface StudentWithoutMentor {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  department: {
    id: number;
    name: string;
  } | null;
}

export interface AssignMentorRequest {
  mentor_id: number;
}

// RemoveMentorRequest is empty - just needs the student ID in URL
// Using Record<string, never> to represent an empty object type
export type RemoveMentorRequest = Record<string, never>;

// ============================================
// Query Keys
// ============================================

export const mentorshipKeys = {
  all: ['mentorship'] as const,
  mentors: () => [...mentorshipKeys.all, 'mentors'] as const,
  mentorList: () => [...mentorshipKeys.mentors(), 'list'] as const,
  mentorMentees: (mentorId: number) => [...mentorshipKeys.mentors(), 'mentees', mentorId] as const,
  studentsWithoutMentor: () => [...mentorshipKeys.all, 'studentsWithoutMentor'] as const,
};

// ============================================
// API Functions
// ============================================

/**
 * Fetch all mentors (users with MENTOR role)
 * Requirements: 19.4 - Display mentor list
 */
export async function fetchMentors(): Promise<MentorWithMentees[]> {
  return api.get<MentorWithMentees[]>(API_ENDPOINTS.mentorship.mentors);
}

/**
 * Fetch mentees for a specific mentor
 * Requirements: 19.4 - Display mentees of each mentor
 */
export async function fetchMentorMentees(mentorId: number): Promise<Mentee[]> {
  return api.get<Mentee[]>(API_ENDPOINTS.mentorship.mentorWithMentees(mentorId));
}

/**
 * Fetch students without a mentor assigned
 * Requirements: 19.5 - For assigning mentor to students
 */
export async function fetchStudentsWithoutMentor(): Promise<StudentWithoutMentor[]> {
  return api.get<StudentWithoutMentor[]>(API_ENDPOINTS.mentorship.studentsWithoutMentor);
}

/**
 * Assign a mentor to a student
 * Requirements: 19.5 - Assign mentor to student
 */
export async function assignMentor(
  studentId: number,
  data: AssignMentorRequest
): Promise<Mentee> {
  return api.post<Mentee>(API_ENDPOINTS.mentorship.assign(studentId), data);
}

/**
 * Remove mentor from a student (unassign mentor-mentee relationship)
 * Requirements: 19.6 - Remove mentor-mentee relationship
 */
export async function removeMentor(studentId: number): Promise<Mentee> {
  return api.post<Mentee>(API_ENDPOINTS.mentorship.remove(studentId), {});
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch all mentors
 * Requirements: 19.4 - Display mentor list
 */
export function useMentors() {
  return useQuery({
    queryKey: mentorshipKeys.mentorList(),
    queryFn: fetchMentors,
  });
}

/**
 * Hook to fetch mentees for a specific mentor
 * Requirements: 19.4 - Display mentees of each mentor
 */
export function useMentorMentees(mentorId: number | undefined) {
  return useQuery({
    queryKey: mentorshipKeys.mentorMentees(mentorId!),
    queryFn: () => fetchMentorMentees(mentorId!),
    enabled: !!mentorId,
  });
}

/**
 * Hook to fetch students without a mentor
 * Requirements: 19.5 - For assigning mentor
 */
export function useStudentsWithoutMentor() {
  return useQuery({
    queryKey: mentorshipKeys.studentsWithoutMentor(),
    queryFn: fetchStudentsWithoutMentor,
  });
}

/**
 * Hook to assign a mentor to a student
 * Requirements: 19.5 - Assign mentor to student
 */
export function useAssignMentorToStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: number; data: AssignMentorRequest }) =>
      assignMentor(studentId, data),
    onSuccess: (_, variables) => {
      // Invalidate mentor list (mentee count changed)
      queryClient.invalidateQueries({ queryKey: mentorshipKeys.mentorList() });
      // Invalidate the specific mentor's mentees list
      queryClient.invalidateQueries({ 
        queryKey: mentorshipKeys.mentorMentees(variables.data.mentor_id) 
      });
      // Invalidate students without mentor list
      queryClient.invalidateQueries({ queryKey: mentorshipKeys.studentsWithoutMentor() });
      // Also invalidate user list since mentor changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to remove mentor from a student
 * Requirements: 19.6 - Remove mentor-mentee relationship
 */
export function useRemoveMentorFromStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) => removeMentor(studentId),
    onSuccess: () => {
      // Invalidate all mentorship-related queries
      queryClient.invalidateQueries({ queryKey: mentorshipKeys.all });
      // Also invalidate user list since mentor changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
