import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  HardHat,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  ShieldAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { trpc } from "@/lib/trpc";

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
      { label: "Ficha de EPI", icon: <HardHat size={14} />, href: "/seguranca/epi" },
      { label: "ITS", icon: <BookOpen size={14} />, href: "/seguranca/its" },
      { label: "PT", icon: <FileText size={14} />, href: "/seguranca/pt" },
      { label: "Treinamento", icon: <BookOpen size={14} />, href: "/seguranca/treinamentos" },
    ],
  },
  {
    label: "TACT Drive",
    icon: <Car size={16} />,
    children: [
      { label: "Dashboard TACT", icon: <Car size={14} />, href: "/seguranca/tactdriver" },
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
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-all duration-150",
            depth === 0 ? "mx-2" : "mx-2 ml-6",
            isActive
              ? "bg-primary/15 text-primary border-l-2 border-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <span className={cn("shrink-0", isActive ? "text-primary" : "")}>{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
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
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-all duration-150 mx-2",
          isParentActive
            ? "text-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <span className={cn("shrink-0", isParentActive ? "text-primary" : "")}>{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-medium">{item.label}</span>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

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
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-sidebar-border", sidebarCollapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Shield size={18} className="text-primary-foreground" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <div className="font-bold text-sm text-sidebar-foreground leading-tight">EHS</div>
            <div className="text-xs text-muted-foreground leading-tight">Soluções Inteligentes</div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {navItems
          .filter(item => !item.roles || (user && item.roles.includes((user as any).ehsRole)))
          .map((item) => (
            <NavItemComponent key={item.label} item={item} collapsed={sidebarCollapsed} />
          ))}
      </div>

      {/* User Profile */}
      <div className={cn("border-t border-sidebar-border p-3", sidebarCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "Usuário"}</div>
              <div className="mt-0.5">{getRoleBadge((user as any)?.ehsRole)}</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          sidebarCollapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-10">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </Button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-card flex items-center gap-4 px-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileOpen(true);
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
          >
            <Menu size={18} />
          </Button>

          {/* Breadcrumb */}
          <div className="flex-1 text-sm text-muted-foreground">
            <span className="text-foreground font-medium">
              {navItems.flatMap((n) => [n, ...(n.children || [])]).find((n) => n.href === location)?.label || "Dashboard"}
            </span>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <Link href="/notificacoes">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell size={18} />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MessageSquare size={18} />
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
