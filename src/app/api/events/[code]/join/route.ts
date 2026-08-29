// P1 프로필 제출 = 참가
//
// 라운드가 이미 돌고 있는 중에 들어오면 대기시키지 않고 그 자리에서 팀에 합류시킨다(§3).
// 늦게 온 사람과 이탈로 자리가 빈 팀은 같은 문제이고, 해법도 같다.
import { fail, ok, withErrors } from '@/lib/api';
import { pairInsight } from '@/lib/matching';
import { getStore } from '@/lib/store';
import type { Meeting, Participant } from '@/lib/types';
import { newId, nowIso } from '@/lib/util';

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return withErrors(async () => {
    const { code } = await ctx.params;
    const body = (await req.json()) as { nickname?: string; mbti?: string; answers?: Record<string, string> };
    if (!body.nickname?.trim()) return fail('이름(닉네임)을 입력해 주세요.');

    const store = await getStore();
    const event = await store.getEventByCode(code.toUpperCase());
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);
    if (event.status === 'ended') return fail('이미 끝난 행사입니다.', 409);

    const participant: Participant = {
      id: newId(),
      event_id: event.id,
      nickname: body.nickname.trim().slice(0, 12),
      mbti: (body.mbti ?? '').toUpperCase().slice(0, 4),
      answers: body.answers ?? {},
      score: 0,
      created_at: nowIso(),
    };
    await store.addParticipant(participant);

    // 진행 중인 라운드가 있으면 바로 합류시킨다 — 혼자 남겨 두지 않는다.
    if (event.status === 'running' && event.current_round > 0) {
      await joinRunningRound(store, event.id, event.current_round, participant);
    }

    return ok(participant);
  });
}

async function joinRunningRound(
  store: Awaited<ReturnType<typeof getStore>>,
  eventId: string,
  roundNo: number,
  newcomer: Participant,
) {
  const teams = await store.listTeams(eventId, roundNo);
  if (teams.length === 0) return;

  const people = await store.listParticipants(eventId);
  const byId = new Map(people.map((p) => [p.id, p]));

  // 인원이 적은 팀을 먼저 채우고, 같은 크기라면 궁합이 좋은 쪽으로 보낸다.
  const smallest = Math.min(...teams.map((t) => t.member_ids.length));
  const candidates = teams.filter((t) => t.member_ids.length === smallest);

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const t of candidates) {
    const score =
      t.member_ids.reduce((acc, id) => {
        const m = byId.get(id);
        return m ? acc + pairInsight(newcomer, m).score : acc;
      }, 0) / Math.max(1, t.member_ids.length);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  await store.patchTeam(best.id, { member_ids: [...best.member_ids, newcomer.id] });

  const meetings: Meeting[] = best.member_ids.map((id) => {
    const [a, b] = [id, newcomer.id].sort();
    return { event_id: eventId, a, b, round_no: roundNo };
  });
  await store.addMeetings(meetings);
}
