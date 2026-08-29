// §8 "더 얘기하고 싶다" — 음성 없이도 "이 조합이 잘 통했나"를 재는 신호
import { fail, ok, withErrors } from '@/lib/api';
import { getStore } from '@/lib/store';

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return withErrors(async () => {
    const { code } = await ctx.params;
    const { from_id, to_id } = (await req.json()) as { from_id?: string; to_id?: string };
    if (!from_id || !to_id) return fail('보낸 사람과 받는 사람이 필요합니다.');

    const store = await getStore();
    const event = await store.getEventByCode(code.toUpperCase());
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);

    await store.addReaction({ event_id: event.id, round_no: event.current_round, from_id, to_id });
    return ok({ done: true });
  });
}
