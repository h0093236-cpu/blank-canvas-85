import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { formatCurrency, formatDate, calculateLateDays, calculateLateFee } from '@/lib/loan-calculations';

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('loans').select('*').eq('operator_id', user.id),
      supabase.from('clients').select('id, full_name').eq('operator_id', user.id),
      supabase.from('payments').select('*').eq('operator_id', user.id).order('paid_at', { ascending: false }),
    ]).then(([loansRes, clientsRes, paymentsRes]) => {
      setLoans((loansRes.data as any[]) || []);
      setClients((clientsRes.data as any[]) || []);
      setPayments((paymentsRes.data as any[]) || []);
      setLoading(false);
    });
  }, [user]);

  const clientMap: Record<string, string> = {};
  clients.forEach((c) => { clientMap[c.id] = c.full_name; });

  const loanClientMap: Record<string, string> = {};
  loans.forEach((l) => { loanClientMap[l.id] = l.client_id; });

  const activeLoans = loans.filter((l) => l.status === 'active');
  const lateLoans = activeLoans.filter((l) => calculateLateDays(new Date(l.due_at)) > 0);
  const onTimeLoans = activeLoans.filter((l) => calculateLateDays(new Date(l.due_at)) === 0);

  const totalCapitalOut = activeLoans.reduce((acc, l) => acc + Number(l.principal_open), 0);
  const totalInterestExpected = activeLoans.reduce((acc, l) => acc + Number(l.cycle_interest_amount), 0);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Carregando...</span></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Relatórios</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{activeLoans.length}</p>
              <p className="text-xs text-muted-foreground">Empréstimos ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{formatCurrency(totalCapitalOut)}</p>
              <p className="text-xs text-muted-foreground">Capital emprestado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{formatCurrency(totalInterestExpected)}</p>
              <p className="text-xs text-muted-foreground">Juros esperados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{lateLoans.length}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="late" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="late" className="flex-1">Atrasados</TabsTrigger>
            <TabsTrigger value="ontime" className="flex-1">Em dia</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="late" className="space-y-2 mt-3">
            {lateLoans.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum atrasado 🎉</p>
            ) : lateLoans.map((loan) => {
              const days = calculateLateDays(new Date(loan.due_at));
              const fee = calculateLateFee(Number(loan.cycle_interest_amount), days);
              return (
                <Card key={loan.id} className="cursor-pointer border-destructive/30" onClick={() => navigate(`/loans/${loan.id}`)}>
                  <CardContent className="p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{clientMap[loan.client_id] || 'Cliente'}</span>
                      <Badge className="text-xs" variant="destructive">{days} dias</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Capital: {formatCurrency(Number(loan.principal_open))} · Multa: {formatCurrency(fee)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="ontime" className="space-y-2 mt-3">
            {onTimeLoans.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum em dia</p>
            ) : onTimeLoans.map((loan) => (
              <Card key={loan.id} className="cursor-pointer" onClick={() => navigate(`/loans/${loan.id}`)}>
                <CardContent className="p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{clientMap[loan.client_id] || 'Cliente'}</span>
                    <span className="text-xs text-muted-foreground">Vence {formatDate(loan.due_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Capital: {formatCurrency(Number(loan.principal_open))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-2 mt-3">
            {payments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum pagamento</p>
            ) : payments.slice(0, 20).map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{formatCurrency(Number(p.amount))}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(p.paid_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {clientMap[loanClientMap[p.loan_id]] || 'Cliente'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
