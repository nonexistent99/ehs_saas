import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocation, useParams } from "wouter";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarIcon, Camera, CheckCircle, ChevronDown, ChevronUp, Clock, FileText, Image, Plus, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============ Types ============
interface OccurrenceImage {
  url: string;
  caption: string;
  file?: File;
  preview?: string;
}

interface Occurrence {
  title: string;
  status: "pendente" | "atencao" | "resolvido" | "previsto";
  descricao: string;
  planoAcao: string;
  prazo: string;
  imagens: OccurrenceImage[];
}

const STATUS_CONFIG = {
  pendente:  { label: "Pendente",  color: "bg-red-500 text-white",    icon: <Clock size={12} /> },
  atencao:  { label: "Atenção",   color: "bg-yellow-600 text-white", icon: <AlertTriangle size={12} /> },
  resolvido: { label: "Resolvido", color: "bg-green-600 text-white",  icon: <CheckCircle size={12} /> },
  previsto:  { label: "Previsto",  color: "bg-blue-600 text-white",   icon: <Clock size={12} /> },
};

const emptyOccurrence = (): Occurrence => ({
  title: "", status: "pendente", descricao: "", planoAcao: "", prazo: "", imagens: [],
});

// ============ Image Upload Helper ============
async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload/image", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Falha ao fazer upload da imagem: ${res.statusText}`);
  const data = await res.json();
  return data.url;
}

