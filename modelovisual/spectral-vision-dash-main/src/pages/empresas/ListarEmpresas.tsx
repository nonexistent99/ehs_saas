import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Building2, Edit, Trash2, Plus, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  contato: string;
}

const mockEmpresas: Empresa[] = [
  {
    id: "1",
    nome: "Equipe EHS",
    cnpj: "00.000.000/0000-00",
    endereco: "Rua Barão do Triunfo, 612",
    bairro: "Brooklin",
    cidade: "São Paulo",
    uf: "SP",
    cep: "04602-000",
    contato: "(11) 5542-4242",
  },
  {
    id: "2",
    nome: "MSB Barcelona",
    cnpj: "38.442.001/0001-69",
    endereco: "Rua Barão do Triunfo, 1722",
    bairro: "Brooklin Paulista",
    cidade: "São Paulo",
    uf: "SP",
    cep: "04602-001",
    contato: "(11) 00000-0000",
  },
  {
    id: "3",
    nome: "MSB Madrid",
    cnpj: "17.073.660/0001-03",
    endereco: "Rua Edson, 1400",
    bairro: "Campo Belo",
    cidade: "São Paulo",
    uf: "SP",
    cep: "04618-035",
    contato: "(11) 00000-0000",
  },
  {
    id: "4",
    nome: "Msb Valencia",
    cnpj: "38.352.705/0001-40",
    endereco: "Rua Caminho do Engenho, 1292",
    bairro: "Ferreira",
    cidade: "São Paulo",
    uf: "SP",
    cep: "05524-000",
    contato: "(54) 93505-0037",
  },
];

export default function ListarEmpresas() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Listar Empresas
            </h1>
            <p className="text-sm text-muted-foreground">
              Dashboard / Empresas / Listar Empresas
            </p>
          </div>
          <Link to="/empresas/adicionar" className="w-full sm:w-auto">
            <Button className="bg-gradient-orange hover:opacity-90 text-white font-semibold w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Empresa
            </Button>
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden fade-in-up">
          {/* Header */}
          <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Empresas cadastradas no sistema EHS
            </p>
          </div>

          {/* Empresas List */}
          <div className="divide-y divide-border">
            {mockEmpresas.map((empresa, index) => (
              <div
                key={empresa.id}
                className="px-4 sm:px-6 py-4 sm:py-5 table-row-hover fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col gap-4">
                  {/* Company info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-foreground text-lg">
                        {empresa.nome}
                      </h3>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <div>
                          <span className="text-muted-foreground">CNPJ: </span>
                          <span className="text-primary">{empresa.cnpj}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CEP: </span>
                          <span className="text-foreground">{empresa.cep}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-foreground break-words">
                          {empresa.endereco}, {empresa.bairro} – {empresa.cidade} / {empresa.uf}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground">{empresa.contato}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end pt-2 border-t border-border/50 sm:border-t-0 sm:pt-0">
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
