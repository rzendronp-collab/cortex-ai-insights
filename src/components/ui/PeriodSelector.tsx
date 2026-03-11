import { useState } from 'react';
import { Calendar } from 'lucide-react';

const PERIODS = [
  { label: '7d', value: '7d' },
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
    <div className="flex items-center gap-0.5 bg-[#080B14]/60 rounded-lg p-0.5">
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 ${
            value === p.value
              ? 'bg-[#4F8EF7]/15 text-[#4F8EF7] border border-[#4F8EF7]/30'
              : 'text-[#4A5F7A] hover:text-[#F0F4FF] hover:bg-white/[0.04]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
