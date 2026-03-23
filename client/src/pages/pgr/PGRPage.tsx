import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Edit, Plus, Shield, Download, Trash2, Eraser, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SignatureCanvas from "react-signature-canvas";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";

function calcLevel(p: number, c: number): string {
  const r = p * c;
  if (r <= 2) return "Muito Baixo";
  if (r <= 5) return "Baixo";
  if (r <= 10) return "Médio";
  if (r <= 16) return "Alto";
  if (r <= 20) return "Severo";
  return "Extremo";
}
function riskLevelColor(level: string): string {
  const m: Record<string, string> = {
    "Muito Baixo": "bg-blue-400/20 text-blue-600 border-blue-300",
    "Baixo": "bg-green-400/20 text-green-600 border-green-300",
    "Médio": "bg-yellow-300/30 text-yellow-700 border-yellow-300",
    "Alto": "bg-red-400/20 text-red-600 border-red-300",
    "Severo": "bg-purple-400/20 text-purple-600 border-purple-300",
    "Extremo": "bg-black/80 text-white border-black",
  };
  return m[level] || "border-border";
}

// Cálculo básico do Anexo 1 NR-24 (Construção Civil e geral)
function calcNR24(workers: number) {
  if (!workers || workers <= 0) return null;
  // Vasos, Lavatórios, Mictórios: 1 para cada 20 trabalhadores (ou fração)
  const toiletsAndSinks = Math.ceil(workers / 20);
  // Chuveiros: 1 para cada 10 trabalhadores (ou fração)
  const showers = Math.ceil(workers / 10);
  return {
    toilets: toiletsAndSinks,
    sinks: toiletsAndSinks,
    urinals: toiletsAndSinks,
    showers: showers
  };
}

