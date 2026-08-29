// 라운드 하나를 여는 일 전체 — 매칭(§5) → 미션·퀴즈 생성(§6) → 만남 기록(§8)

import { buildTeams, spotFor } from './matching';
import { generateMission, geminiAvailable } from './mission/gemini';
import { pickTemplate } from './mission/templates';
import { GUESS_IDS, QUESTIONS, QUESTIONS_BY_ID } from './questions';
import type { Store } from './store';
import type { EventRow, Meeting, Participant, Task, Team } from './types';
import { newId, nowIso, seedFrom, shuffleWithSeed } from './util';

export const MISSION_POINTS = 2;
export const QUIZ_POINTS = 1;

/**
 * Task 를 만드는 유일한 통로.
 *
 * 모든 행이 같은 키 집합을 갖게 하려고 둔 것이다. PostgREST 는 배열 삽입에서
 * 행마다 키가 다르면 없는 키를 DEFAULT 가 아니라 NULL 로 채우기 때문에,
 * 미션 행과 퀴즈 행의 모양이 다르면 NOT NULL 컬럼이 터진다.
 */
function makeTask(fields: Omit<Task, 'target_id' | 'options' | 'answer' | 'guesses' | 'photo' | 'completed_at'> &
  Partial<Pick<Task, 'target_id' | 'options' | 'answer' | 'guesses' | 'photo' | 'completed_at'>>): Task {
  return {
    target_id: null,
    options: null,
    answer: null,
    guesses: {},
    photo: null,
    completed_at: null,
    ...fields,
  };
}

/**
 * AI가 참조해도 되는 사실 전부.
 * 참가자가 낸 프로필에서만 만든다 — 이 목록 밖은 미션에 등장할 수 없다(mission/gemini.ts 검증).
 */
function factsFor(members: Participant[]): string[] {
  const facts: string[] = [];
  for (const m of members) {
    if (m.mbti) facts.push(`${m.nickname} · MBTI · ${m.mbti}`);
    for (const q of QUESTIONS) {
      const v = (m.answers[q.id] ?? '').trim();
      if (v) facts.push(`${m.nickname} · ${q.short} · ${v}`);
    }
  }
  return facts;
}

/**
 * 퀴즈 만들기 — LLM을 쓰지 않는다. 참가자가 낸 프로필이 그대로 재료다(§8).
 *
 * "상대가 이 질문에 뭐라고 답했을까"를 맞히는 구조라, 맞히면 "통하네"가 되고
 * 틀리면 "왜 그렇게 생각했어?"가 나온다 — 어느 쪽이든 대화가 된다(§6).
 */
function buildQuizzes(
  team: Team,
  members: Participant[],
  pool: Participant[],
  count: number,
  seed: number,
): Task[] {
  const out: Task[] = [];
  const targets = shuffleWithSeed(members, seed);
  const usedQ = new Set<string>();

  for (const target of targets) {
    if (out.length >= count) break;

    // ① 우선 "맞힐 것"(자유 입력)으로 — 남들이 모를 얘기라 예측이 갈린다.
    let picked: { qid: string; answer: string; options: string[] } | null = null;

    for (const qid of shuffleWithSeed(GUESS_IDS, seed + out.length)) {
      if (usedQ.has(qid)) continue;
      const answer = (target.answers[qid] ?? '').trim();
      if (!answer) continue;
      const distractors = [
        ...new Set(
          pool
            .filter((p) => p.id !== target.id)
            .map((p) => (p.answers[qid] ?? '').trim())
            .filter((v) => v && v !== answer),
        ),
      ];
      if (distractors.length < 2) continue;
      picked = {
        qid,
        answer,
        options: shuffleWithSeed([answer, ...distractors.slice(0, 3)], seed + out.length * 7),
      };
      break;
    }

    // ② 재료가 모자라면 선택지가 정해진 질문으로 — 항상 성립한다.
    if (!picked) {
      for (const q of shuffleWithSeed(QUESTIONS.filter((x) => x.options), seed + out.length * 3)) {
        if (usedQ.has(q.id)) continue;
        const answer = (target.answers[q.id] ?? '').trim();
        if (!answer) continue;
        picked = { qid: q.id, answer, options: q.options! };
        break;
      }
    }
    if (!picked) continue;

    usedQ.add(picked.qid);
    out.push(
      makeTask({
        id: newId(),
        event_id: team.event_id,
        team_id: team.id,
        round_no: team.round_no,
        kind: 'quiz',
        title: `${target.nickname}은(는) 뭐라고 답했을까?`,
        body: QUESTIONS_BY_ID[picked.qid].label,
        source: 'profile',
        target_id: target.id,
        options: picked.options,
        answer: picked.answer,
        done: false,
        points: 0,
      }),
    );
  }
  return out;
}

