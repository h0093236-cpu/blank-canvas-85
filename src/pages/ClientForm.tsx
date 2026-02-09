import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import StorageImage from '@/components/StorageImage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Camera, Upload } from 'lucide-react';
import { calculateCycleInterest, calculateDueDate, formatCurrency } from '@/lib/loan-calculations';

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState({
    full_name: '',
    document_type: '',
    document_number: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
    zip: '',
    pix_key: '',
    notes: '',
    contact1_name: '',
    contact1_phone: '',
    contact2_name: '',
    contact2_phone: '',
  });
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [existingSelfiePath, setExistingSelfiePath] = useState<string | null>(null);
  const [existingDocPath, setExistingDocPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Loan fields (only for new client)
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [cycleDays, setCycleDays] = useState('30');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [recipientPixKey, setRecipientPixKey] = useState('');
  const [recipientFullName, setRecipientFullName] = useState('');
  const [recipientBank, setRecipientBank] = useState('');
  const [recipientCpf, setRecipientCpf] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');

  useEffect(() => {
    if (isEdit && user) {
      supabase.from('clients').select('*').eq('id', id).eq('operator_id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setForm({
              full_name: data.full_name || '',
              document_type: data.document_type || '',
              document_number: data.document_number || '',
              street: data.street || '',
              number: data.number || '',
              district: data.district || '',
              city: data.city || '',
              state: data.state || '',
              zip: data.zip || '',
              pix_key: data.pix_key || '',
              notes: data.notes || '',
              contact1_name: (data as any).contact1_name || '',
              contact1_phone: (data as any).contact1_phone || '',
              contact2_name: (data as any).contact2_name || '',
              contact2_phone: (data as any).contact2_phone || '',
            });
            setExistingSelfiePath(data.photo_selfie_path);
            setExistingDocPath(data.photo_document_path);
          }
        });
    }
  }, [id, isEdit, user]);

  const uploadFile = async (file: File, folder: string) => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let selfiePath: string | null = null;
      let docPath: string | null = null;

      if (selfieFile) selfiePath = await uploadFile(selfieFile, 'selfies');
      if (docFile) docPath = await uploadFile(docFile, 'documents');

      const payload = {
        ...form,
        operator_id: user.id,
        ...(selfiePath ? { photo_selfie_path: selfiePath } : {}),
        ...(docPath ? { photo_document_path: docPath } : {}),
      };

      if (isEdit) {
        const { error } = await supabase.from('clients').update(payload).eq('id', id!);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Cliente atualizado.' });
        navigate(-1);
      } else {
        // Create client
        const { data: newClient, error: clientError } = await supabase.from('clients').insert([payload]).select('id').single();
        if (clientError) throw clientError;

        // Create first loan if principal is provided
        const principalNum = parseFloat(principal);
        const rateNum = parseFloat(rate);
        const cycleDaysNum = parseInt(cycleDays);

        if (principalNum > 0 && rateNum > 0) {
          if (rateNum > 20) {
            toast({ title: 'Erro', description: 'A taxa mensal não pode ultrapassar 20%.', variant: 'destructive' });
            setSubmitting(false);
            return;
          }

          let receiptPath: string | null = null;
          if (receiptFile) {
            const ext = receiptFile.name.split('.').pop();
            const path = `${user.id}/receipts/${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('receipts').upload(path, receiptFile);
            if (error) throw error;
            receiptPath = path;
          }

          const transferAt = new Date();
          const dueAt = calculateDueDate(transferAt, cycleDaysNum);
          const cycleInterest = calculateCycleInterest(principalNum, rateNum);

          const { error: loanError } = await supabase.from('loans').insert({
            operator_id: user.id,
            client_id: newClient.id,
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
          if (loanError) throw loanError;
        }

        toast({ title: 'Sucesso', description: 'Cliente e empréstimo cadastrados.' });
        navigate(-1);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Foto Selfie</Label>
              {!selfieFile && existingSelfiePath && (
                <StorageImage bucket="photos" path={existingSelfiePath} alt="Selfie atual" className="w-full h-24 object-cover mb-1" />
              )}
              <label className="flex h-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors">
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
                <div className="text-center">
                  <Camera className="mx-auto h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{selfieFile ? selfieFile.name : 'Nova selfie'}</span>
                </div>
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Foto Documento</Label>
              {!docFile && existingDocPath && (
                <StorageImage bucket="photos" path={existingDocPath} alt="Documento atual" className="w-full h-24 object-cover mb-1" />
              )}
              <label className="flex h-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                <div className="text-center">
                  <Camera className="mx-auto h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{docFile ? docFile.name : 'Novo doc'}</span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nome completo *</Label>
            <Input value={form.full_name} onChange={set('full_name')} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo doc.</Label>
              <Input placeholder="CPF, RG, CNH" value={form.document_type} onChange={set('document_type')} />
            </div>
            <div className="space-y-1">
              <Label>Nº documento</Label>
              <Input value={form.document_number} onChange={set('document_number')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Rua</Label>
              <Input value={form.street} onChange={set('street')} />
            </div>
            <div className="space-y-1">
              <Label>Nº</Label>
              <Input value={form.number} onChange={set('number')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input value={form.district} onChange={set('district')} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={set('city')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>UF</Label>
              <Input maxLength={2} value={form.state} onChange={set('state')} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>CEP</Label>
              <Input value={form.zip} onChange={set('zip')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Chave Pix</Label>
            <Input value={form.pix_key} onChange={set('pix_key')} />
          </div>

          {/* Contatos próximos */}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold mb-2">Contato próximo 1</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome completo</Label>
                <Input value={form.contact1_name} onChange={set('contact1_name')} placeholder="Nome do contato" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.contact1_phone} onChange={set('contact1_phone')} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold mb-2">Contato próximo 2</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome completo</Label>
                <Input value={form.contact2_name} onChange={set('contact2_name')} placeholder="Nome do contato" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.contact2_phone} onChange={set('contact2_phone')} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={set('notes')} rows={3} />
          </div>

          {/* Primeiro empréstimo (apenas novo cadastro) */}
          {!isEdit && (
            <div className="border-t border-border pt-4 space-y-4">
              <h2 className="text-lg font-bold">Primeiro Empréstimo</h2>

              <div className="space-y-1">
                <Label>Capital (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="1000.00" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Taxa mensal (%) <span className="text-xs text-muted-foreground">máx 20%</span></Label>
                  <Input type="number" step="0.01" min="0" max="20" placeholder="10" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Dias do ciclo</Label>
                  <Input type="number" min="1" placeholder="30" value={cycleDays} onChange={(e) => setCycleDays(e.target.value)} />
                </div>
              </div>

              {principal && rate && parseFloat(rate) <= 20 && parseFloat(principal) > 0 && (
                <div className="rounded-lg bg-accent p-3 text-sm">
                  <p className="text-accent-foreground">
                    Juros do ciclo: <strong>{formatCurrency(calculateCycleInterest(parseFloat(principal), parseFloat(rate)))}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Vencimento: {cycleDays} dias após a transferência</p>
                  <p className="text-xs text-muted-foreground">
                    Total a pagar: <strong>{formatCurrency(parseFloat(principal) + calculateCycleInterest(parseFloat(principal), parseFloat(rate)))}</strong>
                  </p>
                </div>
              )}

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
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            <Save className="mr-2 h-4 w-4" /> {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
