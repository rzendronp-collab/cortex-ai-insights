import { cn } from '@/lib/utils';

interface ActionLike {
  prioridade?: number;
  valor_atual?: number;
  valor_novo?: number;
  roas_atual?: number;
  roas_estimado?: number;
  campaign_id?: string;
}

interface CampaignLike {
  id?: string;
  spend?: number;
  purchases?: number;
}

export function calculateActionConfidence(action: ActionLike, campaigns: CampaignLike[]) {
  let score = 50;

  const campaign = campaigns.find((item) => item.id === action.campaign_id);
  const spend = campaign?.spend ?? 0;
  const purchases = campaign?.purchases ?? 0;

  if (spend > 100) score += 15;
  if (spend > 500) score += 10;

  const roasCurrent = action.roas_atual ?? 0;
  const roasNext = action.roas_estimado ?? 0;
  const roasBase = Math.max(Math.abs(roasCurrent), 0.1);
  const roasDeviation = Math.abs(roasNext - roasCurrent) / roasBase * 100;
  if (roasDeviation > 50) score += 15;

  if (purchases > 10) score += 10;
  if (action.prioridade === 1) score += 10;

  return Math.min(98, score);
}

export default function CortexActionPlan({ score }: { score: number }) {
  const tone = score >= 80 ? 'emerald' : score >= 60 ? 'yellow' : 'slate';

  return (
    <span
      className={cn(
        'rounded-full border px-2 py-1 text-[10px] font-semibold',
        tone === 'emerald' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
        tone === 'yellow' && 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
        tone === 'slate' && 'border-slate-500/20 bg-slate-500/10 text-slate-400',
      )}
    >
      {score}% confiança
    </span>
  );
}
