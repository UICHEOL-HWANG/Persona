// 배포 점검용. 값은 절대 내보내지 않고, 있는지/모양이 맞는지만 알려준다.
// 배포한 뒤 여기부터 열어 보면 무엇이 빠졌는지 한 번에 보인다.
import { ok, withErrors } from '@/lib/api';
import { aiEnabled } from '@/lib/round';
import { storeKind } from '@/lib/store';

function classifyKey(k?: string): string {
  if (!k) return '없음';
  if (k.startsWith('sb_secret_')) return 'secret (정상)';
  if (k.startsWith('sb_publishable_')) return 'publishable — RLS에 막힙니다. secret 키가 필요합니다';
  if (k.startsWith('eyJ')) return 'JWT (구형 service_role — 동작하지만 secret 키 권장)';
  return '알 수 없는 형식';
}

export async function GET() {
  return withErrors(async () => {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const store = storeKind();

    // 변수가 다 있으면 실제로 한 번 찔러 본다 — 이름만 맞고 값이 틀린 경우를 잡는다.
    let supabaseReachable: boolean | null = null;
    let supabaseError: string | null = null;
    if (url && key) {
      try {
        const res = await fetch(`${url}/rest/v1/events?select=id&limit=1`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: 'no-store',
        });
        supabaseReachable = res.ok;
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          supabaseError = body.message ?? `HTTP ${res.status}`;
        }
      } catch (err) {
        supabaseReachable = false;
        supabaseError = (err as Error).message;
      }
    }

    const problems: string[] = [];
    if (!url) problems.push('SUPABASE_URL 이 없습니다 (예전 이름 NEXT_PUBLIC_SUPABASE_URL 도 못 찾음)');
    if (!key) problems.push('SUPABASE_SERVICE_ROLE_KEY 가 없습니다');
    if (url && key && supabaseReachable === false) problems.push(`Supabase 응답 실패: ${supabaseError}`);
    if (store === 'memory') {
      problems.push(
        '인메모리로 동작 중입니다. 서버리스에서는 요청마다 인스턴스가 갈려 행사가 사라집니다. ' +
          '환경변수를 넣은 뒤 반드시 재배포하세요.',
      );
    }

    return ok({
      ok: problems.length === 0,
      store,
      env: {
        SUPABASE_URL: url ? '설정됨' : '없음',
        SUPABASE_SERVICE_ROLE_KEY: classifyKey(key),
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '설정됨' : '없음',
        GEMINI_MODEL: process.env.GEMINI_MODEL ?? '(기본값 gemini-3.6-flash)',
      },
      supabase: { reachable: supabaseReachable, error: supabaseError },
      ai: aiEnabled(),
      problems,
    });
  });
}
