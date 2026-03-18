import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { CheckSquare, Edit, Download, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function ChecklistExecutionsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: allExecutions = [], isLoading } = trpc.checklistsV2.executions.list.useQuery();
  
  const executions = allExecutions.filter((e: any) => {
    const matchSearch = search 
      ? (e.templateName?.toLowerCase().includes(search.toLowerCase()) || String(e.id) === search)
      : true;
    const matchStatus = statusFilter !== "all" ? e.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const handleDownloadPdf = async (id: number) => {
    try {
      const response = await fetch(`/api/export/checklist/${id}`);
      if (!response.ok) throw new Error("Erro ao gerar PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `checklist-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <PageHeader
        title="Inspeções Realizadas"
        subtitle={`${executions.length} checklist(s) na listagem`}
        actions={
          <Link href="/checklists/nova">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              Nova Inspeção
            </Button>
          </Link>
        }
      />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por modelo ou ID..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border h-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="concluida">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card rounded-lg animate-pulse border border-border/50" />)}</div>
        ) : executions.length === 0 ? (
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="py-16 text-center">
              <CheckSquare size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Nenhuma execução encontrada.</p>
              <Link href="/checklists/nova">
                <Button size="sm" variant="outline" className="mt-4 text-primary border-primary/20 hover:bg-primary/10">Iniciar primeiro checklist</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">ID</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Modelo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden sm:table-cell">Empresa</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Score</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden md:table-cell">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden lg:table-cell">Data</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {executions.map((exec: any) => {
                  const isCompleted = exec.status === "concluida";
                  const score = parseFloat(exec.score || "0");
                  return (
                    <tr key={exec.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">#{exec.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{exec.templateName}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{exec.companyName}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isCompleted && exec.score ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${score >= 80 ? 'bg-green-500/15 text-green-600' : score >= 50 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-red-500/15 text-red-600'}`}>
                            {score.toFixed(0)}% Conform.
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs opacity-50">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2.5 py-1 font-semibold tracking-wide rounded-full ${isCompleted ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                          {isCompleted ? "CONCLUÍDO" : "PENDENTE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {exec.date ? new Date(exec.date).toLocaleDateString("pt-BR") : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(exec.id)} className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-secondary">
                            <Download size={14} />
                          </Button>
                          <Link href={`/checklists/realizados/${exec.id}`}>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-secondary">
                              <Edit size={14} />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
