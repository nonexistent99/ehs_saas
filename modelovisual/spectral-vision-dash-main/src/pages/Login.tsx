import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail } from 'lucide-react';
import logo from '@/assets/logo-ehs.png';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simular delay de autenticação
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(email, password);
    
    if (success) {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/');
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro de autenticação',
        description: 'Email ou senha incorretos.',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,107,0,0.08)_0%,transparent_70%)]" />
      </div>

      <Card className="w-full max-w-md glass border-border/50 relative z-10">
        <CardHeader className="text-center pb-2">
          {/* Logo with glow */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 -m-4 rounded-full bg-[radial-gradient(circle,rgba(255,107,0,0.3)_0%,transparent_70%)]" />
              <img 
                src={logo} 
                alt="EHS Logo" 
                className="w-24 h-24 object-contain relative z-10"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acessar Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Entre com suas credenciais para continuar
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-primary-glow glow-orange"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Test credentials hint */}
          <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium text-primary">Credenciais de teste:</span>
              <br />
              Email: ehs@gmail.com | Senha: 123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