// ============ Component ============
export default function InspectionForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const utils = trpc.useUtils();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [form, setForm] = useState({
    title: "",
    companyId: "",
    obraId: "",
    empreendimento: "",
    data: new Date().toLocaleDateString("pt-BR"),
    observacoes: "",
    status: "nao_iniciada" as "nao_iniciada" | "pendente" | "atencao" | "resolvida" | "concluida",
  });

  const [occurrences, setOccurrences] = useState<Occurrence[]>([emptyOccurrence()]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [uploading, setUploading] = useState(false);

  const { data: companies = [] } = trpc.companies.list.useQuery();

  // Load obras when a company is selected
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: Number(form.companyId) },
    { enabled: !!form.companyId && form.companyId !== "none" }
  );

  const { data: existing } = trpc.inspections.getById.useQuery(
    { id: Number(params.id) }, { enabled: isEditing }
  );
  const { data: existingItems = [] } = trpc.inspections.getItems.useQuery(
    { inspectionId: Number(params.id) }, { enabled: isEditing }
  );

  // Auto-fill address when obra is selected
  useEffect(() => {
    if (!form.obraId || form.obraId === "none") return;
    const obra = (obras as any[]).find((o: any) => String(o.id) === form.obraId);
    if (obra) {
      const parts = [obra.address, obra.city, obra.state].filter(Boolean);
      setForm(f => ({ ...f, empreendimento: obra.name || f.empreendimento }));
    }
  }, [form.obraId, obras]);

  // Fill form on edit
  useEffect(() => {
    if (existing) {
      const e = existing as any;
      setForm(f => ({
        ...f,
        title: e.title || "",
        companyId: e.companyId ? String(e.companyId) : "",
        obraId: e.obraId ? String(e.obraId) : "",
        data: e.inspectedAt ? new Date(e.inspectedAt).toLocaleDateString("pt-BR") : f.data,
        observacoes: e.description || "",
        status: e.status || "nao_iniciada",
      }));
    }
  }, [existing]);

  useEffect(() => {
    if (existingItems && (existingItems as any[]).length > 0) {
      setOccurrences((existingItems as any[]).map((item: any) => ({
        title: item.title || "",
        status: item.status || "pendente",
        descricao: item.situacao || "",
        planoAcao: item.planoAcao || "",
        prazo: item.observacoes || "",
        imagens: (item.mediaUrls || []).map((url: string) => ({ url, caption: "" })),
      })));
    }
  }, [existingItems]);

  // Clone logic
  const searchParams = new URLSearchParams(window.location.search);
  const cloneId = searchParams.get("clone");

  const { data: cloneData } = trpc.inspections.getById.useQuery(
    { id: Number(cloneId) }, { enabled: !!cloneId && !isEditing }
  );
  const { data: cloneItems = [] } = trpc.inspections.getItems.useQuery(
    { inspectionId: Number(cloneId) }, { enabled: !!cloneId && !isEditing }
  );

  // Fill form on clone
  useEffect(() => {
    if (cloneData && !isEditing) {
      const e = cloneData as any;
      setForm(f => ({
        ...f,
        title: (e.title || "") + " (Cópia)",
        companyId: e.companyId ? String(e.companyId) : "",
        obraId: e.obraId ? String(e.obraId) : "",
        data: new Date().toLocaleDateString("pt-BR"),
        observacoes: e.description || "",
        status: "nao_iniciada",
      }));
    }
  }, [cloneData, isEditing]);

  useEffect(() => {
    if (cloneItems && (cloneItems as any[]).length > 0 && !isEditing) {
      setOccurrences((cloneItems as any[]).map((item: any) => ({
        title: item.title || "",
        status: "pendente",
        descricao: item.situacao || "",
        planoAcao: item.planoAcao || "",
        prazo: item.observacoes || "",
        imagens: (item.mediaUrls || []).map((url: string) => ({ url, caption: "" })),
      })));
    }
  }, [cloneItems, isEditing]);

  // Checklist Import Logic
  const checklistId = searchParams.get("checklistId");
  const { data: checklistData } = trpc.checklistsV2.executions.get.useQuery(
    { id: Number(checklistId) }, { enabled: !!checklistId && !isEditing }
  );

  useEffect(() => {
    if (checklistData && !isEditing) {
      const c = checklistData.execution;
      const t = checklistData.template;
      setForm(f => ({
        ...f,
        title: `Relatório de Inspeção - ${t?.name || "Checklist"}`,
        companyId: c?.companyId ? String(c.companyId) : "",
        obraId: c?.projectId ? String(c.projectId) : "",
        data: c?.date ? new Date(c.date).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"),
        observacoes: "Relatório gerado automaticamente a partir do checklist concluído.",
        status: "nao_iniciada",
      }));

      if (checklistData.items && checklistData.items.length > 0) {
        const failedItems = checklistData.items.filter((i: any) => i.executionItem.status === "Não Conforme");
        if (failedItems.length > 0) {
          setOccurrences(failedItems.map((item: any) => ({
            title: item.templateItem.name || "Item Não Conforme",
            status: "pendente",
            descricao: item.executionItem.observation || item.templateItem.description || "Não conformidade encontrada.",
            planoAcao: "A definir",
            prazo: "Imediato",
            imagens: (item.executionItem.mediaUrls || []).map((url: string) => ({ url, caption: "Evidência do checklist" })),
          })));
        } else {
           setOccurrences([emptyOccurrence()]);
        }
      }
    }
  }, [checklistData, isEditing]);


  const createMutation = trpc.inspections.create.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório criado com sucesso!");
      utils.inspections.list.invalidate();
      navigate(`/relatorios/${data as any}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.inspections.update.useMutation({
    onSuccess: () => {
      toast.success("Relatório atualizado!");
      utils.inspections.list.invalidate();
      navigate(`/relatorios/${params.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addOccurrence = () => {
    setOccurrences(p => [...p, emptyOccurrence()]);
  };

  const removeOccurrence = (i: number) => {
    setOccurrences(p => p.filter((_, idx) => idx !== i));
    setCollapsed(p => {
      const next = { ...p };
      delete next[i];
      return next;
    });
  };

  const updateOccurrence = (i: number, field: keyof Occurrence, value: any) => {
    setOccurrences(p => p.map((o, idx) => idx === i ? { ...o, [field]: value } : o));
  };

  const handleImageSelect = async (i: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newImages: OccurrenceImage[] = [];
      for (const file of Array.from(files)) {
        const preview = URL.createObjectURL(file);
        newImages.push({ url: "", caption: "", file, preview });
      }
      setOccurrences(p => p.map((o, idx) =>
        idx === i ? { ...o, imagens: [...o.imagens, ...newImages] } : o
      ));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (occIdx: number, imgIdx: number) => {
    setOccurrences(p => p.map((o, idx) =>
      idx === occIdx ? { ...o, imagens: o.imagens.filter((_, ii) => ii !== imgIdx) } : o
    ));
  };

  const updateCaption = (occIdx: number, imgIdx: number, caption: string) => {
    setOccurrences(p => p.map((o, idx) =>
      idx === occIdx ? {
        ...o,
        imagens: o.imagens.map((img, ii) => ii === imgIdx ? { ...img, caption } : img)
      } : o
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("Título é obrigatório"); return; }
    if (!form.companyId || form.companyId === "none") { toast.error("Empresa é obrigatória"); return; }

    setUploading(true);
    try {
      // Upload any pending images
      const uploadedOccurrences = await Promise.all(occurrences.map(async (occ) => {
        const uploadedImages = await Promise.all(occ.imagens.map(async (img) => {
          if (img.file) {
            try {
              const url = await uploadImageFile(img.file);
              return { ...img, url };
            } catch {
              return img; // keep preview if upload fails
            }
          }
          return img;
        }));
        return { ...occ, imagens: uploadedImages };
      }));

      const obra = (obras as any[]).find((o: any) => String(o.id) === form.obraId);
      const obraAddress = obra ? [obra.address, obra.city, obra.state].filter(Boolean).join(", ") : "";

      const validItems = uploadedOccurrences.filter(o => o.title || o.descricao);
      const payload = {
        title: form.title,
        companyId: Number(form.companyId),
        obraId: form.obraId && form.obraId !== "none" ? Number(form.obraId) : undefined,
        description: form.observacoes || undefined,
        status: form.status,
        address: obraAddress || undefined,
        items: validItems.map(o => ({
          title: o.title,
          situacao: o.descricao,
          status: o.status,
          planoAcao: o.planoAcao,
          observacoes: o.prazo,
          mediaUrls: o.imagens.filter(img => img.url).map(img => img.url),
        })),
      };

      if (isEditing) {
        updateMutation.mutate({ id: Number(params.id), ...payload });
      } else {
        createMutation.mutate(payload);
      }
    } finally {
      setUploading(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || uploading;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? "Editar Relatório" : "Novo Relatório Técnico"}
        backHref="/relatorios"
      />
      <div className="p-6 max-w-4xl space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ===== CAPA do Relatório ===== */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <FileText size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Capa do Relatório</p>
                  <p className="text-xs text-muted-foreground">Dados que aparecerão na primeira página do PDF</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Título do Relatório *</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Inspeção de Segurança — Obra Centro"
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Empresa *</Label>
                  <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v, obraId: "" }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {(companies as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Obra / Empreendimento</Label>
                  <Select
                    value={form.obraId}
                    onValueChange={v => setForm(f => ({ ...f, obraId: v }))}
                    disabled={!form.companyId || form.companyId === "none"}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder={form.companyId && form.companyId !== "none" ? "Selecione a obra" : "Selecione a empresa primeiro"} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {(obras as any[]).map((o: any) => (
                        <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.obraId && form.obraId !== "none" && (() => {
                    const obra = (obras as any[]).find((o: any) => String(o.id) === form.obraId);
                    if (!obra) return null;
                    const addr = [obra.address, obra.city, obra.state].filter(Boolean).join(", ");
                    return addr ? (
                      <p className="text-xs text-muted-foreground mt-1">📍 {addr}</p>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-1.5">
                  <Label>Nome do Empreendimento</Label>
                  <Input
                    value={form.empreendimento}
                    onChange={e => setForm(f => ({ ...f, empreendimento: e.target.value }))}
                    placeholder="Ex: TONS FREI CANECA"
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Data da Inspeção</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary border-border h-9",
                          !form.data && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon size={14} className="mr-2 text-primary" />
                        {form.data || "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={(() => {
                          if (!form.data) return undefined;
                          const parts = form.data.split("/");
                          if (parts.length === 3) {
                            const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                            return isNaN(d.getTime()) ? undefined : d;
                          }
                          return undefined;
                        })()}
                        onSelect={(date: Date | undefined) => {
                          if (date) {
                            setForm(f => ({ ...f, data: date.toLocaleDateString("pt-BR") }));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações da Capa</Label>
                  <Textarea
                    value={form.observacoes}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Contexto e observações gerais da inspeção..."
                    className="bg-secondary border-border resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== OCORRÊNCIAS ===== */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <p className="font-semibold text-foreground text-sm">Ocorrências ({occurrences.length})</p>
                  <p className="text-xs text-muted-foreground">Cada ocorrência gerará uma página no PDF</p>
                </div>
                <Button type="button" size="sm" onClick={addOccurrence} className="bg-primary text-primary-foreground text-xs">
                  <Plus size={12} className="mr-1" />
                  Adicionar Ocorrência
                </Button>
              </div>

              {occurrences.map((occ, i) => {
                const cfg = STATUS_CONFIG[occ.status] || STATUS_CONFIG.pendente;
                const isCollapsed = collapsed[i];
                return (
                  <div key={i} className="border border-border/60 rounded-lg overflow-hidden">
                    {/* Occurrence header bar */}
                    <div
                      className="flex items-center justify-between p-3 bg-secondary/50 cursor-pointer"
                      onClick={() => setCollapsed(p => ({ ...p, [i]: !p[i] }))}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs font-semibold text-muted-foreground shrink-0">#{i + 1}</span>
                        <span className="text-sm font-medium text-foreground truncate">{occ.title || `Ocorrência ${i + 1}`}</span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {occ.imagens.length > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            <Image size={11} className="inline mr-1" />{occ.imagens.length} foto{occ.imagens.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-destructive"
                          onClick={e => { e.stopPropagation(); removeOccurrence(i); }}
                        >
                          <Trash2 size={12} />
                        </Button>
                        {isCollapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Occurrence body */}
                    {!isCollapsed && (
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs">Título da Ocorrência *</Label>
                            <Input
                              value={occ.title}
                              onChange={e => updateOccurrence(i, "title", e.target.value)}
                              placeholder="Ex: RISCO DE QUEDA DE MATERIAIS"
                              className="bg-card border-border text-sm font-medium"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Status</Label>
                            <Select value={occ.status} onValueChange={v => updateOccurrence(i, "status", v)}>
                              <SelectTrigger className="bg-card border-border text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="pendente">🔴 Pendente</SelectItem>
                                <SelectItem value="atencao">🟡 Atenção</SelectItem>
                                <SelectItem value="resolvido">🟢 Resolvido</SelectItem>
                                <SelectItem value="previsto">🔵 Previsto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Prazo de Correção</Label>
                            <Input
                              value={occ.prazo}
                              onChange={e => updateOccurrence(i, "prazo", e.target.value)}
                              placeholder="Ex: Imediato, 15/04/2025..."
                              className="bg-card border-border text-sm"
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs">Desvio Evidenciado</Label>
                            <Textarea
                              value={occ.descricao}
                              onChange={e => updateOccurrence(i, "descricao", e.target.value)}
                              placeholder="Descreva o desvio encontrado na inspeção..."
                              className="bg-card border-border resize-none text-sm"
                              rows={3}
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs">Plano de Ação</Label>
                            <Textarea
                              value={occ.planoAcao}
                              onChange={e => updateOccurrence(i, "planoAcao", e.target.value)}
                              placeholder="Descreva as ações corretivas necessárias..."
                              className="bg-card border-border resize-none text-sm"
                              rows={3}
                            />
                          </div>
                        </div>

                        {/* Image upload section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Fotos da Ocorrência</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-dashed border-primary/40 text-primary"
                                onClick={() => document.getElementById(`camera-input-${i}`)?.click()}
                              >
                                <Camera size={12} className="mr-1" /> Câmera
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-dashed border-primary/40 text-primary"
                                onClick={() => fileInputRefs.current[i]?.click()}
                              >
                                <Image size={12} className="mr-1" /> Galeria
                              </Button>
                            </div>
                            <input
                              id={`camera-input-${i}`}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              multiple
                              className="hidden"
                              onChange={e => handleImageSelect(i, e.target.files)}
                            />
                            <input
                              ref={el => { fileInputRefs.current[i] = el; }}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={e => handleImageSelect(i, e.target.files)}
                            />
                          </div>

                          {occ.imagens.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {occ.imagens.map((img, imgIdx) => (
                                <div key={imgIdx} className="space-y-1.5 group relative">
                                  <div className="relative">
                                    <img
                                      src={img.preview || img.url}
                                      alt={img.caption || `Foto ${imgIdx + 1}`}
                                      className="w-full h-28 object-cover rounded border border-border"
                                    />
                                    <button
                                      type="button"
                                      className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeImage(i, imgIdx)}
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                  <Input
                                    value={img.caption}
                                    onChange={e => updateCaption(i, imgIdx, e.target.value)}
                                    placeholder="Legenda da foto..."
                                    className="bg-card border-border text-xs h-7"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {occ.imagens.length === 0 && (
                            <div
                              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
                              onClick={() => fileInputRefs.current[i]?.click()}
                            >
                              <Image size={24} className="mx-auto mb-2 text-muted-foreground opacity-40" />
                              <p className="text-xs text-muted-foreground">Clique ou arraste fotos aqui</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add occurrence CTA */}
              <button
                type="button"
                onClick={addOccurrence}
                className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Adicionar nova ocorrência
              </button>
            </CardContent>
          </Card>

          {/* ===== Submit ===== */}
          <div className="flex justify-end gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => navigate("/relatorios")} className="border-border">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save size={14} className="mr-2" />
              {isPending ? "Salvando..." : isEditing ? "Atualizar Relatório" : "Criar Relatório"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
