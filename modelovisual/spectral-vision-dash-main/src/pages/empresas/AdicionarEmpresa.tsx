import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Save } from "lucide-react";

export default function AdicionarEmpresa() {
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [telefone, setTelefone] = useState("");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Adicionar Empresa
          </h1>
          <p className="text-sm text-muted-foreground">
            Dashboard / Empresas / Adicionar empresa
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 fade-in-up max-w-3xl">
          <p className="text-muted-foreground mb-6">
            Preencha os campos abaixo para adicionar uma nova empresa
          </p>

          <div className="space-y-5">
            {/* Nome Fantasia */}
            <div>
              <Label htmlFor="nomeFantasia" className="text-muted-foreground text-sm">
                Nome Fantasia
              </Label>
              <Input
                id="nomeFantasia"
                type="text"
                placeholder="Nome da empresa"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="mt-1.5 h-12 bg-background border-border"
              />
            </div>

            {/* CEP e CNPJ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cep" className="text-muted-foreground text-sm">
                  CEP *
                </Label>
                <Input
                  id="cep"
                  type="text"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
              <div>
                <Label htmlFor="cnpj" className="text-muted-foreground text-sm">
                  CNPJ *
                </Label>
                <Input
                  id="cnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
            </div>

            {/* Logradouro */}
            <div>
              <Label htmlFor="logradouro" className="text-muted-foreground text-sm">
                Logradouro *
              </Label>
              <Input
                id="logradouro"
                type="text"
                placeholder="Rua, Avenida, etc."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                className="mt-1.5 h-12 bg-background border-border"
              />
            </div>

            {/* Número e Complemento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numero" className="text-muted-foreground text-sm">
                  Número *
                </Label>
                <Input
                  id="numero"
                  type="text"
                  placeholder="123"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="complemento" className="text-muted-foreground text-sm">
                  Complemento
                </Label>
                <Input
                  id="complemento"
                  type="text"
                  placeholder="Sala, Bloco, etc."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
            </div>

            {/* Bairro e Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bairro" className="text-muted-foreground text-sm">
                  Bairro *
                </Label>
                <Input
                  id="bairro"
                  type="text"
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
              <div>
                <Label htmlFor="telefone" className="text-muted-foreground text-sm">
                  Telefone *
                </Label>
                <Input
                  id="telefone"
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
            </div>

            {/* Cidade e UF */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-3">
                <Label htmlFor="cidade" className="text-muted-foreground text-sm">
                  Cidade *
                </Label>
                <Input
                  id="cidade"
                  type="text"
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="uf" className="text-muted-foreground text-sm">
                  UF *
                </Label>
                <Input
                  id="uf"
                  type="text"
                  placeholder="SP"
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  className="mt-1.5 h-12 bg-background border-border"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button className="w-full h-12 bg-gradient-orange hover:opacity-90 text-white font-semibold mt-4">
              <Save className="h-4 w-4 mr-2" />
              SALVAR EMPRESA
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
