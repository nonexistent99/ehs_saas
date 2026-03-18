import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useLocation, useParams } from "wouter";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Check, Save, Camera, X, Eraser, Image as ImageIcon, Building2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SignatureCanvas from "react-signature-canvas";
import { useSignatureCanvas } from "@/hooks/useSignatureCanvas";

interface ItemImage {
  url: string;
  file?: File;
  preview?: string;
}

// Helper to upload image exactly matching existing form pattern
async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload/image", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Falha ao fazer upload: ${res.statusText}`);
  const data = await res.json();
  return data.url;
}

export default function ChecklistExecutionForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const executionId = params.id ? Number(params.id) : undefined;
  
  const utils = trpc.useUtils();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const sigCanvas = useSignatureCanvas();

  const [startForm, setStartForm] = useState({
    templateId: "",
    companyId: "",
    projectId: "",
    date: new Date().toISOString().split('T')[0]
  });

  const { data: companies = [] } = trpc.companies.list.useQuery();
  const { data: templates = [] } = trpc.checklistsV2.templates.list.useQuery();
  const { data: obras = [] } = trpc.companies.getObras.useQuery(
    { companyId: Number(startForm.companyId) },
    { enabled: !!startForm.companyId }
  );
  const selectedObra = obras.find((o: any) => String(o.id) === startForm.projectId);
  
  const { data: executionData, isLoading: isLoadingExecution } = trpc.checklistsV2.executions.get.useQuery(
    { id: executionId! },
    { enabled: isEditing }
  );

  const startMutation = trpc.checklistsV2.executions.createFromTemplate.useMutation({
    onSuccess: (res: any) => {
      toast.success("Inspeção iniciada!");
      utils.checklistsV2.executions.list.invalidate();
      navigate(`/checklists/realizados/${res.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const completeMutation = trpc.checklistsV2.executions.concluir.useMutation({
    onSuccess: () => {
      toast.success("Checklist concluído com sucesso!");
      utils.checklistsV2.executions.list.invalidate();
      navigate("/checklists/realizados");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startForm.templateId || !startForm.companyId) {
      toast.error("Selecione Empresa e Modelo");
      return;
    }
    startMutation.mutate({
      templateId: Number(startForm.templateId),
      companyId: Number(startForm.companyId),
      projectId: startForm.projectId ? Number(startForm.projectId) : undefined,
      date: startForm.date
    });
  };

  const [localItems, setLocalItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (executionData?.items) {
      setLocalItems(executionData.items.map((i: any) => ({
        id: i.executionItem.id,
        status: i.executionItem.status || "N/A",
        observation: i.executionItem.observation || "",
        name: i.templateItem.name,
        description: i.templateItem.description,
        norma: i.templateItem.norma,
        imagens: (i.executionItem.mediaUrls || []).map((url: string) => ({ url, preview: url })) // Load existing images
      })));
    }
  }, [executionData]);

  const handleItemChange = (id: number, field: string, value: any) => {
    setLocalItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleImageSelect = async (id: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const newImages: ItemImage[] = [];
      for (const file of Array.from(files)) {
        const preview = URL.createObjectURL(file);
        newImages.push({ url: "", file, preview });
      }
      setLocalItems(prev => prev.map(item => 
        item.id === id ? { ...item, imagens: [...(item.imagens || []), ...newImages] } : item
      ));
    } catch {
      toast.error("Erro ao carregar imagens");
    }
  };

  const removeImage = (itemId: number, imgIdx: number) => {
    setLocalItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, imagens: item.imagens.filter((_: any, ii: number) => ii !== imgIdx) } : item
    ));
  };

  const handleSaveAndComplete = async () => {
    setUploading(true);
    try {
      // Get base64 signature
      let signatureBase64 = undefined;
      if (!sigCanvas.isEmpty()) {
        signatureBase64 = sigCanvas.toDataURL();
      }

      // Upload Images
      const uploadedItems = await Promise.all(localItems.map(async (item) => {
        const uploadedImages = await Promise.all((item.imagens || []).map(async (img: ItemImage) => {
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
        return { ...item, imagens: uploadedImages };
      }));

      const itemsToUpdate = uploadedItems.map(item => ({
        id: item.id,
        status: item.status,
        observation: item.observation,
        mediaUrls: item.imagens.filter((img: ItemImage) => img.url).map((img: ItemImage) => img.url),
      }));

      await completeMutation.mutateAsync({ 
        id: executionId!,
        signatureUrl: signatureBase64,
        items: itemsToUpdate
      });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  if (isEditing && isLoadingExecution) {
    return <div className="p-8 text-center animate-pulse">Carregando checklist...</div>;
  }

  const isCompleted = executionData?.execution?.status === "concluida";
  const isPending = completeMutation.isPending || uploading;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <PageHeader
        title={isEditing ? "Preencher Inspeção" : "Nova Inspeção"}
        backHref="/checklists/realizados"
      />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
        {!isEditing ? (
          <form onSubmit={handleStart} className="space-y-4">
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardCheck size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">Iniciar Nova Inspeção</h3>
                    <p className="text-xs text-muted-foreground">Selecione o modelo e o local da inspeção</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Empresa Atendida *</Label>
                    <Select value={startForm.companyId} onValueChange={v => setStartForm(f => ({...f, companyId: v}))}>
                      <SelectTrigger className="bg-secondary/50 border-input h-10">
                        <SelectValue placeholder="Selecione a empresa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Modelo de Checklist *</Label>
                    <Select value={startForm.templateId} onValueChange={v => setStartForm(f => ({...f, templateId: v}))}>
                      <SelectTrigger className="bg-secondary/50 border-input h-10">
                        <SelectValue placeholder="Selecione o modelo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t: any) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Projeto / Obra (Opcional)</Label>
                    <Select
                      value={startForm.projectId}
                      onValueChange={v => setStartForm(f => ({...f, projectId: v}))}
                      disabled={!startForm.companyId}
                    >
                      <SelectTrigger className="bg-secondary/50 border-input h-10">
                        <SelectValue placeholder={startForm.companyId ? "Selecione a obra/projeto..." : "Selecione a empresa primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {obras.map((o: any) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.name}{o.address ? ` — ${o.address}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedObra?.address && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span>📍</span> {selectedObra.address}{selectedObra.city ? `, ${selectedObra.city}` : ""}{selectedObra.state ? `/${selectedObra.state}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Data da Inspeção</Label>
                    <Input type="date" value={startForm.date} onChange={e => setStartForm(f => ({...f, date: e.target.value}))} className="h-10" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={startMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-6 w-full sm:w-auto text-base">
                <Check size={18} className="mr-2" />
                Criar Rascunho & Iniciar Execução
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 pb-24">
            {/* Header / Info Badge */}
            <Card className="bg-card border-border shadow-sm overflow-hidden">
              <div className="bg-secondary/30 p-4 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h2 className="font-bold text-lg">{executionData?.template?.name}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Building2 size={14} /> {executionData?.company?.name}
                  </p>
                  {executionData?.obra && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>📍</span>
                      {executionData.obra.name}
                      {executionData.obra.address ? ` — ${executionData.obra.address}` : ""}
                      {executionData.obra.city ? `, ${executionData.obra.city}` : ""}
                      {executionData.obra.state ? `/${executionData.obra.state}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Data da inspeção</p>
                    <p className="text-sm font-semibold">{executionData?.execution?.date ? new Date(executionData.execution.date).toLocaleDateString("pt-BR") : ""}</p>
                  </div>
                  {isCompleted 
                    ? <span className="ml-3 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-bold uppercase tracking-wide">Concluído</span> 
                    : <span className="ml-3 px-3 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full text-xs font-bold uppercase tracking-wide">Pendente</span>
                  }
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <h3 className="font-bold text-lg pl-1 flex items-center gap-2">
                <ClipboardCheck className="text-primary" size={20} />
                Itens de Verificação
              </h3>
              
              {localItems.map((item, i) => (
                <Card key={item.id} className="bg-card border border-border/60 shadow-sm overflow-hidden transition-all hover:border-primary/20">
                  <CardContent className="p-0">
                    <div className="p-4 bg-secondary/10 border-b border-border/50">
                      <div className="flex gap-3">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{i + 1}</span>
                        <div>
                          <h4 className="font-semibold text-base leading-tight mt-0.5">{item.name}</h4>
                          {item.norma && <span className="inline-block mt-1.5 text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full font-medium">{item.norma}</span>}
                          {item.description && <p className="text-sm text-muted-foreground mt-2">{item.description}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Big Touch Buttons for Status */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {["OK", "NÃO OK", "N/A"].map(opt => {
                          const isSelected = item.status === opt;
                          let activeClasses = "bg-primary/10 border-primary/40 text-primary";
                          if (isSelected) {
                            if (opt === "OK") activeClasses = "bg-green-500/20 border-green-500/60 text-green-600 shadow-sm scale-[0.98]";
                            else if (opt === "NÃO OK") activeClasses = "bg-red-500/20 border-red-500/60 text-red-600 shadow-sm scale-[0.98]";
                          }
                          
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={isCompleted}
                              className={`py-3 sm:py-4 px-2 text-sm sm:text-base font-bold rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                                isSelected ? activeClasses : "bg-card border-border/60 text-muted-foreground hover:bg-secondary/50 hover:border-primary/20"
                              }`}
                              onClick={() => handleItemChange(item.id, "status", opt)}
                            >
                              {opt === "OK" ? <Check size={18} className={isSelected ? "text-green-600" : "opacity-50"} /> : 
                               opt === "NÃO OK" ? <X size={18} className={isSelected ? "text-red-600" : "opacity-50"} /> :
                               <div className="h-[18px] opacity-50">-</div>}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Observation Textarea */}
                      <div className="pt-2">
                        <Textarea 
                          placeholder="Adicione observações para este item..."
                          value={item.observation}
                          disabled={isCompleted}
                          onChange={(e) => handleItemChange(item.id, "observation", e.target.value)}
                          className="bg-secondary/20 h-[72px] text-sm resize-none focus:bg-background transition-colors"
                        />
                      </div>

                      {/* Image Upload per Item */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidências Visuais (Fotos)</Label>
                          {!isCompleted && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => fileInputRefs.current[item.id]?.click()}
                            >
                              <Camera size={14} className="mr-1.5" /> Tirar Foto / Anexar
                            </Button>
                          )}
                          <input
                            ref={el => { fileInputRefs.current[item.id] = el; }}
                            type="file"
                            accept="image/*"
                            multiple
                            capture="environment" // Hint for mobile devices to open camera
                            className="hidden"
                            onChange={e => handleImageSelect(item.id, e.target.files)}
                          />
                        </div>

                        {(item.imagens && item.imagens.length > 0) ? (
                          <div className="flex flex-wrap gap-3">
                            {item.imagens.map((img: ItemImage, imgIdx: number) => (
                              <div key={imgIdx} className="relative group rounded-md overflow-hidden bg-secondary border border-border shrink-0 w-24 h-24 sm:w-32 sm:h-32">
                                <img
                                  src={img.preview || img.url}
                                  alt="Evidência"
                                  className="w-full h-full object-cover"
                                />
                                {!isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => removeImage(item.id, imgIdx)}
                                    className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!isCompleted && item.imagens.length > 0 && (
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[item.id]?.click()}
                                className="w-24 h-24 sm:w-32 sm:h-32 rounded-md border-2 border-dashed border-border/80 flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/50 hover:border-primary/40 hover:text-primary transition-all gap-1 cursor-pointer"
                              >
                                <Camera size={18} />
                                <span className="text-[10px] sm:text-xs">Mais Fotos</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          !isCompleted && (
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[item.id]?.click()}
                              className="w-full py-4 rounded-lg border-2 border-dashed border-border/80 flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/50 hover:border-primary/40 transition-all gap-2"
                            >
                              <ImageIcon size={20} className="opacity-50" />
                              <span className="text-sm">Clique para adicionar fotos da inspeção</span>
                            </button>
                          )
                        )}
                      </div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Signature Canvas Area */}
            {(!isCompleted) && (
              <div className="pt-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  Assinatura do Responsável
                </h3>
                <Card className="bg-card border-border shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-white relative">
                      <canvas
                        ref={sigCanvas.canvasRef}
                        className="w-full h-[200px] border-b border-border/50 touch-none block bg-white cursor-crosshair"
                        style={{ touchAction: "none" }}
                      />
                      <div className="absolute top-0 right-0 p-2">
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 shadow-sm bg-white/80 backdrop-blur"
                          onClick={() => sigCanvas.clear()}
                        >
                          <Eraser size={14} className="mr-1.5" /> Limpar
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-secondary/10 text-center">
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                        Assine no quadro em branco acima usando o dedo ou mouse
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* View Only Signature Area */}
            {isCompleted && executionData?.execution?.signatureUrl && (
              <div className="pt-6">
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  Assinatura do Técnico
                </h3>
                <Card className="bg-card border-border">
                  <CardContent className="p-6 flex flex-col items-center justify-center">
                    <img src={executionData.execution.signatureUrl!} alt="Assinatura" className="max-h-[150px] object-contain" />
                    <div className="w-64 h-px bg-border my-4" />
                    <p className="text-sm font-medium">Assinatura Digital Coletada</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Bottom Floating Bar Actions */}
            {!isCompleted && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 flex justify-end gap-3 md:pl-[250px]">
                <div className="max-w-4xl mx-auto w-full flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="h-12 border-border/80 bg-background hover:bg-secondary w-full sm:w-auto"
                    onClick={() => navigate("/checklists/realizados")}
                  >
                    Salvar Progresso (Rascunho)
                  </Button>
                  <Button 
                    type="button" 
                    disabled={isPending}
                    onClick={handleSaveAndComplete} 
                    className="h-12 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 w-full sm:w-auto font-bold text-base px-8"
                  >
                    <Save size={18} className="mr-2" />
                    {isPending ? "Processando..." : "Concluir e Assinar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
