import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityModuleList } from "@/components/SecurityModuleList";
import { StatusBadge } from "@/components/StatusBadge";
import { GraduationCap, Download, X, Trash2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import { toast } from "sonner";

export default function TreinamentosPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.trainings.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const { data: nrs = [] } = trpc.nrs.list.useQuery();
  const [open, setOpen] = useState(false);
  const [selectedNrs, setSelectedNrs] = useState<number[]>([]);
  const [form, setForm] = useState({
    companyId: "", title: "", type: "presencial" as any, instructor: "",
    startDate: "", endDate: "", duration: "", maxParticipants: "", status: "agendado" as any, description: "",
  });

  const resetForm = () => {
    setForm({ companyId: "", title: "", type: "presencial", instructor: "", startDate: "", endDate: "", duration: "", maxParticipants: "", status: "agendado", description: "" });
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
        <Label>Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do treinamento" className="bg-secondary border-border" />
      </div>

      {/* NR Multi-seleção */}
      <div className="space-y-1.5">
        <Label>NRs Relacionadas (multi-seleção)</Label>
        {nrs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma NR cadastrada no sistema</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 p-3 bg-secondary/40 rounded-md border border-border max-h-36 overflow-y-auto">
              {(nrs as any[]).map(nr => (
                <label key={nr.id} className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedNrs.includes(nr.id)}
                    onChange={() => toggleNr(nr.id)}
                    className="rounded"
                  />
                  NR-{nr.code}{nr.name ? ` — ${nr.name.slice(0, 30)}` : ""}
                </label>
              ))}
            </div>
            {selectedNrs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedNrs.map(id => {
                  const nr = (nrs as any[]).find(n => n.id === id);
                  return nr ? (
                    <span key={id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                      NR-{nr.code}
                      <button onClick={() => toggleNr(id)} className="hover:text-destructive"><X size={10} /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </>
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
      <div className="space-y-1.5">
        <Label>Instrutor</Label>
        <Input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} className="bg-secondary border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data do Treinamento</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Duração (horas)</Label>
          <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="bg-secondary border-border" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-secondary border-border resize-none" />
      </div>
      <Button className="w-full bg-primary text-primary-foreground" disabled={createMutation.isPending}
        onClick={() => {
          if (!form.companyId || !form.title) { toast.error("Empresa e título são obrigatórios"); return; }
          // Use first NR as primary, store rest in description
          const primaryNr = selectedNrs[0];
          const extraNrs = selectedNrs.slice(1);
          const descWithNrs = extraNrs.length > 0
            ? `${form.description ? form.description + "\n" : ""}NRs adicionais: ${extraNrs.map(id => { const nr = (nrs as any[]).find(n => n.id === id); return nr ? `NR-${nr.code}` : ""; }).join(", ")}`
            : form.description;
          createMutation.mutate({
            companyId: Number(form.companyId),
            title: form.title,
            nrId: primaryNr || undefined,
            instructor: form.instructor || undefined,
            trainingDate: form.startDate || undefined,
            validityMonths: form.duration ? Number(form.duration) : 12,
            location: undefined,
            status: form.status as any,
            description: descWithNrs || undefined,
          });
        }}>
        {createMutation.isPending ? "Salvando..." : "Criar Treinamento"}
      </Button>
    </div>
  );

  return (
    <SecurityModuleList
      title="Treinamentos"
      icon={<GraduationCap size={36} />}
      items={items}
      isLoading={isLoading}
      formContent={formContent}
      formOpen={open}
      setFormOpen={setOpen}
      columns={[
        { key: "title", label: "Título", render: (i) => <span className="text-sm font-medium text-foreground">{i.title}</span> },
        { key: "type", label: "Tipo", render: (i) => <span className="text-xs bg-secondary px-2 py-1 rounded-full capitalize">{i.type}</span> },
        { key: "instructor", label: "Instrutor", render: (i) => <span className="text-sm text-muted-foreground">{i.instructor || "—"}</span> },
        { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
        {
          key: "trainingDate", label: "Data",
          render: (i) => <span className="text-xs text-muted-foreground">{i.trainingDate ? new Date(i.trainingDate).toLocaleDateString("pt-BR") : "—"}</span>
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
  );
}