export default function PGRPage() {
  const utils = trpc.useUtils();
  const { data: pgrs = [], isLoading } = trpc.pgr.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [form, setForm] = useState({
    companyId: "", title: "", version: "1.0", status: "em_elaboracao" as any,
    validUntil: "", content: "", responsibleName: "", obraId: ""
  });
  
  const companyIdNum = Number(form.companyId);
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: companyIdNum },
    { enabled: !!companyIdNum && companyIdNum > 0 }
  );

  const [riskMatrix, setRiskMatrix] = useState<any[]>([]);
  const [actionPlan, setActionPlan] = useState<any[]>([]);
  
  // NR-24 state
  const [workersCount, setWorkersCount] = useState<string>("");

  // Auto-saved or Loaded signature base64
  const [savedSignature, setSavedSignature] = useState<string>("");
  const sigCanvasRef = useRef<any>(null);

  const createMutation = trpc.pgr.create.useMutation({
    onSuccess: () => {
      toast.success("PGR criado com sucesso!");
      utils.pgr.list.invalidate();
      setOpen(false);
      resetState();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.pgr.update.useMutation({
    onSuccess: () => {
      toast.success("PGR atualizado!");
      utils.pgr.list.invalidate();
      setOpen(false);
      setEditItem(null);
    },
    onError: (err: any) => toast.error(err.message),
  });
  
  const deleteMutation = trpc.pgr.delete.useMutation({
    onSuccess: () => { toast.success("PGR excluído!"); utils.pgr.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const resetState = () => {
    setForm({ companyId: "", title: "", version: "1.0", status: "em_elaboracao", validUntil: "", content: "", responsibleName: "", obraId: "" });
    setRiskMatrix([]);
    setActionPlan([]);
    setWorkersCount("");
    setSavedSignature("");
    setEditItem(null);
    if (sigCanvasRef.current) sigCanvasRef.current.clear();
  };

  const handleSubmit = () => {
    if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
    
    // Obter assinatura atual, se foi desenhado e não está vazio
    let signatureBase64 = savedSignature;
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      signatureBase64 = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
    }

    const payload = {
      companyId: Number(form.companyId),
      obraId: form.obraId && form.obraId !== "none" ? Number(form.obraId) : undefined,
      title: form.title,
      version: form.version,
      status: form.status,
      validUntil: form.validUntil ? form.validUntil : undefined,
      content: JSON.stringify({
        risks: riskMatrix,
        actionPlan: actionPlan,
        rawContent: form.content,
        responsibleName: form.responsibleName,
        nr24Workers: workersCount ? Number(workersCount) : undefined,
        signatureUrl: signatureBase64
      }),
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (pgr: any) => {
    setEditItem(pgr);
    let parsedContent = "";
    let risks = [];
    let actions = [];
    let workers = "";
    let sigBase64 = "";

    try {
      const parsed = JSON.parse(pgr.content || "{}");
      parsedContent = parsed.rawContent || "";
      risks = parsed.risks || [];
      actions = parsed.actionPlan || [];
      workers = parsed.nr24Workers ? String(parsed.nr24Workers) : "";
      sigBase64 = parsed.signatureUrl || "";
    } catch {
      parsedContent = pgr.content || "";
    }
    
    setForm({
      companyId: String(pgr.companyId),
      obraId: pgr.obraId ? String(pgr.obraId) : "none",
      title: pgr.title,
      version: pgr.version || "1.0",
      status: pgr.status,
      validUntil: pgr.validUntil ? new Date(pgr.validUntil).toISOString().split("T")[0] : "",
      content: parsedContent,
      responsibleName: pgr.responsibleName || "",
    });
    setRiskMatrix(risks);
    setActionPlan(actions);
    setWorkersCount(workers);
    setSavedSignature(sigBase64);
    setTimeout(() => { if (sigCanvasRef.current) sigCanvasRef.current.clear(); }, 100);
    setOpen(true);
  };

  const exportPdf = (id: number) => {
    window.open(`/api/export/pgr/${id}`, "_blank");
  };

  const nr24Specs = calcNR24(Number(workersCount));

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="PGR — Programa de Gestão de Riscos"
        subtitle="Gerenciamento e rastreamento de conformidade"
        actions={
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetState(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={resetState}>
                <Plus size={14} className="mr-2" /> Novo PGR
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editItem ? "Editar PGR" : "Novo PGR"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Empresa *</Label>
                  <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v, obraId: "none" }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {companies.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Obra</Label>
                    <Select disabled={!form.companyId} value={form.obraId} onValueChange={v => setForm(f => ({ ...f, obraId: v }))}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione a obra (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="none">Nenhuma / Geral</SelectItem>
                        {obras.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Título *</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Título do PGR" className="bg-secondary border-border" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 hidden">
                    {/* Versão escondida do grid principal, mantida lógica de default "1.0" no backend */}
                    <Label>Versão</Label>
                    <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                      placeholder="1.0" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Responsável Técnico</Label>
                    <Input value={form.responsibleName} onChange={e => setForm(f => ({ ...f, responsibleName: e.target.value }))}
                      placeholder="Nome do responsável" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                        <SelectItem value="vigente">Vigente</SelectItem>
                        <SelectItem value="revisao">Em Revisão</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Válido até</Label>
                  <Input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="bg-secondary border-border" />
                </div>
                
                <div className="space-y-1.5">
                  <Label>Observações gerais</Label>
                  <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Observações do PGR..." className="bg-secondary border-border resize-none" rows={2} />
                </div>

                {/* ─── Cálculo NR-24 ─── */}
                <div className="p-3 bg-secondary/50 border border-border rounded-md space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    Cálculo de Instalações NR-24
                  </Label>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="space-y-1.5" style={{ minWidth: "200px" }}>
                      <Label className="text-xs text-muted-foreground">Número de Trabalhadores</Label>
                      <Input type="number" min={1} placeholder="Ex: 45" value={workersCount} onChange={(e) => setWorkersCount(e.target.value)} className="h-8 bg-card border-border" />
                    </div>
                    {nr24Specs && (
                      <div className="flex gap-2 flex-wrap text-xs bg-primary/10 text-primary p-2 border border-primary/20 rounded">
                        <span>🚽 Vasos: <b>{nr24Specs.toilets}</b></span>
                        <span className="opacity-50">|</span>
                        <span>💦 Lavatórios: <b>{nr24Specs.sinks}</b></span>
                        <span className="opacity-50">|</span>
                        <span>🚹 Mictórios: <b>{nr24Specs.urinals}</b></span>
                        <span className="opacity-50">|</span>
                        <span>🚿 Chuveiros: <b>{nr24Specs.showers}</b></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Matriz de Riscos ─── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">1. Matriz de Riscos</Label>
                    <Button type="button" size="sm" variant="outline" className="border-border text-xs h-7"
                      onClick={() => setRiskMatrix(r => [...r, { agent: "", type: "", source: "", healthEffect: "", probability: "", severity: "", riskLevel: "" }])}>
                      <Plus size={11} className="mr-1" /> Adicionar Risco
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">P = Probabilidade (1–5) | C = Consequência (1–5) | Nível = P × C</p>
                  {riskMatrix.map((r, i) => (
                    <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-secondary/30">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-muted-foreground">Risco #{i + 1}</span>
                        <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive"
                          onClick={() => setRiskMatrix(prev => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Agente de risco" className="bg-card border-border text-xs h-8"
                          value={r.agent} onChange={e => setRiskMatrix(prev => prev.map((x, idx) => idx === i ? { ...x, agent: e.target.value } : x))} />
                        <Input placeholder="Tipo (físico, químico...)" className="bg-card border-border text-xs h-8"
                          value={r.type} onChange={e => setRiskMatrix(prev => prev.map((x, idx) => idx === i ? { ...x, type: e.target.value } : x))} />
                        <Input placeholder="Fonte geradora" className="bg-card border-border text-xs h-8"
                          value={r.source} onChange={e => setRiskMatrix(prev => prev.map((x, idx) => idx === i ? { ...x, source: e.target.value } : x))} />
                        <Input placeholder="Possíveis danos à saúde" className="bg-card border-border text-xs h-8"
                          value={r.healthEffect} onChange={e => setRiskMatrix(prev => prev.map((x, idx) => idx === i ? { ...x, healthEffect: e.target.value } : x))} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">P (1–5)</Label>
                          <Input type="number" min={1} max={5} className="bg-card border-border text-xs h-8"
                            value={r.probability} onChange={e => {
                              const p = Number(e.target.value); const c = Number(r.severity);
                              setRiskMatrix(prev => prev.map((x, idx) => idx === i ? { ...x, probability: e.target.value, riskLevel: calcLevel(p, c) } : x));
                            }} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">C (1–5)</Label>
                          <Input type="number" min={1} max={5} className="bg-card border-border text-xs h-8"
                            value={r.severity} onChange={e => {
                              const c = Number(e.target.value); const p = Number(r.probability);
                              setRiskMatrix(prev => prev.map((x, idx) => idx === i ? { ...x, severity: e.target.value, riskLevel: calcLevel(p, c) } : x));
                            }} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Nível de Risco</Label>
                          <div className={`h-8 flex items-center justify-center rounded border text-xs font-bold ${riskLevelColor(r.riskLevel)}`}>
                            {r.riskLevel || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {riskMatrix.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-1 text-center">Nenhum risco adicionado</p>
                  )}
                </div>

                {/* ─── Plano de Ação ─── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">2. Plano de Ação (ESPM)</Label>
                    <Button type="button" size="sm" variant="outline" className="border-border text-xs h-7"
                      onClick={() => setActionPlan(a => [...a, { riskRef: "", action: "", deadline: "", status: "pendente" }])}>
                      <Plus size={11} className="mr-1" /> Adicionar Ação
                    </Button>
                  </div>
                  {actionPlan.map((a, i) => (
                    <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-secondary/30">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-muted-foreground">Ação #{i + 1}</span>
                        <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive"
                          onClick={() => setActionPlan(prev => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      <Input placeholder="Risco referência" className="bg-card border-border text-xs h-8"
                        value={a.riskRef} onChange={e => setActionPlan(prev => prev.map((x, idx) => idx === i ? { ...x, riskRef: e.target.value } : x))} />
                      <Textarea placeholder="Ação proposta (controle)" className="bg-card border-border text-xs resize-none" rows={2}
                        value={a.action} onChange={e => setActionPlan(prev => prev.map((x, idx) => idx === i ? { ...x, action: e.target.value } : x))} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Prazo</Label>
                          <Input type="date" className="bg-card border-border text-xs h-8"
                            value={a.deadline} onChange={e => setActionPlan(prev => prev.map((x, idx) => idx === i ? { ...x, deadline: e.target.value } : x))} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Select value={a.status} onValueChange={v => setActionPlan(prev => prev.map((x, idx) => idx === i ? { ...x, status: v } : x))}>
                            <SelectTrigger className="bg-card border-border text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {actionPlan.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-1 text-center">Nenhuma ação adicionada</p>
                  )}
                </div>

                {/* ─── Assinatura do Responsável Técnico ─── */}
                <div className="space-y-2 p-3 bg-secondary/30 rounded-md border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                       Assinatura do Responsável Técnico
                    </Label>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-border"
                      onClick={() => { if(sigCanvasRef.current) sigCanvasRef.current.clear(); setSavedSignature(""); }}>
                      <Eraser size={11} className="mr-1" /> Limpar
                    </Button>
                  </div>
                  
                  {savedSignature ? (
                    <div className="bg-white rounded border border-border relative h-32 flex justify-center items-center">
                      <img src={savedSignature} alt="Assinatura" className="max-h-full" />
                      <Button variant="outline" size="sm" className="absolute top-2 right-2 h-6 text-[10px]" 
                         onClick={() => { setSavedSignature(""); setTimeout(() => { if(sigCanvasRef.current) sigCanvasRef.current.clear(); }, 100); }}>
                        Refazer
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white rounded border border-border touch-none" style={{ height: "150px" }}>
                       <SignatureCanvas 
                          ref={sigCanvasRef}
                          penColor="black"
                          canvasProps={{ className: "w-full h-full" }} 
                       />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground leading-tight text-center">
                    Assine de forma legível dentro da caixa acima. Esta assinatura integrará o relatório de PGR.
                  </p>
                </div>

                <Button className="w-full bg-primary text-primary-foreground" onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editItem ? "Atualizar" : "Criar PGR"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card rounded-lg animate-pulse" />)}</div>
        ) : pgrs.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Shield size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Nenhum PGR cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pgrs.map((pgr: any) => (
              <Card key={pgr.id} className="bg-card border-border hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2" style={{ maxWidth: 'calc(100% - 100px)' }}>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield size={15} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">{pgr.title}</p>
                        {pgr.obraId && (
                           <p className="text-xs text-muted-foreground truncate">{obras.find((o:any) => o.id === pgr.obraId)?.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <ShareWhatsappDialog
                        title={pgr.title}
                        documentUrl={`${window.location.origin}/api/export/pgr/${pgr.id}`}
                        documentType="pgr"
                        documentId={pgr.id}
                        trigger={
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-green-500 hover:text-green-600 hover:bg-green-500/10" title="Compartilhar no WhatsApp">
                            <MessageCircle size={13} />
                          </Button>
                        }
                      />
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        title="Exportar PDF" onClick={() => exportPdf(pgr.id)}>
                        <Download size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        title="Editar" onClick={() => openEdit(pgr)}>
                        <Edit size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        title="Excluir" onClick={() => { if(confirm("Deseja excluir este PGR?")) deleteMutation.mutate({ id: pgr.id }); }}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <StatusBadge status={pgr.status} />
                    {pgr.responsibleName && (
                      <p className="text-xs text-muted-foreground mt-2">👤 {pgr.responsibleName}</p>
                    )}
                    {pgr.validUntil && (
                      <p className="text-xs text-muted-foreground">
                        📅 Válido até {new Date(pgr.validUntil).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
