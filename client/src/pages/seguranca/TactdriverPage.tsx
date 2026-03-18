import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import {
  Cloud, Folder, FolderOpen, FileText, FilePlus, FolderPlus, Trash2,
  Download, AlertTriangle, Clock, CheckCircle2, X, Upload, Bell
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────
type Doc = {
  id: number; name: string; description?: string | null;
  fileUrl?: string | null; fileName?: string | null; fileType?: string | null;
  hasExpiry: boolean; expiryDate?: string | null;
  folderId?: number | null; companyId: number; createdAt: string;
};
type FolderT = { id: number; name: string; color?: string | null; companyId: number };

const FOLDER_COLORS = [
  { value: "blue",   label: "Azul",     bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-500",   dot: "bg-blue-500" },
  { value: "green",  label: "Verde",    bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-500",  dot: "bg-green-500" },
  { value: "yellow", label: "Amarelo",  bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-500", dot: "bg-yellow-500" },
  { value: "red",    label: "Vermelho", bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-500",    dot: "bg-red-500" },
  { value: "purple", label: "Roxo",     bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500", dot: "bg-purple-500" },
  { value: "orange", label: "Laranja",  bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", dot: "bg-orange-500" },
];

function getColor(color?: string | null) {
  return FOLDER_COLORS.find(c => c.value === color) ?? FOLDER_COLORS[0];
}

function expiryStatus(expiryDate?: string | null) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return { label: "Vencido", color: "text-red-500", bg: "bg-red-500/10", icon: AlertTriangle };
  if (days <= 7) return { label: `Vence em ${days}d`, color: "text-red-400", bg: "bg-red-500/10", icon: Clock };
  if (days <= 30) return { label: `Vence em ${days}d`, color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Clock };
  return { label: `Valid. ${format(parseISO(expiryDate), "dd/MM/yyyy", { locale: ptBR })}`, color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle2 };
}

function fileIcon(fileType?: string | null) {
  if (!fileType) return "📄";
  if (fileType.includes("pdf")) return "📕";
  if (fileType.includes("image")) return "🖼️";
  if (fileType.includes("word") || fileType.includes("docx")) return "📘";
  if (fileType.includes("sheet") || fileType.includes("excel")) return "📗";
  return "📄";
}

// ─── Modal overlay ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-base">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TactDrivePage() {
  const utils = trpc.useUtils();
  const { data: companies = [] } = trpc.companies.list.useQuery();

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null | undefined>(undefined); // undefined = all

  // Queries
  const { data: folders = [] } = trpc.tactDrive.folders.list.useQuery(
    { companyId: selectedCompanyId ?? undefined },
    { enabled: true }
  );
  const { data: documents = [], isLoading: docsLoading } = trpc.tactDrive.documents.list.useQuery(
    { companyId: selectedCompanyId ?? undefined, folderId: selectedFolderId },
    { enabled: true }
  );
  const { data: expiringDocs = [] } = trpc.tactDrive.documents.expiring.useQuery(
    { companyId: selectedCompanyId ?? undefined, daysAhead: 30 },
    { enabled: true }
  );

  // Mutations
  const createFolderMut = trpc.tactDrive.folders.create.useMutation({
    onSuccess: () => { toast.success("Pasta criada!"); utils.tactDrive.folders.list.invalidate(); setShowFolderModal(false); resetFolderForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteFolderMut = trpc.tactDrive.folders.delete.useMutation({
    onSuccess: () => { toast.success("Pasta excluída!"); utils.tactDrive.folders.list.invalidate(); utils.tactDrive.documents.list.invalidate(); setSelectedFolderId(undefined); },
    onError: (e: any) => toast.error(e.message),
  });
  const createDocMut = trpc.tactDrive.documents.create.useMutation({
    onSuccess: () => { toast.success("Documento adicionado!"); utils.tactDrive.documents.list.invalidate(); utils.tactDrive.documents.expiring.invalidate(); setShowDocModal(false); resetDocForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteDocMut = trpc.tactDrive.documents.delete.useMutation({
    onSuccess: () => { toast.success("Documento excluído!"); utils.tactDrive.documents.list.invalidate(); utils.tactDrive.documents.expiring.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  // Modal states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const [folderForm, setFolderForm] = useState({ name: "", color: "blue" });
  const [docForm, setDocForm] = useState({
    companyId: "", name: "", description: "",
    hasExpiry: false, expiryDate: "",
    fileUrl: "", fileName: "", fileType: "",
  });

  const resetFolderForm = () => setFolderForm({ name: "", color: "blue" });
  const resetDocForm = () => setDocForm({ companyId: "", name: "", description: "", hasExpiry: false, expiryDate: "", fileUrl: "", fileName: "", fileType: "" });

  // File upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Falha no upload");
      const data = await res.json();
      setDocForm(f => ({ ...f, fileUrl: data.url, fileName: file.name, fileType: file.type }));
      toast.success("Arquivo anexado!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const currentFolder = folders.find((f: FolderT) => f.id === selectedFolderId);
  const expiredCount = expiringDocs.filter((d: Doc) => {
    if (!d.expiryDate) return false;
    return differenceInDays(parseISO(d.expiryDate), new Date()) < 0;
  }).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="TACT Drive"
        subtitle="Nuvem de documentos e contratos"
        icon={<Cloud size={22} />}
        actions={
          <div className="flex items-center gap-2">
            {expiringDocs.length > 0 && (
              <Button variant="outline" size="sm" className="relative gap-1.5 border-border" onClick={() => setShowExpiry(true)}>
                <Bell size={14} />
                Vencimentos
                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${expiredCount > 0 ? "bg-red-500 text-white" : "bg-yellow-500 text-black"}`}>
                  {expiringDocs.length}
                </span>
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => setShowFolderModal(true)}>
              <FolderPlus size={14} /> Nova Pasta
            </Button>
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground" onClick={() => setShowDocModal(true)}>
              <FilePlus size={14} /> Novo Documento
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-56 bg-card border-r border-border flex flex-col overflow-y-auto">
          {/* Company filter */}
          <div className="p-3 border-b border-border">
            <Select
              value={selectedCompanyId ? String(selectedCompanyId) : "all"}
              onValueChange={v => { setSelectedCompanyId(v === "all" ? null : Number(v)); setSelectedFolderId(undefined); }}
            >
              <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Folders */}
          <nav className="flex-1 p-2 space-y-0.5">
            <button
              onClick={() => setSelectedFolderId(undefined)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${selectedFolderId === undefined ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <Cloud size={14} /> Todos os documentos
            </button>
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${selectedFolderId === null ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <FileText size={14} /> Sem pasta
            </button>

            {folders.length > 0 && <div className="h-px bg-border my-2" />}

            {folders.map((folder: FolderT) => {
              const c = getColor(folder.color);
              const isSelected = selectedFolderId === folder.id;
              return (
                <div key={folder.id} className="group flex items-center">
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${isSelected ? `${c.bg} ${c.text} font-medium border ${c.border}` : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    {isSelected ? <FolderOpen size={14} /> : <Folder size={14} />}
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                    onClick={() => { if (confirm(`Excluir pasta "${folder.name}"?`)) deleteFolderMut.mutate({ id: folder.id }); }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Document Grid ────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 bg-background">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
            <Cloud size={12} />
            <span>TACT Drive</span>
            {currentFolder && <><span>/</span><span className="text-foreground font-medium">{currentFolder.name}</span></>}
            {selectedFolderId === null && <><span>/</span><span className="text-foreground font-medium">Sem pasta</span></>}
          </div>

          {docsLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Cloud size={32} className="animate-pulse" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3 text-center">
              <FileText size={40} className="text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">Nenhum documento aqui</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Novo Documento" para adicionar</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {documents.map((doc: Doc) => {
                const expiry = doc.hasExpiry ? expiryStatus(doc.expiryDate) : null;
                const ExpiryIcon = expiry?.icon;
                return (
                  <Card key={doc.id} className="bg-card border-border hover:border-primary/30 hover:shadow-md transition-all group">
                    <CardContent className="p-4 flex flex-col gap-2 h-full">
                      {/* Icon + name */}
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{fileIcon(doc.fileType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.name}</p>
                          {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
                        </div>
                      </div>

                      {/* Expiry badge */}
                      {expiry && ExpiryIcon && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${expiry.color} ${expiry.bg}`}>
                          <ExpiryIcon size={11} />
                          {expiry.label}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto pt-2 flex items-center gap-1 justify-end border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-primary" title="Baixar / Visualizar">
                              <Download size={13} />
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" title="Excluir"
                          onClick={() => { if (confirm(`Excluir "${doc.name}"?`)) deleteDocMut.mutate({ id: doc.id }); }}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Expiry Alert Panel ──────────────────────────────────────────── */}
      {showExpiry && (
        <Modal title={`⚠️ Documentos Vencendo (${expiringDocs.length})`} onClose={() => setShowExpiry(false)}>
          <div className="space-y-2">
            {expiringDocs.map((doc: Doc) => {
              const expiry = expiryStatus(doc.expiryDate);
              const ExpiryIcon = expiry?.icon;
              if (!expiry) return null;
              return (
                <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg ${expiry.bg} border border-current/10`}>
                  {ExpiryIcon && <ExpiryIcon size={16} className={expiry.color} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className={`text-xs ${expiry.color}`}>{expiry.label}</p>
                  </div>
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="w-7 h-7"><Download size={13} /></Button>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ── New Folder Modal ─────────────────────────────────────────────── */}
      {showFolderModal && (
        <Modal title="Nova Pasta" onClose={() => { setShowFolderModal(false); resetFolderForm(); }}>
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Select value={folderForm.name ? (selectedCompanyId ? String(selectedCompanyId) : "") : ""} onValueChange={() => {}}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nome da Pasta *</Label>
            <Input value={folderForm.name} onChange={e => setFolderForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Contratos, NRs, Treinamentos..." className="bg-secondary border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setFolderForm(f => ({ ...f, color: c.value }))}
                  className={`w-8 h-8 rounded-full ${c.dot} flex items-center justify-center transition-all ${folderForm.color === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-60 hover:opacity-100"}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <Button className="w-full bg-primary text-primary-foreground" disabled={createFolderMut.isPending}
            onClick={() => {
              if (!folderForm.name) { toast.error("Nome é obrigatório"); return; }
              createFolderMut.mutate({
                companyId: selectedCompanyId ?? (companies[0] as any)?.id ?? 1,
                name: folderForm.name,
                color: folderForm.color,
              });
            }}>
            {createFolderMut.isPending ? "Criando..." : "Criar Pasta"}
          </Button>
        </Modal>
      )}

      {/* ── New Document Modal ──────────────────────────────────────────── */}
      {showDocModal && (
        <Modal title="Novo Documento" onClose={() => { setShowDocModal(false); resetDocForm(); }}>
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Select value={docForm.companyId} onValueChange={v => setDocForm(f => ({ ...f, companyId: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pasta</Label>
            <Select
              value={selectedFolderId ? String(selectedFolderId) : "root"}
              onValueChange={() => {}}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Sem pasta (raiz)" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="root">Sem pasta</SelectItem>
                {folders.map((folder: FolderT) => <SelectItem key={folder.id} value={String(folder.id)}>{folder.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nome do Documento *</Label>
            <Input value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Contrato de prestação de serviços 2024" className="bg-secondary border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Breve descrição do documento..." className="bg-secondary border-border resize-none text-sm" />
          </div>

          {/* Has expiry toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
            <input type="checkbox" id="hasExpiry" checked={docForm.hasExpiry}
              onChange={e => setDocForm(f => ({ ...f, hasExpiry: e.target.checked, expiryDate: "" }))}
              className="w-4 h-4 rounded" />
            <label htmlFor="hasExpiry" className="text-sm cursor-pointer">
              <span className="font-medium">Possui data de validade?</span>
              <span className="block text-xs text-muted-foreground">Uma notificação será exibida 30 dias antes do vencimento</span>
            </label>
          </div>

          {docForm.hasExpiry && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Clock size={12} /> Data de Validade *</Label>
              <Input type="date" value={docForm.expiryDate} onChange={e => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} className="bg-secondary border-border" />
            </div>
          )}

          {/* File upload */}
          <div className="space-y-1.5">
            <Label>Anexo do Documento</Label>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />
            {docForm.fileUrl ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-sm truncate text-green-600 flex-1">{docForm.fileName}</span>
                <button type="button" onClick={() => setDocForm(f => ({ ...f, fileUrl: "", fileName: "", fileType: "" }))}
                  className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 rounded-lg border-2 border-dashed border-border/80 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                disabled={uploading}>
                <Upload size={20} className={uploading ? "animate-bounce" : ""} />
                <span className="text-xs">{uploading ? "Enviando..." : "Clique para anexar arquivo"}</span>
              </button>
            )}
          </div>

          <Button className="w-full bg-primary text-primary-foreground" disabled={createDocMut.isPending}
            onClick={() => {
              if (!docForm.companyId || !docForm.name) { toast.error("Empresa e nome são obrigatórios"); return; }
              if (docForm.hasExpiry && !docForm.expiryDate) { toast.error("Informe a data de validade"); return; }
              createDocMut.mutate({
                companyId: Number(docForm.companyId),
                folderId: selectedFolderId && selectedFolderId > 0 ? selectedFolderId : null,
                name: docForm.name,
                description: docForm.description || undefined,
                fileUrl: docForm.fileUrl || undefined,
                fileName: docForm.fileName || undefined,
                fileType: docForm.fileType || undefined,
                hasExpiry: docForm.hasExpiry,
                expiryDate: docForm.hasExpiry ? docForm.expiryDate : null,
              });
            }}>
            {createDocMut.isPending ? "Salvando..." : "Salvar Documento"}
          </Button>
        </Modal>
      )}
    </div>
  );
}
