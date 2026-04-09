import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Check } from "lucide-react";

const normasRegulamentadoras = [
  { id: "NR 01", name: "Disposições Gerais e GRO" },
  { id: "NR 03", name: "Embargo ou Interdição" },
  { id: "NR 04", name: "SESMT" },
  { id: "NR 05", name: "CIPA" },
  { id: "NR 06", name: "EPI" },
  { id: "NR 07", name: "PCMSO" },
  { id: "NR 10", name: "Eletricidade" },
  { id: "NR 11", name: "Transporte e Movimentação" },
  { id: "NR 12", name: "Máquinas e Equipamentos" },
  { id: "NR 15", name: "Insalubridade" },
  { id: "NR 16", name: "Periculosidade" },
  { id: "NR 17", name: "Ergonomia" },
  { id: "NR 18", name: "Indústria da Construção" },
  { id: "NR 24", name: "Condições Sanitárias" },
  { id: "NR 26", name: "Sinalização de Segurança" },
  { id: "NR 35", name: "Trabalho em Altura" },
];

export default function CriarInspecao() {
  const navigate = useNavigate();
  const [selectedNRs, setSelectedNRs] = useState<string[]>([]);
  const inspectionId = `${Date.now()}`;

  const toggleNR = (id: string) => {
    setSelectedNRs((prev) =>
      prev.includes(id) ? prev.filter((nr) => nr !== id) : [...prev, id]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Criar Inspeção
          </h1>
          <p className="text-muted-foreground">
            Dashboard / Inspeção / Criar inspeção
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-border bg-card p-6 fade-in-up">
          {/* Inspection ID */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-1">Nova inspeção ID:</p>
            <p className="text-2xl font-bold text-primary">{inspectionId}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Siga os passos abaixo para criar a nova inspeção
            </p>
          </div>

          {/* NRs Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              Selecione as Normas Regulamentadoras pertinentes a essa inspeção
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {normasRegulamentadoras.map((nr) => {
                const isSelected = selectedNRs.includes(nr.id);
                return (
                  <button
                    key={nr.id}
                    onClick={() => toggleNR(nr.id)}
                    className={cn(
                      "relative flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {nr.id}
                    {isSelected && (
                      <Check className="absolute -top-1 -right-1 h-4 w-4 text-primary bg-background rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedNRs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">Selecionadas:</span>
                {selectedNRs.map((id) => (
                  <Badge key={id} variant="default" className="bg-primary/20 text-primary border-primary/30">
                    {id}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Continue Button */}
          <div className="mt-8">
            <Button
              className="w-full sm:w-auto bg-gradient-orange hover:opacity-90 text-white font-semibold px-8 py-3 h-12"
              disabled={selectedNRs.length === 0}
            >
              CONTINUAR
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
