import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Preencha email e senha");
      return;
    }
    loginMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-primary blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield size={32} className="text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-3">
            EHS <span className="text-primary">Soluções</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Sistema de Gestão de Segurança e Saúde Ocupacional
          </p>

          <div className="space-y-4 text-left">
            {[
              { title: "Relatórios Técnicos", desc: "Crie e gerencie inspeções com fotos e status" },
              { title: "Conformidade com NRs", desc: "Rastreamento de Normas Regulamentadoras" },
              { title: "Gestão de Equipes", desc: "Controle de usuários com perfis de acesso" },
              { title: "Notificações Multicanal", desc: "WhatsApp e Email integrados" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield size={20} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground">EHS Soluções</p>
              <p className="text-xs text-muted-foreground">Gestão de Segurança</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-1">Entre com suas credenciais de acesso</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="pl-10 bg-secondary border-border focus:border-primary"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Senha</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="pl-10 pr-10 bg-secondary border-border focus:border-primary"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground text-center mb-2 font-medium">
              Primeiro acesso? Solicite suas credenciais ao administrador do sistema.
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            EHS Soluções Inteligentes © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
