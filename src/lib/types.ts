// 페르소나 — 도메인 타입
// 기획서(CLAUDE.md) §5 매칭 / §6 미션·퀴즈 / §8 되먹임 에 대응한다.

export type EventStatus = 'lobby' | 'running' | 'ended';

export interface EventRow {
  id: string;
  code: string;              // 6자리 참가 코드
  title: string;
  purpose: string;           // §6 "호스트 설정 = 목적 한 줄"
  host_name: string;
  team_size: number;         // 2 = 1:1(연애) / 3+ = 다:다(친목). 모드는 이 값 하나로 갈린다.
  rotation_minutes: number;  // 20 / 40 / 커스텀 / 1·2(데모용 빠른 모드)
  total_rounds: number;
  status: EventStatus;
  current_round: number;     // 0 = 아직 시작 전
  round_started_at: string | null;
  photo_verify: boolean;     // §14 기본 꺼짐(자동 승인)
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  nickname: string;
  mbti: string;                        // 'ENFP' 등, 미입력 시 ''
  answers: Record<string, string>;     // questionId -> 답
  score: number;                       // §6 팀 점수가 개인에게 누적된 값
  created_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  round_no: number;
  spot: string;             // 만날 장소 (§9 공개된 장소 유도)
  member_ids: string[];
  score: number;
  /** §5 매칭 근거 — "왜 이 조합인가"를 참가자에게 그대로 보여준다 */
  shared: string[];
  different: string[];
}

export type TaskKind = 'mission' | 'quiz';

export interface Task {
  id: string;
  event_id: string;
  team_id: string;
  round_no: number;
  kind: TaskKind;
  title: string;
  body: string;
  source: 'ai' | 'template' | 'profile'; // 생성 출처 (데모에서 그대로 노출)

  // 퀴즈 전용 — "상대가 이 질문에 뭐라고 답했을까"
  //
  // 아래 선택 필드들이 undefined 가 아니라 null 인 이유:
  // PostgREST 는 여러 행을 한 번에 넣을 때 모든 행의 키 집합을 합집합으로 잡고,
  // 어떤 행에 없는 키는 DEFAULT 가 아니라 NULL 로 채운다. 그래서 미션 행과 퀴즈 행이
  // 키 집합이 다르면 NOT NULL 컬럼이 터진다. 항상 같은 키를 실어 보낸다.
  target_id: string | null;
  options: string[] | null;
  answer: string | null;
  guesses: Record<string, string>;       // participantId -> 고른 답

  done: boolean;
  photo: string | null;                  // 축소된 data URL
  completed_at: string | null;
  points: number;                        // 이 태스크로 팀이 딴 점수
}

/** §5 "아직 안 만난 사람 우선" + §12 관계 지도의 원본 */
export interface Meeting {
  event_id: string;
  a: string;
  b: string;
  round_no: number;
}

/** §8 되먹임 신호 — "더 얘기하고 싶다" */
export interface Reaction {
  event_id: string;
  round_no: number;
  from_id: string;
  to_id: string;
}
