import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, LogIn, Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type LoginMode = 'select' | 'user' | 'admin';

export default function Auth() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<LoginMode>('select');
  const [numericLogin, setNumericLogin] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (user) return <Navigate to="/" replace />;

  const isNumeric = (v: string) => /^\d+$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNumeric(numericLogin)) {
      toast({ title: 'Erro', description: 'O login deve conter apenas números.', variant: 'destructive' });
      return;
    }
    if (!isNumeric(password)) {
      toast({ title: 'Erro', description: 'A senha deve conter apenas números.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 dígitos.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const result = await signIn(numericLogin, password);
    
    if (result.error) {
      setSubmitting(false);
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      return;
    }

    // Check role after login
    const { data: { user: loggedUser } } = await supabase.auth.getUser();
    if (loggedUser) {
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', loggedUser.id);
      const userRoles = roles?.map(r => r.role) || [];

      if (mode === 'admin') {
        if (!userRoles.includes('admin')) {
          await supabase.auth.signOut();
          setSubmitting(false);
          toast({ title: 'Erro', description: 'Esta conta não tem permissão de administrador.', variant: 'destructive' });
          return;
        }
        setSubmitting(false);
        navigate('/admin');
        return;
      }
    }

    setSubmitting(false);
  };

  if (mode === 'select') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm animate-fade-in shadow-lg">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <DollarSign className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Extra Bom</CardTitle>
            <CardDescription>Selecione o tipo de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full h-14 text-lg"
              variant="default"
              onClick={() => setMode('user')}
            >
              <User className="mr-2 h-5 w-5" />
              USUÁRIO
            </Button>
            <Button
              className="w-full h-14 text-lg"
              variant="outline"
              onClick={() => setMode('admin')}
            >
              <Shield className="mr-2 h-5 w-5" />
              ADMINISTRADOR
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm animate-fade-in shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            {mode === 'admin' ? (
              <Shield className="h-7 w-7 text-primary-foreground" />
            ) : (
              <DollarSign className="h-7 w-7 text-primary-foreground" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === 'admin' ? 'Administrador' : 'Extra Bom'}
          </CardTitle>
          <CardDescription>Acesse sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Login (somente números)</Label>
              <Input
                id="login"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex: 12345"
                value={numericLogin}
                onChange={(e) => setNumericLogin(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha (somente números)</Label>
              <Input
                id="password"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Mínimo 6 dígitos"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Aguarde...' : (
                <><LogIn className="mr-2 h-4 w-4" /> Entrar</>
              )}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMode('select')}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
