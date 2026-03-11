import { useState, useRef, useEffect } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { useDashboard } from '@/context/DashboardContext';
import { Bell, X, Check, AlertTriangle, AlertCircle, Info } from 'lucide-react';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

const severityConfig: Record<string, { icon: typeof AlertCircle; borderClass: string; iconClass: string }> = {
  critical: { icon: AlertCircle, borderClass: 'border-l-[#DC2626]', iconClass: 'text-[#DC2626]' },
  warning: { icon: AlertTriangle, borderClass: 'border-l-[#D97706]', iconClass: 'text-[#D97706]' },
  info: { icon: Info, borderClass: 'border-l-[#2563EB]', iconClass: 'text-[#2563EB]' },
};

export default function AlertsPanel() {
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useAlerts();
  const { setActiveTab } = useDashboard();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAlertClick = (alert: any) => {
    markAsRead(alert.id);
    setActiveTab('campaigns');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-[18px] h-[18px] text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7EF]">
            <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Marcar todas como lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                ✅ Nenhum alerta no momento
              </div>
            ) : (
              alerts.filter(a => !a.read).map(alert => {
                const sev = severityConfig[alert.severity || 'warning'] || severityConfig.warning;
                const Icon = sev.icon;
                return (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`w-full text-left px-4 py-3 border-l-4 ${sev.borderClass} hover:bg-[#E4E7EF] transition-colors border-b border-[#E4E7EF] last:border-b-0`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sev.iconClass}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-foreground truncate">{alert.title}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(alert.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                        {alert.campaign_name && (
                          <span className="text-[10px] text-primary mt-1 inline-block truncate max-w-full">{alert.campaign_name}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
