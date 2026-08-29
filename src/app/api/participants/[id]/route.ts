// §3 "행사 직전, 프로필 수정·추가 확인" — 언제든 고칠 수 있다(§7)
import { fail, ok, withErrors } from '@/lib/api';
import { getStore } from '@/lib/store';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { id } = await ctx.params;
    const store = await getStore();
    const p = await store.getParticipant(id);
    if (!p) return fail('참가자를 찾을 수 없습니다.', 404);
    return ok(p);
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { id } = await ctx.params;
    const body = (await req.json()) as { nickname?: string; mbti?: string; answers?: Record<string, string> };
    const store = await getStore();
    const p = await store.getParticipant(id);
    if (!p) return fail('참가자를 찾을 수 없습니다.', 404);

    await store.patchParticipant(id, {
      ...(body.nickname ? { nickname: body.nickname.trim().slice(0, 12) } : {}),
      ...(body.mbti !== undefined ? { mbti: body.mbti.toUpperCase().slice(0, 4) } : {}),
      ...(body.answers ? { answers: { ...p.answers, ...body.answers } } : {}),
    });
    return ok(await store.getParticipant(id));
  });
}
