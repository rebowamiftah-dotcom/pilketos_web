// Client-side session store for verified voter identity
// BACKEND INTEGRATION: Replace with secure server-side session (NextAuth or Supabase Auth)
// Never store sensitive data in localStorage in production

import type { Student } from './mockData';

const SESSION_KEY = 'pilketos_voter_session';

export interface VoterSession {
  student: Student;
  verified_at: string;
  has_voted: boolean;
}

export function setVoterSession(student: Student): void {
  if (typeof window === 'undefined') return;
  const session: VoterSession = {
    student,
    verified_at: new Date().toISOString(),
    has_voted: false,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getVoterSession(): VoterSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VoterSession;
  } catch {
    return null;
  }
}

export function markSessionVoted(): void {
  if (typeof window === 'undefined') return;
  const session = getVoterSession();
  if (!session) return;
  session.has_voted = true;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearVoterSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

const ADMIN_SESSION_KEY = 'pilketos_admin_session';

export function setAdminSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
}

export function getAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated';
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}                                                                                       