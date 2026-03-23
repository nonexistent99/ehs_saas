import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { HardHat, Download, Plus, Trash2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import { toast } from "sonner";

export default function EPIPage() {
  const utils = trpc.useUtils();
  const { data: rawItems = [], isLoading } = trpc.epiFicha.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();

  const [open, setOpen] = useState(false);

  const initialForm = {
    companyId: "",
    employeeName: "",
    obraId: "",
    items: [{ epiName: "", ca: "", quantity: "1", validUntil: "", reason: "" }]
  };
  const [form, setForm] = useState(initialForm);

  const companyIdNum = Number(form.companyId);
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: companyIdNum },
    { enabled: !!companyIdNum && companyIdNum > 0 }
  );

  // The list returns [{ficha: {...}, user: {...}}] — flatten for easier use
  const items = (rawItems as any[]).map(row => ({
    ...(row.ficha || row),
    employeeName: row.ficha?.employeeName || row.user?.name || row.user?.email || "—",
  }));

  const createMutation = trpc.epiFicha.create.useMutation({
    onSuccess: () => {
      toast.success("Ficha(s) de EPI criada(s)!");
      utils.epiFicha.list.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => {
    if (!id) { toast.error("ID inválido para exportar"); return; }
    window.open(`/api/export/epi/${id}`, "_blank");
  };

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { epiName: "", ca: "", quantity: "1", validUntil: "", reason: "" }]
  }));
  const removeItem = (index: number) => setForm(f => ({
    ...f, items: f.items.filter((_, i) => i !== index)
  }));
  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm(f => ({ ...f, items: newItems }));
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

      <div className="grid grid-cols-2 gap-3">
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
          <Label>Colaborador *</Label>
          <Input value={form.employeeName} onChange={e => setForm(f => ({ ...f, employeeName: e.target.value }))} placeholder="Nome do funcionário..." className="bg-secondary border-border" />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="block text-sm font-semibold">Lista de EPIs *</Label>
        {form.items.map((item, index) => (
          <div key={index} className="p-3 border border-border bg-secondary/30 rounded-md relative space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">EPI #{index + 1}</span>
              {form.items.length > 1 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:bg-destructive/10" onClick={() => removeItem(index)}>
                  <Trash2 size={12} /> Remover
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">EPI *</Label>
                <Input value={item.epiName} onChange={e => updateItem(index, 'epiName', e.target.value)} placeholder="Ex: Capacete" className="h-8 text-sm bg-secondary" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CA</Label>
                <Input value={item.ca} onChange={e => updateItem(index, 'ca', e.target.value)} placeholder="CA-12345" className="h-8 text-sm bg-secondary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Qtd *</Label>
                <Input type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} className="h-8 text-sm bg-secondary" min="1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Validade</Label>
                <Input type="date" value={item.validUntil} onChange={e => updateItem(index, 'validUntil', e.target.value)} className="h-8 text-sm bg-secondary" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Motivo / Obs</Label>
              <Input value={item.reason} onChange={e => updateItem(index, 'reason', e.target.value)} className="h-8 text-sm bg-secondary" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full gap-2 border-dashed border-2">
          <Plus size={14} /> Adicionar EPI
        </Button>
      </div>

      <Button className="w-full bg-primary text-primary-foreground mt-4" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.employeeName) { toast.error("Empresa e Colaborador são obrigatórios"); return; }
          const validItems = form.items.filter(i => i.epiName.trim() !== "");
          if (validItems.length === 0) { toast.error("Preencha ao menos um EPI"); return; }
          createMutation.mutate({
            companyId: Number(form.companyId),
            employeeName: form.employeeName,
            obraId: form.obraId ? Number(form.obraId) : undefined,
            items: validItems.map(i => ({
              epiName: i.epiName,
              ca: i.ca || undefined,
              quantity: Number(i.quantity) || 1,
              validUntil: i.validUntil || undefined,
              reason: i.reason || undefined,
            })),
          });
        }}>
        {createMutation.isPending ? "Salvando..." : "Criar Lote de EPIs"}
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
        { key: "createdAt", label: "Entregue Em", render: (i) => <span className="text-xs text-muted-foreground">{i.createdAt ? new Date(i.createdAt).toLocaleDateString("pt-BR") : "—"}</span> },
        { key: "validUntil", label: "Válido Até", render: (i) => <span className="text-xs text-muted-foreground">{i.validUntil ? new Date(i.validUntil).toLocaleDateString("pt-BR") : "—"}</span> },
      ]}
      actions={(i) => (
        <div className="flex justify-end gap-1">
          <ShareWhatsappDialog
            title={`Ficha EPI - ${i.employeeName}`}
            documentUrl={`${window.location.origin}/api/export/epi/${i.id}`}
            documentType="epi"
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
        </div>
      )}
    />
  );
}
