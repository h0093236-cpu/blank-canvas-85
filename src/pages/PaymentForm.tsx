import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Upload, AlertTriangle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  formatCurrency, calculateLateDays, calculateLateFee, applyPayment
} from '@/lib/loan-calculations';

export default function PaymentForm() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loan, setLoan] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<string>('');
  const [note, setNote] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paidAt, setPaidAt] = useState<Date>(new Date());

  useEffect(() => {
    if (!user || !loanId) return;
    supabase.from('loans').select('*').eq('id', loanId).eq('operator_id', user.id).single()
      .then(({ data }) => setLoan(data));
  }, [loanId, user]);

  if (!loan) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Carregando...</span></div>;

  const lateDays = calculateLateDays(new Date(loan.due_at));
  const cycleInterest = Number(loan.cycle_interest_amount);
  const lateFee = calculateLateFee(cycleInterest, lateDays);
  const principalOpen = Number(loan.principal_open);
  const totalDebt = lateFee + cycleInterest + principalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !type) {
      toast({ title: 'Erro', description: 'Selecione o tipo de pagamento.', variant: 'destructive' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Erro', description: 'Valor inválido.', variant: 'destructive' });
      return;
    }

    // Cap: cannot pay more than total debt
    const maxPayable = type === 'interest_only'
      ? lateFee + cycleInterest
      : totalDebt;
    if (amountNum > maxPayable + 0.01) {
      toast({ title: 'Erro', description: `Valor máximo permitido: ${formatCurrency(maxPayable)}`, variant: 'destructive' });
      return;
    }

    const breakdown = applyPayment(
      amountNum,
      lateFee,
      cycleInterest,
      principalOpen,
      type as any
    );

    setSubmitting(true);
    try {
      let receiptPath: string | null = null;
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const path = `${user.id}/receipts/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('receipts').upload(path, receiptFile);
        if (error) throw error;
        receiptPath = path;
      }

      // Insert payment
      const { error: payErr } = await supabase.from('payments').insert({
        loan_id: loanId,
        operator_id: user.id,
        amount: amountNum,
        type,
        late_fee_paid: breakdown.lateFeePaid,
        cycle_interest_paid: breakdown.cycleInterestPaid,
        principal_paid: breakdown.principalPaid,
        receipt_path: receiptPath,
        note: note || null,
        paid_at: paidAt.toISOString(),
      });
      if (payErr) throw payErr;

      // Update loan
      // Unpaid interest and late fees roll into principal
      const unpaidInterest = cycleInterest - breakdown.cycleInterestPaid;
      const unpaidLateFee = lateFee - breakdown.lateFeePaid;
      const newPrincipal = principalOpen - breakdown.principalPaid + unpaidInterest + unpaidLateFee;
      const isClosed = type === 'full_settlement' && newPrincipal <= 0.01;

      const updateData: Record<string, unknown> = {
        principal_open: Math.max(0, newPrincipal),
      };

      if (isClosed) {
        updateData.status = 'closed';
      } else {
        // Recalculate interest for next cycle based on new principal (includes rolled-over debt)
        const newCycleInterest = Math.max(0, newPrincipal) * (Number(loan.monthly_rate_pct) / 100);
        updateData.cycle_interest_amount = newCycleInterest;
        // Reset due date for next cycle using loan's cycle_days
        const loanCycleDays = (loan as any).cycle_days || 30;
        const newDue = new Date();
        newDue.setDate(newDue.getDate() + loanCycleDays);
        updateData.due_at = newDue.toISOString();
      }

      const { error: upErr } = await supabase.from('loans').update(updateData).eq('id', loanId);
      if (upErr) throw upErr;

      toast({ title: 'Sucesso', description: 'Pagamento registrado.' });
      navigate(-1);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  // Preview breakdown
  const amountNum = parseFloat(amount) || 0;
  const preview = amountNum > 0
    ? applyPayment(amountNum, lateFee, cycleInterest, principalOpen, (type as any) || 'interest_only')
    : null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Registrar Pagamento</h1>
        </div>

        <div className="rounded-lg bg-accent p-3 text-sm space-y-1">
          <p>Capital aberto: <strong>{formatCurrency(principalOpen)}</strong></p>
          <p>Juros do ciclo: <strong>{formatCurrency(cycleInterest)}</strong></p>
          {lateDays > 0 && (
            <p className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {lateDays} dias de atraso · Multa: <strong>{formatCurrency(lateFee)}</strong>
            </p>
          )}
          <div className="border-t border-border mt-2 pt-2">
            <p className="font-semibold text-base text-foreground">
              Dívida total: {formatCurrency(totalDebt)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Valor pago (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={type === 'interest_only' ? (lateFee + cycleInterest).toFixed(2) : totalDebt.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Máx: {formatCurrency(type === 'interest_only' ? lateFee + cycleInterest : totalDebt)}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Data do pagamento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paidAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(paidAt, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paidAt}
                  onSelect={(date) => date && setPaidAt(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>


          <div className="space-y-1">
            <Label>Tipo de pagamento *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interest_only">Somente juros</SelectItem>
                <SelectItem value="interest_plus_principal">Juros + parte do capital</SelectItem>
                <SelectItem value="full_settlement">Quitação total</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preview && type && (
            <div className="rounded-lg border border-border p-3 text-sm space-y-1">
              <p className="font-medium text-xs text-muted-foreground mb-1">Distribuição do pagamento:</p>
              {preview.lateFeePaid > 0 && <p>Multa: {formatCurrency(preview.lateFeePaid)}</p>}
              <p>Juros: {formatCurrency(preview.cycleInterestPaid)}</p>
              {preview.principalPaid > 0 && <p>Capital: {formatCurrency(preview.principalPaid)}</p>}
              {preview.remaining > 0 && <p className="text-warning">Troco/sobra: {formatCurrency(preview.remaining)}</p>}
            </div>
          )}

          <div className="space-y-1">
            <Label>Comprovante</Label>
            <label className="flex h-14 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {receiptFile ? receiptFile.name : 'Anexar comprovante'}
              </div>
            </label>
          </div>

          <div className="space-y-1">
            <Label>Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !type}>
            <Save className="mr-2 h-4 w-4" /> {submitting ? 'Salvando...' : 'Registrar Pagamento'}
          </Button>
        </form>
      </div>
    </div>
  );
}
