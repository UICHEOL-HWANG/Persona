// H2 진행 화면이 2초마다 폴링하는 엔드포인트
import { fail, ok, withErrors } from '@/lib/api';
import { aiEnabled } from '@/lib/round';
import { getStore, storeKind } from '@/lib/store';

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return withErrors(async () => {
    const { code } = await ctx.params;
    const store = await getStore();
    const event = await store.getEventByCode(code.toUpperCase());
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);

    const [participants, teams, tasks, reactions] = await Promise.all([
      store.listParticipants(event.id),
      store.listTeams(event.id, event.current_round || undefined),
      store.listTasks(event.id, event.current_round || undefined),
      store.listReactions(event.id),
    ]);

    const ranking = [...participants]
      .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
      .map((p, i) => ({ rank: i + 1, id: p.id, nickname: p.nickname, score: p.score }));

    return ok({
      event,
      participants: participants.map((p) => ({ id: p.id, nickname: p.nickname, mbti: p.mbti, score: p.score })),
      teams,
      tasks,
      ranking,
      // §8 되먹임 신호 — 이번 행사에서 "더 얘기하고 싶다"가 몇 번 눌렸나
      reactionCount: reactions.length,
      meta: { store: storeKind(), ai: aiEnabled() },
    });
  });
}
