import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Building2, Edit, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function CompaniesList() {
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: companies = [], isLoading } = trpc.companies.list.useQuery(
    search ? { search } : undefined
  );

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      toast.success("Empresa removida com sucesso");
      utils.companies.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Lista de Empresas"
        subtitle={`${companies.length} empresa(s) cadastrada(s)`}
        icon={<Building2 size={20} />}
        actions={
          <Link href="/empresas/nova">
            <Button size="sm" variant="glow" className="font-bold uppercase tracking-wider text-xs">
              <Plus size={14} className="mr-2" />
              Nova Empresa
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        <div className="relative max-w-sm group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 glass border-border/40 focus:border-primary/50 focus:ring-primary/20"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <Card className="glass border-border/40">
            <CardContent className="py-16 text-center">
              <Building2 size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground font-medium">Nenhuma empresa cadastrada</p>
              <Link href="/empresas/nova">
                <Button size="sm" variant="glow" className="mt-4 font-bold uppercase tracking-wider text-xs">
                  Cadastrar primeira empresa
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company: any) => (
              <Card key={company.id} className="glass border-border/40 hover:border-primary/50 transition-all duration-300 card-hover stat-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {company.logoUrl ? (
                        <img src={company.logoUrl} alt={company.name} className="w-10 h-10 rounded-lg object-contain bg-secondary/40 p-1" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 size={18} className="text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-sm">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.cnpj || "CNPJ não informado"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    {company.city && (
                      <p className="text-xs text-muted-foreground">
                        📍 {company.city}{company.state ? `, ${company.state}` : ""}
                      </p>
                    )}
                    {company.phone && (
                      <p className="text-xs text-muted-foreground">📞 {company.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Link href={`/empresas/${company.id}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full text-xs text-primary hover:text-primary/80">
                        Ver detalhes
                      </Button>
                    </Link>
                    <Link href={`/empresas/${company.id}/editar`}>
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
                          <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A empresa <strong>{company.name}</strong> será desativada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate({ id: company.id })}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
