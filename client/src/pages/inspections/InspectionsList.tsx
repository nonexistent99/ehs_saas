import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ShareWhatsappDialog } from "@/components/ShareWhatsappDialog";
import { Building2, FileText, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InspectionsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [companyId, setCompanyId] = useState("all");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const selectedCompanyId = companyId !== "all" ? Number(companyId) : undefined;

  const { data: inspections = [], isLoading } = trpc.inspections.list.useQuery({
    search: search || undefined,
    status: status && status !== "all" ? status : undefined,
    companyId: selectedCompanyId,
  });

  const deleteMutation = trpc.inspections.delete.useMutation({
    onSuccess: () => {
      toast.success("Relatório excluído com sucesso!");
      utils.inspections.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const canDelete = (user as any)?.ehsRole === "adm_ehs" || (user as any)?.ehsRole === "tecnico";
  const visibleInspections = selectedCompanyId
    ? inspections.filter((item: any) =>
        item.inspection?.companyId === selectedCompanyId || item.company?.id === selectedCompanyId
      )
    : inspections;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Relatórios Técnicos"
        subtitle={`${visibleInspections.length} relatório(s)`}
        actions={
          <Link href="/relatorios/novo">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={14} className="mr-2" />
              Novo Relatório
            </Button>
          </Link>
        }
      />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por assunto..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
          </div>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-full sm:w-64 bg-card border-border">
              <Building2 size={14} className="mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.map((company: any) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="nao_iniciada">Não Iniciada</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="resolvida">Resolvida</SelectItem>
              <SelectItem value="previsto">Previsto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-card rounded-lg animate-pulse" />)}</div>
        ) : visibleInspections.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <FileText size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Nenhum relatório encontrado</p>
              <Link href="/relatorios/novo">
                <Button size="sm" className="mt-4 bg-primary text-primary-foreground">Criar primeiro relatório</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Título</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden md:table-cell">Empresa</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden lg:table-cell">NR</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden lg:table-cell">Data</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleInspections.map((item: any) => (
                  <tr key={item.inspection.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{item.inspection.title}</p>
                      {item.inspection.location && (
                        <p className="text-xs text-muted-foreground">📍 {item.inspection.location}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{item.company?.name || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {item.nr ? (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">NR-{item.nr.number}</span>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.inspection.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.inspection.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ShareWhatsappDialog
                          title={item.inspection.title}
                          documentUrl={`${window.location.origin}/relatorios/${item.inspection.id}`}
                          documentType="inspection"
                          documentId={item.inspection.id}
                          trigger={
                            <Button variant="ghost" size="sm" className="text-xs text-green-600 hover:text-green-700 h-7">
                              WhatsApp
                            </Button>
                          }
                        />
                        <Link href={`/relatorios/${item.inspection.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 h-7">
                            Ver
                          </Button>
                        </Link>
                        <Link href={`/relatorios/${item.inspection.id}/editar`}>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                            Editar
                          </Button>
                        </Link>
                        <Link href={`/relatorios/novo?clone=${item.inspection.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                            Duplicar
                          </Button>
                        </Link>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 size={13} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Relatório</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o relatório <strong>"{item.inspection.title}"</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate({ id: item.inspection.id })}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
