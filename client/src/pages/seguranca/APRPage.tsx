import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertTriangle, Download, Plus, Trash2, Search, MessageCircle, Edit, Eraser } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import SignatureCanvas from "react-signature-canvas";

const MATERIALS_OPTIONS = ["Ferramentas Manuais","Furadeiras / Parafusadeira","Máquina de Solda","Esmeril","Compressor","Máquina de Corte","Betoneira","Andaime"];
const EPI_OPTIONS = ["Capacete de Segurança","Bota de Segurança","Óculos de Proteção","Luva de PVC","Luva de Látex","Cinto de Segurança","Protetor Auricular","Máscara de Pó","Colete Refletivo"];
const EPC_OPTIONS = ["Avisos, Sinalizações","Biombo","Extintores","Guarda-Corpo","Iluminação","Tapetes Antiderrapantes","Rede de Proteção"];
const CONDITION_OPTIONS = ["Falta de Avisos, Sinalizações","Falta de Treinamentos","Risco iminente","Condições Climáticas (Chuvas, Raios)","Equipamentos danificados","Área não isolada"];
const RISK_TYPES = ["Físico","Químico","Biológico","Ergonômico","Acidente","Mecânico"];

function normalizeTextItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(item => String(item ?? "").trim()).filter(Boolean)));
  }

  if (typeof value === "string") {
    return Array.from(new Set(value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean)));
  }

  return [];
}

function TagList({ label, items, onChange, placeholder }: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setDraft("");
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-card rounded-md border border-border">
        {items.map(item => (
          <span key={item} className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-xs text-primary border border-primary/20">
            {item}
            <button
              type="button"
              aria-label={`Remover ${item}`}
              onClick={() => onChange(items.filter(i => i !== item))}
              className="ml-0.5 hover:text-destructive"
            >
              x
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-muted-foreground italic self-center">Nenhum item</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="bg-card border-border text-xs h-8 flex-1"
        />
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs border-border" onClick={add}>
          <Plus size={12} className="mr-1" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function CheckGroup({
  label,
  options,
  selected,
  onChange,
  otherItems,
  onOtherItemsChange,
  otherPlaceholder = "Descreva outros itens",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  otherItems?: string[];
  onOtherItemsChange?: (value: string[]) => void;
  otherPlaceholder?: string;
}) {
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt]);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="space-y-3 p-3 bg-secondary/40 rounded-md border border-border">
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-xs">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded" />
              {opt}
            </label>
          ))}
        </div>
        {onOtherItemsChange && (
          <TagList
            label="Outros"
            items={otherItems || []}
            onChange={onOtherItemsChange}
            placeholder={otherPlaceholder}
          />
        )}
      </div>
    </div>
  );
}

function SignatureField({
  label,
  savedSignature,
  setSavedSignature,
  canvasRef,
}: {
  label: string;
  savedSignature: string;
  setSavedSignature: (value: string) => void;
  canvasRef: RefObject<SignatureCanvas | null>;
}) {
  const clearSignature = () => {
    canvasRef.current?.clear();
    setSavedSignature("");
  };

  return (
    <div className="space-y-2 p-3 bg-secondary/30 rounded-md border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{label}</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border" onClick={clearSignature}>
          <Eraser size={11} className="mr-1" /> Limpar
        </Button>
      </div>

      {savedSignature ? (
        <div className="bg-white rounded border border-border relative h-32 flex justify-center items-center">
          <img src={savedSignature} alt={label} className="max-h-full object-contain" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 h-6 text-[10px]"
            onClick={clearSignature}
          >
            Refazer
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded border border-border touch-none" style={{ height: "150px" }}>
          <SignatureCanvas
            ref={canvasRef}
            penColor="black"
            canvasProps={{ className: "w-full h-full" }}
          />
        </div>
      )}
    </div>
  );
}

