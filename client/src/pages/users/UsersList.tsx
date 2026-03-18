import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Edit, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  adm_ehs: { label: "ADM EHS", color: "bg-primary/15 text-primary" },
  cliente: { label: "Cliente", color: "bg-blue-500/15 text-blue-400" },
  tecnico: { label: "Técnico", color: "bg-green-500/15 text-green-400" },
  apoio: { label: "Apoio", color: "bg-purple-500/15 text-purple-400" },
};

export default function UsersList() {
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: users = [], isLoading } = trpc.users.list.useQuery(
    search ? { search } : undefined
  );

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário desativado com sucesso");
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Lista de Usuários"
        subtitle={`${users.length} usuário(s) cadastrado(s)`}
        actions={
          <Link href="/usuarios/novo">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={14} className="mr-2" />
              Novo Usuário
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <UserCheck size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              <Link href="/usuarios/novo">
                <Button size="sm" className="mt-4 bg-primary text-primary-foreground">
                  Cadastrar primeiro usuário
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Usuário</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Perfil</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">WhatsApp</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Último Acesso</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user: any) => {
                  const roleConfig = ROLE_CONFIG[(user.ehsRole as string) || "tecnico"] || ROLE_CONFIG.tecnico;
                  return (
                    <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{user.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{(user as any).whatsapp || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(user as any).isActive !== false ? (
                          <span className="status-resolvido text-xs px-2 py-1 rounded-full font-medium">Ativo</span>
                        ) : (
                          <span className="status-atencao text-xs px-2 py-1 rounded-full font-medium">Inativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/usuarios/${user.id}/editar`}>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                              <Edit size={13} />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive">
                                <Trash2 size={13} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O usuário <strong>{user.name}</strong> será desativado e não poderá mais acessar o sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate({ id: user.id })}
                                >
                                  Desativar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
