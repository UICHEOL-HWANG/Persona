import type { EventRow, Meeting, Participant, Reaction, Task, Team } from '../types';

export interface Store {
  kind: 'memory' | 'supabase';

  createEvent(e: EventRow): Promise<void>;
  getEventByCode(code: string): Promise<EventRow | null>;
  getEvent(id: string): Promise<EventRow | null>;
  patchEvent(id: string, patch: Partial<EventRow>): Promise<void>;

  addParticipant(p: Participant): Promise<void>;
  getParticipant(id: string): Promise<Participant | null>;
  patchParticipant(id: string, patch: Partial<Participant>): Promise<void>;
  listParticipants(eventId: string): Promise<Participant[]>;

  addTeams(ts: Team[]): Promise<void>;
  listTeams(eventId: string, roundNo?: number): Promise<Team[]>;
  patchTeam(id: string, patch: Partial<Team>): Promise<void>;

  addTasks(ts: Task[]): Promise<void>;
  getTask(id: string): Promise<Task | null>;
  patchTask(id: string, patch: Partial<Task>): Promise<void>;
  listTasks(eventId: string, roundNo?: number): Promise<Task[]>;

  addMeetings(ms: Meeting[]): Promise<void>;
  listMeetings(eventId: string): Promise<Meeting[]>;

  addReaction(r: Reaction): Promise<void>;
  listReactions(eventId: string): Promise<Reaction[]>;
}

let cached: Store | null = null;

/**
 * Supabase 환경변수가 있으면 Supabase, 없으면 인메모리로 붙는다.
 * 인메모리는 개발·데모 전용이다 — 서버가 재시작되면 날아가고,
 * 서버리스(Vercel)에서는 인스턴스마다 상태가 갈리므로 배포에는 반드시 Supabase를 붙여야 한다.
 */
export async function getStore(): Promise<Store> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const { createSupabaseStore } = await import('./supabase');
    cached = createSupabaseStore(url, key);
  } else {
    const { createMemoryStore } = await import('./memory');
    cached = createMemoryStore();
  }
  return cached;
}

export function storeKind(): 'memory' | 'supabase' {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? 'supabase' : 'memory';
}