export default function APRPage() {
  const utils = trpc.useUtils();
  
  // Filters State
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterTitle, setFilterTitle] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  
  const { data: items = [], isLoading } = trpc.apr.list.useQuery({
    companyId: filterCompany !== "all" ? Number(filterCompany) : undefined,
    search: filterTitle || undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    date: filterDate || undefined,
  });
  
  const { data: companies = [] } = trpc.companies.list.useQuery();
  
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ companyId: "", title: "", activity: "", obraId: "", date: "", status: "aberta" as any, responsibleName: "" });
  const [materials, setMaterials] = useState<string[]>([]);
  const [epis, setEpis] = useState<string[]>([]);
  const [epcs, setEpcs] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [otherMaterials, setOtherMaterials] = useState<string[]>([]);
  const [otherEpis, setOtherEpis] = useState<string[]>([]);
  const [otherEpcs, setOtherEpcs] = useState<string[]>([]);
  const [otherConditions, setOtherConditions] = useState<string[]>([]);
  const [technicianSignatureUrl, setTechnicianSignatureUrl] = useState("");
  const [companySignatureUrl, setCompanySignatureUrl] = useState("");
  const technicianSignatureRef = useRef<SignatureCanvas>(null);
  const companySignatureRef = useRef<SignatureCanvas>(null);
  const [risks, setRisks] = useState<any[]>([]);

  const companyIdNum = Number(form.companyId);
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: companyIdNum },
    { enabled: !!companyIdNum && companyIdNum > 0 }
  );

  const resetForm = () => {
    setForm({ companyId: "", title: "", activity: "", obraId: "", date: "", status: "aberta", responsibleName: "" });
    setMaterials([]); setEpis([]); setEpcs([]); setConditions([]); setRisks([]);
    setOtherMaterials([]); setOtherEpis([]); setOtherEpcs([]); setOtherConditions([]);
    setTechnicianSignatureUrl(""); setCompanySignatureUrl(""); setEditItem(null);
    technicianSignatureRef.current?.clear();
    companySignatureRef.current?.clear();
  };

  const createMutation = trpc.apr.create.useMutation({
    onSuccess: () => { toast.success("APR criada!"); utils.apr.list.invalidate(); setOpen(false); resetForm(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.apr.update.useMutation({
    onSuccess: () => { toast.success("APR atualizada!"); utils.apr.list.invalidate(); setOpen(false); resetForm(); },
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

  const getDrawnSignature = (ref: RefObject<SignatureCanvas | null>, currentValue: string) => {
    if (ref.current && !ref.current.isEmpty()) {
      return ref.current.toDataURL("image/png");
    }
    return currentValue;
  };

  const getAprContent = (item: any) => {
    if (!item?.content) return {};
    if (typeof item.content === "string") {
      try { return JSON.parse(item.content); } catch { return {}; }
    }
    return item.content as Record<string, any>;
  };

  const handleSubmit = () => {
    if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
    const content = {
      materials,
      epis,
      epcs,
      conditions,
      otherMaterials,
      otherEpis,
      otherEpcs,
      otherConditions,
      risks,
      responsibleName: form.responsibleName,
      technicianSignatureUrl: getDrawnSignature(technicianSignatureRef, technicianSignatureUrl),
      companySignatureUrl: getDrawnSignature(companySignatureRef, companySignatureUrl),
    };

    const payload = {
      companyId: Number(form.companyId),
      obraId: form.obraId ? Number(form.obraId) : undefined,
      title: form.title,
      activity: form.activity || undefined,
      date: form.date || undefined,
      status: form.status,
      content,
    };

    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (item: any) => {
    const content = getAprContent(item);
    setEditItem(item);
    setForm({
      companyId: item.companyId ? String(item.companyId) : "",
      title: item.title || "",
      activity: item.activity || "",
      obraId: item.obraId ? String(item.obraId) : "",
      date: item.date ? String(item.date).slice(0, 10) : "",
      status: item.status || "aberta",
      responsibleName: content.responsibleName || "",
    });
    setMaterials(Array.isArray(content.materials) ? content.materials : []);
    setEpis(Array.isArray(content.epis) ? content.epis : []);
    setEpcs(Array.isArray(content.epcs) ? content.epcs : []);
    setConditions(Array.isArray(content.conditions) ? content.conditions : []);
    setOtherMaterials(normalizeTextItems(content.otherMaterials));
    setOtherEpis(normalizeTextItems(content.otherEpis));
    setOtherEpcs(normalizeTextItems(content.otherEpcs));
    setOtherConditions(normalizeTextItems(content.otherConditions));
    setRisks(Array.isArray(content.risks) ? content.risks : []);
    setTechnicianSignatureUrl(content.technicianSignatureUrl || content.responsibleSignatureUrl || content.signatureUrl || "");
    setCompanySignatureUrl(content.companySignatureUrl || content.companyRepresentativeSignatureUrl || "");
    setOpen(true);
    setTimeout(() => {
      technicianSignatureRef.current?.clear();
      companySignatureRef.current?.clear();
    }, 100);
  };

  const formContent = (
    <div className="space-y-4">
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
        <Label>Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título da APR" className="bg-secondary border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Atividade</Label>
          <Input value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} placeholder="Atividade a ser realizada" className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Obra</Label>
          <Select value={form.obraId} onValueChange={v => setForm(f => ({ ...f, obraId: v === "none" ? "" : v }))}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="none">Nenhuma</SelectItem>
              {obras.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
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

      <CheckGroup
        label="Recursos Materiais"
        options={MATERIALS_OPTIONS}
        selected={materials}
        onChange={setMaterials}
        otherItems={otherMaterials}
        onOtherItemsChange={setOtherMaterials}
        otherPlaceholder="Ex: martelete, linha de vida temporária"
      />
      <CheckGroup
        label="Equipamentos de Proteção Individual (EPI)"
        options={EPI_OPTIONS}
        selected={epis}
        onChange={setEpis}
        otherItems={otherEpis}
        onOtherItemsChange={setOtherEpis}
        otherPlaceholder="Ex: respirador semifacial, perneira"
      />
      <CheckGroup
        label="Equipamentos de Proteção Coletiva (EPC)"
        options={EPC_OPTIONS}
        selected={epcs}
        onChange={setEpcs}
        otherItems={otherEpcs}
        onOtherItemsChange={setOtherEpcs}
        otherPlaceholder="Ex: linha de vida, bandeja de proteção"
      />
      <CheckGroup
        label="Condições Impeditivas para Realização"
        options={CONDITION_OPTIONS}
        selected={conditions}
        onChange={setConditions}
        otherItems={otherConditions}
        onOtherItemsChange={setOtherConditions}
        otherPlaceholder="Ex: vento forte, iluminação insuficiente"
      />

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

      <SignatureField
        label="Assinatura do Técnico/Engenheiro de Segurança"
        savedSignature={technicianSignatureUrl}
        setSavedSignature={setTechnicianSignatureUrl}
        canvasRef={technicianSignatureRef}
      />
      <SignatureField
        label="Assinatura do Representante da Empresa"
        savedSignature={companySignatureUrl}
        setSavedSignature={setCompanySignatureUrl}
        canvasRef={companySignatureRef}
      />

      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
        {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editItem ? "Atualizar APR" : "Criar APR"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters Menu */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card rounded-md border border-border">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pesquisar Título</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Digite o título..." 
              value={filterTitle} 
              onChange={e => setFilterTitle(e.target.value)} 
              className="pl-8 bg-secondary h-9 text-sm" 
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Filtrar por Empresa</Label>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="bg-secondary h-9 text-sm">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {companies.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-secondary h-9 text-sm">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input 
            type="date"
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
            className="bg-secondary h-9 text-sm" 
          />
        </div>
      </div>

      <SecurityModuleList
        title="APR — Análise Preliminar de Riscos"
        icon={<AlertTriangle size={36} />}
        items={items}
        isLoading={isLoading}
        formContent={formContent}
        onOpenForm={resetForm}
        formOpen={open}
        setFormOpen={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
        columns={[
          { key: "title", label: "Título", render: (i) => <span className="text-sm font-medium text-foreground">{i.title}</span> },
          { key: "activity", label: "Atividade", render: (i) => <span className="text-sm text-muted-foreground">{i.activity || "—"}</span> },
          { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
          { key: "date", label: "Data", render: (i) => <span className="text-xs text-muted-foreground">{i.date ? new Date(i.date).toLocaleDateString("pt-BR") : "—"}</span> },
        ]}
        actions={(i) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
              title="Editar" onClick={() => openEdit(i)}>
              <Edit size={13} />
            </Button>
            <ShareWhatsappDialog
              title={i.title}
              documentUrl={`${window.location.origin}/api/export/apr/${i.id}`}
              documentType="apr"
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
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
              title="Excluir" onClick={() => { if(confirm("Deseja excluir esta APR?")) deleteMutation.mutate({ id: i.id }); }}>
              <Trash2 size={13} />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