/**
 * 다음 라운드를 연다. 호스트가 "라운드 시작"이나 "지금 바로 다음 라운드"(빠른 모드)를 누를 때 호출된다.
 * 반환값은 갱신된 이벤트.
 */
export async function startNextRound(store: Store, event: EventRow): Promise<EventRow> {
  const participants = await store.listParticipants(event.id);
  if (participants.length < 2) {
    throw new Error('참가자가 2명 이상이어야 라운드를 시작할 수 있습니다.');
  }

  const roundNo = event.current_round + 1;
  const meetings = await store.listMeetings(event.id);
  const matched = buildTeams(participants, event.team_size, meetings, roundNo);
  const byId = new Map(participants.map((p) => [p.id, p]));

  const teams: Team[] = matched.map((m, i) => ({
    id: newId(),
    event_id: event.id,
    round_no: roundNo,
    spot: spotFor(i),
    member_ids: m.member_ids,
    score: 0,
    shared: m.shared,
    different: m.different,
  }));

  const tasks: Task[] = [];
  const newMeetings: Meeting[] = [];

  for (const team of teams) {
    const members = team.member_ids.map((id) => byId.get(id)!).filter(Boolean);
    const names = members.map((p) => p.nickname);
    const seed = seedFrom(event.id, roundNo, team.id);

    // §5 모드는 팀 인원 하나로 갈린다.
    //   1:1(2명) → 주 재료는 퀴즈   /   다:다(3명+) → 주 재료는 미션 + 퀴즈 보조
    const wantMission = members.length >= 3;
    const quizCount = members.length >= 3 ? 2 : 2;

    if (wantMission) {
      const ai = await generateMission({
        purpose: event.purpose,
        names,
        shared: team.shared,
        different: team.different,
        roundNo,
        teamSize: members.length,
        facts: factsFor(members),
        otherNames: participants
          .filter((p) => !team.member_ids.includes(p.id))
          .map((p) => p.nickname),
      });
      const m = ai ?? pickTemplate({ names, shared: team.shared, different: team.different }, seed);
      tasks.push(
        makeTask({
          id: newId(),
          event_id: event.id,
          team_id: team.id,
          round_no: roundNo,
          kind: 'mission',
          title: m.title,
          body: m.body,
          source: ai ? 'ai' : 'template',
          done: false,
          points: 0,
        }),
      );
    }

    tasks.push(...buildQuizzes(team, members, participants, quizCount, seed));

    // 1:1이면 미션도 하나 붙여 준다 — 앉아서 할 수 있는 것으로.
    if (!wantMission) {
      const m = pickTemplate({ names, shared: team.shared, different: team.different }, seed);
      tasks.push(
        makeTask({
          id: newId(),
          event_id: event.id,
          team_id: team.id,
          round_no: roundNo,
          kind: 'mission',
          title: m.title,
          body: m.body,
          source: 'template',
          done: false,
          points: 0,
        }),
      );
    }

    for (let i = 0; i < team.member_ids.length; i++) {
      for (let j = i + 1; j < team.member_ids.length; j++) {
        const [a, b] = [team.member_ids[i], team.member_ids[j]].sort();
        newMeetings.push({ event_id: event.id, a, b, round_no: roundNo });
      }
    }
  }

  await store.addTeams(teams);
  await store.addTasks(tasks);
  await store.addMeetings(newMeetings);

  const patch = {
    current_round: roundNo,
    status: 'running' as const,
    round_started_at: nowIso(),
  };
  await store.patchEvent(event.id, patch);
  return { ...event, ...patch };
}

export function aiEnabled(): boolean {
  return geminiAvailable();
}
