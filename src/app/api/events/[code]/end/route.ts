import { fail, ok, withErrors } from '@/lib/api';
import { getStore } from '@/lib/store';

export async function POST(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return withErrors(async () => {
    const { code } = await ctx.params;
    const store = await getStore();
    const event = await store.getEventByCode(code.toUpperCase());
    if (!event) return fail('행사를 찾을 수 없습니다.', 404);
    await store.patchEvent(event.id, { status: 'ended' });
    return ok({ ...event, status: 'ended' as const });
  });
}
