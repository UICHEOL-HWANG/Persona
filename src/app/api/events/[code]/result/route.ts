// P3 결과 — 순위표 · 사진첩 · 관계 지도
import { fail, ok, withErrors } from '@/lib/api';
import { getStore } from '@/lib/store';

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return withErrors(async () => {
    const { code } = await ctx.params;
    const store = await getStore();
    const event = await store.getEventByCode(code.toUpperCase());
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);

    const [participants, tasks, meetings, reactions] = await Promise.all([
      store.listParticipants(event.id),
      store.listTasks(event.id),
      store.listMeetings(event.id),
      store.listReactions(event.id),
    ]);

    const ranking = [...participants]
      .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
      .map((p, i) => ({ rank: i + 1, id: p.id, nickname: p.nickname, score: p.score }));

    const photos = tasks
      .filter((t) => t.photo)
      .map((t) => ({ id: t.id, round_no: t.round_no, title: t.title, photo: t.photo! }));

    const doneTasks = tasks.filter((t) => t.done);
    const quizzes = tasks.filter((t) => t.kind === 'quiz');
    const totalGuesses = quizzes.reduce((n, q) => n + Object.keys(q.guesses ?? {}).length, 0);
    const correctGuesses = quizzes.reduce(
      (n, q) => n + Object.values(q.guesses ?? {}).filter((g) => g === q.answer).length,
      0,
    );

    return ok({
      event,
      people: participants.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score })),
      ranking,
      photos,
      // 관계 지도 — 누가 누구와 만났나
      edges: meetings.map((m) => ({ a: m.a, b: m.b, round_no: m.round_no })),
      reactions: reactions.map((r) => ({ from_id: r.from_id, to_id: r.to_id })),
      // §8 되먹임 — 이번 행사에서 실제로 잡힌 신호들
      stats: {
        rounds: event.current_round,
        tasksTotal: tasks.length,
        tasksDone: doneTasks.length,
        totalGuesses,
        correctGuesses,
        reactionCount: reactions.length,
      },
    });
  });
}
