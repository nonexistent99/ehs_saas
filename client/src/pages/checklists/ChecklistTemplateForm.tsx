import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useLocation, useParams } from "wouter";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { CheckSquare, Plus, Save, Trash2, GripVertical } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface TemplateItem {
  id?: number;
  name: string;
  description: string;
  norma: string;
  referenceImgUrl: string;
  order: number;
}

export default function ChecklistTemplateForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const utils = trpc.useUtils();
  const { user } = useAuth();

  const [form, setForm] = useState({ 
    name: "", 
    description: "", 
    frequencyValue: 1, 
    frequencyType: "meses" as "dias" | "semanas" | "meses",
    type: "estatico" as "estatico" | "dinamico"
  });
  
  const [items, setItems] = useState<TemplateItem[]>([
    { name: "", description: "", norma: "", referenceImgUrl: "", order: 0 }
  ]);

  const { data: existing, isLoading: isLoadingExisting } = trpc.checklistsV2.templates.get.useQuery(
    { id: Number(params.id) }, { enabled: isEditing }
  );

  useEffect(() => {
    if (existing && existing.template) {
      setForm({
        name: existing.template.name,
        description: existing.template.description || "",
        frequencyValue: existing.template.frequencyValue,
        frequencyType: existing.template.frequencyType as any,
        type: (existing.template as any).type || "estatico",
      });
      if (existing.items && existing.items.length > 0) {
        setItems(existing.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          norma: item.norma || "",
          referenceImgUrl: item.referenceImgUrl || "",
          order: item.order,
        })));
      }
    }
  }, [existing]);

  const createMutation = trpc.checklistsV2.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Modelo criado com sucesso!");
      utils.checklistsV2.templates.list.invalidate();
      navigate("/checklists/modelos");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.checklistsV2.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Modelo atualizado!");
      utils.checklistsV2.templates.list.invalidate();
      utils.checklistsV2.templates.get.invalidate({ id: Number(params.id) });
      navigate("/checklists/modelos");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addItem = () => setItems(prev => [...prev, { name: "", description: "", norma: "", referenceImgUrl: "", order: prev.length }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof TemplateItem, value: any) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const moveItemUp = (i: number) => {
    if (i === 0) return;
    setItems(prev => {
      const copy = [...prev];
      [copy[i], copy[i - 1]] = [copy[i - 1], copy[i]];
      return copy.map((x, idx) => ({ ...x, order: idx }));
    });
  };

  const moveItemDown = (i: number) => {
    if (i === items.length - 1) return;
    setItems(prev => {
      const copy = [...prev];
      [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
      return copy.map((x, idx) => ({ ...x, order: idx }));
    });
  };

  // Drag & Drop logic
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
    // Using a slight delay to allow the drag image to be captured before we append styles
    setTimeout(() => { (e.target as HTMLElement).classList.add("opacity-50"); }, 0);
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("opacity-50");
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      setItems((prevItems) => {
        const copyListItems = [...prevItems];
        const dragItemContent = copyListItems[dragItem.current!];
        copyListItems.splice(dragItem.current!, 1);
        copyListItems.splice(dragOverItem.current!, 0, dragItemContent);
        return copyListItems.map((item, index) => ({ ...item, order: index }));
      });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    
    const validItems = items.filter(i => i.name.trim()).map((item, index) => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      norma: item.norma || undefined,
      referenceImgUrl: item.referenceImgUrl || undefined,
      order: index
    }));
    
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item ao checklist");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || undefined,
      type: form.type,
      frequencyType: form.frequencyType,
      frequencyValue: form.frequencyValue,
      items: validItems,
      ...(isEditing ? {} : { companyId: 1 }) // Default to company 1
    };

    if (isEditing) {
      updateMutation.mutate({ id: Number(params.id), ...payload });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingExisting) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando modelo...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? "Editar Modelo de Checklist" : "Novo Modelo de Checklist"}
        backHref="/checklists/modelos"
      />
      
      <div className="p-6 max-w-4xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckSquare size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">Definições Gerais</h3>
                  <p className="text-xs text-muted-foreground">Nome e regra de recorrência do checklist</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome do Modelo <span className="text-destructive">*</span></Label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Inspeção Semanal de Andaimes" 
                    className="bg-secondary/50 border-input" 
                    required 
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição / Instruções</Label>
                  <Textarea 
                    value={form.description} 
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Instruções para o preenchimento deste checklist..." 
                    className="bg-secondary/50 border-input resize-none" 
                    rows={2} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo do Modelo</Label>
                  <Select 
                    value={form.type} 
                    onValueChange={(v: "estatico" | "dinamico") => setForm(f => ({ ...f, type: v }))}
                  >
                    <SelectTrigger className="bg-secondary/50 border-input">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estatico">Estático</SelectItem>
                      <SelectItem value="dinamico">Dinâmico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Recorrência</Label>
                  <Select 
                    value={form.frequencyType} 
                    onValueChange={(v: "dias" | "semanas" | "meses") => setForm(f => ({ ...f, frequencyType: v }))}
                  >
                    <SelectTrigger className="bg-secondary/50 border-input">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dias">Dias</SelectItem>
                      <SelectItem value="semanas">Semanas</SelectItem>
                      <SelectItem value="meses">Meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Intervalo de Recorrência (a cada X)</Label>
                  <Input 
                    type="number"
                    min={1}
                    value={form.frequencyValue} 
                    onChange={e => setForm(f => ({ ...f, frequencyValue: parseInt(e.target.value) || 1 }))}
                    className="bg-secondary/50 border-input" 
                    required 
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ex: Se "Dias" e "7", o próximo abrirá 7 dias após a conclusão do anterior.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-semibold text-foreground text-base">Itens de Verificação</h3>
                  <p className="text-xs text-muted-foreground">Critérios que serão avaliados em cada execução</p>
                </div>
                <Button type="button" size="sm" onClick={addItem} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  <Plus size={14} className="mr-2" />
                  Adicionar Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div 
                    key={i} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragEnter={(e) => handleDragEnter(e, i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    className="flex gap-3 p-4 bg-secondary/30 border border-border/50 rounded-lg group transition-colors hover:border-primary/30 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex flex-col items-center justify-start pt-2 px-1 gap-1 text-muted-foreground w-8">
                      {i > 0 && <button type="button" onClick={() => moveItemUp(i)} className="hover:text-primary"><GripVertical size={14} className="rotate-90" /></button>}
                      <GripVertical size={16} className="opacity-30 my-1 cursor-grab" />
                      {i < items.length - 1 && <button type="button" onClick={() => moveItemDown(i)} className="hover:text-primary"><GripVertical size={14} className="rotate-90" /></button>}
                      <span className="text-[10px] font-mono font-bold mt-1 pt-1 opacity-50 border-t border-border/50 w-full text-center">{i + 1}</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2 space-y-1.5">
                          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Critério / Verificação *</Label>
                          <Input
                            value={item.name}
                            onChange={e => updateItem(i, "name", e.target.value)}
                            placeholder="Ex: Guarda-corpo instalado corretamente?"
                            className="bg-card border-input h-9"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Norma (Opcional)</Label>
                          <Input
                            value={item.norma}
                            onChange={e => updateItem(i, "norma", e.target.value)}
                            placeholder="Ex: NR-18"
                            className="bg-card border-input h-9"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Descrição Adicional (Opcional)</Label>
                          <Input
                            value={item.description}
                            onChange={e => updateItem(i, "description", e.target.value)}
                            placeholder="Detalhes sobre a verificação..."
                            className="bg-card border-input h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Imagem de Referência (Opcional URL)</Label>
                          <Input
                            value={item.referenceImgUrl}
                            onChange={e => updateItem(i, "referenceImgUrl", e.target.value)}
                            placeholder="https://exemplo.com/imagem.png"
                            className="bg-card border-input h-9"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeItem(i)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                    Nenhum item adicionado ainda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/checklists/modelos")} className="bg-card">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
              <Save size={16} className="mr-2" />
              {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Modelo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
