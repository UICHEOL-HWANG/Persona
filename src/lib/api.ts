import { NextResponse } from 'next/server';
import type { Store } from './store';
import type { Participant, Team } from './types';

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withErrors<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[api]', message);
    return fail(message, 500);
  }
}

/**
 * §6 팀 점수 — 서로를 평가하지 않고 같이 딴다.
 * 팀이 딴 점수는 그대로 팀원 전원의 개인 점수에 누적되어 파티 끝의 순위표가 된다.
 */
export async function award(store: Store, team: Team, points: number, members?: Participant[]) {
  if (points <= 0) return;
  await store.patchTeam(team.id, { score: team.score + points });
  const list = members ?? (await store.listParticipants(team.event_id));
  for (const id of team.member_ids) {
    const p = list.find((x) => x.id === id);
    if (p) await store.patchParticipant(p.id, { score: p.score + points });
  }
}
