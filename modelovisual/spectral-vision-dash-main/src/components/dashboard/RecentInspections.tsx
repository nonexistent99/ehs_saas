import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface Inspection {
  id: string;
  date: string;
  status: "pendente" | "nao_iniciada" | "atencao" | "concluida";
  name: string;
  address: string;
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
  { id: "1", date: "14 nov", status: "pendente", name: "Triu 1722", address: "Rua Barão do Triunfo, 1722" },
  { id: "2", date: "16 nov", status: "pendente", name: "", address: "Rua Edson, 1400" },
  { id: "3", date: "18 nov", status: "pendente", name: "Msb Valencia", address: "Rua Caminho do Engenho, 1292" },
  { id: "4", date: "19 nov", status: "pendente", name: "", address: "Rua Caminho do Engenho, 1292" },
  { id: "5", date: "24 nov", status: "pendente", name: "Madri", address: "Rua Edson, 1400" },
  { id: "6", date: "24 nov", status: "nao_iniciada", name: "Edson 1400", address: "Rua Edson, 1400" },
  { id: "7", date: "24 nov", status: "pendente", name: "Madrid", address: "Rua Edson, 1400" },
  { id: "8", date: "26 nov", status: "pendente", name: "Triu 1722", address: "Rua Barão do Triunfo, 1722" },
];

const ITEMS_PER_PAGE = 4;

export function RecentInspections() {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(mockInspections.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentInspections = mockInspections.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Clock className="h-5 w-5 text-primary" />
            <div className="absolute inset-0 blur-md bg-primary/40" />
          </div>
          <h3 className="font-semibold text-foreground">Inspeções mais recentes</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1">
          Ver todas
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="w-16 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Data
              </th>
              <th className="w-24 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Empresa
              </th>
              <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Endereço
              </th>
              <th className="w-12 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ação
              </th>
            </tr>
          </thead>
          <AnimatePresence mode="wait">
            <motion.tbody
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="divide-y divide-border"
            >
              {currentInspections.map((inspection, index) => (
                <motion.tr
                  key={inspection.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="table-row-hover"
                >
                  <td className="px-3 py-4">
                    <span className="text-sm font-medium text-foreground">
                      {inspection.date}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-[10px] font-medium px-2 py-0.5",
                        statusConfig[inspection.status].className
                      )}
                    >
                      {statusConfig[inspection.status].label}
                    </Badge>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-4">
                    <span className="text-sm font-medium text-primary truncate block">
                      {inspection.name || "—"}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-3 py-4">
                    <span className="text-sm text-muted-foreground truncate block">
                      {inspection.address}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 sm:px-6 py-3">
        <span className="text-xs text-muted-foreground">
          Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, mockInspections.length)} de {mockInspections.length}
        </span>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8 text-xs",
                currentPage === page && "bg-primary text-primary-foreground"
              )}
              onClick={() => goToPage(page)}
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
