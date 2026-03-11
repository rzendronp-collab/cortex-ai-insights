const PERIODS = [
  { label: '7d',  value: '7d'  },
  { label: '14d', value: '14d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {PERIODS.map(p => {
        const isActive = value === p.value;
        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              border: `1px solid ${isActive ? '#C7D7FD' : 'transparent'}`,
              background: isActive ? '#EFF4FF' : 'transparent',
              color: isActive ? '#2563EB' : '#9BA5B7',
              transition: 'all 150ms ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = '#F1F3F8';
                (e.currentTarget as HTMLElement).style.color = '#0F1523';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = '#9BA5B7';
              }
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
