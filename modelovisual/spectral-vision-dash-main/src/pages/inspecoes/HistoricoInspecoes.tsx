import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";

type OrderType = "id" | "agenda" | "nome";

export default function HistoricoInspecoes() {
  const [orderBy, setOrderBy] = useState<OrderType | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Histórico de Inspeções
          </h1>
          <p className="text-muted-foreground">
            Dashboard / Inspeções / Histórico de Inspeções
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden fade-in-up">
          {/* Filters Header */}
          <div className="border-b border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Ordenar por:</span>
              {(["id", "agenda", "nome"] as OrderType[]).map((order) => (
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

            <div className="text-sm text-muted-foreground mt-3">
              Ordenado Por: <span className="text-foreground font-medium">{orderBy || "Nenhum Critério"}</span>
            </div>
          </div>

          {/* Empty State */}
          <div className="p-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma inspeção no histórico
            </h3>
            <p className="text-sm text-muted-foreground">
              As inspeções concluídas aparecerão aqui
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
