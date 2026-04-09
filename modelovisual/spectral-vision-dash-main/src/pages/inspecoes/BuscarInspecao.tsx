import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState } from "react";

export default function BuscarInspecao() {
  const [searchId, setSearchId] = useState("");

  const handleSearch = () => {
    if (searchId.trim()) {
      // TODO: Implement search functionality
      console.log("Searching for:", searchId);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Buscar Inspeções
          </h1>
          <p className="text-muted-foreground">
            Dashboard / Inspeções / Buscar Inspeções
          </p>
        </div>

        {/* Search Card */}
        <div className="rounded-xl border border-border bg-card p-6 fade-in-up">
          <div className="max-w-2xl">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Digite o ID da inspeção"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="h-12 px-6 bg-gradient-orange hover:opacity-90 text-white font-semibold"
              >
                Buscar
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Insira o ID numérico da inspeção para localizar rapidamente os detalhes.
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center fade-in-up delay-100">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Nenhuma busca realizada
          </h3>
          <p className="text-sm text-muted-foreground">
            Digite um ID acima para buscar uma inspeção específica
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
