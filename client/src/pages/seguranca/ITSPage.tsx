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

export default function ITSPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.its.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();

  const [open, setOpen] = useState(false);
  
  const initialForm = {
    companyId: "", obraId: "", title: "", code: "", content: "",
    theme: "", date: "", duration: "", technician: "",
    participants: [""],
  };
  const [form, setForm] = useState(initialForm);
  const companyIdNum = Number(form.companyId);
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: companyIdNum },
    { enabled: !!companyIdNum && companyIdNum > 0 }
  );

  const createMutation = trpc.its.create.useMutation({
    onSuccess: () => {
      toast.success("ITS criada!");
      utils.its.list.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.its.delete.useMutation({
    onSuccess: () => { toast.success("ITS excluída!"); utils.its.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => window.open(`/api/export/its/${id}`, "_blank");

  // Dynamic Participants
  const addParticipant = () => setForm(f => ({ ...f, participants: [...f.participants, ""] }));
  const removeParticipant = (index: number) => setForm(f => ({ ...f, participants: f.participants.filter((_, i) => i !== index) }));
  const updateParticipant = (index: number, val: string) => {
    const newP = [...form.participants];
    newP[index] = val;
    setForm(f => ({ ...f, participants: newP }));
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
        <Label>Código</Label>
        <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ITS-001" className="bg-secondary border-border" />
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

      <div className="space-y-2">
        <Label>Participante(s)</Label>
        {form.participants.map((participant, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input 
              value={participant} 
              onChange={e => updateParticipant(i, e.target.value)} 
              placeholder={`Nome do participante ${i + 1}`} 
              className="bg-secondary border-border flex-1" 
            />
            {form.participants.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeParticipant(i)}>
                <X size={16} />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addParticipant} className="gap-1.5 mt-1 border-dashed">
          <Plus size={14} /> Adicionar outro
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label>Técnico em Segurança</Label>
        <Input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} placeholder="Nome do técnico" className="bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <Label>Conteúdo / Observações</Label>
        <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} className="bg-secondary border-border resize-none" />
      </div>
      
      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
          const validParticipants = form.participants.map(p => p.trim()).filter(Boolean);
          const structuredContent = JSON.stringify({
            theme: form.theme, date: form.date, duration: form.duration,
            participants: validParticipants, technician: form.technician, notes: form.content,
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
        { key: "code", label: "Código", render: (i) => <span className="text-xs font-mono text-primary">{i.code || "—"}</span> },
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
