import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Cloud,
  ExternalLink,
  FileText,
  HardHat,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sun,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";

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

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: NavItem[];
  badge?: number;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <Home size={16} />,
    href: "/dashboard",
  },
  {
    label: "Usuários",
    icon: <Users size={16} />,
    roles: ["adm_ehs"],
    children: [
      { label: "Cadastrar Usuário", icon: <Users size={14} />, href: "/usuarios/novo" },
      { label: "Lista de Usuários", icon: <Users size={14} />, href: "/usuarios" },
    ],
  },
  {
    label: "Empresas",
    icon: <Building2 size={16} />,
    children: [
      { label: "Cadastrar Empresa", icon: <Building2 size={14} />, href: "/empresas/nova" },
      { label: "Lista de Empresas", icon: <Building2 size={14} />, href: "/empresas" },
    ],
  },
  {
    label: "Check List",
    icon: <ClipboardCheck size={16} />,
    children: [
      { label: "Nova Inspeção", icon: <ClipboardCheck size={14} />, href: "/checklists/nova" },
      { label: "Checklists Realizados", icon: <ClipboardList size={14} />, href: "/checklists/realizados" },
      { label: "Modelos de Checklist", icon: <FileText size={14} />, href: "/checklists/modelos" },
    ],
  },
  {
    label: "Relatório",
    icon: <FileText size={16} />,
    children: [
      { label: "Criar Relatório", icon: <FileText size={14} />, href: "/relatorios/novo" },
      { label: "Pesquisar Relatório", icon: <FileText size={14} />, href: "/relatorios" },
      { label: "Alterar Relatório", icon: <FileText size={14} />, href: "/relatorios/editar" },
    ],
  },
  {
    label: "PGR",
    icon: <Shield size={16} />,
    children: [
      { label: "Atualização PGR", icon: <Shield size={14} />, href: "/pgr" },
    ],
  },
  {
    label: "NRs",
    icon: <BookOpen size={16} />,
    href: "/nrs",
    roles: ["adm_ehs"],
  },
  {
    label: "Gestão de Segurança",
    icon: <ShieldAlert size={16} />,
    children: [
      { label: "Advertência", icon: <AlertTriangle size={14} />, href: "/seguranca/advertencias" },
      { label: "APR", icon: <ClipboardCheck size={14} />, href: "/seguranca/apr" },
      { label: "ITS", icon: <BookOpen size={14} />, href: "/seguranca/its" },
      { label: "PT", icon: <FileText size={14} />, href: "/seguranca/pt" },
      { label: "Treinamento", icon: <BookOpen size={14} />, href: "/seguranca/treinamentos" },
    ],
  },
  {
    label: "TACT Drive",
    icon: <Cloud size={16} />,
    children: [
      { label: "Dashboard TACT", icon: <Cloud size={14} />, href: "/seguranca/tactdriver" },
      { label: "EPI Drive", icon: <Cloud size={14} />, href: "/seguranca/epi" },
    ],
  },
];

