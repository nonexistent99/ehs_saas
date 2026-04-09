import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { StatusBadge } from "@/components/StatusBadge";
import { GraduationCap, Download, X, Trash2, MessageCircle, Building2, Loader2, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import { toast } from "sonner";

export default function TreinamentosPage() {
  const utils = trpc.useUtils();
  
  // Filters State
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterObra, setFilterObra] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState<string>("");

  const { data: items = [], isLoading } = trpc.trainings.list.useQuery({
    companyId: filterCompany !== "all" ? Number(filterCompany) : undefined,
  });

  const { data: companies = [] } = trpc.companies.list.useQuery();
  const { data: obras = [] } = trpc.obras.list.useQuery(
    { companyId: Number(filterCompany) },
    { enabled: filterCompany !== "all" }
  );
  
  const { data: nrs = [] } = trpc.nrs.list.useQuery();
  const [open, setOpen] = useState(false);
  const [selectedNrs, setSelectedNrs] = useState<number[]>([]);
  const [form, setForm] = useState({
    companyId: "", 
    obraId: "",
    title: "", 
    type: "presencial" as any, 
    instructor: "",
    startDate: "", 
    endDate: "", 
    duration: "", 
    maxParticipants: "", 
    status: "agendado" as any, 
    description: "",
  });

  // Reset obra filter when company changes
  useEffect(() => { setFilterObra("all"); }, [filterCompany]);

  const resetForm = () => {
    setForm({ 
      companyId: "", 
      obraId: "",
      title: "", 
      type: "presencial", 
      instructor: "", 
      startDate: "", 
      endDate: "", 
      duration: "", 
      maxParticipants: "", 
      status: "agendado", 
      description: "" 
    });
    setSelectedNrs([]);
  };

  const createMutation = trpc.trainings.create.useMutation({
    onSuccess: () => {
      toast.success("Treinamento criado!");
      utils.trainings.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Queries for the form
  const { data: formObras = [] } = trpc.obras.list.useQuery(
    { companyId: Number(form.companyId) },
    { enabled: !!form.companyId }
  );

  const deleteMutation = trpc.trainings.delete.useMutation({
    onSuccess: () => { toast.success("Treinamento excluído!"); utils.trainings.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPdf = (id: number) => window.open(`/api/export/treinamento/${id}`, "_blank");

  const toggleNr = (id: number) => {
    setSelectedNrs(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
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
          <Label>Obra</Label>
          <Select 
            value={form.obraId} 
            onValueChange={v => setForm(f => ({ ...f, obraId: v }))}
            disabled={!form.companyId}
          >
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {formObras.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: NR-35 Trabalho em Altura" className="bg-secondary border-border" />
      </div>

      {/* NR Multi-seleção */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Normas Regulamentadoras (NRs)</Label>
        {nrs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma NR cadastrada no sistema</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-secondary/20 rounded-lg border border-border">
            {(nrs as any[]).map(nr => (
              <Button
                key={nr.id}
                type="button"
                variant={selectedNrs.includes(nr.id) ? "default" : "outline"}
                size="sm"
                className={`h-7 text-[10px] ${selectedNrs.includes(nr.id) ? "bg-primary text-primary-foreground" : "border-border"}`}
                onClick={() => toggleNr(nr.id)}
              >
                NR-{nr.code}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="hibrido">Híbrido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Instrutor</Label>
          <Input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-secondary border-border" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-secondary border-border resize-none" />
      </div>
      <Button className="w-full bg-primary text-primary-foreground font-bold" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
          const primaryNr = selectedNrs[0];
          const extraNrs = selectedNrs.slice(1);
          const descWithNrs = extraNrs.length > 0
            ? `${form.description ? form.description + "\n" : ""}NRs adicionais: ${extraNrs.map(id => { const nr = (nrs as any[]).find(n => n.id === id); return nr ? `NR-${nr.code}` : ""; }).join(", ")}`
            : form.description;
          createMutation.mutate({
            companyId: Number(form.companyId),
            obraId: form.obraId ? Number(form.obraId) : undefined,
            title: form.title,
            nrId: primaryNr || undefined,
            instructor: form.instructor || undefined,
            trainingDate: form.startDate || undefined,
            validityMonths: 12,
            status: form.status as any,
            description: descWithNrs || undefined,
          });
        }}>
        {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {createMutation.isPending ? "Salvando..." : "Criar Treinamento"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters Menu */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card rounded-md border border-border">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Empresa</Label>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="bg-secondary h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Obra</Label>
          <Select value={filterObra} onValueChange={setFilterObra} disabled={filterCompany === "all"}>
            <SelectTrigger className="bg-secondary h-9 text-sm">
              <Building2 size={13} className="mr-2 opacity-50" />
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {obras.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pesquisa</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Título ou instrutor..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="pl-8 bg-secondary h-9 text-sm" />
          </div>
        </div>
        <div className="flex items-end">
           <Button variant="outline" className="h-9 w-full gap-2 border-border" onClick={() => { setFilterCompany("all"); setFilterObra("all"); setFilterSearch(""); }}>
              Limpar Filtros
           </Button>
        </div>
      </div>

      <SecurityModuleList
        title="Treinamentos"
        icon={<GraduationCap size={36} />}
        items={items.filter(i => {
           if (filterObra !== "all" && i.obraId !== Number(filterObra)) return false;
           if (filterSearch && !i.title.toLowerCase().includes(filterSearch.toLowerCase()) && !i.instructor?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
           return true;
        })}
        isLoading={isLoading}
        formContent={formContent}
        formOpen={open}
        setFormOpen={setOpen}
        columns={[
          { key: "title", label: "Título", render: (i) => <span className="text-sm font-medium text-foreground">{i.title}</span> },
          { key: "type", label: "Tipo", render: (i) => <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full capitalize border border-border">{i.type}</span> },
          { key: "instructor", label: "Instrutor", render: (i) => <span className="text-xs text-muted-foreground font-medium">{i.instructor || "—"}</span> },
          { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
          {
            key: "trainingDate", label: "Data",
            render: (i) => <span className="text-xs text-muted-foreground font-medium">{i.trainingDate ? new Date(i.trainingDate).toLocaleDateString("pt-BR") : "—"}</span>
          },
        ]}
        actions={(i) => (
          <div className="flex justify-end gap-1">
            <ShareWhatsappDialog
              title={i.title}
              documentUrl={`${window.location.origin}/api/export/treinamento/${i.id}`}
              documentType="treinamento"
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
              title="Excluir" onClick={() => { if (confirm("Excluir este treinamento?")) deleteMutation.mutate({ id: i.id }); }}>
              <Trash2 size={13} />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
