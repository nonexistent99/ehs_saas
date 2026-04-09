import { useState, useEffect } from "react";
import { Bell, LogOut, User, ExternalLink, Clock, MapPin, Calendar, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function formatDate(date: Date) {
  const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  const diaSemana = diasSemana[date.getDay()];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  const hora = date.getHours().toString().padStart(2, '0');
  const minutos = date.getMinutes().toString().padStart(2, '0');
  const segundos = date.getSeconds().toString().padStart(2, '0');
  
  return {
    diaSemana,
    dataCompleta: `${dia} de ${mes} de ${ano}`,
    hora: `${hora}:${minutos}:${segundos}`
  };
}

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  onNotificationClick?: () => void;
}

export function Header({ onMenuClick, showMenuButton, onNotificationClick }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<string>("Carregando...");

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.municipality || "Localização desconhecida";
            const state = data.address?.state || "";
            setLocation(`${city}${state ? `, ${state}` : ""}`);
          } catch {
            setLocation("São Paulo, SP");
          }
        },
        () => {
          setLocation("São Paulo, SP");
        }
      );
    } else {
      setLocation("São Paulo, SP");
    }

    return () => clearInterval(timer);
  }, []);

  const { diaSemana, dataCompleta, hora } = formatDate(currentTime);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      {/* Top bar with date/time and location - Hidden on mobile */}
      <div className="hidden md:flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-2">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{diaSemana}</span>
            <span className="text-muted-foreground">•</span>
            <span>{dataCompleta}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono text-foreground">{hora}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span>{location}</span>
        </div>
      </div>

      {/* Main header */}
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left side - Menu button (mobile) + Breadcrumb */}
        <div className="flex items-center gap-3">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden sm:inline">Olá,</span>
            <span className="font-medium text-foreground truncate max-w-[150px] sm:max-w-none">Cleder Gobi Dal'Moro</span>
            <span className="text-muted-foreground mx-1 hidden sm:inline">/</span>
            <span className="text-muted-foreground hidden sm:inline">Dashboard</span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-4">
          {/* External link */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar para o site EHS</span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={onNotificationClick}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              3
            </span>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-orange text-white font-semibold">
                    CG
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Cleder Gobi Dal'Moro</p>
                  <p className="text-xs text-muted-foreground">
                    segurancal@ehsss.com.br
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
