const PERMISSION_KEY = 'cortexads_notif_permission';

export function useNotifications() {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const requestPermission = async () => {
    if (!isSupported) return;
    if (Notification.permission === 'granted') {
      localStorage.setItem(PERMISSION_KEY, 'granted');
      return;
    }
    if (Notification.permission === 'denied') return;
    try {
      const result = await Notification.requestPermission();
      localStorage.setItem(PERMISSION_KEY, result);
    } catch {
      // Silent — no modal
    }
  };

  const notify = (title: string, body: string, icon?: string) => {
    if (!isSupported || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: icon || '/favicon.ico' });
    } catch {
      // Silent fallback
    }
  };

  return { requestPermission, notify, isSupported };
}