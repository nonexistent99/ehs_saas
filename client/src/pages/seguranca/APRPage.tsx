import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertTriangle, Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MATERIALS_OPTIONS = ["Ferramentas Manuais","Furadeiras / Parafusadeira","Máquina de Solda","Esmeril","Compressor","Máquina de Corte","Betoneira","Andaime"];
const EPI_OPTIONS = ["Capacete de Segurança","Bota de Segurança","Óculos de Proteção","Luva de PVC","Luva de Látex","Cinto de Segurança","Protetor Auricular","Máscara de Pó","Colete Refletivo"];
const EPC_OPTIONS = ["Avisos, Sinalizações","Biombo","Extintores","Guarda-Corpo","Iluminação","Tapetes Antiderrapantes","Rede de Proteção"];
const CONDITION_OPTIONS = ["Falta de Avisos, Sinalizações","Falta de Treinamentos","Risco iminente","Condições Climáticas (Chuvas, Raios)","Equipamentos danificados","Área não isolada"];
const RISK_TYPES = ["Físico","Químico","Biológico","Ergonômico","Acidente","Mecânico"];

function CheckGroup({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt]);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2 p-3 bg-secondary/40 rounded-md border border-border">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-xs">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded" />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function APRPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.apr.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: "", title: "", activity: "", location: "", date: "", status: "aberta" as any, responsibleName: "" });
  const [materials, setMaterials] = useState<string[]>([]);
  const [epis, setEpis] = useState<string[]>([]);
  const [epcs, setEpcs] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [risks, setRisks] = useState<any[]>([]);

  const resetForm = () => {
    setForm({ companyId: "", title: "", activity: "", location: "", date: "", status: "aberta", responsibleName: "" });
    setMaterials([]); setEpis([]); setEpcs([]); setConditions([]); setRisks([]);
  };

  const createMutation = trpc.apr.create.useMutation({
    onSuccess: () => { toast.success("APR criada!"); utils.apr.list.invalidate(); setOpen(false); resetForm(); },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => window.open(`/api/export/apr/${id}`, "_blank");

  const addRisk = () => setRisks(r => [...r, { step: "", riskType: "", danger: "", damage: "", recommendation: "" }]);
  const updateRisk = (i: number, field: string, value: string) => setRisks(prev => prev.map((x, idx) => idx === i ? { ...x, [field]: value } : x));
  const removeRisk = (i: number) => setRisks(prev => prev.filter((_, idx) => idx !== i));
  const deleteMutation = trpc.apr.delete.useMutation({
    onSuccess: () => { toast.success("APR excluída!"); utils.apr.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
    createMutation.mutate({
      companyId: Number(form.companyId),
      title: form.title,
      activity: form.activity || undefined,
      location: form.location || undefined,
      date: form.date || undefined,
      status: form.status,
      content: { materials, epis, epcs, conditions, risks, responsibleName: form.responsibleName },
    });
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
        <Label>Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título da APR" className="bg-secondary border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Atividade</Label>
          <Input value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} placeholder="Atividade a ser realizada" className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Local</Label>
          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Input value={form.responsibleName} onChange={e => setForm(f => ({ ...f, responsibleName: e.target.value }))} placeholder="Nome do responsável" className="bg-secondary border-border" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CheckGroup label="Recursos Materiais" options={MATERIALS_OPTIONS} selected={materials} onChange={setMaterials} />
      <CheckGroup label="Equipamentos de Proteção Individual (EPI)" options={EPI_OPTIONS} selected={epis} onChange={setEpis} />
      <CheckGroup label="Equipamentos de Proteção Coletiva (EPC)" options={EPC_OPTIONS} selected={epcs} onChange={setEpcs} />
      <CheckGroup label="Condições Impeditivas para Realização" options={CONDITION_OPTIONS} selected={conditions} onChange={setConditions} />

      {/* Tabela de Riscos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Etapas da Atividade / Riscos</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border" onClick={addRisk}>
            <Plus size={11} className="mr-1" /> Adicionar Etapa
          </Button>
        </div>
        {risks.map((r, i) => (
          <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-secondary/30">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Etapa #{i + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive" onClick={() => removeRisk(i)}>
                <Trash2 size={12} />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Etapa da atividade" className="bg-card border-border text-xs h-8" value={r.step} onChange={e => updateRisk(i, "step", e.target.value)} />
              <Select value={r.riskType} onValueChange={v => updateRisk(i, "riskType", v)}>
                <SelectTrigger className="bg-card border-border text-xs h-8"><SelectValue placeholder="Tipo de risco" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {RISK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Perigo / Risco verificado" className="bg-card border-border text-xs h-8" value={r.danger} onChange={e => updateRisk(i, "danger", e.target.value)} />
              <Input placeholder="Possíveis danos" className="bg-card border-border text-xs h-8" value={r.damage} onChange={e => updateRisk(i, "damage", e.target.value)} />
            </div>
            <Textarea placeholder="Recomendações de segurança" className="bg-card border-border text-xs resize-none" rows={2} value={r.recommendation} onChange={e => updateRisk(i, "recommendation", e.target.value)} />
          </div>
        ))}
        {risks.length === 0 && <p className="text-xs text-muted-foreground italic py-1 text-center">Nenhuma etapa adicionada</p>}
      </div>

      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending} onClick={handleCreate}>
        {createMutation.isPending ? "Salvando..." : "Criar APR"}
      </Button>
    </div>
  );

  return (
    <SecurityModuleList
      title="APR — Análise Preliminar de Riscos"
      icon={<AlertTriangle size={36} />}
      items={items}
      isLoading={isLoading}
      formContent={formContent}
      formOpen={open}
      setFormOpen={setOpen}
      columns={[
        { key: "title", label: "Título", render: (i) => <span className="text-sm font-medium text-foreground">{i.title}</span> },
        { key: "activity", label: "Atividade", render: (i) => <span className="text-sm text-muted-foreground">{i.activity || "—"}</span> },
        { key: "location", label: "Local", render: (i) => <span className="text-sm text-muted-foreground">{i.location || "—"}</span> },
        { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
        { key: "date", label: "Data", render: (i) => <span className="text-xs text-muted-foreground">{i.date ? new Date(i.date).toLocaleDateString("pt-BR") : "—"}</span> },
      ]}
      actions={(i) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
            title="Exportar PDF" onClick={() => exportPdf(i.id)}>
            <Download size={13} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
            title="Excluir" onClick={() => { if(confirm("Deseja excluir esta APR?")) deleteMutation.mutate({ id: i.id }); }}>
            <Trash2 size={13} />
          </Button>
        </div>
      )}
    />
  );
}
