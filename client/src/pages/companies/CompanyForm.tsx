import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

export default function CompanyForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: "", cnpj: "", cep: "", address: "", neighborhood: "",
    city: "", state: "", phone: "", email: "", logoUrl: "",
  });

  const { data: existing } = trpc.companies.getById.useQuery(
    { id: Number(params.id) }, { enabled: isEditing }
  );

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        cnpj: existing.cnpj || "",
        cep: existing.cep || "",
        address: existing.address || "",
        neighborhood: existing.neighborhood || "",
        city: existing.city || "",
        state: existing.state || "",
        phone: existing.phone || "",
        email: existing.email || "",
        logoUrl: existing.logoUrl || "",
      });
    }
  }, [existing]);

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("Empresa cadastrada com sucesso!");
      utils.companies.list.invalidate();
      navigate("/empresas");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso!");
      utils.companies.list.invalidate();
      navigate("/empresas");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    if (isEditing) {
      updateMutation.mutate({ id: Number(params.id), ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleCepBlur = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(f => ({
            ...f,
            address: data.logradouro || f.address,
            neighborhood: data.bairro || f.neighborhood,
            city: data.localidade || f.city,
            state: data.uf || f.state,
          }));
        }
      } catch {}
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEditing ? "Editar Empresa" : "Cadastrar Empresa"}
        backHref="/empresas"
      />
      <div className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Building2 size={18} className="text-primary" />
                </div>
                <p className="font-semibold text-foreground">Dados da Empresa</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Razão Social / Nome *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome da empresa" className="bg-secondary border-border" required />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(11) 3333-3333" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contato@empresa.com" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>CEP</Label>
                  <Input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                    onBlur={handleCepBlur} placeholder="00000-000" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                    placeholder="Bairro" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Rua, número, complemento" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="São Paulo" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado (UF)</Label>
                  <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    placeholder="SP" maxLength={2} className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>URL do Logo</Label>
                  <Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="https://..." className="bg-secondary border-border" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/empresas")} className="border-border">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
