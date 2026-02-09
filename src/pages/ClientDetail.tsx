import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Plus, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/loan-calculations';
import StorageImage from '@/components/StorageImage';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    Promise.all([
      supabase.from('clients').select('*').eq('id', id).eq('operator_id', user.id).single(),
      supabase.from('loans').select('*').eq('client_id', id).eq('operator_id', user.id).order('created_at', { ascending: false }),
    ]).then(([clientRes, loansRes]) => {
      setClient(clientRes.data);
      setLoans((loansRes.data as any[]) || []);
      setLoading(false);
    });
  }, [id, user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Carregando...</span></div>;
  if (!client) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Cliente não encontrado</span></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-xl font-bold truncate">{client.full_name}</h1>
          <Button variant="outline" size="icon" onClick={() => navigate(`/clients/${id}/edit`)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-3 p-4">
            {(client.photo_selfie_path || client.photo_document_path) && (
              <div className="grid grid-cols-2 gap-3">
                {client.photo_selfie_path && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Selfie</p>
                    <StorageImage bucket="photos" path={client.photo_selfie_path} alt="Selfie do cliente" className="w-full h-32 object-cover" />
                  </div>
                )}
                {client.photo_document_path && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Documento</p>
                    <StorageImage bucket="photos" path={client.photo_document_path} alt="Documento do cliente" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>
            )}
            <div className="text-sm space-y-2">
              {client.document_type && <p><span className="text-muted-foreground">{client.document_type}:</span> {client.document_number}</p>}
              {client.city && <p><span className="text-muted-foreground">Cidade:</span> {client.city}/{client.state}</p>}
              {client.street && <p><span className="text-muted-foreground">Endereço:</span> {client.street}, {client.number} - {client.district}</p>}
              {client.pix_key && <p><span className="text-muted-foreground">Pix:</span> {client.pix_key}</p>}
              {(client as any).contact1_name && (
                <p><span className="text-muted-foreground">Contato 1:</span> {(client as any).contact1_name} · {(client as any).contact1_phone}</p>
              )}
              {(client as any).contact2_name && (
                <p><span className="text-muted-foreground">Contato 2:</span> {(client as any).contact2_name} · {(client as any).contact2_phone}</p>
              )}
              {client.notes && <p><span className="text-muted-foreground">Obs:</span> {client.notes}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Empréstimos</h2>
          <Button size="sm" onClick={() => navigate(`/clients/${id}/loans/new`)}>
            <Plus className="mr-1 h-4 w-4" /> Novo
          </Button>
        </div>

        {loans.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">Nenhum empréstimo</p>
        ) : (
          <div className="space-y-2">
            {loans.map((loan) => (
              <Card
                key={loan.id}
                className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                onClick={() => navigate(`/loans/${loan.id}`)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                    <DollarSign className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{formatCurrency(Number(loan.principal_open))}</p>
                      <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                        {loan.status === 'active' ? 'Ativo' : 'Fechado'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {loan.monthly_rate_pct}% a.m. · Vence {formatDate(loan.due_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
