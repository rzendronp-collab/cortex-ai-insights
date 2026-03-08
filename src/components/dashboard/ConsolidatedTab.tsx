import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const accounts = [
  { name: 'Loja Demo', roas: 3.5, sales: 94, spend: 3580, revenue: 12464 },
  { name: 'Loja Secundária', roas: 2.8, sales: 45, spend: 2100, revenue: 5880 },
  { name: 'Projeto Teste', roas: 4.1, sales: 32, spend: 1200, revenue: 4920 },
];

const roasTarget = 3.0;

export default function ConsolidatedTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {accounts.map(a => (
          <div key={a.name} className="bg-card border border-border rounded-lg p-4 animate-fade-up">
            <h3 className="text-sm font-semibold text-foreground mb-3">{a.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">ROAS</p>
                <p className={`text-xl font-extrabold ${a.roas >= roasTarget ? 'text-success' : 'text-warning'}`}>{a.roas}x</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Vendas</p>
                <p className="text-xl font-extrabold text-foreground">{a.sales}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Gasto</p>
                <p className="text-sm font-bold text-foreground">R$ {(a.spend / 1000).toFixed(1)}k</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Receita</p>
                <p className="text-sm font-bold text-success">R$ {(a.revenue / 1000).toFixed(1)}k</p>
              </div>
            </div>
            {/* ROAS bar vs target */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">ROAS vs Meta ({roasTarget}x)</span>
                <span className="text-foreground font-semibold">{((a.roas / roasTarget) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${a.roas >= roasTarget ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min((a.roas / roasTarget) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">ROAS por Conta</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={accounts}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(218,25%,38%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            <ReferenceLine y={roasTarget} stroke="hsl(218,25%,38%)" strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Bar dataKey="roas" radius={[4, 4, 0, 0]}>
              {accounts.map((a, i) => {
                const fill = a.roas >= roasTarget * 1.2 ? 'hsl(152, 72%, 44%)' : a.roas >= roasTarget ? 'hsl(34, 87%, 53%)' : 'hsl(349, 83%, 62%)';
                return <Cell key={i} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
