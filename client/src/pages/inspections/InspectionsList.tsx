import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function InspectionsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [location] = useLocation();

  const { data: inspections = [], isLoading } = trpc.inspections.list.useQuery({
    search: search || undefined,
    status: status || undefined,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Relatórios Técnicos"
        subtitle={`${inspections.length} relatório(s)`}
        actions={
          <Link href="/relatorios/novo">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={14} className="mr-2" />
              Novo Relatório
            </Button>
          </Link>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por assunto..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
          </div>
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
        ) : inspections.length === 0 ? (
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
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
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
                {inspections.map((item: any) => (
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
