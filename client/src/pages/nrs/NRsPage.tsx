import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Search, Globe, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const NR_CATEGORIES = [
  "Geral", "EPI", "Construção", "Elétrica", "Ergonomia", "Higiene Ocupacional",
  "Insalubridade", "Periculosidade", "Máquinas", "Incêndio", "Altura", "Confinados",
  "PCMSO", "SESMT", "CIPA", "Materiais", "Pressão", "Temperatura", "Explosivos",
  "Inflamáveis", "Externo", "Mineração", "Higiene", "Resíduos", "Sinalização",
  "Fiscalização", "Portuário", "Aquaviário", "Agrícola", "Saúde", "Naval",
  "Alimentar", "Petróleo", "Limpeza Urbana",
];

export default function NRsPage() {
  const { user } = useAuth();
  const isAdmin = user?.ehsRole === "adm_ehs";

  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newNR, setNewNR] = useState({ code: "", name: "", description: "", category: "" });
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();

  const { data: companies = [] } = trpc.companies.list.useQuery(undefined, { enabled: isAdmin });

  const { data: nrs = [], refetch } = trpc.nrs.list.useQuery(
    selectedCompanyId ? { companyId: selectedCompanyId } : undefined
  );

  const createMutation = trpc.nrs.create.useMutation({
    onSuccess: () => {
      toast.success("NR criada com sucesso!");
      refetch();
      setCreateOpen(false);
      setNewNR({ code: "", name: "", description: "", category: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = trpc.nrs.delete.useMutation({
    onSuccess: () => { toast.success("NR removida"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = nrs.filter((nr: any) =>
    nr.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (nr.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const globalNRs = filtered.filter((nr: any) => !nr.companyId);
  const customNRs = filtered.filter((nr: any) => !!nr.companyId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            Normas Regulamentadoras (NRs)
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {nrs.length} NRs disponíveis — {globalNRs.length} globais, {customNRs.length} personalizadas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Select
              value={selectedCompanyId?.toString() || "global"}
              onValueChange={(v: string) => setSelectedCompanyId(v === "global" ? undefined : Number(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">🌐 Globais apenas</SelectItem>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>🏢 {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus size={14} className="mr-1" /> Nova NR
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar NR Personalizada</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Código *</Label>
                    <Input
                      placeholder="ex: NR-CUSTOM-01"
                      value={newNR.code}
                      onChange={e => setNewNR(p => ({ ...p, code: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={newNR.category} onValueChange={(v: string) => setNewNR(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {NR_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Nome completo da NR"
                    value={newNR.name}
                    onChange={e => setNewNR(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Descrição opcional"
                    value={newNR.description}
                    onChange={e => setNewNR(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
                {isAdmin && (
                  <div>
                    <Label>Empresa (deixe em branco para NR global)</Label>
                    <Select
                      value={selectedCompanyId?.toString() || ""}
                      onValueChange={(v: string) => setSelectedCompanyId(v ? Number(v) : undefined)}
                    >
                      <SelectTrigger><SelectValue placeholder="Global (sistema)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">🌐 Global</SelectItem>
                        {companies.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>🏢 {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  className="w-full bg-primary text-primary-foreground"
                  onClick={() => createMutation.mutate({
                    ...newNR,
                    companyId: isAdmin ? selectedCompanyId : undefined,
                  })}
                  disabled={!newNR.code || !newNR.name || createMutation.isPending}
                >
                  {createMutation.isPending ? "Criando..." : "Criar NR"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar NR por código, nome ou categoria..."
          className="pl-9"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Global NRs */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe size={16} className="text-primary" />
            NRs do Sistema ({globalNRs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {globalNRs.map((nr: any) => (
              <div
                key={nr.id}
                className="flex items-start justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-primary border-primary/30 font-bold text-xs shrink-0">
                      {nr.code}
                    </Badge>
                    {nr.category && (
                      <span className="text-xs text-muted-foreground truncate">{nr.category}</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground leading-tight line-clamp-2">{nr.name}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom NRs */}
      {customNRs.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 size={16} className="text-orange-400" />
              NRs Personalizadas ({customNRs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {customNRs.map((nr: any) => (
                <div
                  key={nr.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 font-bold text-xs shrink-0">
                        {nr.code}
                      </Badge>
                      {nr.category && (
                        <span className="text-xs text-muted-foreground truncate">{nr.category}</span>
                      )}
                    </div>
                    <p className="text-xs text-foreground leading-tight line-clamp-2">{nr.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive ml-1 shrink-0"
                    onClick={() => deleteMutation.mutate({ id: nr.id })}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Shield size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhuma NR encontrada{searchTerm ? ` para "${searchTerm}"` : ""}</p>
        </div>
      )}
    </div>
  );
}
