'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from './client';

/**
 * 2초 폴링.
 * 로테이션은 분 단위라 폴링으로 충분하고, 저장소 백엔드가 무엇이든 똑같이 동작한다.
 * 탭이 백그라운드로 가면 쉬었다가 돌아올 때 즉시 한 번 당겨온다.
 */
export function usePoll<T>(url: string | null, intervalMs = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!url) return;
    try {
      const next = await fetchJson<T>(url);
      if (alive.current) {
        setData(next);
        setError(null);
      }
    } catch (err) {
      if (alive.current) setError((err as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    alive.current = true;
    if (!url) {
      setLoading(false);
      return;
    }
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [url, intervalMs, refresh]);

  return { data, error, loading, refresh, setData };
}
