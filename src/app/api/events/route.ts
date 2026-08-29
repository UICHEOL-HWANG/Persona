// H1 행사 만들기 — 목적 한 줄 · 인원 · 로테이션 주기 · 팀 인원
import { fail, ok, withErrors } from '@/lib/api';
import { getStore } from '@/lib/store';
import type { EventRow } from '@/lib/types';
import { newCode, newId, nowIso } from '@/lib/util';

export async function POST(req: Request) {
  return withErrors(async () => {
    const b = (await req.json()) as Partial<EventRow>;
    if (!b.title?.trim()) return fail('행사 이름을 입력해 주세요.');

    const store = await getStore();

    // 코드 충돌 회피 (사실상 안 나지만 현장에서 겹치면 치명적이라 확인한다)
    let code = newCode();
    for (let i = 0; i < 5 && (await store.getEventByCode(code)); i++) code = newCode();

    const event: EventRow = {
      id: newId(),
      code,
      title: b.title.trim(),
      purpose: (b.purpose ?? '').trim(),
      host_name: (b.host_name ?? '').trim(),
      team_size: clamp(b.team_size ?? 4, 2, 8),
      rotation_minutes: clamp(b.rotation_minutes ?? 20, 1, 240),
      total_rounds: clamp(b.total_rounds ?? 4, 1, 12),
      status: 'lobby',
      current_round: 0,
      round_started_at: null,
      photo_verify: Boolean(b.photo_verify),
      created_at: nowIso(),
    };
    await store.createEvent(event);
    return ok(event);
  });
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(Number(n) || lo)));
}
