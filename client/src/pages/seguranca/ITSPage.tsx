import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ITSPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.its.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    companyId: "", title: "", code: "", version: "1.0", status: "ativo" as any, content: "",
    theme: "", date: "", duration: "", participant: "", technician: "",
  });

  const createMutation = trpc.its.create.useMutation({
    onSuccess: () => {
      toast.success("ITS criada!");
      utils.its.list.invalidate();
      setOpen(false);
      setForm({ companyId: "", title: "", code: "", version: "1.0", status: "ativo", content: "", theme: "", date: "", duration: "", participant: "", technician: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.its.delete.useMutation({
    onSuccess: () => { toast.success("ITS excluída!"); utils.its.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => window.open(`/api/export/its/${id}`, "_blank");

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Empresa *</Label>
        <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ITS-001" className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Versão</Label>
          <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" className="bg-secondary border-border" />
        </div>
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
      <div className="space-y-1.5">
        <Label>Participante(s)</Label>
        <Input value={form.participant} onChange={e => setForm(f => ({ ...f, participant: e.target.value }))} placeholder="Nome(s) do(s) participante(s)" className="bg-secondary border-border" />
      </div>
      <div className="space-y-1.5">
        <Label>Técnico em Segurança</Label>
        <Input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} placeholder="Nome do técnico" className="bg-secondary border-border" />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="revisao">Em Revisão</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Conteúdo / Observações</Label>
        <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} className="bg-secondary border-border resize-none" />
      </div>
      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
          const structuredContent = JSON.stringify({
            theme: form.theme, date: form.date, duration: form.duration,
            participant: form.participant, technician: form.technician, notes: form.content,
          });
          createMutation.mutate({ companyId: Number(form.companyId), title: form.title, code: form.code || undefined, status: form.status as any, content: structuredContent });
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
        { key: "version", label: "Versão", render: (i) => <span className="text-sm text-muted-foreground">v{i.version}</span> },
        { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
        { key: "createdAt", label: "Data", render: (i) => <span className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleDateString("pt-BR")}</span> },
      ]}
      actions={(i) => (
        <div className="flex justify-end gap-1">
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
