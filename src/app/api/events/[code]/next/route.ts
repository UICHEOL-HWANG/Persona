// H2 "라운드 시작" / "지금 바로 다음 라운드"(빠른 모드)
// §12 빠른 모드는 기능 추가가 아니라 데모가 성립하는 조건이다 — 같은 엔드포인트를 쓴다.
import { fail, ok, withErrors } from '@/lib/api';
import { startNextRound } from '@/lib/round';
import { getStore } from '@/lib/store';

export async function POST(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return withErrors(async () => {
    const { code } = await ctx.params;
    const store = await getStore();
    const event = await store.getEventByCode(code.toUpperCase());
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);
    if (event.status === 'ended') return fail('이미 끝난 행사입니다.', 409);
    if (event.current_round >= event.total_rounds) {
      return fail('마지막 라운드입니다. 행사를 종료해 주세요.', 409);
    }

    try {
      const updated = await startNextRound(store, event);
      return ok(updated);
    } catch (err) {
      return fail(err instanceof Error ? err.message : '라운드를 시작할 수 없습니다.', 409);
    }
  });
}
