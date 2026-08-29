// P1 프로필 제출 = 참가
import { fail, ok, withErrors } from '@/lib/api';
import { getStore } from '@/lib/store';
import type { Participant } from '@/lib/types';
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
    return ok(participant);
  });
}
