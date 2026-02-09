import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { calculateCycleInterest, calculateDueDate, formatCurrency } from '@/lib/loan-calculations';

export default function LoanForm() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [cycleDays, setCycleDays] = useState('30');
  const [guarantorId, setGuarantorId] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Recipient bank details
  const [recipientPixKey, setRecipientPixKey] = useState('');
  const [recipientFullName, setRecipientFullName] = useState('');
  const [recipientBank, setRecipientBank] = useState('');
  const [recipientCpf, setRecipientCpf] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('clients').select('id, full_name').eq('operator_id', user.id).order('full_name')
      .then(({ data }) => setClients((data as any[]) || []));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !clientId) return;

    const principalNum = parseFloat(principal);
    const rateNum = parseFloat(rate);
    const cycleDaysNum = parseInt(cycleDays);

    if (isNaN(principalNum) || principalNum <= 0) {
      toast({ title: 'Erro', description: 'Valor do capital inválido.', variant: 'destructive' });
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      toast({ title: 'Erro', description: 'Taxa inválida.', variant: 'destructive' });
      return;
    }
    if (rateNum > 20) {
      toast({ title: 'Erro', description: 'A taxa mensal não pode ultrapassar 20%.', variant: 'destructive' });
      return;
    }
    if (isNaN(cycleDaysNum) || cycleDaysNum < 1) {
      toast({ title: 'Erro', description: 'Dias do ciclo inválido.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const transferAt = new Date();
      const dueAt = calculateDueDate(transferAt, cycleDaysNum);
      const cycleInterest = calculateCycleInterest(principalNum, rateNum);

      let receiptPath: string | null = null;
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const path = `${user.id}/receipts/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('receipts').upload(path, receiptFile);
        if (error) throw error;
        receiptPath = path;
      }

      const { error } = await supabase.from('loans').insert({
        operator_id: user.id,
        client_id: clientId,
        guarantor_client_id: guarantorId || null,
        principal_initial: principalNum,
        principal_open: principalNum,
        monthly_rate_pct: rateNum,
        transfer_at: transferAt.toISOString(),
        due_at: dueAt.toISOString(),
        cycle_interest_amount: cycleInterest,
        transfer_receipt_path: receiptPath,
        cycle_days: cycleDaysNum,
        recipient_pix_key: recipientPixKey || null,
        recipient_full_name: recipientFullName || null,
        recipient_bank: recipientBank || null,
        recipient_cpf: recipientCpf || null,
        recipient_account_number: recipientAccountNumber || null,
      } as any);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Empréstimo criado.' });
      navigate(-1);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const previewInterest = principal && rate && parseFloat(rate) <= 20
    ? calculateCycleInterest(parseFloat(principal), parseFloat(rate))
    : null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Novo Empréstimo</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Capital (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="1000.00"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Taxa mensal (%) * <span className="text-xs text-muted-foreground">máx 20%</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="20"
                placeholder="10"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Dias do ciclo *</Label>
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={cycleDays}
                onChange={(e) => setCycleDays(e.target.value)}
                required
              />
            </div>
          </div>

          {previewInterest !== null && (
            <div className="rounded-lg bg-accent p-3 text-sm">
              <p className="text-accent-foreground">
                Juros do ciclo: <strong>{formatCurrency(previewInterest)}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vencimento: {cycleDays} dias após a transferência
              </p>
              {principal && rate && cycleDays && (
                <p className="text-xs text-muted-foreground">
                  Total a pagar no vencimento: <strong>{formatCurrency(parseFloat(principal) + previewInterest)}</strong>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Avalista (opcional)</Label>
            <Select value={guarantorId} onValueChange={setGuarantorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um avalista" />
              </SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.id !== clientId).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dados do recebedor */}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold mb-2">Dados da conta recebedora</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome completo do titular</Label>
                <Input value={recipientFullName} onChange={(e) => setRecipientFullName(e.target.value)} placeholder="Nome do titular da conta" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">CPF do titular</Label>
                  <Input value={recipientCpf} onChange={(e) => setRecipientCpf(e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Banco</Label>
                  <Input value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)} placeholder="Nome do banco" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nº da conta</Label>
                  <Input value={recipientAccountNumber} onChange={(e) => setRecipientAccountNumber(e.target.value)} placeholder="Número da conta" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Chave Pix</Label>
                  <Input value={recipientPixKey} onChange={(e) => setRecipientPixKey(e.target.value)} placeholder="Chave Pix" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Comprovante de transferência</Label>
            <label className="flex h-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {receiptFile ? receiptFile.name : 'Anexar comprovante'}
              </div>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            <Save className="mr-2 h-4 w-4" /> {submitting ? 'Salvando...' : 'Criar Empréstimo'}
          </Button>
        </form>
      </div>
    </div>
  );
}
