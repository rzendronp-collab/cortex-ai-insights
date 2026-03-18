import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface DayData {
  date: string;
  spend: number;
  revenue: number;
}

interface Props {
  dailyData: DayData[];
  roasTarget: number;
}

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_INDEX_MAP: Record<string, number> = {
  dom: 0,
  domingo: 0,
  sun: 0,
  sunday: 0,
  seg: 1,
  segunda: 1,
  monday: 1,
  mon: 1,
  ter: 2,
  terca: 2,
  terça: 2,
  tuesday: 2,
  tue: 2,
  qua: 3,
  quarta: 3,
  wednesday: 3,
  wed: 3,
  qui: 4,
  quinta: 4,
  thursday: 4,
  thu: 4,
  sex: 5,
  sexta: 5,
  friday: 5,
  fri: 5,
  sab: 6,
  sáb: 6,
  sabado: 6,
  sábado: 6,
  saturday: 6,
  sat: 6,
};

function getDayOfWeek(value: string): number | null {
  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate.getDay();

  const normalized = String(value || '').trim().toLowerCase();
  return WEEKDAY_INDEX_MAP[normalized] ?? null;
}

export default function RoasWeekdayChart({ dailyData, roasTarget }: Props) {
  const data = useMemo(() => {
    const buckets: Record<number, { spend: number; revenue: number; count: number }> = {};
    for (let i = 0; i < 7; i++) buckets[i] = { spend: 0, revenue: 0, count: 0 };

    (dailyData ?? []).filter(Boolean).forEach((d) => {
      const dow = getDayOfWeek(d?.date);
      if (dow === null || !buckets[dow]) return;

      buckets[dow].spend += d?.spend || 0;
      buckets[dow].revenue += d?.revenue || 0;
      buckets[dow].count++;
    });

    return Object.entries(buckets).map(([dow, b]) => ({
      name: WEEKDAYS_PT[parseInt(dow, 10)],
      roas: b.spend > 0 ? b.revenue / b.spend : 0,
    }));
  }, [dailyData]);

  if (dailyData.length === 0) return null;

  return (
    <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5">
      <h3 className="text-[13px] font-semibold text-[#F0F4FF] mb-4">ROAS por Dia da Semana</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#1E2A42" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#7A8FAD', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#7A8FAD', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0E1420', border: '1px solid #2A3A5C', borderRadius: 8, fontSize: 11, color: '#F0F4FF' }}
            formatter={(value: number) => [`${value.toFixed(1)}x`, 'ROAS']}
          />
          <ReferenceLine y={roasTarget} stroke="#4F8EF7" strokeDasharray="4 4" strokeWidth={1} />
          <Bar dataKey="roas" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.roas >= roasTarget ? '#22D07A' : '#F05252'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