function NavItemComponent({
  item,
  depth = 0,
  collapsed,
}: {
  item: NavItem;
  depth?: number;
  collapsed: boolean;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((c) => c.href && location.startsWith(c.href));
    }
    return false;
  });

  const isActive = item.href ? location === item.href || location.startsWith(item.href + "/") : false;
  const isParentActive = item.children?.some(
    (c) => c.href && (location === c.href || location.startsWith(c.href + "/"))
  );

  if (item.href && !item.children) {
    return (
      <Link href={item.href}>
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-all duration-200 sidebar-link",
            isActive && "active",
            depth === 0 ? "mx-2" : "mx-2 ml-6",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <span className={cn("shrink-0", isActive ? "text-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]" : "")}>{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-primary text-primary-foreground border-none">
                  {item.badge}
                </Badge>
              ) : null}
            </>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-all duration-200 mx-2",
          isParentActive
            ? "text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <span className={cn("shrink-0", isParentActive ? "text-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]" : "")}>{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-medium">{item.label}</span>
            <ChevronDown size={14} className={cn("transition-transform duration-200", open ? "rotate-180" : "rotate-0")} />
          </>
        )}
      </div>
      {!collapsed && open && item.children && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavItemComponent key={child.href} item={child} depth={depth + 1} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EHSLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [geoCity, setGeoCity] = useState<string>("São Paulo, SP");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

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
            setGeoCity(`${city}${state ? `, ${state}` : ""}`);
          } catch {
            setGeoCity("São Paulo, SP");
          }
        },
        () => {
          setGeoCity("São Paulo, SP");
        }
      );
    }

    return () => clearInterval(timer);
  }, []);

  const { diaSemana, dataCompleta, hora } = formatDate(currentTime);

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadge = (role?: string | null) => {
    const map: Record<string, { label: string; color: string }> = {
      adm_ehs: { label: "ADM EHS", color: "bg-primary/20 text-primary" },
      cliente: { label: "Cliente", color: "bg-blue-500/20 text-blue-400" },
      tecnico: { label: "Técnico", color: "bg-green-500/20 text-green-400" },
      apoio: { label: "Apoio", color: "bg-purple-500/20 text-purple-400" },
    };
    const r = map[role || "tecnico"] || map.tecnico;
    return <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", r.color)}>{r.label}</span>;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo area with animated glow */}
      <div className={cn(
        "relative flex items-center justify-center border-b border-sidebar-border px-4 transition-all duration-300",
        sidebarCollapsed ? "h-20" : "h-32"
      )}>
        {/* Animated glow background */}
        {!sidebarCollapsed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-32 h-32 logo-glow rounded-full blur-2xl animate-pulse" />
            <div className="absolute w-24 h-24 logo-glow rounded-full blur-xl opacity-50" />
            <div className="absolute w-16 h-16 bg-primary/20 rounded-full blur-lg animate-logo-breathe" />
          </div>
        )}
        
        <div className="relative flex flex-col items-center gap-2 z-10 transition-all duration-300">
          <div className={cn(
            "rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,107,0,0.4)]",
            sidebarCollapsed ? "w-10 h-10" : "w-14 h-14"
          )}>
            <Cloud size={sidebarCollapsed ? 20 : 28} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col items-center gap-0.5">
              <div className="font-bold text-lg tracking-tight text-white drop-shadow-sm">TACT Drive</div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold opacity-80">EHS Intelligence</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-1">
        {navItems
          .filter(item => !item.roles || (user && item.roles.includes((user as any).ehsRole)))
          .map((item) => (
            <NavItemComponent key={item.label} item={item} collapsed={sidebarCollapsed} />
          ))}
      </div>

      {/* User Profile */}
      <div className={cn("p-4 border-t border-sidebar-border bg-sidebar-accent/30", sidebarCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
          <div className="relative">
            <Avatar className="w-9 h-9 shrink-0 ring-2 ring-primary/20 transition-all hover:ring-primary/50 cursor-pointer">
              <AvatarFallback className="bg-gradient-to-br from-primary to-orange-600 text-white text-xs font-bold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar animate-pulse" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.name || "Usuário"}</div>
              <div className="mt-0.5 flex">
                {getRoleBadge((user as any)?.ehsRole)}
              </div>
            </div>
          )}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 relative glass",
          sidebarCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {SidebarContent()}
        
        {/* Neon Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 z-50",
            sidebarCollapsed 
              ? "border-border bg-background text-muted-foreground hover:text-foreground"
              : "border-primary/50 bg-primary/20 text-primary animate-neon-pulse shadow-[0_0_10px_rgba(255,107,0,0.5)] hover:bg-primary/30"
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3 drop-shadow-[0_0_4px_rgba(255,107,0,0.8)]" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-10 glass">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </Button>
            {SidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Spectral Vision Header Layer 1: Info Bar */}
        <div className="hidden md:flex h-9 items-center justify-between border-b border-border/40 bg-muted/20 px-6 py-0.5 shrink-0 transition-all">
          <div className="flex items-center gap-6 text-[11px]">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary opacity-80" />
              <span className="font-semibold text-foreground uppercase tracking-tight">{diaSemana}</span>
              <span className="opacity-30">|</span>
              <span className="font-medium">{dataCompleta}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground border-l border-border/30 pl-6">
              <Clock className="h-3.5 w-3.5 text-primary opacity-80" />
              <span className="font-mono text-foreground font-bold text-xs tracking-wider">{hora}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary opacity-80" />
            <span className="tracking-tight">{geoCity}</span>
          </div>
        </div>

        {/* Top Header Layer 2: Main Actions */}
        <header className="h-14 border-b border-border/60 bg-background/80 backdrop-blur-xl flex items-center gap-4 px-6 shrink-0 sticky top-0 z-30 transition-all">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </Button>

            {/* Breadcrumb / Greetings */}
            <div className="flex items-center gap-2.5 text-sm transition-all">
              <span className="text-muted-foreground/60 hidden sm:inline">Olá,</span>
              <span className="font-bold text-foreground drop-shadow-sm">{user?.name || "Usuário"}</span>
              <span className="text-muted-foreground/30 mx-1 hidden sm:inline text-lg">/</span>
              <span className="text-muted-foreground font-medium opacity-80">
                {navItems.flatMap((n) => [n, ...(n.children || [])]).find((n) => n.href === location)?.label || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Header Actions */}
          <div className="flex items-center gap-4">
            {toggleTheme && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
              </Button>
            )}

            <Link href="/notificacoes">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Bell size={19} />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-black animate-pulse-glow ring-2 ring-background">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            
            <Link href="/chat">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
                <MessageSquare size={19} />
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full ring-2 ring-primary/10 hover:ring-primary/40 transition-all p-0 overflow-hidden"
                >
                  <Avatar className="h-full w-full">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-orange-600 text-white text-xs font-bold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] mt-1 glass">
                <DropdownMenuLabel className="font-bold text-xs py-2 uppercase tracking-widest text-primary opacity-80">Perfil</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem className="text-xs font-medium cursor-pointer hover:bg-primary/10 transition-colors">
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-xs font-bold text-destructive cursor-pointer hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#0a0a0b] relative">
          {/* Subtle noise/texture overlay for premium look */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
