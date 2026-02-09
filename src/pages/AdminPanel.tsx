import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Shield, User, UserPlus, LogOut, KeyRound, Pencil, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ManagedUser {
  id: string;
  email: string;
  numeric_login: string;
  full_name: string;
  active: boolean;
  roles: string[];
  created_at: string;
}

export default function AdminPanel() {
  const { user, loading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editLogin, setEditLogin] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const checkAdmin = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user!.id)
      .eq('role', 'admin');
    setIsAdmin(data && data.length > 0);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?action=list`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );
    const result = await res.json();
    
    if (result.users) {
      setUsers(result.users);
    } else if (result.error) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
    setLoadingUsers(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(newLogin) || !/^\d+$/.test(newPassword)) {
      toast({ title: 'Erro', description: 'Login e senha devem conter apenas números.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Erro', description: 'Senha deve ter pelo menos 6 dígitos.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?action=create`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          numeric_login: newLogin,
          password: newPassword,
          role: newRole,
          full_name: newFullName,
        }),
      }
    );

    const result = await res.json();
    setCreating(false);

    if (result.success) {
      toast({ title: 'Sucesso', description: 'Usuário criado com sucesso!' });
      setNewFullName('');
      setNewLogin('');
      setNewPassword('');
      setNewRole('user');
      setShowCreate(false);
      fetchUsers();
    } else {
      toast({ title: 'Erro', description: result.error || 'Erro ao criar usuário', variant: 'destructive' });
    }
  };

  const toggleActive = async (userId: string, active: boolean) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?action=toggle-active`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ user_id: userId, active }),
      }
    );

    const result = await res.json();
    if (result.success) {
      toast({ title: 'Sucesso', description: `Usuário ${active ? 'ativado' : 'desativado'}.` });
      fetchUsers();
    }
  };

  const handleResetPassword = async () => {
    if (!/^\d+$/.test(resetPassword)) {
      toast({ title: 'Erro', description: 'Senha deve conter apenas números.', variant: 'destructive' });
      return;
    }
    if (resetPassword.length < 6) {
      toast({ title: 'Erro', description: 'Senha deve ter pelo menos 6 dígitos.', variant: 'destructive' });
      return;
    }

    setResetting(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?action=reset-password`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ user_id: resetUserId, new_password: resetPassword }),
      }
    );

    const result = await res.json();
    setResetting(false);

    if (result.success) {
      toast({ title: 'Sucesso', description: 'Senha redefinida com sucesso!' });
      setResetUserId(null);
      setResetPassword('');
    } else {
      toast({ title: 'Erro', description: result.error || 'Erro ao redefinir senha', variant: 'destructive' });
    }
  };

  const openEditDialog = (u: ManagedUser) => {
    setEditUser(u);
    setEditFullName(u.full_name || '');
    setEditLogin(u.numeric_login);
    setEditRole(u.roles.includes('admin') ? 'admin' : 'user');
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    if (!/^\d+$/.test(editLogin)) {
      toast({ title: 'Erro', description: 'Login deve conter apenas números.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?action=update-user`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          user_id: editUser.id,
          full_name: editFullName,
          numeric_login: editLogin,
          role: editRole,
        }),
      }
    );

    const result = await res.json();
    setSaving(false);

    if (result.success) {
      toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso!' });
      setEditUser(null);
      fetchUsers();
    } else {
      toast({ title: 'Erro', description: result.error || 'Erro ao atualizar usuário', variant: 'destructive' });
    }
  };

  const handleBackup = async (targetUser: ManagedUser) => {
    setBackingUp(targetUser.id);
    toast({ title: 'Backup', description: 'Preparando backup, aguarde...' });

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-user?user_id=${targetUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const data = await res.json();
      if (data.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        setBackingUp(null);
        return;
      }

      const userName = targetUser.full_name || targetUser.numeric_login;

      // Generate Excel
      const wb = XLSX.utils.book_new();

      if (data.clients?.length > 0) {
        const wsClients = XLSX.utils.json_to_sheet(data.clients);
        XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes');
      }

      if (data.loans?.length > 0) {
        const wsLoans = XLSX.utils.json_to_sheet(data.loans);
        XLSX.utils.book_append_sheet(wb, wsLoans, 'Empréstimos');
      }

      if (data.payments?.length > 0) {
        const wsPayments = XLSX.utils.json_to_sheet(data.payments);
        XLSX.utils.book_append_sheet(wb, wsPayments, 'Pagamentos');
      }

      if (data.profile) {
        const wsProfile = XLSX.utils.json_to_sheet([data.profile]);
        XLSX.utils.book_append_sheet(wb, wsProfile, 'Perfil');
      }

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(excelBlob, `backup_${userName}_dados.xlsx`);

      // Download and zip images
      if (data.imageUrls?.length > 0) {
        const zip = new JSZip();
        const imgFolder = zip.folder('imagens');

        for (const img of data.imageUrls) {
          try {
            const imgRes = await fetch(img.url);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const fileName = img.path.replace(/\//g, '_');
              imgFolder?.file(fileName, blob);
            }
          } catch (e) {
            console.error(`Erro ao baixar imagem ${img.path}:`, e);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `backup_${userName}_imagens.zip`);
      }

      toast({ title: 'Sucesso', description: 'Backup concluído! Verifique seus downloads.' });
    } catch (error: any) {
      console.error('Backup error:', error);
      toast({ title: 'Erro', description: 'Erro ao gerar backup.', variant: 'destructive' });
    } finally {
      setBackingUp(null);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === null) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verificando permissões...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Painel Administrativo</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Início
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Usuários</h2>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Novo Usuário
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cadastrar Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    placeholder="Ex: João da Silva"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Login (somente números)</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="Ex: 12345"
                    value={newLogin}
                    onChange={(e) => setNewLogin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha (somente números, mín. 6)</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    placeholder="Mínimo 6 dígitos"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar Usuário'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loadingUsers ? (
          <div className="text-center text-muted-foreground py-8">Carregando usuários...</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {u.roles.includes('admin') ? (
                        <Shield className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{u.full_name || u.numeric_login}</p>
                      <p className="text-xs text-muted-foreground">Login: {u.numeric_login}</p>
                      <div className="flex gap-1 mt-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'} className="text-xs">
                            {r === 'admin' ? 'Admin' : 'Usuário'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Backup"
                      disabled={backingUp === u.id}
                      onClick={() => handleBackup(u)}
                    >
                      {backingUp === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar usuário"
                      onClick={() => openEditDialog(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Redefinir senha"
                      onClick={() => { setResetUserId(u.id); setResetPassword(''); }}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <Switch
                      checked={u.active}
                      onCheckedChange={(checked) => toggleActive(u.id, checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <Dialog open={!!resetUserId} onOpenChange={(open) => { if (!open) setResetUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha (somente números, mín. 6)</Label>
              <Input
                type="password"
                inputMode="numeric"
                placeholder="Mínimo 6 dígitos"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUserId(null)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Nome completo"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Login (somente números)</Label>
              <Input
                inputMode="numeric"
                placeholder="Ex: 12345"
                value={editLogin}
                onChange={(e) => setEditLogin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
