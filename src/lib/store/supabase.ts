import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EventRow, Meeting, Participant, Reaction, Task, Team } from '../types';
import type { Store } from './index';

// 컬럼명은 도메인 타입의 필드명과 1:1로 맞춰 두었다 (supabase/schema.sql 참고).
// 매핑 계층이 없어 인메모리 백엔드와 동작이 갈릴 여지가 없다.

export function createSupabaseStore(url: string, key: string): Store {
  const sb: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const must = <T>(res: { data: T | null; error: { message: string } | null }): T => {
    if (res.error) throw new Error(`[supabase] ${res.error.message}`);
    return res.data as T;
  };
  const ok = (res: { error: { message: string } | null }) => {
    if (res.error) throw new Error(`[supabase] ${res.error.message}`);
  };

  return {
    kind: 'supabase',

    async createEvent(e) {
      ok(await sb.from('events').insert(e));
    },
    async getEventByCode(code) {
      const { data, error } = await sb.from('events').select('*').eq('code', code).maybeSingle();
      if (error) throw new Error(`[supabase] ${error.message}`);
      return (data as EventRow) ?? null;
    },
    async getEvent(id) {
      const { data, error } = await sb.from('events').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`[supabase] ${error.message}`);
      return (data as EventRow) ?? null;
    },
    async patchEvent(id, patch) {
      ok(await sb.from('events').update(patch).eq('id', id));
    },

    async addParticipant(p) {
      ok(await sb.from('participants').insert(p));
    },
    async getParticipant(id) {
      const { data, error } = await sb.from('participants').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`[supabase] ${error.message}`);
      return (data as Participant) ?? null;
    },
    async patchParticipant(id, patch) {
      ok(await sb.from('participants').update(patch).eq('id', id));
    },
    async listParticipants(eventId) {
      return must<Participant[]>(
        await sb.from('participants').select('*').eq('event_id', eventId).order('created_at'),
      );
    },

    async addTeams(ts) {
      if (ts.length) ok(await sb.from('teams').insert(ts));
    },
    async listTeams(eventId, roundNo) {
      let q = sb.from('teams').select('*').eq('event_id', eventId);
      if (roundNo !== undefined) q = q.eq('round_no', roundNo);
      return must<Team[]>(await q);
    },
    async patchTeam(id, patch) {
      ok(await sb.from('teams').update(patch).eq('id', id));
    },

    async addTasks(ts) {
      if (ts.length) ok(await sb.from('tasks').insert(ts));
    },
    async getTask(id) {
      const { data, error } = await sb.from('tasks').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`[supabase] ${error.message}`);
      return (data as Task) ?? null;
    },
    async patchTask(id, patch) {
      ok(await sb.from('tasks').update(patch).eq('id', id));
    },
    async listTasks(eventId, roundNo) {
      let q = sb.from('tasks').select('*').eq('event_id', eventId);
      if (roundNo !== undefined) q = q.eq('round_no', roundNo);
      return must<Task[]>(await q);
    },

    async addMeetings(ms) {
      if (ms.length) ok(await sb.from('meetings').insert(ms));
    },
    async listMeetings(eventId) {
      return must<Meeting[]>(await sb.from('meetings').select('*').eq('event_id', eventId));
    },

    async addReaction(r) {
      // 같은 라운드에서 같은 상대에게 두 번 눌러도 한 번으로 친다.
      ok(await sb.from('reactions').upsert(r, { onConflict: 'event_id,round_no,from_id,to_id' }));
    },
    async listReactions(eventId) {
      return must<Reaction[]>(await sb.from('reactions').select('*').eq('event_id', eventId));
    },
  };
}
