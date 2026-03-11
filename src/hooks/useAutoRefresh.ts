import { useState, useEffect, useCallback, useRef } from 'react';

type RefreshInterval = 0 | 300000 | 900000 | 1800000; // OFF | 5min | 15min | 30min

const STORAGE_KEY = 'cortex_autorefresh';

export function useAutoRefresh(onRefresh: () => void) {
  const [interval, setIntervalMs] = useState<RefreshInterval>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (parseInt(saved) as RefreshInterval) : 0;
    } catch { return 0; }
  });
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const changeInterval = useCallback((ms: RefreshInterval) => {
    setIntervalMs(ms);
    localStorage.setItem(STORAGE_KEY, ms.toString());
  }, []);

  useEffect(() => {
    // Clear existing timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (interval === 0) {
      setCountdown(0);
      return;
    }

    setCountdown(Math.floor(interval / 1000));

    timerRef.current = setInterval(() => {
      onRefresh();
      setCountdown(Math.floor(interval / 1000));
    }, interval);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [interval, onRefresh]);

  const formatCountdown = useCallback(() => {
    if (countdown === 0) return '';
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [countdown]);

  const intervalLabel = interval === 0 ? 'OFF' : interval === 300000 ? '5min' : interval === 900000 ? '15min' : '30min';

  return { interval, changeInterval, countdown: formatCountdown(), intervalLabel, isActive: interval > 0 };
}
