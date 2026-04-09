import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Edit, Trash2 } from "lucide-react";

interface NormaRegulamentadora {
  id: string;
  nome: string;
  tipo: "GERAL" | "ESPECIAL" | "SETORIAL";
}

const mockNormas: NormaRegulamentadora[] = [
  { id: "NR-01", nome: "DISPOSIÇÕES GERAIS E GRO", tipo: "GERAL" },
  { id: "NR-03", nome: "EMBARGO OU INTERDIÇÃO", tipo: "GERAL" },
  { id: "NR-04", nome: "SESMT", tipo: "GERAL" },
  { id: "NR-05", nome: "CIPA", tipo: "GERAL" },
  { id: "NR-06", nome: "EPI", tipo: "GERAL" },
  { id: "NR-07", nome: "PCMSO", tipo: "GERAL" },
  { id: "NR-10", nome: "ELETRICIDADE", tipo: "GERAL" },
  { id: "NR-11", nome: "TRANSPORTE, MOVIMENTAÇÃO, ARMAZENAGEM E MANUSEIO DE MATERIAIS", tipo: "GERAL" },
  { id: "NR-12", nome: "MÁQUINAS E EQUIPAMENTOS", tipo: "ESPECIAL" },
  { id: "NR-15", nome: "INSALUBRIDADE", tipo: "ESPECIAL" },
  { id: "NR-16", nome: "PERICULOSIDADE", tipo: "ESPECIAL" },
  { id: "NR-17", nome: "ERGONOMIA", tipo: "GERAL" },
  { id: "NR-18", nome: "INDÚSTRIA DA CONSTRUÇÃO", tipo: "SETORIAL" },
  { id: "NR-24", nome: "CONDIÇÕES SANITÁRIAS E DE CONFORTO NOS LOCAIS DE TRABALHO", tipo: "ESPECIAL" },
  { id: "NR-26", nome: "SINALIZAÇÃO DE SEGURANÇA", tipo: "ESPECIAL" },
  { id: "NR-35", nome: "TRABALHO EM ALTURA", tipo: "ESPECIAL" },
];

const tipoConfig = {
  GERAL: "bg-info/20 text-info border-info/30",
  ESPECIAL: "bg-warning/20 text-warning border-warning/30",
  SETORIAL: "bg-primary/20 text-primary border-primary/30",
};

export default function ListarNormas() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Listar Normas
            </h1>
            <p className="text-sm text-muted-foreground">
              Dashboard / Normas Regulamentadoras / Listar Normas
            </p>
          </div>
          <Button className="bg-gradient-orange hover:opacity-90 text-white font-semibold w-full sm:w-auto">
            <BookOpen className="h-4 w-4 mr-2" />
            Adicionar NR
          </Button>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden fade-in-up">
          {/* Header */}
          <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Normas Regulamentadoras cadastradas no sistema EHS
            </p>
          </div>

          {/* Normas List */}
          <div className="divide-y divide-border">
            {mockNormas.map((norma, index) => (
              <div
                key={norma.id}
                className="px-4 sm:px-6 py-4 table-row-hover fade-in-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Mobile layout */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{norma.id}</span>
                        <Badge variant="outline" className={tipoConfig[norma.tipo]}>
                          {norma.tipo}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 break-words">
                        {norma.nome}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons - stack on mobile */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      EDITAR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      REMOVER
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
