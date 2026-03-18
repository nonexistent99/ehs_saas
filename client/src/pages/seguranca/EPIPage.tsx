import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { HardHat, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function EPIPage() {
  const utils = trpc.useUtils();
  const { data: rawItems = [], isLoading } = trpc.epiFicha.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: "", userId: "", epiName: "", ca: "", quantity: "1", deliveredAt: "", validUntil: "", reason: "" });

  // The list returns [{ficha: {...}, user: {...}}] — flatten for easier use
  const items = (rawItems as any[]).map(row => ({
    ...(row.ficha || row),
    employeeName: row.user?.name || row.user?.email || "—",
  }));

  const createMutation = trpc.epiFicha.create.useMutation({
    onSuccess: () => {
      toast.success("Ficha de EPI criada!");
      utils.epiFicha.list.invalidate();
      setOpen(false);
      setForm({ companyId: "", userId: "", epiName: "", ca: "", quantity: "1", deliveredAt: "", validUntil: "", reason: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => {
    if (!id) { toast.error("ID inválido para exportar"); return; }
    window.open(`/api/export/epi/${id}`, "_blank");
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
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            {(users as any[]).map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>EPI *</Label>
          <Input value={form.epiName} onChange={e => setForm(f => ({ ...f, epiName: e.target.value }))} placeholder="Ex: Capacete" className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Nº CA</Label>
          <Input value={form.ca} onChange={e => setForm(f => ({ ...f, ca: e.target.value }))} placeholder="CA-12345" className="bg-secondary border-border" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Quantidade</Label>
          <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Data de Entrega</Label>
          <Input type="date" value={form.deliveredAt} onChange={e => setForm(f => ({ ...f, deliveredAt: e.target.value }))} className="bg-secondary border-border" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Válido até</Label>
        <Input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className="bg-secondary border-border" />
      </div>
      <div className="space-y-1.5">
        <Label>Motivo / Observações</Label>
        <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="bg-secondary border-border" />
      </div>
      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.userId || !form.epiName) { toast.error("Empresa, colaborador e EPI são obrigatórios"); return; }
          createMutation.mutate({
            companyId: Number(form.companyId),
            userId: Number(form.userId),
            epiName: form.epiName,
            ca: form.ca || undefined,
            quantity: Number(form.quantity) || 1,
            deliveredAt: form.deliveredAt || undefined,
            validUntil: form.validUntil || undefined,
            reason: form.reason || undefined,
          });
        }}>
        {createMutation.isPending ? "Salvando..." : "Criar Ficha de EPI"}
      </Button>
    </div>
  );

  return (
    <SecurityModuleList
      title="Ficha de EPI"
      icon={<HardHat size={36} />}
      items={items}
      isLoading={isLoading}
      formContent={formContent}
      formOpen={open}
      setFormOpen={setOpen}
      columns={[
        { key: "epiName", label: "EPI", render: (i) => <span className="text-sm font-medium text-foreground">{i.epiName}</span> },
        { key: "employeeName", label: "Colaborador", render: (i) => <span className="text-sm text-muted-foreground">{i.employeeName}</span> },
        { key: "ca", label: "CA", render: (i) => <span className="text-xs font-mono text-muted-foreground">{i.ca || "—"}</span> },
        { key: "quantity", label: "Qtd", render: (i) => <span className="text-sm text-foreground">{i.quantity}</span> },
        { key: "deliveredAt", label: "Entrega", render: (i) => <span className="text-xs text-muted-foreground">{i.deliveredAt ? new Date(i.deliveredAt).toLocaleDateString("pt-BR") : "—"}</span> },
        { key: "validUntil", label: "Validade", render: (i) => <span className="text-xs text-muted-foreground">{i.validUntil ? new Date(i.validUntil).toLocaleDateString("pt-BR") : "—"}</span> },
      ]}
      actions={(i) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
            title="Exportar PDF" onClick={() => exportPdf(i.id)}>
            <Download size={13} />
          </Button>
        </div>
      )}
    />
  );
}
