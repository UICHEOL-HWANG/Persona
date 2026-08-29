#!/usr/bin/env node
// 데모용 시드 — 행사 하나와 가짜 참가자 N명을 만든다.
// 심사 직전 리허설이나, 현장에서 사람이 덜 모였을 때 쓴다.
//
//   node scripts/seed.mjs                 # 8명, http://localhost:3000
//   node scripts/seed.mjs 12 --smoke      # 12명 + 전 구간 자동 점검
//   BASE=https://... node scripts/seed.mjs

const BASE = process.env.BASE ?? 'http://localhost:3000';
const count = Number(process.argv[2]) || 8;
const smoke = process.argv.includes('--smoke');

// --demo: 심사·제출용. 참가자를 채우고 1라운드까지 열어 둔 채로 남긴다.
// 코드를 받은 사람이 혼자 들어와도 대기하지 않고 바로 팀에 합류한다(§3).
const demo = process.argv.includes('--demo');
const wantedCode = (process.argv.find((a) => a.startsWith('--code=')) ?? '').split('=')[1];

const NAMES = ['지훈', '서연', '민준', '하윤', '도윤', '지우', '예준', '수아', '시우', '지아', '주원', '하은'];
const MBTI = ['ENFP', 'INTJ', 'ISFJ', 'ESTP', 'INFP', 'ENTJ', 'ISTP', 'ESFJ'];
const POOL = {
  music: ['힙합·R&B', 'K-POP', '발라드', '록·밴드', '시티팝·재즈', '일렉·하우스'],
  food: ['치킨', '떡볶이', '피자', '곱창·막창', '라면', '회·초밥'],
  hobby: ['운동', '게임', '영상·드라마', '독서', '여행·나들이', '사이드 프로젝트'],
  area: ['홍대·합정', '강남·성수', '종로·을지로', '신촌·이대', '그 외 서울', '서울 밖'],
  travel: ['계획을 다 짜야 함', '발길 닿는 대로'],
  weekend: ['무조건 밖으로', '집이 최고'],
  first: ['먼저 말 거는 편', '말 걸어주길 기다리는 편'],
  choice: ['검증된 것', '안 해본 것'],
};
const SECRETS = ['밴드에서 드럼 쳤음', '전국노래자랑 본선 나감', '자격증이 11개', '뱀을 키움', '사주 볼 줄 앎', '마라톤 완주 3회'];
const ISLANDS = ['아이패드', '기타', '라면 한 박스', '침낭', '위성전화', '스케치북'];

