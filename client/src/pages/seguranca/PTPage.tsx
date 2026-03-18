import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { StatusBadge } from "@/components/StatusBadge";
import { ClipboardCheck, Download, Plus, Trash2, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Predefined risks & auto-measures ────────────────────────────────────────
const POTENTIAL_RISKS = [
  "Trabalho em Altura","Eletricidade","Espaço Confinado","Trabalho a Quente",
  "Içamento de Cargas","Agentes Químicos","Produtos Inflamáveis","Ruído Elevado",
  "Calor Excessivo","Máquinas / Equipamentos",
];

const RISK_MEASURES: Record<string, string[]> = {
  "Trabalho em Altura": ["Cinto de Segurança","Talabarte","Trava-Queda","Capacete com Jugular","Guarda-Corpo"],
  "Eletricidade": ["Luva Isolante","Bota Isolante","Óculos de Proteção","Ferramenta Isolada","Isolamento de Área"],
  "Espaço Confinado": ["Detector de Gases","Tripé de Resgate","Cinto de Segurança","Ventilação Forçada","Comunicação Contínua"],
  "Trabalho a Quente": ["Máscara de Solda","Avental Raspa","Extintor de Incêndio","Biombo de Proteção","Luva de Raspa"],
  "Içamento de Cargas": ["Área Isolada","Capacete","Sinaleiro Treinado","Inspeção dos Cabos","Carga Limitada"],
  "Agentes Químicos": ["Máscara Respiratória","Luva Nitrílica","Óculos de Segurança","Avental Químico","EPC: Ventilação"],
  "Produtos Inflamáveis": ["Extintor de CO2","Aterramento Elétrico","Proibição de Chamas","Avental Químico","Máscara de Vapores"],
  "Ruído Elevado": ["Protetor Auricular","Auricular de Concha"],
  "Calor Excessivo": ["Hidratação","Pausas Regulares","Roupa Adequada"],
  "Máquinas / Equipamentos": ["Guarda de Segurança","Lockout/Tagout","Treinamento de Operação","Capacete","EPC: Sinalização"],
};

function getAutoMeasures(selectedRisks: string[]): string[] {
  const measures = new Set<string>();
  selectedRisks.forEach(r => (RISK_MEASURES[r] || []).forEach(m => measures.add(m)));
  return Array.from(measures);
}

// ─── CheckGroup (predefined checkboxes) ──────────────────────────────────────
function CheckGroup({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt]);
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

// ─── TagList (editable pill list with add + remove) ──────────────────────────
function TagList({ label, items, onChange }: {
  label: string; items: string[]; onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) { onChange([...items, v]); setDraft(""); }
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-secondary/40 rounded-md border border-border">
        {items.map(item => (
          <span key={item} className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-xs text-primary border border-primary/20">
            {item}
            <button type="button" onClick={() => onChange(items.filter(i => i !== item))} className="hover:text-destructive ml-0.5">×</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-muted-foreground italic self-center">Nenhum item</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Digite e pressione Enter para adicionar..."
          className="bg-secondary border-border text-xs h-8 flex-1"
        />
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs border-border" onClick={add}>
          <Plus size={12} className="mr-1" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PTPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.pt.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    companyId: "", obraId: "", title: "", code: "", status: "ativo" as any,
    serviceDescription: "", startDate: "", endDate: "", issuerName: "", supervisorName: "",
  });

  // Obra data
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: Number(form.companyId) },
    { enabled: !!form.companyId }
  );
  const selectedObra = obras.find((o: any) => String(o.id) === form.obraId) as any;

  // Risk & EPI state
  const [potentialRisks, setPotentialRisks] = useState<string[]>([]);
  const [customRisks, setCustomRisks] = useState<string[]>([]);
  const [epis, setEpis] = useState<string[]>([]);
  const [team, setTeam] = useState<Array<{ name: string; role: string }>>([]);
  const [revalidations, setRevalidations] = useState<Array<{ date: string; notes: string; responsible: string }>>([]);

  // Auto-measures from selected predefined risks
  const autoMeasures = getAutoMeasures(potentialRisks);
  // Combined measures: auto + manual EPIs
  const allMeasures = Array.from(new Set([...autoMeasures, ...epis]));

  const resetForm = () => {
    setForm({ companyId: "", obraId: "", title: "", code: "", status: "ativo", serviceDescription: "", startDate: "", endDate: "", issuerName: "", supervisorName: "" });
    setPotentialRisks([]); setCustomRisks([]); setEpis([]); setTeam([]); setRevalidations([]);
  };

  const createMutation = trpc.pt.create.useMutation({
    onSuccess: () => { toast.success("PT criado!"); utils.pt.list.invalidate(); setOpen(false); resetForm(); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = trpc.pt.delete.useMutation({
    onSuccess: () => { toast.success("PT excluída!"); utils.pt.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => window.open(`/api/export/pt/${id}`, "_blank");

  const allRisks = [...potentialRisks, ...customRisks];

  const formContent = (
    <div className="space-y-4">
      {/* Empresa */}
      <div className="space-y-1.5">
        <Label>Empresa *</Label>
        <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v, obraId: "" }))}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Obra */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><MapPin size={12} /> Obra / Projeto (opcional)</Label>
        <Select
          value={form.obraId}
          onValueChange={v => setForm(f => ({ ...f, obraId: v }))}
          disabled={!form.companyId}
        >
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder={form.companyId ? "Selecione a obra..." : "Selecione a empresa primeiro"} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {obras.map((o: any) => (
              <SelectItem key={o.id} value={String(o.id)}>
                {o.name}{o.address ? ` — ${o.address}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedObra?.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin size={10} /> {selectedObra.address}{selectedObra.city ? `, ${selectedObra.city}` : ""}{selectedObra.state ? `/${selectedObra.state}` : ""}
          </p>
        )}
      </div>

      {/* Código + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="PT-001" className="bg-secondary border-border" />
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
      </div>

      {/* Título */}
      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do procedimento" className="bg-secondary border-border" />
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label>Descrição do Serviço</Label>
        <Textarea value={form.serviceDescription} onChange={e => setForm(f => ({ ...f, serviceDescription: e.target.value }))} rows={2} className="bg-secondary border-border resize-none" />
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data Início</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Data Validade</Label>
          <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Emitente (Segurança)</Label>
          <Input value={form.issuerName} onChange={e => setForm(f => ({ ...f, issuerName: e.target.value }))} placeholder="Nome do emitente" className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Responsável pela Tarefa</Label>
          <Input value={form.supervisorName} onChange={e => setForm(f => ({ ...f, supervisorName: e.target.value }))} placeholder="Nome do supervisor" className="bg-secondary border-border" />
        </div>
      </div>

      {/* 1. Riscos Potenciais - predefined checkboxes */}
      <CheckGroup label="1. Riscos Potenciais" options={POTENTIAL_RISKS} selected={potentialRisks} onChange={setPotentialRisks} />

      {/* Custom risks */}
      <TagList
        label="1b. Riscos Adicionais (personalizados)"
        items={customRisks}
        onChange={setCustomRisks}
      />

      {/* 2. EPI/EPC — auto suggestions + editable list */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. EPI / EPC e Medidas Preventivas</Label>
        {autoMeasures.length > 0 && (
          <div className="p-2 bg-green-500/10 rounded-md border border-green-500/30">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Sugeridos automaticamente pelos riscos:</p>
            <div className="flex flex-wrap gap-1.5">
              {autoMeasures.map(m => (
                <button
                  key={m} type="button"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-all ${epis.includes(m) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary hover:text-primary"}`}
                  title={epis.includes(m) ? "Remover da lista" : "Adicionar à lista"}
                  onClick={() => setEpis(prev => prev.includes(m) ? prev.filter(e => e !== m) : [...prev, m])}
                >
                  {epis.includes(m) ? "✓" : "+"} {m}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Clique nos itens para adicioná-los ou removê-los da lista final</p>
          </div>
        )}
        <TagList
          label="EPI/EPC confirmados na PT"
          items={epis}
          onChange={setEpis}
        />
      </div>

      {/* 3. Equipe */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">3. Equipe Autorizada</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border"
            onClick={() => setTeam(t => [...t, { name: "", role: "" }])}>
            <Plus size={11} className="mr-1" /> Adicionar
          </Button>
        </div>
        {team.map((t, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input placeholder="Nome" className="bg-secondary border-border text-xs h-8 flex-1"
              value={t.name} onChange={e => setTeam(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
            <Input placeholder="Função" className="bg-secondary border-border text-xs h-8 w-36"
              value={t.role} onChange={e => setTeam(prev => prev.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x))} />
            <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => setTeam(prev => prev.filter((_, idx) => idx !== i))}>
              <Trash2 size={12} />
            </Button>
          </div>
        ))}
        {team.length === 0 && <p className="text-xs text-muted-foreground italic py-1 text-center">Nenhum membro adicionado</p>}
      </div>

      {/* 4. Revalidações */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">4. Revalidações (Máx. 6)</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border"
            onClick={() => { if (revalidations.length < 6) setRevalidations(r => [...r, { date: "", notes: "", responsible: "" }]); }}>
            <Plus size={11} className="mr-1" /> Adicionar
          </Button>
        </div>
        {revalidations.map((r, i) => (
          <div key={i} className="border border-border rounded-md p-2 space-y-2 bg-secondary/30">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Revalidação #{i + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive"
                onClick={() => setRevalidations(prev => prev.filter((_, idx) => idx !== i))}>
                <Trash2 size={12} />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" className="bg-card border-border text-xs h-8" value={r.date}
                onChange={e => setRevalidations(prev => prev.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x))} />
              <Input placeholder="Responsável" className="bg-card border-border text-xs h-8" value={r.responsible}
                onChange={e => setRevalidations(prev => prev.map((x, idx) => idx === i ? { ...x, responsible: e.target.value } : x))} />
            </div>
            <Input placeholder="Observações" className="bg-card border-border text-xs h-8" value={r.notes}
              onChange={e => setRevalidations(prev => prev.map((x, idx) => idx === i ? { ...x, notes: e.target.value } : x))} />
          </div>
        ))}
        {revalidations.length === 0 && <p className="text-xs text-muted-foreground italic py-1 text-center">Nenhuma revalidação adicionada</p>}
      </div>

      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
          const structuredContent = JSON.stringify({
            serviceDescription: form.serviceDescription,
            startDate: form.startDate, endDate: form.endDate,
            issuerName: form.issuerName, supervisorName: form.supervisorName,
            potentialRisks: allRisks,
            protectiveMeasures: allMeasures,
            team, revalidations,
          });
          createMutation.mutate({
            companyId: Number(form.companyId),
            obraId: form.obraId ? Number(form.obraId) : undefined,
            title: form.title,
            code: form.code || undefined,
            status: form.status as any,
            content: structuredContent,
          });
        }}>
        {createMutation.isPending ? "Salvando..." : "Criar PT"}
      </Button>
    </div>
  );

  return (
    <SecurityModuleList
      title="PT — Permissão de Trabalho"
      icon={<ClipboardCheck size={36} />}
      items={items}
      isLoading={isLoading}
      formContent={formContent}
      formOpen={open}
      setFormOpen={setOpen}
      columns={[
        { key: "code", label: "Código", render: (i) => <span className="text-xs font-mono text-primary">{i.code || "—"}</span> },
        { key: "title", label: "Título", render: (i) => <span className="text-sm font-medium text-foreground">{i.title}</span> },
        { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
        { key: "createdAt", label: "Data", render: (i) => <span className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleDateString("pt-BR")}</span> },
      ]}
      actions={(i) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
            title="Exportar PDF" onClick={() => exportPdf(i.id)}>
            <Download size={13} />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
            title="Excluir" onClick={() => { if (confirm("Excluir esta PT?")) deleteMutation.mutate({ id: i.id }); }}>
            <Trash2 size={13} />
          </Button>
        </div>
      )}
    />
  );
}
