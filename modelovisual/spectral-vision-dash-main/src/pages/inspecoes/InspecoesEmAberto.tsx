import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

type InspectionStatus = "pendente" | "nao_iniciada" | "atencao" | "concluida";

interface Inspection {
  id: string;
  name?: string;
  status: InspectionStatus;
}

const statusConfig = {
  pendente: {
    label: "Pendente",
    className: "status-pendente",
  },
  nao_iniciada: {
    label: "Não Iniciada",
    className: "status-nao-iniciada",
  },
  atencao: {
    label: "Atenção",
    className: "status-atencao",
  },
  concluida: {
    label: "Concluída",
    className: "status-concluida",
  },
};

const mockInspections: Inspection[] = [
  { id: "1769688471000", status: "pendente" },
  { id: "1769688415000", status: "pendente" },
  { id: "1769688347000", status: "nao_iniciada" },
  { id: "1769182560000", name: "Teste p/ aprovação Apple e Google – não deletar", status: "nao_iniciada" },
  { id: "1764172729000", name: "Triu 1722", status: "pendente" },
  { id: "1763990893000", name: "Madrid", status: "pendente" },
  { id: "1763990828000", name: "Edson 1400", status: "nao_iniciada" },
  { id: "1763990665000", name: "Madri", status: "pendente" },
  { id: "1763566245000", status: "pendente" },
  { id: "1763474407000", name: "Msb Valencia", status: "pendente" },
  { id: "1763340445000", status: "pendente" },
  { id: "1763155299000", name: "Triu 1722", status: "pendente" },
];

type FilterType = "todos" | "pendentes" | "atencao";
type OrderType = "status" | "id" | "agenda" | "nome";

export default function InspecoesEmAberto() {
  const [filter, setFilter] = useState<FilterType>("todos");
  const [orderBy, setOrderBy] = useState<OrderType | null>(null);

  const filteredInspections = mockInspections.filter((ins) => {
    if (filter === "todos") return true;
    if (filter === "pendentes") return ins.status === "pendente";
    if (filter === "atencao") return ins.status === "atencao";
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Inspeções em aberto
          </h1>
          <p className="text-sm text-muted-foreground">
            Dashboard / Inspeções / Inspeções em aberto
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden fade-in-up">
          {/* Filters Header */}
          <div className="border-b border-border bg-muted/30 p-4 space-y-4">
            {/* Order By */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground w-full sm:w-auto">Ordenar por:</span>
              <div className="flex flex-wrap gap-2">
                {(["status", "id", "agenda", "nome"] as OrderType[]).map((order) => (
                  <Button
                    key={order}
                    variant={orderBy === order ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderBy(order)}
                    className={cn(
                      "uppercase text-xs",
                      orderBy === order && "bg-primary text-primary-foreground"
                    )}
                  >
                    {order}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filter By Status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground w-full sm:w-auto">Filtrar status:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("todos")}
                  className={cn(
                    "uppercase text-xs",
                    filter === "todos" && "bg-primary text-primary-foreground"
                  )}
                >
                  TODOS
                </Button>
                <Button
                  variant={filter === "pendentes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("pendentes")}
                  className={cn(
                    "uppercase text-xs",
                    filter === "pendentes" && "bg-warning text-warning-foreground"
                  )}
                >
                  PENDENTES
                </Button>
                <Button
                  variant={filter === "atencao" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("atencao")}
                  className={cn(
                    "uppercase text-xs",
                    filter === "atencao" && "bg-destructive text-destructive-foreground"
                  )}
                >
                  ATENÇÃO
                </Button>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground">
              Ordenado Por: <span className="text-foreground font-medium">{orderBy || "Nenhum"}</span>
              {" — "}
              Filtrado Por: <span className="text-foreground font-medium">{filter === "todos" ? "Todos" : filter}</span>
            </div>
          </div>

          {/* Inspection List */}
          <div className="divide-y divide-border">
            {filteredInspections.map((inspection, index) => (
              <div
                key={inspection.id}
                className="px-4 sm:px-6 py-4 table-row-hover fade-in-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  {/* Inspection info */}
                  <div className="flex-1 min-w-0">
                    {inspection.name && (
                      <p className="font-medium text-foreground mb-1 truncate">{inspection.name}</p>
                    )}
                    <p className="text-primary font-mono text-sm">{inspection.id}</p>
                  </div>
                  
                  {/* Status and action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-xs font-medium whitespace-nowrap",
                        statusConfig[inspection.status].className
                      )}
                    >
                      {statusConfig[inspection.status].label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 flex-shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
