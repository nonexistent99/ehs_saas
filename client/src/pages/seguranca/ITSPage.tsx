import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { FileText, Download, Trash2, Plus, X, MessageCircle } from "lucide-react";
import { useState } from "react";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import { toast } from "sonner";
import { SignatureCapture } from "@/components/SignatureCapture";

type ITSParticipantForm = {
  id: string;
  name: string;
  signatureUrl: string;
};

function createParticipant(): ITSParticipantForm {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "", signatureUrl: "" };
}

export default function ITSPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.its.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();

  const [open, setOpen] = useState(false);

  const initialForm = {
    companyId: "", obraId: "", title: "", code: "", content: "",
    theme: "", date: "", duration: "", technician: "",
    technicianSignatureUrl: "",
  };
  const [form, setForm] = useState(initialForm);
  const [participants, setParticipants] = useState<ITSParticipantForm[]>([createParticipant()]);
  const companyIdNum = Number(form.companyId);
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: companyIdNum },
    { enabled: !!companyIdNum && companyIdNum > 0 }
  );

  const resetForm = () => {
    setForm(initialForm);
    setParticipants([createParticipant()]);
  };

  const createMutation = trpc.its.create.useMutation({
    onSuccess: () => {
      toast.success("ITS criada!");
      utils.its.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.its.delete.useMutation({
    onSuccess: () => { toast.success("ITS excluída!"); utils.its.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => window.open(`/api/export/its/${id}`, "_blank");

  const addParticipant = () => setParticipants(prev => [...prev, createParticipant()]);
  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : [createParticipant()]);
  };
  const updateParticipant = (id: string, patch: Partial<ITSParticipantForm>) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
      <div className="space-y-1.5">
        <Label>Empresa *</Label>
        <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v, obraId: "" }))}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Obra (Opcional)</Label>
        <Select value={form.obraId} onValueChange={v => setForm(f => ({ ...f, obraId: v === "none" ? "" : v }))}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="none">Nenhuma</SelectItem>
            {obras.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título da instrução" className="bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <Label>Tema</Label>
        <Input value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} placeholder="Tema da instrução técnica" className="bg-secondary border-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Duração</Label>
          <Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Ex: 4h" className="bg-secondary border-border" />
        </div>
      </div>

      {/* Participants with individual signatures */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Participante(s)</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border" onClick={addParticipant}>
            <Plus size={12} className="mr-1" /> Adicionar
          </Button>
        </div>
        {participants.map((participant, index) => (
          <div key={participant.id} className="space-y-3 rounded-md border border-border bg-secondary/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Participante {index + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeParticipant(participant.id)}>
                <X size={14} />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do participante</Label>
              <Input value={participant.name} onChange={e => updateParticipant(participant.id, { name: e.target.value })} className="bg-card border-border" placeholder={`Nome do participante ${index + 1}`} />
            </div>
            <SignatureCapture
              label="Assinatura do participante"
              value={participant.signatureUrl}
              onChange={value => updateParticipant(participant.id, { signatureUrl: value })}
              description="Assinatura exibida ao lado do nome no PDF da ITS."
              height={100}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Técnico em Segurança</Label>
        <Input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} placeholder="Nome do técnico" className="bg-secondary border-border" />
      </div>

      <SignatureCapture
        label="Assinatura do Técnico/Responsável"
        value={form.technicianSignatureUrl}
        onChange={value => setForm(f => ({ ...f, technicianSignatureUrl: value }))}
        description="Assinatura exibida no campo do responsável pela ITS."
      />

      <div className="space-y-1.5">
        <Label>Conteúdo / Observações</Label>
        <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} className="bg-secondary border-border resize-none" />
      </div>

      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
          const participantList = participants
            .map(({ name, signatureUrl }) => ({ name: name.trim(), signatureUrl }))
            .filter(p => p.name);
          const structuredContent = JSON.stringify({
            theme: form.theme, date: form.date, duration: form.duration,
            participants: participantList,
            technician: form.technician,
            technicianSignatureUrl: form.technicianSignatureUrl,
            notes: form.content,
          });
          createMutation.mutate({
            companyId: Number(form.companyId),
            obraId: form.obraId ? Number(form.obraId) : undefined,
            title: form.title,
            code: form.code || undefined,
            content: structuredContent
          });
        }}>
        {createMutation.isPending ? "Salvando..." : "Criar ITS"}
      </Button>
    </div>
  );

  return (
    <SecurityModuleList
      title="ITS — Instrução Técnica de Segurança"
      icon={<FileText size={36} />}
      items={items}
      isLoading={isLoading}
      formContent={formContent}
      formOpen={open}
      setFormOpen={setOpen}
      columns={[
        { key: "title", label: "Título", render: (i) => <span className="text-sm font-medium text-foreground">{i.title}</span> },
        { key: "createdAt", label: "Data", render: (i) => <span className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleDateString("pt-BR")}</span> },
      ]}
      actions={(i) => (
        <div className="flex justify-end gap-1">
          <ShareWhatsappDialog
            title={i.title}
            documentUrl={`${window.location.origin}/api/export/its/${i.id}`}
            documentType="its"
            documentId={i.id}
            trigger={
              <Button variant="ghost" size="icon" className="w-7 h-7 text-green-500 hover:text-green-600 hover:bg-green-500/10" title="Compartilhar no WhatsApp">
                <MessageCircle size={13} />
              </Button>
            }
          />
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
            title="Exportar PDF" onClick={() => exportPdf(i.id)}>
            <Download size={13} />
          </Button>
          {deleteMutation && (
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
              title="Excluir" onClick={() => { if (confirm("Excluir esta ITS?")) deleteMutation.mutate({ id: i.id }); }}>
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      )}
    />
  );
}