const api = async (path, init) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → ${res.status} ${body.error ?? ''}`);
  return body;
};

const pick = (arr, i) => arr[i % arr.length];

const event = await api('/api/events', {
  method: 'POST',
  body: JSON.stringify({
    title: demo ? '페르소나 체험 파티' : '2026 I/O Extended 애프터파티',
    purpose: '신입생 환영회 · 30명 · 서로 이름도 모름',
    host_name: '데모 호스트',
    team_size: 4,
    rotation_minutes: demo ? 20 : 1,
    total_rounds: demo ? 4 : 3,
    ...(wantedCode ? { code: wantedCode } : {}),
  }),
});
console.log(`행사 생성  code=${event.code}`);

const people = [];
for (let i = 0; i < count; i++) {
  const answers = {};
  for (const [k, v] of Object.entries(POOL)) answers[k] = pick(v, i * 3 + k.length);
  answers.secret = pick(SECRETS, i);
  answers.island = pick(ISLANDS, i + 2);
  people.push(
    await api(`/api/events/${event.code}/join`, {
      method: 'POST',
      body: JSON.stringify({ nickname: pick(NAMES, i), mbti: pick(MBTI, i), answers }),
    }),
  );
}
console.log(`참가자 ${people.length}명 투입`);

console.log(`\n호스트 콘솔  ${BASE}/host/${event.code}`);
console.log(`참가 화면    ${BASE}/join/${event.code}`);
people.slice(0, 3).forEach((p) => console.log(`  · ${p.nickname} → ${BASE}/p/${event.code}  (pid ${p.id})`));

if (demo) {
  await api(`/api/events/${event.code}/next`, { method: 'POST' });
  const state = await api(`/api/events/${event.code}`);
  console.log('\n── 제출용 체험 행사 준비 완료 ──────────────────────');
  console.log(`  참가 코드   ${event.code}`);
  console.log(`  참가 링크   ${BASE}/join/${event.code}`);
  console.log(`  호스트 콘솔 ${BASE}/host/${event.code}`);
  console.log(`  현재        ${state.event.current_round}라운드 진행 중 · ${state.teams.length}팀 · 참가자 ${state.participants.length}명`);
  console.log('\n  코드를 받은 사람이 혼자 들어와도 대기 없이 바로 팀에 합류합니다.');
  process.exit(0);
}

if (!smoke) process.exit(0);

// ── 전 구간 점검 ────────────────────────────────────────────
console.log('\n--- smoke ---');
let failures = 0;
const check = (label, cond, detail = '') => {
  console.log(`${cond ? ' ok ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

for (let round = 1; round <= 3; round++) {
  await api(`/api/events/${event.code}/next`, { method: 'POST' });
  const host = await api(`/api/events/${event.code}`);
  check(`${round}R 라운드 열림`, host.event.current_round === round);
  check(`${round}R 팀 배정`, host.teams.length > 0, `${host.teams.length}팀`);
  check(
    `${round}R 전원 배정`,
    host.teams.flatMap((t) => t.member_ids).length === count,
    `${host.teams.flatMap((t) => t.member_ids).length}/${count}`,
  );
  check(`${round}R 미션·퀴즈 생성`, host.tasks.length > 0, `${host.tasks.length}개`);

  // 팀마다 미션 완료 + 퀴즈 응답
  for (const team of host.teams) {
    for (const task of host.tasks.filter((t) => t.team_id === team.id)) {
      if (task.kind === 'mission') {
        await api(`/api/tasks/${task.id}/complete`, { method: 'POST', body: JSON.stringify({}) });
      } else {
        for (const mid of team.member_ids) {
          if (mid === task.target_id) continue;
          const guess = task.options[Math.floor(Math.random() * task.options.length)];
          await api(`/api/tasks/${task.id}/guess`, {
            method: 'POST',
            body: JSON.stringify({ participant_id: mid, guess }),
          });
        }
      }
    }
  }

  const after = await api(`/api/events/${event.code}`);
  check(`${round}R 태스크 전부 완료 처리`, after.tasks.every((t) => t.done));
  check(`${round}R 점수 누적`, after.ranking.some((r) => r.score > 0), `1위 ${after.ranking[0]?.score}점`);

  // 참가자 시점
  const me = await api(`/api/events/${event.code}/me?pid=${people[0].id}`);
  check(`${round}R 참가자에게 팀·장소 노출`, Boolean(me.team?.spot), me.team?.spot);
}

// §5 "아직 안 만난 사람 우선"이 실제로 작동하는가
//
// 주의: 8명 · 4인팀이면 라운드당 12쌍이 쓰이는데 가능한 조합은 28쌍뿐이라
// 3라운드(36쌍)에서는 재발이 수학적으로 강제된다. 그래서 여기서는 "이론상 최소치에
// 얼마나 가까운가"만 보고, 재발이 0이어야 하는 조건은 아래 1:1 이벤트에서 따로 확인한다.
const result = await api(`/api/events/${event.code}/result`);
const seen = new Map();
for (const e of result.edges) {
  const k = [e.a, e.b].sort().join('|');
  seen.set(k, (seen.get(k) ?? 0) + 1);
}
const instances = result.edges.length;
const possible = (count * (count - 1)) / 2;
const floor = Math.max(0, instances - possible); // 피할 수 없는 재발의 최소 개수
const repeats = instances - seen.size;
check(
  '다:다 — 재발이 이론상 최소치 근처',
  repeats <= floor + Math.ceil(possible * 0.2),
  `재발 ${repeats} (최소 ${floor}) · 서로 다른 조합 ${seen.size}/${possible}`,
);

// 1:1(2인팀)에서는 3라운드 12쌍 < 28쌍이라 재발이 0이어야 한다.
const solo = await api('/api/events', {
  method: 'POST',
  body: JSON.stringify({
    title: '1:1 매칭 점검',
    purpose: '솔로파티 · 8명 · 연애 목적',
    team_size: 2,
    rotation_minutes: 1,
    total_rounds: 3,
  }),
});
for (let i = 0; i < count; i++) {
  const answers = {};
  for (const [k, v] of Object.entries(POOL)) answers[k] = pick(v, i * 3 + k.length);
  answers.secret = pick(SECRETS, i);
  answers.island = pick(ISLANDS, i + 2);
  await api(`/api/events/${solo.code}/join`, {
    method: 'POST',
    body: JSON.stringify({ nickname: pick(NAMES, i), mbti: pick(MBTI, i), answers }),
  });
}
for (let r = 0; r < 3; r++) await api(`/api/events/${solo.code}/next`, { method: 'POST' });
const soloResult = await api(`/api/events/${solo.code}/result`);
const soloSeen = new Set(soloResult.edges.map((e) => [e.a, e.b].sort().join('|')));
check(
  '1:1 — 3라운드 동안 같은 사람 재매칭 없음',
  soloSeen.size === soloResult.edges.length,
  `${soloSeen.size}/${soloResult.edges.length}쌍`,
);
check('1:1 — 매 라운드 전원 배정', soloResult.edges.length === (count / 2) * 3);

// §8 되먹임 신호
await api(`/api/events/${event.code}/react`, {
  method: 'POST',
  body: JSON.stringify({ from_id: people[0].id, to_id: people[1].id }),
});
const reacted = await api(`/api/events/${event.code}/result`);
check('"더 얘기하고 싶다" 기록됨', reacted.stats.reactionCount === 1);

await api(`/api/events/${event.code}/end`, { method: 'POST' });
const ended = await api(`/api/events/${event.code}/result`);
check('행사 종료', ended.event.status === 'ended');
check('결과 통계 집계', ended.stats.tasksDone > 0, JSON.stringify(ended.stats));

console.log(failures === 0 ? '\n전 구간 통과' : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
