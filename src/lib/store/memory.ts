import type { EventRow, Meeting, Participant, Reaction, Task, Team } from '../types';
import type { Store } from './index';

interface Db {
  events: Map<string, EventRow>;
  participants: Map<string, Participant>;
  teams: Map<string, Team>;
  tasks: Map<string, Task>;
  meetings: Meeting[];
  reactions: Reaction[];
}

// dev의 HMR/라우트 재평가 사이에서도 상태가 유지되도록 globalThis에 건다.
const g = globalThis as unknown as { __personaDb?: Db };

function db(): Db {
  if (!g.__personaDb) {
    g.__personaDb = {
      events: new Map(),
      participants: new Map(),
      teams: new Map(),
      tasks: new Map(),
      meetings: [],
      reactions: [],
    };
  }
  return g.__personaDb;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function createMemoryStore(): Store {
  return {
    kind: 'memory',

    async createEvent(e) {
      db().events.set(e.id, clone(e));
    },
    async getEventByCode(code) {
      for (const e of db().events.values()) if (e.code === code) return clone(e);
      return null;
    },
    async getEvent(id) {
      const e = db().events.get(id);
      return e ? clone(e) : null;
    },
    async patchEvent(id, patch) {
      const e = db().events.get(id);
      if (e) db().events.set(id, { ...e, ...patch });
    },

    async addParticipant(p) {
      db().participants.set(p.id, clone(p));
    },
    async getParticipant(id) {
      const p = db().participants.get(id);
      return p ? clone(p) : null;
    },
    async patchParticipant(id, patch) {
      const p = db().participants.get(id);
      if (p) db().participants.set(id, { ...p, ...patch });
    },
    async listParticipants(eventId) {
      return [...db().participants.values()]
        .filter((p) => p.event_id === eventId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(clone);
    },

    async addTeams(ts) {
      for (const t of ts) db().teams.set(t.id, clone(t));
    },
    async listTeams(eventId, roundNo) {
      return [...db().teams.values()]
        .filter((t) => t.event_id === eventId && (roundNo === undefined || t.round_no === roundNo))
        .map(clone);
    },
    async patchTeam(id, patch) {
      const t = db().teams.get(id);
      if (t) db().teams.set(id, { ...t, ...patch });
    },

    async addTasks(ts) {
      for (const t of ts) db().tasks.set(t.id, clone(t));
    },
    async getTask(id) {
      const t = db().tasks.get(id);
      return t ? clone(t) : null;
    },
    async patchTask(id, patch) {
      const t = db().tasks.get(id);
      if (t) db().tasks.set(id, { ...t, ...patch });
    },
    async listTasks(eventId, roundNo) {
      return [...db().tasks.values()]
        .filter((t) => t.event_id === eventId && (roundNo === undefined || t.round_no === roundNo))
        .map(clone);
    },

    async addMeetings(ms) {
      db().meetings.push(...ms.map(clone));
    },
    async listMeetings(eventId) {
      return db().meetings.filter((m) => m.event_id === eventId).map(clone);
    },

    async addReaction(r) {
      const list = db().reactions;
      const dup = list.some(
        (x) => x.event_id === r.event_id && x.round_no === r.round_no && x.from_id === r.from_id && x.to_id === r.to_id,
      );
      if (!dup) list.push(clone(r));
    },
    async listReactions(eventId) {
      return db().reactions.filter((r) => r.event_id === eventId).map(clone);
    },
  };
}
