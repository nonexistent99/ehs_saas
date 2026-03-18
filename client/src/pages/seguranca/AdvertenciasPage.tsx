import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { AlertOctagon, Download, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdvertenciasPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.advertencias.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: "", userId: "", type: "escrita" as any, reason: "", description: "", date: new Date().toISOString().split("T")[0] });

  const createMutation = trpc.advertencias.create.useMutation({
    onSuccess: () => {
      toast.success("Advertência registrada!");
      utils.advertencias.list.invalidate();
      setOpen(false);
      setForm({ companyId: "", userId: "", type: "escrita", reason: "", description: "", date: new Date().toISOString().split("T")[0] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => {
    window.open(`/api/export/advertencia/${id}`, "_blank");
  };

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
      <div className="space-y-1.5">
        <Label>Colaborador *</Label>
        <Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            {(users as any[]).map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="verbal">Verbal</SelectItem>
              <SelectItem value="escrita">Escrita</SelectItem>
              <SelectItem value="suspensao">Suspensão</SelectItem>
              <SelectItem value="demissao">Demissão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Motivo *</Label>
        <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Motivo da advertência" className="bg-secondary border-border" />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-secondary border-border resize-none" />
      </div>
      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.userId || !form.reason || !form.date) { toast.error("Preencha todos os campos obrigatórios"); return; }
          createMutation.mutate({ companyId: Number(form.companyId), userId: Number(form.userId), type: form.type, reason: form.reason, description: form.description || undefined, date: form.date });
        }}>
        {createMutation.isPending ? "Salvando..." : "Registrar Advertência"}
      </Button>
    </div>
  );

  return (
    <SecurityModuleList
      title="Advertências"
      icon={<AlertOctagon size={36} />}
      items={items}
      isLoading={isLoading}
      formContent={formContent}
      formOpen={open}
      setFormOpen={setOpen}
      columns={[
        { key: "reason", label: "Motivo", render: (i) => <span className="text-sm font-medium text-foreground">{i.advertencia.reason}</span> },
        { key: "type", label: "Tipo", render: (i) => {
          const colors: Record<string, string> = { verbal: "bg-blue-500/10 text-blue-400", escrita: "bg-yellow-500/10 text-yellow-400", suspensao: "bg-orange-500/10 text-orange-400", demissao: "bg-red-500/10 text-red-400" };
          return <span className={`text-xs px-2 py-1 rounded-full capitalize ${colors[i.advertencia.type] || ""}`}>{i.advertencia.type}</span>;
        }},
        { key: "date", label: "Data", render: (i) => <span className="text-xs text-muted-foreground">{i.advertencia.date ? new Date(i.advertencia.date).toLocaleDateString("pt-BR") : "—"}</span> },
      ]}
      actions={(i) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
            title="Exportar PDF" onClick={() => exportPdf(i.advertencia.id)}>
            <Download size={13} />
          </Button>
        </div>
      )}
    />
  );
}
