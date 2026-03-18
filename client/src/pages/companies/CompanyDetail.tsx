import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Edit, HardHat, Plus, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CompanyDetail() {
  const params = useParams<{ id: string }>();
  const companyId = Number(params.id);
  const utils = trpc.useUtils();

  const { data: company, isLoading } = trpc.companies.getById.useQuery({ id: companyId });
  const { data: obras = [] } = trpc.companies.getObras.useQuery({ companyId });
  const { data: companyUsers = [] } = trpc.companies.getUsers.useQuery({ companyId });
  const { data: allUsers = [] } = trpc.users.list.useQuery();

  const [obraForm, setObraForm] = useState({ name: "", address: "", city: "", state: "" });
  const [userForm, setUserForm] = useState({ userId: "", cargo: "equipe_tecnica" as any });
  const [obraOpen, setObraOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const createObraMutation = trpc.companies.createObra.useMutation({
    onSuccess: () => {
      toast.success("Obra cadastrada!");
      utils.companies.getObras.invalidate({ companyId });
      setObraOpen(false);
      setObraForm({ name: "", address: "", city: "", state: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const addUserMutation = trpc.companies.addUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário vinculado!");
      utils.companies.getUsers.invalidate({ companyId });
      setUserOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeUserMutation = trpc.companies.removeUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido!");
      utils.companies.getUsers.invalidate({ companyId });
    },
  });

  if (isLoading) {
    return <div className="p-6"><div className="h-48 bg-card rounded-lg animate-pulse" /></div>;
  }

  if (!company) {
    return <div className="p-6 text-muted-foreground">Empresa não encontrada</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={company.name}
        subtitle={company.cnpj || "CNPJ não informado"}
        backHref="/empresas"
        actions={
          <Button variant="outline" size="sm" className="border-border" onClick={() => window.location.href = `/empresas/${companyId}/editar`}>
            <Edit size={14} className="mr-2" />
            Editar
          </Button>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="info">
          <TabsList className="bg-secondary border border-border mb-6">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="obras">Obras ({obras.length})</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários ({companyUsers.length})</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 size={15} className="text-primary" />
                    Dados Cadastrais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "CNPJ", value: company.cnpj },
                    { label: "Telefone", value: company.phone },
                    { label: "Email", value: company.email },
                    { label: "CEP", value: company.cep },
                    { label: "Endereço", value: company.address },
                    { label: "Bairro", value: company.neighborhood },
                    { label: "Cidade/UF", value: company.city && company.state ? `${company.city}/${company.state}` : company.city || company.state },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium">{value}</span>
                    </div>
                  ) : null)}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Obras Tab */}
          <TabsContent value="obras">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={obraOpen} onOpenChange={setObraOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground">
                      <Plus size={14} className="mr-2" />
                      Nova Obra
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Cadastrar Obra</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Nome do Empreendimento *</Label>
                        <Input value={obraForm.name} onChange={e => setObraForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Nome da obra" className="bg-secondary border-border" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Endereço</Label>
                        <Input value={obraForm.address} onChange={e => setObraForm(f => ({ ...f, address: e.target.value }))}
                          placeholder="Endereço da obra" className="bg-secondary border-border" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Cidade</Label>
                          <Input value={obraForm.city} onChange={e => setObraForm(f => ({ ...f, city: e.target.value }))}
                            className="bg-secondary border-border" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>UF</Label>
                          <Input value={obraForm.state} onChange={e => setObraForm(f => ({ ...f, state: e.target.value }))}
                            maxLength={2} className="bg-secondary border-border" />
                        </div>
                      </div>
                      <Button
                        className="w-full bg-primary text-primary-foreground"
                        onClick={() => createObraMutation.mutate({ companyId, ...obraForm })}
                        disabled={!obraForm.name || createObraMutation.isPending}
                      >
                        {createObraMutation.isPending ? "Salvando..." : "Cadastrar Obra"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {obras.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <HardHat size={32} className="mx-auto mb-2 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm">Nenhuma obra cadastrada</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {obras.map((obra: any) => (
                    <Card key={obra.id} className="bg-card border-border">
                      <CardContent className="p-4">
                        <p className="font-medium text-foreground">{obra.name}</p>
                        {obra.address && <p className="text-xs text-muted-foreground mt-1">{obra.address}</p>}
                        {obra.city && <p className="text-xs text-muted-foreground">{obra.city}{obra.state ? `/${obra.state}` : ""}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Usuários Tab */}
          <TabsContent value="usuarios">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={userOpen} onOpenChange={setUserOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground">
                      <Plus size={14} className="mr-2" />
                      Vincular Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Vincular Usuário à Empresa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Usuário *</Label>
                        <Select value={userForm.userId} onValueChange={v => setUserForm(f => ({ ...f, userId: v }))}>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Selecione um usuário" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {allUsers.map((u: any) => (
                              <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Cargo</Label>
                        <Select value={userForm.cargo} onValueChange={v => setUserForm(f => ({ ...f, cargo: v }))}>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="diretor">Diretor</SelectItem>
                            <SelectItem value="engenheiro">Engenheiro</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="coordenador">Coordenador</SelectItem>
                            <SelectItem value="equipe_tecnica">Equipe Técnica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full bg-primary text-primary-foreground"
                        onClick={() => addUserMutation.mutate({ companyId, userId: Number(userForm.userId), cargo: userForm.cargo })}
                        disabled={!userForm.userId || addUserMutation.isPending}
                      >
                        Vincular
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {companyUsers.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <Users size={32} className="mx-auto mb-2 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm">Nenhum usuário vinculado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Usuário</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Cargo</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {companyUsers.map((cu: any) => (
                        <tr key={cu.companyUser.id} className="hover:bg-secondary/20">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{cu.user.name}</p>
                            <p className="text-xs text-muted-foreground">{cu.user.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground capitalize">{cu.companyUser.cargo?.replace("_", " ")}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost" size="icon"
                              className="w-7 h-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeUserMutation.mutate({ companyId, userId: cu.user.id })}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
