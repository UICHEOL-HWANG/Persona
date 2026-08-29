// §5 매칭 — 판정 규칙은 "AI가 알아서"가 아니라 한 문장으로 설명할 수 있어야 한다.
//
//   ▸ 겹치는 게 하나는 있고, 갈리는 게 하나는 있는 조합을 우선한다.
//     공통점은 대화의 입구를 만들고, 차이점은 대화가 길어지게 한다.
//   ▸ 아직 안 만난 사람 우선.
//   ▸ 지난 라운드에서 만난 사람 후순위.
//
// 아래 상수들이 그 문장을 그대로 옮긴 것이다.

import type { Meeting, Participant } from './types';
import { DIVERGE_IDS, OVERLAP_IDS, QUESTIONS_BY_ID } from './questions';

const W_BOTH_PRESENT = 10; // 겹침·갈림이 "둘 다" 있을 때만 주는 가산점 — 규칙의 본체
const W_PER_OVERLAP = 1;
const W_PER_DIVERGE = 1;
const CAP = 3;             // 한쪽으로 쏠려도 더 이상 오르지 않게
const P_ALREADY_MET = 20;  // 이미 만난 사이는 사실상 배제

export interface PairInsight {
  score: number;
  shared: string[];
  different: string[];
}

function mbtiDiff(a: string, b: string): number {
  if (a.length !== 4 || b.length !== 4) return 0;
  let d = 0;
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** 두 사람 사이의 궁합 + 그 근거(참가자에게 그대로 보여줄 문장) */
export function pairInsight(a: Participant, b: Participant, metCount = 0): PairInsight {
  const shared: string[] = [];
  const different: string[] = [];

  for (const id of OVERLAP_IDS) {
    const va = a.answers[id];
    const vb = b.answers[id];
    if (va && vb && va === vb) shared.push(`${QUESTIONS_BY_ID[id].short} · ${va}`);
  }
  for (const id of DIVERGE_IDS) {
    const va = a.answers[id];
    const vb = b.answers[id];
    if (va && vb && va !== vb) different.push(`${QUESTIONS_BY_ID[id].short} · ${va} ↔ ${vb}`);
  }

  // MBTI는 겹침·갈림에 동시에 걸리는 재료다(§7).
  if (a.mbti && b.mbti) {
    const d = mbtiDiff(a.mbti, b.mbti);
    if (d <= 1) shared.push(`MBTI · ${a.mbti} ↔ ${b.mbti} 거의 같은 유형`);
    else if (d >= 3) different.push(`MBTI · ${a.mbti} ↔ ${b.mbti} 정반대에 가까움`);
  }

  const ov = shared.length;
  const dv = different.length;

  let score = 0;
  if (ov > 0 && dv > 0) score += W_BOTH_PRESENT;
  score += Math.min(ov, CAP) * W_PER_OVERLAP;
  score += Math.min(dv, CAP) * W_PER_DIVERGE;
  score -= metCount * P_ALREADY_MET;

  return { score, shared, different };
}

function key(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function metCountMap(meetings: Meeting[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of meetings) {
    const k = key(x.a, x.b);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export interface MatchedTeam {
  member_ids: string[];
  shared: string[];
  different: string[];
}

/**
 * 라운드 하나의 팀 배정.
 * 그리디: 아직 안 뽑힌 사람 중 하나를 시드로 잡고, 팀에 넣었을 때 팀 전체 점수 합이
 * 가장 커지는 사람을 teamSize만큼 채운다. 남는 사람은 점수가 가장 잘 맞는 팀에 합류시킨다
 * (§3 이탈 처리와 같은 경로 — 혼자 남는 사람을 만들지 않는다).
 */
export function buildTeams(
  participants: Participant[],
  teamSize: number,
  meetings: Meeting[],
  roundNo: number,
): MatchedTeam[] {
  const size = Math.max(2, teamSize);
  const met = metCountMap(meetings);
  const byId = new Map(participants.map((p) => [p.id, p]));

  const pairScore = (x: string, y: string) =>
    pairInsight(byId.get(x)!, byId.get(y)!, met.get(key(x, y)) ?? 0).score;
  const hasMet = (x: string, y: string) => (met.get(key(x, y)) ?? 0) > 0;

  // 라운드마다 순서를 바꿔 같은 조합이 반복되지 않게 한다.
  const pool = participants.map((p) => p.id);
  rotate(pool, roundNo);

  const remaining = new Set(pool);
  const teams: string[][] = [];

  while (remaining.size > 0) {
    if (remaining.size < size && teams.length > 0) break; // 자투리는 아래에서 합류 처리

    // 가장 제약이 심한 사람(아직 안 만난 상대가 가장 적은 사람)부터 자리를 잡는다.
    // 아무 순서로나 채우면 마지막 두 명이 "이미 만난 사이"만 남는 코너에 몰린다.
    const seed = mostConstrained(remaining, hasMet, pool);
    remaining.delete(seed);
    const team = [seed];

    while (team.length < size && remaining.size > 0) {
      let best: string | null = null;
      let bestScore = -Infinity;
      for (const cand of remaining) {
        const s = team.reduce((acc, m) => acc + pairScore(m, cand), 0);
        if (s > bestScore) {
          bestScore = s;
          best = cand;
        }
      }
      if (!best) break;
      remaining.delete(best);
      team.push(best);
    }
    teams.push(team);
  }

  // 자투리 합류 — 가장 잘 맞는 팀으로 (§3 이탈 처리와 같은 경로. 혼자 남기지 않는다)
  for (const leftover of remaining) {
    let best = 0;
    let bestScore = -Infinity;
    teams.forEach((t, i) => {
      const s = t.reduce((acc, m) => acc + pairScore(m, leftover), 0) / t.length;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    });
    if (teams.length === 0) teams.push([leftover]);
    else teams[best].push(leftover);
  }

  // 그리디가 놓친 것을 교환으로 줍는다. 팀 두 개에서 한 명씩 맞바꿔 총점이 오르면 바꾼다.
  refineBySwap(teams, pairScore);

  return teams.map((member_ids) => {
    const shared: string[] = [];
    const different: string[] = [];
    for (let i = 0; i < member_ids.length; i++) {
      for (let j = i + 1; j < member_ids.length; j++) {
        const ins = pairInsight(byId.get(member_ids[i])!, byId.get(member_ids[j])!);
        shared.push(...ins.shared);
        different.push(...ins.different);
      }
    }
    return {
      member_ids,
      shared: dedupe(shared).slice(0, 3),
      different: dedupe(different).slice(0, 3),
    };
  });
}

/** 아직 안 만난 상대가 가장 적게 남은 사람 — 얘부터 자리를 줘야 막판에 몰리지 않는다 */
function mostConstrained(
  remaining: Set<string>,
  hasMet: (a: string, b: string) => boolean,
  order: string[],
): string {
  let best = '';
  let bestFree = Infinity;
  for (const id of order) {
    if (!remaining.has(id)) continue;
    let free = 0;
    for (const other of remaining) if (other !== id && !hasMet(id, other)) free++;
    if (free < bestFree) {
      bestFree = free;
      best = id;
    }
  }
  return best || [...remaining][0];
}

function sumPairs(team: string[], score: (a: string, b: string) => number): number {
  let s = 0;
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) s += score(team[i], team[j]);
  }
  return s;
}

/**
 * 2-opt 교환. 팀 두 개에서 한 명씩 맞바꿨을 때 두 팀의 점수 합이 오르면 바꾼다.
 * 더 오를 데가 없을 때까지(최대 6번) 돈다.
 */
function refineBySwap(teams: string[][], score: (a: string, b: string) => number) {
  for (let pass = 0; pass < 6; pass++) {
    let improved = false;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        for (let a = 0; a < teams[i].length; a++) {
          for (let b = 0; b < teams[j].length; b++) {
            const before = sumPairs(teams[i], score) + sumPairs(teams[j], score);
            const ti = [...teams[i]];
            const tj = [...teams[j]];
            [ti[a], tj[b]] = [tj[b], ti[a]];
            if (sumPairs(ti, score) + sumPairs(tj, score) > before) {
              teams[i] = ti;
              teams[j] = tj;
              improved = true;
            }
          }
        }
      }
    }
    if (!improved) return;
  }
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}

function rotate<T>(arr: T[], n: number) {
  const k = arr.length ? n % arr.length : 0;
  arr.push(...arr.splice(0, k));
}

const SPOTS = [
  'A 테이블', 'B 테이블', 'C 테이블', 'D 테이블', 'E 테이블',
  'F 테이블', 'G 테이블', 'H 테이블', 'I 테이블', 'J 테이블',
];

export function spotFor(index: number): string {
  return SPOTS[index] ?? `${index + 1}번 자리`;
}
