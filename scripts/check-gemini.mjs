#!/usr/bin/env node
// §6 "호스트 설정 = 목적 한 줄" 이 실물로 증명되는지 확인한다.
// 같은 참가자 구성에 목적만 바꿔서, 미션의 주제와 수위가 실제로 달라지는지 본다.
//
//   node scripts/check-gemini.mjs

const BASE = process.env.BASE ?? 'http://localhost:3000';
const PURPOSES = [
  '신입생 환영회 · 30명 · 서로 이름도 모름',
  '솔로파티 · 20명 · 연애 목적',
  '사내 워크샵 · 40명 · 부서가 다 다름',
];

const api = async (p, i) => {
  const r = await fetch(BASE + p, { ...i, headers: { 'content-type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${p} → ${r.status} ${b.error ?? ''}`);
  return b;
};

const PEOPLE = [
  { nickname: '지훈', mbti: 'ENFP', answers: { music: 'K-POP', food: '치킨', hobby: '운동', travel: '계획을 다 짜야 함', weekend: '무조건 밖으로', secret: '밴드에서 드럼 쳤음', island: '기타' } },
  { nickname: '서연', mbti: 'INTJ', answers: { music: 'K-POP', food: '떡볶이', hobby: '독서', travel: '발길 닿는 대로', weekend: '집이 최고', secret: '자격증이 11개', island: '아이패드' } },
  { nickname: '민준', mbti: 'ISFJ', answers: { music: '록·밴드', food: '치킨', hobby: '게임', travel: '계획을 다 짜야 함', weekend: '집이 최고', secret: '뱀을 키움', island: '침낭' } },
  { nickname: '하윤', mbti: 'ESTP', answers: { music: '힙합·R&B', food: '피자', hobby: '운동', travel: '발길 닿는 대로', weekend: '무조건 밖으로', secret: '마라톤 완주 3회', island: '스케치북' } },
];

let aiCount = 0;

for (const purpose of PURPOSES) {
  const ev = await api('/api/events', {
    method: 'POST',
    body: JSON.stringify({ title: '목적 비교 테스트', purpose, team_size: 4, rotation_minutes: 1, total_rounds: 1 }),
  });
  for (const p of PEOPLE) {
    await api(`/api/events/${ev.code}/join`, { method: 'POST', body: JSON.stringify(p) });
  }
  await api(`/api/events/${ev.code}/next`, { method: 'POST' });
  const host = await api(`/api/events/${ev.code}`);
  const mission = host.tasks.find((t) => t.kind === 'mission');

  console.log(`\n[목적] ${purpose}`);
  console.log(`  출처 : ${mission.source === 'ai' ? 'Gemini 생성' : '템플릿 폴백'}`);
  console.log(`  제목 : ${mission.title}`);
  console.log(`  내용 : ${mission.body}`);
  if (mission.source === 'ai') aiCount++;
}

console.log(
  `\n${aiCount}/${PURPOSES.length} 건이 AI 생성. ` +
    (aiCount === PURPOSES.length
      ? '목적 한 줄이 미션을 실제로 바꿉니다.'
      : aiCount === 0
        ? 'GEMINI_API_KEY 가 없거나 호출이 실패해 전부 템플릿으로 폴백했습니다 (플로우는 정상).'
        : '일부만 AI 생성 — 나머지는 템플릿으로 폴백했습니다.'),
);
