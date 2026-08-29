// §7 프로필 — 역할이 다른 질문 세 종류를 섞는다.
//   overlap(겹칠 것) = 대화의 입구 · diverge(갈릴 것) = 대화가 길어지게 · guess(맞힐 것) = 퀴즈 재료

export type QuestionRole = 'overlap' | 'diverge' | 'guess';

export interface Question {
  id: string;
  role: QuestionRole;
  label: string;
  /** 매칭 근거를 한 줄로 보여줄 때 쓰는 짧은 이름 */
  short: string;
  options?: string[];  // 없으면 자유 입력
  placeholder?: string;
}

export const QUESTIONS: Question[] = [
  // ── 겹칠 것 ──────────────────────────────────────────
  {
    id: 'music',
    role: 'overlap',
    short: '음악',
    label: '요즘 제일 많이 듣는 음악은?',
    options: ['힙합·R&B', 'K-POP', '발라드', '록·밴드', '시티팝·재즈', '일렉·하우스'],
  },
  {
    id: 'food',
    role: 'overlap',
    short: '야식',
    label: '야식 대결에서 늘 이기는 메뉴는?',
    options: ['치킨', '떡볶이', '피자', '곱창·막창', '라면', '회·초밥'],
  },
  {
    id: 'hobby',
    role: 'overlap',
    short: '요즘 하는 것',
    label: '요즘 시간을 제일 많이 쓰는 곳은?',
    options: ['운동', '게임', '영상·드라마', '독서', '여행·나들이', '사이드 프로젝트'],
  },
  {
    id: 'area',
    role: 'overlap',
    short: '자주 가는 동네',
    label: '주말에 자주 가는 동네는?',
    options: ['홍대·합정', '강남·성수', '종로·을지로', '신촌·이대', '그 외 서울', '서울 밖'],
  },

  // ── 갈릴 것 ──────────────────────────────────────────
  {
    id: 'travel',
    role: 'diverge',
    short: '여행 스타일',
    label: '여행 갈 때 나는',
    options: ['계획을 다 짜야 함', '발길 닿는 대로'],
  },
  {
    id: 'weekend',
    role: 'diverge',
    short: '주말',
    label: '주말은',
    options: ['무조건 밖으로', '집이 최고'],
  },
  {
    id: 'first',
    role: 'diverge',
    short: '처음 만난 자리에서',
    label: '처음 보는 사람들 사이에서 나는',
    options: ['먼저 말 거는 편', '말 걸어주길 기다리는 편'],
  },
  {
    id: 'choice',
    role: 'diverge',
    short: '선택할 때',
    label: '새로운 걸 고를 때',
    options: ['검증된 것', '안 해본 것'],
  },

  // ── 맞힐 것 (퀴즈 재료) ───────────────────────────────
  {
    id: 'secret',
    role: 'guess',
    short: '의외의 이야기',
    label: '남들이 들으면 의외라고 하는 내 이야기',
    placeholder: '예) 사실 대학 때 밴드에서 드럼 쳤음',
  },
  {
    id: 'island',
    role: 'guess',
    short: '무인도에 가져갈 것',
    label: '무인도에 딱 하나만 가져간다면?',
    placeholder: '예) 아이패드',
  },
];

export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

export const OVERLAP_IDS = QUESTIONS.filter((q) => q.role === 'overlap').map((q) => q.id);
export const DIVERGE_IDS = QUESTIONS.filter((q) => q.role === 'diverge').map((q) => q.id);
export const GUESS_IDS = QUESTIONS.filter((q) => q.role === 'guess').map((q) => q.id);

export const MBTI_LIST = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];
