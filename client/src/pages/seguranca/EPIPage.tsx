import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat, Download, Plus, Trash2, MessageCircle, User, Loader2, Search, Info, History, Cloud, MessageSquare } from "lucide-react";
import { useState } from "react";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import { toast } from "sonner";
import { useRecentUsers } from "@/hooks/useRecentUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EPIPage() {
  const utils = trpc.useUtils();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number, name: string } | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: companies = [] } = trpc.companies.list.useQuery();
  const { data: obras = [] } = trpc.epiFicha.obras.useQuery(
    { companyId: Number(selectedCompanyId) },
    { enabled: !!selectedCompanyId }
  );
  
  const { data: employees = [], isLoading: loadingEmployees } = trpc.epiFicha.employees.useQuery(
    { 
      companyId: Number(selectedCompanyId), 
      obraId: selectedObraId === "" ? undefined : Number(selectedObraId),
      search: employeeSearch 
    },
    { enabled: !!selectedCompanyId && !!selectedObraId }
  );
  
  const { data: history = [], isLoading: loadingHistory } = trpc.epiFicha.history.useQuery(
    { 
      companyId: Number(selectedCompanyId), 
      employeeId: selectedEmployee?.id || 0 
    },
    { enabled: !!selectedCompanyId && !!selectedEmployee }
  );

  const { recentUsers, addRecentUser } = useRecentUsers();

  const initialForm = {
    companyId: selectedCompanyId,
    employeeName: selectedEmployee?.name || "",
    obraId: selectedObraId === "" ? "" : selectedObraId,
    items: [{ epiName: "", ca: "", quantity: "1", validUntil: "", reason: "" }]
  };
  const [form, setForm] = useState(initialForm);

  const createMutation = trpc.epiFicha.create.useMutation({
    onSuccess: (ids) => {
      toast.success("Ficha(s) de EPI criada(s)!");
      if (form.employeeName) addRecentUser(form.employeeName);
      utils.epiFicha.employees.invalidate();
      utils.epiFicha.history.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => {
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

  const filteredEmployees = employees || [];

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
      <div className="space-y-1.5">
        <Label className="text-foreground/80">Empresa *</Label>
        <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v, obraId: "" }))}>
          <SelectTrigger className="bg-secondary/50 border-border h-11"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-foreground/80">Obra *</Label>
          <Select value={form.obraId} onValueChange={v => setForm(f => ({ ...f, obraId: v }))}>
            <SelectTrigger className="bg-secondary/50 border-border h-11"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {obras.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 flex flex-col">
          <Label className="text-foreground/80">Colaborador *</Label>
          <Input 
            value={form.employeeName} 
            onChange={e => setForm(f => ({ ...f, employeeName: e.target.value }))} 
            placeholder="Nome do colaborador" 
            className="bg-secondary/50 border-border h-11" 
            list="recent-users-epi"
          />
          <datalist id="recent-users-epi">
            {recentUsers.map((name, i) => (
              <option key={i} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <Label className="block text-sm font-bold text-primary">Especificações do EPI *</Label>
        {form.items.map((item, index) => (
          <div key={index} className="p-4 border border-border bg-secondary/20 rounded-xl relative space-y-3 overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              {form.items.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => removeItem(index)}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome do EPI</Label>
                <Input value={item.epiName} onChange={e => updateItem(index, 'epiName', e.target.value)} placeholder="Ex: Luva de Raspa" className="h-10 text-sm bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">CA</Label>
                <Input value={item.ca} onChange={e => updateItem(index, 'ca', e.target.value)} placeholder="00000" className="h-10 text-sm bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quantidade</Label>
                <Input type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} className="h-10 text-sm bg-background border-border" min="1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Validade</Label>
                <Input type="date" value={item.validUntil} onChange={e => updateItem(index, 'validUntil', e.target.value)} className="h-10 text-sm bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Observação / Motivo</Label>
              <Input value={item.reason} onChange={e => updateItem(index, 'reason', e.target.value)} placeholder="Ex: Substituição por desgaste" className="h-10 text-sm bg-background border-border" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full h-11 gap-2 border-dashed border-2 hover:border-primary hover:text-primary transition-all">
          <Plus size={16} /> Adicionar outro item ao lote
        </Button>
      </div>

      <Button className="w-full h-12 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 mt-6" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.employeeName || !form.obraId) { toast.error("Preencha todos os campos obrigatórios (*)"); return; }
          const validItems = form.items.filter(i => i.epiName.trim() !== "");
          if (validItems.length === 0) { toast.error("Adicione pelo menos um EPI"); return; }
          createMutation.mutate({
            companyId: Number(form.companyId),
            employeeName: form.employeeName,
            obraId: Number(form.obraId),
            items: validItems.map(i => ({
              epiName: i.epiName,
              ca: i.ca || undefined,
              quantity: Number(i.quantity) || 1,
              validUntil: i.validUntil || undefined,
              reason: i.reason || undefined,
            })),
          });
        }}>
        {createMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <HardHat className="mr-2" size={18} />}
        {createMutation.isPending ? "Processando..." : "Confirmar Entrega de EPI"}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="px-8 py-6 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
            <Cloud size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">EPI <span className="text-primary">Drive</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-primary/30 text-primary bg-primary/5">Powered by TACT</Badge>
              <p className="text-xs text-muted-foreground font-medium">Gestão Inteligente de Equipamentos</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-xl border border-border">
             <Select value={selectedCompanyId} onValueChange={v => { setSelectedCompanyId(v); setSelectedObraId(""); setSelectedEmployee(null); }}>
              <SelectTrigger className="w-48 bg-transparent border-none shadow-none focus:ring-0 h-9 font-semibold"><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="w-px h-6 bg-border mx-1" />
             <Select value={selectedObraId} onValueChange={v => { setSelectedObraId(v); setSelectedEmployee(null); }} disabled={!selectedCompanyId}>
              <SelectTrigger className="w-48 bg-transparent border-none shadow-none focus:ring-0 h-9 font-semibold"><SelectValue placeholder="Selecione a Obra" /></SelectTrigger>
              <SelectContent>
                {obras.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 bg-primary text-primary-foreground font-bold rounded-xl gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" 
                onClick={() => setForm({ ...initialForm, companyId: selectedCompanyId, employeeName: selectedEmployee?.name || "", obraId: selectedObraId })}>
                <Plus size={20} strokeWidth={3} /> Nova Entrega
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-3xl border-border bg-card shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><HardHat size={24} /></div>
                  Registrar Entrega de EPI
                </DialogTitle>
              </DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 bg-secondary/5">
        {/* Sidebar: Funcionários */}
        <aside className="w-80 border-r border-border bg-card/30 backdrop-blur-md flex flex-col shadow-sm">
          <div className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Colaboradores</h3>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
              <Input 
                placeholder="Filtrar por nome..." 
                className="pl-10 bg-secondary/50 border-border h-11 rounded-xl text-sm focus-visible:ring-primary/30"
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                disabled={!selectedObraId}
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-1.5 pb-6">
              {!selectedCompanyId || !selectedObraId ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50">
                    <Building2 className="text-muted-foreground opacity-30" size={32} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Selecione uma <span className="text-foreground">Empresa</span> e <span className="text-foreground">Obra</span> para listar os colaboradores ativos.
                  </p>
                </div>
              ) : loadingEmployees ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Carregando...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <User className="mx-auto text-muted-foreground opacity-20 mb-3" size={40} />
                  <p className="text-xs text-muted-foreground italic font-medium">Nenhum colaborador encontrado nesta obra.</p>
                </div>
              ) : (
                filteredEmployees.map((emp: any) => (
                  <button
                    key={emp.id}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all group ${
                      selectedEmployee?.id === emp.id 
                        ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 font-bold translate-x-1" 
                        : "hover:bg-secondary/80 text-foreground/70 hover:text-foreground"
                    }`}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${
                      selectedEmployee?.id === emp.id ? "bg-white/20" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    }`}>
                      <User size={18} />
                    </div>
                    <span className="truncate flex-1 text-sm">{emp.name}</span>
                    {selectedEmployee?.id === emp.id && <ChevronRight size={16} strokeWidth={3} />}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content: Histórico */}
        <main className="flex-1 flex flex-col p-8 min-w-0">
          {!selectedEmployee ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-card rounded-3xl flex items-center justify-center shadow-xl border border-border mb-6">
                <History className="text-primary opacity-20" size={48} />
              </div>
              <h3 className="text-2xl font-black text-foreground">Histórico de Movimentação</h3>
              <p className="text-sm text-muted-foreground mt-3 max-w-sm font-medium leading-relaxed">
                Selecione um colaborador ao lado para visualizar o dossiê completo de entregas e substituições de EPI.
              </p>
            </div>
          ) : loadingHistory ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={48} />
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between bg-card/50 p-6 rounded-3xl border border-border backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                    <User size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">{selectedEmployee.name}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-secondary px-2.5 py-1 rounded-full border border-border">
                        <History size={12} className="text-primary" /> {history.length} Entregas
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">• Registrado no TACT Drive</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-right mr-4">
                     <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Status Geral</p>
                     <p className="text-sm font-black text-green-500 uppercase">Regularizado</p>
                   </div>
                   <div className="w-px h-10 bg-border mx-2" />
                   <Button variant="outline" className="rounded-xl border-border hover:bg-secondary font-bold gap-2">
                     <Download size={16} /> Relatório Completo
                   </Button>
                </div>
              </div>

              <div className="grid gap-5">
                {history.map((row: any) => (
                  <Card key={row.ficha.id} className="group bg-card border-border overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 rounded-3xl border-2 hover:border-primary/20">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-5 bg-secondary/30 border-b border-border transition-colors group-hover:bg-primary/5">
                        <div className="flex items-center gap-5">
                          <div className="bg-background border border-border px-3 py-1.5 rounded-xl flex flex-col items-center">
                             <span className="text-[10px] font-black text-muted-foreground uppercase leading-none mb-1">Dossiê</span>
                             <span className="text-sm font-bold text-primary">#{row.ficha.id}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data da Entrega</span>
                            <span className="text-sm font-black text-foreground">
                              {row.ficha.createdAt ? format(new Date(row.ficha.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <ShareWhatsappDialog
                            title={`Ficha EPI - ${selectedEmployee.name}`}
                            documentUrl={`${window.location.origin}/api/export/epi/${row.ficha.id}`}
                            documentType="epi"
                            documentId={row.ficha.id}
                            trigger={
                              <Button variant="outline" className="h-10 px-4 gap-2 border-green-200 text-green-700 bg-green-50/50 hover:bg-green-100 rounded-xl font-bold transition-all">
                                <MessageCircle size={16} strokeWidth={2.5} /> WhatsApp
                              </Button>
                            }
                          />
                          <Button variant="secondary" className="h-10 px-4 gap-2 bg-card border border-border hover:bg-secondary rounded-xl font-bold shadow-sm" onClick={() => exportPdf(row.ficha.id)}>
                            <Download size={16} strokeWidth={2.5} /> Exportar PDF
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-6 grid grid-cols-12 gap-8 items-center bg-card">
                        <div className="col-span-4 border-r border-border/50">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest leading-loose">Equipamento (EPI)</Label>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <HardHat size={20} />
                            </div>
                            <div>
                              <p className="text-lg font-black text-foreground leading-tight">{row.ficha.epiName}</p>
                              <div className="inline-flex items-center bg-secondary/80 px-2 py-0.5 rounded-md mt-1 border border-border">
                                <span className="text-[10px] font-bold text-muted-foreground mr-1.5 uppercase tracking-tighter">CA:</span>
                                <span className="text-[10px] font-black text-foreground">{row.ficha.ca || "NÃO INFORMADO"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 border-r border-border/50">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest leading-loose">Qtd.</Label>
                          <p className="text-2xl font-black text-primary font-mono">{String(row.ficha.quantity).padStart(2, '0')}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Unidades</p>
                        </div>

                        <div className="col-span-3 border-r border-border/50">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest leading-loose">Emitido Por</Label>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                              {row.responsible?.name?.[0] || 'R'}
                            </div>
                            <p className="text-sm font-bold text-foreground truncate">{row.responsible?.name || "Sistema"}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tight italic">Assinatura Digital Auditada</p>
                        </div>

                        <div className="col-span-3">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest leading-loose">Validade Técnica</Label>
                          <div className="flex flex-col mt-1">
                             <p className={`text-base font-black ${row.ficha.validUntil && new Date(row.ficha.validUntil) < new Date() ? 'text-red-500 underline decoration-2' : 'text-foreground'}`}>
                               {row.ficha.validUntil ? format(new Date(row.ficha.validUntil), "dd/MM/yyyy", { locale: ptBR }) : "INDETERMINADA"}
                             </p>
                             {row.ficha.validUntil && new Date(row.ficha.validUntil) < new Date() ? (
                               <Badge className="w-fit mt-1 bg-red-100 text-red-600 border-red-200 text-[9px] font-black uppercase tracking-tighter">🚨 Substituição Urgente</Badge>
                             ) : (
                               <span className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Garantia Ativa</span>
                             )}
                          </div>
                        </div>
                      </div>

                      {row.ficha.reason && (
                        <div className="px-6 py-4 bg-secondary/10 flex items-start gap-3 border-t border-border/50">
                          <MessageSquare size={14} className="text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">Motivo / Observação</span>
                            <p className="text-xs text-muted-foreground/80 font-medium italic leading-relaxed">"{row.ficha.reason}"</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {history.length === 0 && (
                  <div className="text-center py-32 bg-card/30 rounded-[4rem] border-4 border-dashed border-border/50 flex flex-col items-center">
                    <div className="p-6 bg-secondary/50 rounded-full mb-6">
                      <Plus className="text-muted-foreground opacity-20" size={64} />
                    </div>
                    <p className="text-xl font-bold text-muted-foreground">Nenhuma ficha registrada no histórico.</p>
                    <p className="text-sm text-muted-foreground/60 mt-2 font-medium">Inicie uma nova entrega para gerar o dossiê deste colaborador.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
