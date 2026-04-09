import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Mail, UserPlus, User } from "lucide-react";
import { Link } from "react-router-dom";

interface Usuario {
  id: string;
  nome: string;
  username: string;
  papel: "admin" | "cliente";
}

const mockUsuarios: Usuario[] = [
  { id: "1", nome: "Daniel Rodrigues", username: "danielwalterrodrigues@gmail.com", papel: "admin" },
  { id: "2", nome: "Rodrigo", username: "rodrigo.silva@ehsss.com.br", papel: "admin" },
  { id: "3", nome: "Cleder Gobi Dal'Moro", username: "segurancal@ehsss.com.br", papel: "admin" },
  { id: "4", nome: "Luciano José Batista Machado", username: "luciano.machado@ehsss.com.br", papel: "admin" },
  { id: "5", nome: "Cliente Teste", username: "sst.ehs901@gmail.com", papel: "cliente" },
  { id: "6", nome: "Gobi", username: "cledergdm@hotmail.com", papel: "cliente" },
  { id: "7", nome: "Teste – não deletar", username: "teste@teste.com", papel: "cliente" },
  { id: "8", nome: "Teste", username: "otaviogcasartelli@gmail.com", papel: "admin" },
];

export default function ListarUsuarios() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Listar Usuários
            </h1>
            <p className="text-sm text-muted-foreground">
              Dashboard / Usuários / Listar Usuários
            </p>
          </div>
          <Link to="/usuarios/adicionar" className="w-full sm:w-auto">
            <Button className="bg-gradient-orange hover:opacity-90 text-white font-semibold w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden fade-in-up">
          {/* Header */}
          <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Usuários cadastrados no sistema EHS
            </p>
          </div>

          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Papel
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockUsuarios.map((usuario, index) => (
                  <tr
                    key={usuario.id}
                    className="table-row-hover fade-in-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-foreground">{usuario.nome}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-primary">{usuario.username}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge
                        variant="outline"
                        className={
                          usuario.papel === "admin"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-muted bg-muted text-muted-foreground"
                        }
                      >
                        {usuario.papel}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        >
                          REMOVER
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - shown only on mobile */}
          <div className="md:hidden divide-y divide-border">
            {mockUsuarios.map((usuario, index) => (
              <div
                key={usuario.id}
                className="px-4 py-4 table-row-hover fade-in-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex flex-col gap-3">
                  {/* User info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{usuario.nome}</p>
                        <Badge
                          variant="outline"
                          className={
                            usuario.papel === "admin"
                              ? "border-primary/30 bg-primary/10 text-primary text-xs"
                              : "border-muted bg-muted text-muted-foreground text-xs"
                          }
                        >
                          {usuario.papel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Email */}
                  <p className="text-sm text-primary break-all">{usuario.username}</p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      REMOVER
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary flex-1"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      EMAIL
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
