import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react';
import {
  formatCurrency, formatDate, formatDateTime,
  calculateLateDays, calculateLateFee
} from '@/lib/loan-calculations';
import StorageImage from '@/components/StorageImage';

export default function LoanDetail() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loan, setLoan] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !loanId) return;
    const fetch = async () => {
      const { data: loanData } = await supabase.from('loans').select('*').eq('id', loanId).eq('operator_id', user.id).single();
      if (!loanData) { setLoading(false); return; }
      setLoan(loanData);

      const [paymentsRes, clientRes] = await Promise.all([
        supabase.from('payments').select('*').eq('loan_id', loanId).order('paid_at', { ascending: false }),
        supabase.from('clients').select('full_name').eq('id', loanData.client_id).single(),
      ]);
      setPayments((paymentsRes.data as any[]) || []);
      setClientName(clientRes.data?.full_name || '');

      if (loanData.guarantor_client_id) {
        const { data: g } = await supabase.from('clients').select('full_name').eq('id', loanData.guarantor_client_id).single();
        setGuarantorName(g?.full_name || '');
      }
      setLoading(false);
    };
    fetch();
  }, [loanId, user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Carregando...</span></div>;
  if (!loan) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Empréstimo não encontrado</span></div>;

  const lateDays = loan.status === 'active' ? calculateLateDays(new Date(loan.due_at)) : 0;
  const lateFee = calculateLateFee(Number(loan.cycle_interest_amount), lateDays);
  const totalDue = Number(loan.cycle_interest_amount) + lateFee;
  const totalDebt = Number(loan.principal_open) + Number(loan.cycle_interest_amount) + lateFee;
  const cycleDays = (loan as any).cycle_days || 30;

  const typeLabels: Record<string, string> = {
    interest_only: 'Somente juros',
    interest_plus_principal: 'Juros + Capital',
    full_settlement: 'Quitação total',
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Empréstimo</h1>
            <p className="text-sm text-muted-foreground">{clientName}</p>
          </div>
          <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
            {loan.status === 'active' ? 'Ativo' : 'Fechado'}
          </Badge>
        </div>

        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Capital inicial</p>
              <p className="font-semibold">{formatCurrency(Number(loan.principal_initial))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Capital aberto</p>
              <p className="font-semibold">{formatCurrency(Number(loan.principal_open))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Taxa mensal</p>
              <p className="font-semibold">{loan.monthly_rate_pct}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Juros do ciclo</p>
              <p className="font-semibold">{formatCurrency(Number(loan.cycle_interest_amount))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Ciclo</p>
              <p className="font-semibold">{cycleDays} dias</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Vencimento</p>
              <p className="font-medium">{formatDate(loan.due_at)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Transferência</p>
              <p className="font-medium">{formatDate(loan.transfer_at)}</p>
            </div>
            {guarantorName && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Avalista</p>
                <p className="font-medium">{guarantorName}</p>
              </div>
            )}
            {loan.status === 'active' && (
              <div className="col-span-2 border-t border-border pt-2">
                <p className="text-muted-foreground text-xs">Dívida total</p>
                <p className="font-bold text-lg text-primary">{formatCurrency(totalDebt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados da conta recebedora */}
        {((loan as any).recipient_full_name || (loan as any).recipient_pix_key) && (
          <Card>
            <CardContent className="p-4 text-sm space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Conta recebedora</p>
              {(loan as any).recipient_full_name && <p><span className="text-muted-foreground">Titular:</span> {(loan as any).recipient_full_name}</p>}
              {(loan as any).recipient_cpf && <p><span className="text-muted-foreground">CPF:</span> {(loan as any).recipient_cpf}</p>}
              {(loan as any).recipient_bank && <p><span className="text-muted-foreground">Banco:</span> {(loan as any).recipient_bank}</p>}
              {(loan as any).recipient_account_number && <p><span className="text-muted-foreground">Conta:</span> {(loan as any).recipient_account_number}</p>}
              {(loan as any).recipient_pix_key && <p><span className="text-muted-foreground">Pix:</span> {(loan as any).recipient_pix_key}</p>}
            </CardContent>
          </Card>
        )}

        {loan.transfer_receipt_path && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Comprovante de transferência</p>
              <StorageImage bucket="receipts" path={loan.transfer_receipt_path} alt="Comprovante de transferência" className="w-full h-48 object-cover" />
            </CardContent>
          </Card>
        )}

        {loan.status === 'active' && lateDays > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">{lateDays} dias de atraso</p>
                <p className="text-muted-foreground">
                  Multa: {formatCurrency(lateFee)} · Total devido: {formatCurrency(totalDue + Number(loan.principal_open))}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {loan.status === 'active' && (
          <Button className="w-full" onClick={() => navigate(`/loans/${loanId}/payment`)}>
            <Plus className="mr-1 h-4 w-4" /> Registrar Pagamento
          </Button>
        )}

        {payments.length > 0 && (
          <Card>
            <CardContent className="p-4 text-sm space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Resumo de pagamentos</p>
              <p>Total pago: <strong className="text-primary">{formatCurrency(payments.reduce((s, p) => s + Number(p.amount), 0))}</strong></p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Juros: {formatCurrency(payments.reduce((s, p) => s + Number(p.cycle_interest_paid), 0))}</span>
                <span>Capital: {formatCurrency(payments.reduce((s, p) => s + Number(p.principal_paid), 0))}</span>
                {payments.reduce((s, p) => s + Number(p.late_fee_paid), 0) > 0 && (
                  <span>Multas: {formatCurrency(payments.reduce((s, p) => s + Number(p.late_fee_paid), 0))}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="text-lg font-semibold">Pagamentos</h2>
        {payments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">Nenhum pagamento registrado</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{formatCurrency(Number(p.amount))}</span>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[p.type] || p.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.paid_at)}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {Number(p.late_fee_paid) > 0 && <span>Multa: {formatCurrency(Number(p.late_fee_paid))}</span>}
                    {Number(p.cycle_interest_paid) > 0 && <span>Juros: {formatCurrency(Number(p.cycle_interest_paid))}</span>}
                    {Number(p.principal_paid) > 0 && <span>Capital: {formatCurrency(Number(p.principal_paid))}</span>}
                  </div>
                  {p.note && <p className="text-xs italic">{p.note}</p>}
                  {p.receipt_path && (
                    <StorageImage bucket="receipts" path={p.receipt_path} alt="Comprovante de pagamento" className="w-full h-32 object-cover mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
