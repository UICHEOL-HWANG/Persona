// P2 미션 완료 인증 — 사진 업로드
//
// §14 판단: 사진의 진짜 용도는 판별이 아니라 수집이다. 기본은 자동 승인이고,
// 순위·상품이 걸린 행사를 위해 "사진 필수"만 호스트 옵션(photo_verify)으로 남긴다.
import { award, fail, ok, withErrors } from '@/lib/api';
import { MISSION_POINTS } from '@/lib/round';
import { getStore } from '@/lib/store';
import { nowIso } from '@/lib/util';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { id } = await ctx.params;
    const { photo } = (await req.json()) as { photo?: string };

    const store = await getStore();
    const task = await store.getTask(id);
    if (!task) return fail('미션을 찾을 수 없습니다.', 404);
    if (task.done) return ok(task);

    const event = await store.getEvent(task.event_id);
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);
    if (event.photo_verify && !photo) return fail('이 행사는 사진 인증이 필수입니다.', 400);

    const teams = await store.listTeams(task.event_id, task.round_no);
    const team = teams.find((t) => t.id === task.team_id);
    if (!team) return fail('팀을 찾을 수 없습니다.', 404);

    const patch = {
      done: true,
      photo: photo?.slice(0, 3_000_000),
      completed_at: nowIso(),
      points: MISSION_POINTS,
    };
    await store.patchTask(task.id, patch);
    await award(store, team, MISSION_POINTS);

    return ok({ ...task, ...patch });
  });
}
