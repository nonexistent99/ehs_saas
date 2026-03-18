import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { CheckSquare, Edit, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function CheckListsList() {
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: checklists = [], isLoading } = trpc.checkLists.list.useQuery(
    search ? { search } : undefined
  );

  const deleteMutation = trpc.checkLists.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Checklist removido!");
      utils.checkLists.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Check Lists"
        subtitle={`${checklists.length} checklist(s) cadastrado(s)`}
        actions={
          <Link href="/checklists/novo">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={14} className="mr-2" />
              Novo Check List
            </Button>
          </Link>
        }
      />
      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar checklist..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card rounded-lg animate-pulse" />)}</div>
        ) : checklists.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <CheckSquare size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Nenhum checklist cadastrado</p>
              <Link href="/checklists/novo">
                <Button size="sm" className="mt-4 bg-primary text-primary-foreground">Criar primeiro checklist</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Nome</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden md:table-cell">NR</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden lg:table-cell">Itens</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3 hidden lg:table-cell">Criado em</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {checklists.map((cl: any) => (
                  <tr key={cl.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{cl.name}</p>
                      {cl.description && <p className="text-xs text-muted-foreground">{cl.description}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {cl.nrId ? `NR-${cl.nrId}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{cl.itemCount ?? 0} itens</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {new Date(cl.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/checklists/${cl.id}/editar`}>
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
                              <AlertDialogTitle>Remover checklist?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O checklist <strong>{cl.name}</strong> será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white"
                                onClick={() => deleteMutation.mutate({ id: cl.id })}
                              >Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
