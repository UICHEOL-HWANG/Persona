// P2 퀴즈 — "상대가 이 질문에 뭐라고 답했을까"를 고른다.
// 맞히면 "우리 통하네", 틀리면 "왜 그렇게 생각했어?" — 어느 쪽이든 대화가 된다(§6).
import { award, fail, ok, withErrors } from '@/lib/api';
import { QUIZ_POINTS } from '@/lib/round';
import { getStore } from '@/lib/store';
import { nowIso } from '@/lib/util';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { id } = await ctx.params;
    const { participant_id, guess } = (await req.json()) as { participant_id?: string; guess?: string };
    if (!participant_id || guess === undefined) return fail('답을 고른 사람과 고른 답이 필요합니다.');

    const store = await getStore();
    const task = await store.getTask(id);
    if (!task || task.kind !== 'quiz') return fail('퀴즈를 찾을 수 없습니다.', 404);
    if (participant_id === task.target_id) return fail('본인 문제에는 답할 수 없습니다.', 400);

    const guesses = { ...(task.guesses ?? {}) };
    if (guesses[participant_id] !== undefined) return ok({ ...task, answer: task.done ? task.answer : undefined });

    const teams = await store.listTeams(task.event_id, task.round_no);
    const team = teams.find((t) => t.id === task.team_id);
    if (!team) return fail('팀을 찾을 수 없습니다.', 404);
    if (!team.member_ids.includes(participant_id)) return fail('이 팀의 퀴즈가 아닙니다.', 403);

    guesses[participant_id] = guess;
    const correct = guess === task.answer;

    // 정답자 수만큼 팀 점수가 오른다 — 상대를 평가하는 게 아니라 같이 딴다.
    const gained = correct ? QUIZ_POINTS : 0;
    const answerers = team.member_ids.filter((mid) => mid !== task.target_id);
    const allAnswered = answerers.every((mid) => guesses[mid] !== undefined);

    const patch = {
      guesses,
      points: task.points + gained,
      done: allAnswered,
      ...(allAnswered ? { completed_at: nowIso() } : {}),
    };
    await store.patchTask(task.id, patch);
    if (gained) await award(store, team, gained);

    return ok({
      ...task,
      ...patch,
      correct,
      // 본인이 답을 낸 뒤에는 정답을 알려줘야 "왜 그렇게 생각했어?"가 나온다.
      answer: task.answer,
    });
  });
}
