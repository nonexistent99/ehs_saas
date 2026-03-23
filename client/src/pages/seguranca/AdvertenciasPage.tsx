import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { AlertOctagon, Download, Eraser, Search, MessageCircle } from "lucide-react";
import { useState, useRef } from "react";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

export default function AdvertenciasPage() {
  const utils = trpc.useUtils();
  
  // Filters State
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");

  const { data: items = [], isLoading } = trpc.advertencias.list.useQuery({
    companyId: filterCompany !== "all" ? Number(filterCompany) : undefined,
    userId: filterUser !== "all" ? Number(filterUser) : undefined,
    type: filterType !== "all" ? filterType : undefined,
    date: filterDate || undefined,
    search: filterSearch || undefined,
  });

  const { data: companies = [] } = trpc.companies.list.useQuery();
  const { data: usersData = [] } = trpc.users.list.useQuery();
  const users = usersData as any[];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: "", userId: "", type: "escrita" as any, reason: "", description: "", date: new Date().toISOString().split("T")[0] });
  
  const [savedSignature, setSavedSignature] = useState<string>("");
  const sigCanvasRef = useRef<any>(null);

  const resetForm = () => {
    setForm({ companyId: "", userId: "", type: "escrita", reason: "", description: "", date: new Date().toISOString().split("T")[0] });
    setSavedSignature("");
    if (sigCanvasRef.current) sigCanvasRef.current.clear();
  };

  const createMutation = trpc.advertencias.create.useMutation({
    onSuccess: () => {
      toast.success("Advertência registrada!");
      utils.advertencias.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => {
    window.open(`/api/export/advertencia/${id}`, "_blank");
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
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
          <Label>Colaborador *</Label>
          <Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="verbal">Verbal</SelectItem>
              <SelectItem value="escrita">Escrita</SelectItem>
              <SelectItem value="suspensao">Suspensão</SelectItem>
              <SelectItem value="demissao">Demissão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Motivo *</Label>
        <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Motivo da advertência" className="bg-secondary border-border" />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-secondary border-border resize-none" />
      </div>
      
      {/* ─── Assinatura ─── */}
      <div className="space-y-2 p-3 bg-secondary/30 rounded-md border border-border mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Assinatura do Colaborador (opcional)
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
      </div>

      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.userId || !form.reason || !form.date) { toast.error("Preencha todos os campos obrigatórios"); return; }
          
          let signatureBase64 = savedSignature;
          if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
            signatureBase64 = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
          }
          
          createMutation.mutate({ 
            companyId: Number(form.companyId), 
            userId: Number(form.userId), 
            type: form.type, 
            reason: form.reason, 
            description: form.description || undefined, 
            date: form.date,
            signatureUrl: signatureBase64 || undefined
          });
        }}>
        {createMutation.isPending ? "Salvando..." : "Registrar Advertência"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters Menu */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-card rounded-md border border-border">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pesquisar Motivo</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Digite o motivo..." 
              value={filterSearch} 
              onChange={e => setFilterSearch(e.target.value)} 
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
          <Label className="text-xs text-muted-foreground">Colaborador</Label>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="bg-secondary h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-secondary h-9 text-sm">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="verbal">Verbal</SelectItem>
              <SelectItem value="escrita">Escrita</SelectItem>
              <SelectItem value="suspensao">Suspensão</SelectItem>
              <SelectItem value="demissao">Demissão</SelectItem>
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
        title="Advertências"
        icon={<AlertOctagon size={36} />}
        items={items}
        isLoading={isLoading}
        formContent={formContent}
        formOpen={open}
        setFormOpen={(val) => { setOpen(val); if (!val) resetForm(); }}
        columns={[
          { key: "reason", label: "Motivo", render: (i) => <span className="text-sm font-medium text-foreground">{i.advertencia.reason}</span> },
          { key: "user", label: "Colaborador", render: (i) => <span className="text-sm text-foreground">{i.user?.name || i.user?.email || "—"}</span> },
          { key: "type", label: "Tipo", render: (i) => {
            const colors: Record<string, string> = { verbal: "bg-blue-500/10 text-blue-400", escrita: "bg-yellow-500/10 text-yellow-400", suspensao: "bg-orange-500/10 text-orange-400", demissao: "bg-red-500/10 text-red-400" };
            return <span className={`text-xs px-2 py-1 rounded-full capitalize ${colors[i.advertencia.type] || ""}`}>{i.advertencia.type}</span>;
          }},
          { key: "date", label: "Data", render: (i) => <span className="text-xs text-muted-foreground">{i.advertencia.date ? new Date(i.advertencia.date).toLocaleDateString("pt-BR") : "—"}</span> },
        ]}
        actions={(i) => (
          <div className="flex justify-end gap-1">
            <ShareWhatsappDialog
              title={`Advertência - ${i.user?.name || i.user?.email || "Sem Nome"}`}
              documentUrl={`${window.location.origin}/api/export/advertencia/${i.advertencia.id}`}
              documentType="advertencia"
              documentId={i.advertencia.id}
              trigger={
                <Button variant="ghost" size="icon" className="w-7 h-7 text-green-500 hover:text-green-600 hover:bg-green-500/10" title="Compartilhar no WhatsApp">
                  <MessageCircle size={13} />
                </Button>
              }
            />
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground"
              title="Exportar PDF" onClick={() => exportPdf(i.advertencia.id)}>
              <Download size={13} />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
