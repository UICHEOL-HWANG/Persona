// §6 만드는 방법 ② 템플릿 라이브러리.
// 규칙 하나: 미션은 반드시 다른 사람을 향한다. 혼자 할 수 있는 미션은 넣지 않는다.
//
// 치환자
//   {A} {B} — 팀원 이름   {ALL} — 팀원 전체   {N} — 팀 인원
//   {SHARED} — 이 팀의 공통점 한 줄   {DIFF} — 이 팀의 갈리는 지점 한 줄

export interface MissionTemplate {
  title: string;
  body: string;
  /** 이 템플릿이 성립하는 최소 인원 */
  min: number;
  /** {SHARED} / {DIFF} 를 쓰는가 — 근거가 없으면 건너뛴다 */
  needs?: 'shared' | 'diff';
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    title: '서로 세 가지 질문',
    body: '{ALL} 각자 옆 사람에게 질문 3개를 던지고, 답을 듣기 전에 먼저 답을 예측해 보세요. 몇 개나 맞혔는지 세어서 인증 사진 한 장.',
    min: 2,
  },
  {
    title: '공통점 {N}개 찾기',
    body: '{ALL} 이 자리에서 처음 알게 된 공통점을 {N}개 찾아내세요. 프로필에 이미 있는 건 셈에 넣지 않습니다. 찾은 목록을 손으로 적어 사진으로 남기세요.',
    min: 2,
  },
  {
    title: '가장 의외인 사람',
    body: '{ALL} 돌아가며 "남들이 들으면 의외라고 할 내 얘기"를 하나씩 풀어놓으세요. 제일 의외였던 사람을 뽑고, 그 사람을 가운데 두고 단체 사진.',
    min: 3,
  },
  {
    title: '이 얘기부터 시작하세요',
    body: '{SHARED} — 여기서 시작해서 5분 안에 전혀 다른 주제까지 대화를 끌고 가 보세요. 어디까지 갔는지 마지막 주제를 적어 사진으로 인증.',
    min: 2,
    needs: 'shared',
  },
  {
    title: '갈리는 지점 토론',
    body: '{DIFF} — 이 지점에서 갈렸습니다. 각자 왜 그런지 30초씩 변론하고, 상대 쪽으로 마음이 조금이라도 움직였는지 손으로 표시해 사진 한 장.',
    min: 2,
    needs: 'diff',
  },
  {
    title: '같은 포즈 사진',
    body: '{ALL} 다 같이 정한 포즈 하나로 사진을 찍으세요. 단, 포즈는 팀원 중 가장 늦게 온 사람이 정합니다.',
    min: 2,
  },
  {
    title: '팀 이름 짓기',
    body: '{ALL} 오늘 이 조합에만 어울리는 팀 이름을 하나 지으세요. 이름의 근거를 한 문장으로 붙이고, 이름을 적어 사진으로.',
    min: 2,
  },
  {
    title: '한 명 소개하기',
    body: '{A}에 대해 나머지 팀원이 알아낸 것만으로 소개 문장 세 줄을 완성하세요. {A}는 맞는지 채점만 합니다. 완성된 소개문을 사진으로.',
    min: 3,
  },
  {
    title: '교차 인터뷰',
    body: '{A}와 {B}가 서로를 1분씩 인터뷰하고, 나머지가 더 재미있게 답한 쪽을 고릅니다. 인터뷰 장면을 사진으로.',
    min: 3,
  },
  {
    title: '연락처보다 어려운 것',
    body: '{ALL} 서로에게 "다음에 같이 하면 재밌을 것" 하나씩을 제안하세요. 제일 그럴듯한 제안을 하나 골라 적고 사진으로 남기세요.',
    min: 2,
  },
];

export function fillTemplate(
  t: MissionTemplate,
  ctx: { names: string[]; shared: string[]; different: string[] },
): { title: string; body: string } {
  const [a, b] = ctx.names;
  const sub = (s: string) =>
    s
      .replaceAll('{A}', a ?? '팀원')
      .replaceAll('{B}', b ?? '팀원')
      .replaceAll('{ALL}', ctx.names.join(' · '))
      .replaceAll('{N}', String(ctx.names.length))
      .replaceAll('{SHARED}', ctx.shared[0] ?? '')
      .replaceAll('{DIFF}', ctx.different[0] ?? '');
  return { title: sub(t.title), body: sub(t.body) };
}

/** 라운드·팀마다 다른 템플릿이 나오도록 결정론적으로 고른다 */
export function pickTemplate(
  ctx: { names: string[]; shared: string[]; different: string[] },
  seed: number,
): { title: string; body: string } {
  const usable = MISSION_TEMPLATES.filter(
    (t) =>
      ctx.names.length >= t.min &&
      (t.needs !== 'shared' || ctx.shared.length > 0) &&
      (t.needs !== 'diff' || ctx.different.length > 0),
  );
  const pool = usable.length ? usable : MISSION_TEMPLATES.filter((t) => t.min <= 2 && !t.needs);
  return fillTemplate(pool[Math.abs(seed) % pool.length], ctx);
}
