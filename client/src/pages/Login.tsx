import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Zap } from "lucide-react";
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
    <div className="min-h-screen bg-[#050506] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-orange-600/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 relative z-10 glass rounded-[32px] overflow-hidden border-white/5 shadow-2xl">
        {/* Left Panel - Hero Section */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden">
          <div className="absolute inset-0 logo-glow opacity-10 blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-12">
              <img src="/logo-dark.png" alt="TACT Logo" className="h-20 object-contain drop-shadow-[0_0_20px_rgba(255,107,0,0.5)]" />
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-black leading-[1.1] text-white tracking-tighter">
                Segurança <br />
                <span className="gradient-text">Inteligente</span> <br />
                em tempo real.
              </h1>
              <p className="text-muted-foreground text-lg max-w-sm leading-relaxed">
                A nova era da gestão EHS. Potencialize sua conformidade com tecnologia de ponta.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="text-primary" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-tight">Zero Regressões</p>
                <p className="text-xs text-muted-foreground">Sistema blindado com multi-tenancy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Auth Section */}
        <div className="p-8 lg:p-16 bg-card/60 backdrop-blur-2xl flex flex-col justify-center border-l border-white/5">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-10 text-center lg:text-left">
              <div className="lg:hidden flex justify-center mb-6">
                 <img src="/logo-dark.png" alt="TACT Logo" className="h-16 object-contain drop-shadow-[0_0_20px_rgba(255,107,0,0.5)]" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Bem-vindo</h2>
              <p className="text-muted-foreground mt-2 font-medium">Acesse o painel administrativo</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email Corporativo</Label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    type="email"
                    placeholder="email@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    className="h-14 pl-12 bg-white/[0.02] border-white/10 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-medium text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Senha de Acesso</Label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    className="h-14 pl-12 pr-12 bg-white/[0.02] border-white/10 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-medium text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="glow"
                disabled={loginMutation.isPending}
                className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-[0.15em] transition-all"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Entrar no Sistema <Zap size={18} className="fill-white" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                TACT Drive v4.0 • EHS Global Standard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
