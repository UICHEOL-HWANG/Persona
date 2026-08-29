// §6 만드는 방법 ① AI 자동 생성.
// 호스트가 쓴 "목적 한 줄"과 이 팀의 실제 공통점·차이점을 넣어 미션을 만든다.
// 키가 없거나 호출이 실패하면 null을 돌려주고, 호출부는 템플릿으로 넘어간다(§ 데모가 죽지 않는다).

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

export interface MissionContext {
  purpose: string;
  names: string[];
  shared: string[];
  different: string[];
  roundNo: number;
  teamSize: number;
}

export function geminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
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
    ctx.shared.length ? `[이 팀의 공통점] ${ctx.shared.join(' / ')}` : '',
    ctx.different.length ? `[이 팀에서 갈리는 점] ${ctx.different.join(' / ')}` : '',
    '',
    '위 팀에게 줄 미션 하나를 만들어라. 규칙:',
    '1. 반드시 다른 팀원을 향하는 미션이어야 한다. 혼자 할 수 있는 미션은 금지.',
    '2. 5분 안에 끝낼 수 있고, 그 자리에서 앉거나 서서 할 수 있어야 한다.',
    '3. 마지막은 사진 한 장으로 인증하는 것으로 끝나야 한다.',
    '4. 위에 적힌 공통점이나 갈리는 점을 최소 하나는 미션 안에 실제로 써라.',
    '5. 술·신체 접촉·외모 평가·개인 연락처 요구는 금지.',
    '',
    'JSON만 출력해라. 형식: {"title":"12자 이내 제목","body":"2~3문장 지시문"}',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 1.0,
      },
    });
    const text = res.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as { title?: string; body?: string };
    if (!parsed.title || !parsed.body) return null;
    return { title: String(parsed.title).slice(0, 40), body: String(parsed.body).slice(0, 400) };
  } catch (err) {
    console.warn('[gemini] 미션 생성 실패, 템플릿으로 대체합니다:', (err as Error).message);
    return null;
  }
}
