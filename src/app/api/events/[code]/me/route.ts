// P2 라운드 화면이 2초마다 폴링한다.
// 호스트가 다음 라운드를 열면 여기 응답이 바뀌고, 참가자 폰이 알아서 갈아탄다.
import { fail, ok, withErrors } from '@/lib/api';
import { getStore } from '@/lib/store';

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return withErrors(async () => {
    const { code } = await ctx.params;
    const pid = new URL(req.url).searchParams.get('pid');
    if (!pid) return fail('참가자 정보가 없습니다.', 400);

    const store = await getStore();
    const event = await store.getEventByCode(code.toUpperCase());
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);

    const participants = await store.listParticipants(event.id);
    const me = participants.find((p) => p.id === pid);
    if (!me) return fail('참가자를 찾을 수 없습니다.', 404);

    const round = event.current_round;
    const teams = round ? await store.listTeams(event.id, round) : [];
    const myTeam = teams.find((t) => t.member_ids.includes(pid)) ?? null;
    const allTasks = round ? await store.listTasks(event.id, round) : [];
    const tasks = myTeam ? allTasks.filter((t) => t.team_id === myTeam.id) : [];

    const nameOf = (id: string) => participants.find((p) => p.id === id)?.nickname ?? '알 수 없음';

    const ranking = [...participants]
      .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))
      .map((p, i) => ({ rank: i + 1, id: p.id, nickname: p.nickname, score: p.score }));

    // §3 라운드 도중에 들어온 사람인지 — 화면에서 "어떻게 시작할지"를 따로 안내한다.
    const joinedMidRound = Boolean(
      event.round_started_at && me.created_at > event.round_started_at,
    );

    return ok({
      event,
      me,
      joinedMidRound,
      team: myTeam,
      teammates: myTeam ? myTeam.member_ids.filter((id) => id !== pid).map((id) => ({ id, nickname: nameOf(id) })) : [],
      tasks: tasks.map((t) => ({
        ...t,
        // 정답은 이 라운드 태스크가 끝나기 전까지 클라이언트로 내보내지 않는다.
        answer: t.done ? t.answer : undefined,
        target_name: t.target_id ? nameOf(t.target_id) : undefined,
      })),
      ranking,
      totalParticipants: participants.length,
    });
  });
}
