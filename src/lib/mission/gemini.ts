// §6 만드는 방법 ① AI 자동 생성.
//
// 할루시네이션 방지가 이 파일의 절반이다.
// 참가자가 낸 프로필 밖의 사실을 지어내면(없는 취향·없는 사연) 그 자리에서 신뢰가 깨진다.
// 그래서 두 겹으로 막는다.
//   ① 쓸 수 있는 사실을 화이트리스트로 통째로 주고, 그 밖은 금지한다.
//   ② 모델에게 "무엇을 썼는지"를 함께 뱉게 하고, 그게 화이트리스트에 있는지 검증한다.
//      하나라도 어긋나면 결과를 버리고 템플릿으로 넘어간다.
//
// 키가 없거나 검증에 걸리면 null 을 돌려주고, 호출부는 템플릿을 쓴다.

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

export interface MissionContext {
  purpose: string;
  names: string[];
  shared: string[];
  different: string[];
  roundNo: number;
  teamSize: number;
  /** 이 미션이 참조해도 되는 사실 전부. 팀원 프로필에서만 온다. */
  facts: string[];
  /** 이 팀이 아닌 참가자 이름 — 본문에 등장하면 결과를 버린다. */
  otherNames: string[];
}

export function geminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

// 모델이 목록의 글머리("1. ", "- ")까지 그대로 옮겨 적는 일이 잦다.
// 그걸 할루시네이션으로 오인하지 않도록 벗겨내고 비교한다.
const norm = (s: string) =>
  s
    .replace(/^\s*(?:\d+\s*[.)]|[-*•])\s*/, '')
    .replace(/\s+/g, '')
    .toLowerCase();

/** 검증 — 통과하지 못하면 이유를 남기고 null */
function validate(
  out: { title?: unknown; body?: unknown; used_facts?: unknown },
  ctx: MissionContext,
): { title: string; body: string } | null {
  const title = typeof out.title === 'string' ? out.title.trim() : '';
  const body = typeof out.body === 'string' ? out.body.trim() : '';
  if (!title || !body) return reject('제목이나 본문이 비었음');
  if (title.length > 40 || body.length > 400) return reject('길이 초과');

  // ① 참조한 사실이 전부 화이트리스트 안에 있어야 한다.
  const used = Array.isArray(out.used_facts) ? out.used_facts.map(String) : [];
  if (used.length === 0) return reject('참조한 사실을 밝히지 않음');
  const allowed = new Set(ctx.facts.map(norm));
  for (const f of used) {
    if (!allowed.has(norm(f))) return reject(`프로필에 없는 사실을 지어냄: "${f}"`);
  }

  // ② 이 팀이 아닌 사람 이름이 본문에 나오면 안 된다.
  const text = `${title} ${body}`;
  const intruder = ctx.otherNames.find((n) => n.length >= 2 && text.includes(n));
  if (intruder) return reject(`팀에 없는 사람이 등장함: "${intruder}"`);

  // ③ 팀원을 최소 한 명은 불러야 한다 — 혼자 할 수 있는 미션을 걸러낸다.
  if (!ctx.names.some((n) => text.includes(n))) return reject('팀원을 아무도 지목하지 않음');

  return { title, body };
}

function reject(reason: string): null {
  console.warn(`[gemini] 생성 결과를 버리고 템플릿을 씁니다 — ${reason}`);
  return null;
}

export async function generateMission(
  ctx: MissionContext,
): Promise<{ title: string; body: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = [
    '너는 오프라인 파티에서 처음 만난 사람들이 자연스럽게 친해지도록 미션을 설계하는 진행자다.',
    '',
    `[행사 목적] ${ctx.purpose || '처음 만난 사람들이 어색함 없이 친해지기'}`,
    `[이번 라운드] ${ctx.roundNo}라운드 · ${ctx.teamSize}인 팀`,
    `[팀원] ${ctx.names.join(', ')}`,
    '',
    '[쓸 수 있는 사실 — 이 목록이 전부다]',
    ...ctx.facts.map((f) => `  - ${f}`),
    '',
    '### 사실에 관한 절대 규칙 (어기면 결과를 버린다)',
    '1. 위 목록에 없는 사실을 만들어내지 마라. 참가자의 직업·나이·사는 곳·경험·취향 중',
    '   목록에 없는 것은 한 글자도 쓰지 마라. 추측도 금지다.',
    '2. 위 목록에서 최소 하나를 실제로 미션에 써라.',
    '3. [팀원]에 없는 이름을 쓰지 마라.',
    '',
    '### 좋은 미션의 조건',
    '4. 반드시 다른 팀원을 향해야 한다. 혼자 할 수 있는 미션은 금지.',
    '5. "사실을 확인하고 사진을 찍으세요"는 미션이 아니다. 시시하다.',
    '   해야 할 행동이 있어야 하고, 그 안에 작은 규칙이나 반전이 하나 있어야 한다.',
    '   (예: 순서를 정해 주기 · 누가 무엇을 맞히게 하기 · 제한 시간 · 역할 바꾸기 ·',
    '    한 사람만 모르게 하기 · 지면 벌칙 대신 다음 라운드에 뭘 하기)',
    '6. 위 사실은 미션의 소재로 써라. 사실 자체를 낭독시키지 마라.',
    '7. 5분 안에 끝나고, 그 자리에서 앉거나 서서 할 수 있어야 한다.',
    '8. 마지막은 사진 한 장으로 인증하는 것으로 끝나야 한다.',
    '',
    '### 목적이 미션을 정한다',
    '9. [행사 목적]이 미션의 주제와 수위를 정한다. 목적이 다르면 미션도 확실히 달라야 한다.',
    '   처음 만난 사이면 이름과 얼굴을 붙이는 쪽으로, 연애 목적이면 취향이 갈리는 지점을',
    '   드러내는 쪽으로, 사내 행사면 직급·부서를 지우는 쪽으로 기울여라.',
    '10. 술·신체 접촉·외모 평가·개인 연락처 요구는 금지.',
    '',
    '### 출력',
    'JSON만 출력해라. used_facts 에는 위 목록에서 실제로 쓴 항목을 목록에 적힌 문장 그대로 옮겨 적어라.',
    '{"title":"12자 이내 제목","body":"2~3문장 지시문","used_facts":["목록에서 그대로 옮긴 문장"]}',
  ].join('\n');

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 1.0 },
    });
    const text = res.text;
    if (!text) return reject('빈 응답');
    return validate(JSON.parse(text), ctx);
  } catch (err) {
    console.warn('[gemini] 미션 생성 실패, 템플릿으로 대체합니다:', (err as Error).message);
    return null;
  }
}
