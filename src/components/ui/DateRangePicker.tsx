import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DateRangePickerProps {
  isActive: boolean;
  dateRange: { from: string; to: string } | null;
  onApply: (range: { from: string; to: string }) => void;
  onClear: () => void;
}

export default function DateRangePicker({ isActive, dateRange, onApply, onClear }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(dateRange?.from || '');
  const [to, setTo] = useState(dateRange?.to || '');

  const handleApply = () => {
    if (!from || !to) {
      toast.error('Selecione as duas datas');
      return;
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      toast.error('Data inicial deve ser antes da final');
      return;
    }
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      toast.error('Máximo de 90 dias de intervalo');
      return;
    }
    onApply({ from, to });
    setOpen(false);
  };

  const handleCancel = () => {
    setFrom(dateRange?.from || '');
    setTo(dateRange?.to || '');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
            isActive
              ? 'bg-data-blue text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Custom
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] bg-bg-card border-border-default p-4 space-y-3" align="end">
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full h-8 px-2 text-[12px] bg-bg-base border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-data-blue"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full h-8 px-2 text-[12px] bg-bg-base border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-data-blue"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleCancel}
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-[11px] border-border-default text-text-secondary"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            size="sm"
            className="flex-1 h-8 text-[11px] gradient-blue text-white"
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
