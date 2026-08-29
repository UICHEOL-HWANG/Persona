#!/usr/bin/env node
// .env.local 의 Supabase 설정이 실제로 동작하는지 확인한다.
//   node --env-file=.env.local scripts/check-supabase.mjs

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 있어야 합니다.');
  process.exit(1);
}
if (key.startsWith('sb_publishable_')) {
  console.error('공개(publishable) 키가 들어 있습니다. secret 키가 필요합니다 — RLS가 켜져 있어 공개 키로는 막힙니다.');
  process.exit(1);
}

const TABLES = ['events', 'participants', 'teams', 'tasks', 'meetings', 'reactions'];
let bad = 0;

for (const t of TABLES) {
  const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (res.ok) {
    console.log(` ok   ${t}`);
  } else {
    const body = await res.json().catch(() => ({}));
    console.log(`FAIL  ${t}  ${body.message ?? res.status}`);
    bad++;
  }
}

console.log(bad === 0 ? '\nSupabase 연결 정상 — 6개 테이블 모두 접근됩니다.' : `\n${bad}개 테이블 실패`);
process.exit(bad === 0 ? 0 : 1);
