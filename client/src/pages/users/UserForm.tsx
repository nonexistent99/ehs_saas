import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, User } from "lucide-react";

export default function UserForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    ehsRole: "tecnico" as "adm_ehs" | "cliente" | "tecnico" | "apoio",
    companyIds: [] as number[],
    obraIds: [] as number[],
  });

  const { data: allCompanies = [] } = trpc.companies.list.useQuery();
  const { data: allObras = [] } = trpc.obras.list.useQuery();

  const { data: existingUser } = trpc.users.getById.useQuery(
    { id: Number(params.id) },
    { enabled: isEditing }
  );

  useEffect(() => {
    if (existingUser) {
      setForm({
        name: existingUser.name || "",
        email: existingUser.email || "",
        password: "",
        phone: (existingUser as any).phone || "",
        whatsapp: (existingUser as any).whatsapp || "",
        ehsRole: (existingUser as any).ehsRole || "tecnico",
        companyIds: (existingUser as any).companyIds || [],
        obraIds: (existingUser as any).obraIds || [],
      });
    }
  }, [existingUser]);

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário cadastrado com sucesso!");
      utils.users.list.invalidate();
      navigate("/usuarios");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.users.list.invalidate();
      navigate("/usuarios");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    if (isEditing) {
      const { password, ...updateData } = form;
      updateMutation.mutate({ id: Number(params.id), ...updateData });
    } else {
      if (!form.password) { toast.error("Senha é obrigatória"); return; }
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? "Editar Usuário" : "Cadastrar Usuário"}
        subtitle={isEditing ? "Atualize os dados do usuário" : "Preencha os dados para criar um novo usuário"}
        backHref="/usuarios"
      />

      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Dados do Usuário</p>
                  <p className="text-xs text-muted-foreground">Informações de identificação e acesso</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-foreground">Nome Completo *</Label>
                  <Input
                    placeholder="João da Silva"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm text-foreground">Email *</Label>
                  <Input
                    type="email"
                    placeholder="joao@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                {!isEditing && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm text-foreground">Senha *</Label>
                    <Input
                      type="password"
                      placeholder="Senha de acesso"
                      value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-secondary border-border"
                      required={!isEditing}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm text-foreground">Telefone</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm text-foreground">WhatsApp</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={form.whatsapp}
                    onChange={(e) => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm text-foreground">Perfil de Acesso *</Label>
                  <Select
                    value={form.ehsRole}
                    onValueChange={(v) => setForm(f => ({ ...f, ehsRole: v as any }))}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="adm_ehs">ADM EHS — Acesso total, gerencia licenças</SelectItem>
                      <SelectItem value="cliente">Cliente — Visualiza apenas seus dados</SelectItem>
                      <SelectItem value="tecnico">Técnico — Ferramenta de trabalho operacional</SelectItem>
                      <SelectItem value="apoio">Apoio — Acesso de suporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.ehsRole !== "adm_ehs" && (
                <div className="pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Empresas Vinculadas</Label>
                    <div className="space-y-2 max-h-48 overflow-auto pr-2">
                      {allCompanies.map((c: any) => (
                        <label key={`comp-${c.id}`} className="flex items-center gap-2 text-sm">
                          <input 
                            type="checkbox" 
                            checked={form.companyIds.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) setForm(f => ({ ...f, companyIds: [...f.companyIds, c.id] }));
                              else setForm(f => ({ ...f, companyIds: f.companyIds.filter(id => id !== c.id) }));
                            }}
                            className="rounded border-border bg-secondary"
                          />
                          {c.name}
                        </label>
                      ))}
                      {allCompanies.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma empresa encontrada</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Obras Vinculadas</Label>
                    <div className="space-y-2 max-h-48 overflow-auto pr-2">
                      {allObras.filter((o: any) => form.companyIds.includes(o.companyId)).map((o: any) => (
                        <label key={`obra-${o.id}`} className="flex items-center gap-2 text-sm">
                          <input 
                            type="checkbox" 
                            checked={form.obraIds.includes(o.id)}
                            onChange={(e) => {
                              if (e.target.checked) setForm(f => ({ ...f, obraIds: [...f.obraIds, o.id] }));
                              else setForm(f => ({ ...f, obraIds: f.obraIds.filter(id => id !== o.id) }));
                            }}
                            className="rounded border-border bg-secondary"
                          />
                          {o.name}
                        </label>
                      ))}
                      {allObras.filter((o: any) => form.companyIds.includes(o.companyId)).length === 0 && <span className="text-xs text-muted-foreground">Nenhuma obra encontrada para as empresas selecionadas</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/usuarios")}
                  className="border-border"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save size={14} className="mr-2" />
                  {isPending ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
