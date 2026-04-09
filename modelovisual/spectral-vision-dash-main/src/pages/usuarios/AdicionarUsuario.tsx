import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";

export default function AdicionarUsuario() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState("");
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/usuarios");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Adicionar Usuário
            </h1>
            <p className="text-muted-foreground">
              Dashboard / Usuários / Adicionar Usuário
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border bg-card p-6 fade-in-up max-w-2xl">
          <p className="text-muted-foreground mb-6">
            Preencha os campos abaixo para adicionar um novo usuário
          </p>

          <div className="space-y-5">
            {/* Nome */}
            <div>
              <Label htmlFor="nome" className="text-muted-foreground text-sm">
                Nome Completo
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="Nome do usuário"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1.5 h-12 bg-background border-border"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-muted-foreground text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-12 bg-background border-border"
              />
            </div>

            {/* Senha */}
            <div>
              <Label htmlFor="senha" className="text-muted-foreground text-sm">
                Senha
              </Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1.5 h-12 bg-background border-border"
              />
            </div>

            {/* Papel */}
            <div>
              <Label htmlFor="papel" className="text-muted-foreground text-sm">
                Papel
              </Label>
              <Select value={papel} onValueChange={setPapel}>
                <SelectTrigger className="mt-1.5 h-12 bg-background border-border">
                  <SelectValue placeholder="Selecione o papel do usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button className="w-full h-12 bg-gradient-orange hover:opacity-90 text-white font-semibold mt-4">
              <Save className="h-4 w-4 mr-2" />
              SALVAR USUÁRIO
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
