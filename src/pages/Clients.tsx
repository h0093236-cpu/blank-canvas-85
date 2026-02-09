import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Search, User } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  document_number: string | null;
  city: string | null;
  status: string;
}

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, document_number, city, status')
        .eq('operator_id', user.id)
        .order('full_name');
      setClients((data as Client[]) || []);
      setLoading(false);
    };
    fetchClients();
  }, [user]);

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Clientes</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => navigate('/clients/new')}>
            <Plus className="mr-1 h-4 w-4" /> Novo
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                    <User className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{client.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.city || 'Sem cidade'} · {client.document_number || 'Sem documento'}
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
