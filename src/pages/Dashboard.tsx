import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CalendarClock, BarChart3, LogOut, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const items = [
    { label: 'Clientes', icon: Users, path: '/clients', desc: 'Gerenciar clientes' },
    { label: 'Agenda', icon: CalendarClock, path: '/agenda', desc: 'Vencimentos' },
    { label: 'Relatórios', icon: BarChart3, path: '/reports', desc: 'Análises e históricos' },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Extra Bom</h1>
              <p className="text-xs text-muted-foreground">Gestão de Empréstimos</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-3">
          {items.map((item) => (
            <Card
              key={item.path}
              className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                  <item.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
