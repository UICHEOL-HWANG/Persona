'use client';

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return data as T;
}

const pidKey = (code: string) => `persona:pid:${code.toUpperCase()}`;

export function savePid(code: string, pid: string) {
  try {
    localStorage.setItem(pidKey(code), pid);
  } catch {
    /* 사파리 프라이빗 모드 등 — 저장이 막혀도 이번 세션은 굴러간다 */
  }
}

export function loadPid(code: string): string | null {
  try {
    return localStorage.getItem(pidKey(code));
  } catch {
    return null;
  }
}

export function clearPid(code: string) {
  try {
    localStorage.removeItem(pidKey(code));
  } catch {
    /* noop */
  }
}

/**
 * 사진을 긴 변 900px / JPEG 0.72로 줄여 data URL로 만든다.
 * 이렇게 하면 별도 스토리지 설정 없이 한 컬럼에 들어가고, 현장 3G에서도 올라간다.
 */
export function shrinkImage(file: File, maxEdge = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('사진을 여는 데 실패했습니다.'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('이미지를 처리할 수 없습니다.'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
