import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, CalendarClock } from 'lucide-react';
import { formatCurrency, formatDate, calculateLateDays, calculateLateFee } from '@/lib/loan-calculations';

export default function Agenda() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .eq('operator_id', user.id)
        .eq('status', 'active')
        .order('due_at');

      const loansList = (loansData as any[]) || [];
      setLoans(loansList);

      // Fetch client names
      const clientIds = [...new Set(loansList.map(l => l.client_id))];
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, full_name')
          .in('id', clientIds);
        const map: Record<string, string> = {};
        (clientsData || []).forEach((c: any) => { map[c.id] = c.full_name; });
        setClientMap(map);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Agenda de Vencimentos</h1>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : loans.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Nenhum empréstimo ativo</div>
        ) : (
          <div className="space-y-2">
            {loans.map((loan) => {
              const lateDays = calculateLateDays(new Date(loan.due_at));
              const lateFee = calculateLateFee(Number(loan.cycle_interest_amount), lateDays);
              const isLate = lateDays > 0;

              return (
                <Card
                  key={loan.id}
                  className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                    isLate ? 'border-destructive/40' : ''
                  }`}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-medium text-sm">{clientMap[loan.client_id] || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          Vence: {formatDate(loan.due_at)}
                        </p>
                      </div>
                      {isLate ? (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {lateDays}d
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Em dia</Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                      <span>Capital: {formatCurrency(Number(loan.principal_open))}</span>
                      <span>Juros: {formatCurrency(Number(loan.cycle_interest_amount))}</span>
                      {isLate && <span className="text-destructive">Multa: {formatCurrency(lateFee)}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
