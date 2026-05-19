import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Plus, Save, Trash2 } from "lucide-react";

interface CheckItem {
  description: string;
  isRequired: boolean;
  order: number;
}

export default function CheckListForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const utils = trpc.useUtils();

  const [form, setForm] = useState({ name: "", description: "", nrId: "" });
  const [items, setItems] = useState<CheckItem[]>([{ description: "", isRequired: true, order: 0 }]);

  const { data: nrs = [] } = trpc.nrs.list.useQuery();
  const { data: existing } = trpc.checkLists.getById.useQuery(
    { id: Number(params.id) }, { enabled: isEditing }
  );

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        description: existing.description || "",
        nrId: existing.nrId ? String(existing.nrId) : "",
      });
      if ((existing as any).items && (existing as any).items.length > 0) {
        setItems((existing as any).items.map((item: any) => ({
          description: item.description,
          isRequired: item.isRequired,
          order: item.order,
        })));
      }
    }
  }, [existing]);

  const createMutation = trpc.checkLists.create.useMutation({
    onSuccess: () => {
      toast.success("Checklist criado com sucesso!");
      utils.checkLists.list.invalidate();
      navigate("/checklists");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.checkLists.create.useMutation({
    onSuccess: () => {
      toast.success("Checklist atualizado!");
      utils.checkLists.list.invalidate();
      navigate("/checklists");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addItem = () => setItems(prev => [...prev, { description: "", isRequired: true, order: prev.length }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof CheckItem, value: any) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    const validItems = items.filter(i => i.description.trim());
    const payload = {
      title: form.name,
      description: form.description || undefined,
      nrId: form.nrId ? Number(form.nrId) : undefined,
      items: validItems,
    };
    if (isEditing) {
      // Re-create with same data (no update endpoint available)
      createMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? "Editar Check List" : "Novo Check List"}
        backHref="/checklists"
      />
      <div className="p-6 max-w-3xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <CheckSquare size={16} className="text-primary" />
                </div>
                <p className="font-semibold text-foreground">Dados do Check List</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Inspeção de Andaimes" className="bg-secondary border-border" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Norma Regulamentadora</Label>
                  <Select value={form.nrId} onValueChange={v => setForm(f => ({ ...f, nrId: v }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecione a NR" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {nrs.map((nr: any) => (
                        <SelectItem key={nr.id} value={String(nr.id)}>NR-{nr.number} — {nr.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descrição do checklist..." className="bg-secondary border-border resize-none" rows={2} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <p className="font-semibold text-foreground text-sm">Itens do Check List ({items.length})</p>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="border-border text-xs">
                  <Plus size={12} className="mr-1" />
                  Adicionar Item
                </Button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                  <span className="text-xs text-muted-foreground mt-2.5 w-5 text-center font-mono">{i + 1}</span>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.description}
                      onChange={e => updateItem(i, "description", e.target.value)}
                      placeholder="Descrição do item de verificação"
                      className="bg-card border-border text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={e => updateItem(i, "isRequired", e.target.checked)}
                        className="rounded"
                      />
                      Item obrigatório
                    </label>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive mt-1"
                    onClick={() => removeItem(i)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/checklists")} className="border-border">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save size={14} className="mr-2" />
              {isPending ? "Salvando..." : isEditing ? "Atualizar" : "Criar Checklist"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
