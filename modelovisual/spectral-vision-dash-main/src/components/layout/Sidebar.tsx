import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Users,
  Building2,
  X,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import logoEhs from "@/assets/logo-ehs.png";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    label: "Início",
    icon: LayoutDashboard,
    children: [{ label: "Dashboard", href: "/" }],
  },
  {
    label: "Inspeções",
    icon: ClipboardCheck,
    children: [
      { label: "Criar nova inspeção", href: "/inspecoes/criar" },
      { label: "Inspeções em aberto", href: "/inspecoes/aberto" },
      { label: "Buscar inspeção por ID", href: "/inspecoes/buscar" },
      { label: "Histórico de inspeções", href: "/inspecoes/historico" },
    ],
  },
  {
    label: "Normas Regulamentadoras",
    icon: BookOpen,
    children: [
      { label: "Listar NRs", href: "/normas" },
      { label: "Criar NR", href: "/normas/criar" },
    ],
  },
  {
    label: "Usuários",
    icon: Users,
    children: [
      { label: "Listar usuários", href: "/usuarios" },
      { label: "Adicionar usuário", href: "/usuarios/adicionar" },
    ],
  },
  {
    label: "Empresas",
    icon: Building2,
    children: [
      { label: "Listar empresas", href: "/empresas" },
      { label: "Adicionar empresa", href: "/empresas/adicionar" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const location = useLocation();
  const [openSections, setOpenSections] = useState<string[]>(["Início", "Inspeções"]);

  const toggleSection = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label)
        ? prev.filter((s) => s !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isSectionActive = (children?: { href: string }[]) =>
    children?.some((child) => isActive(child.href));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        // Mobile: slide in/out from left
        "md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Mobile close button */}
      {mobileOpen && (
        <button
          onClick={onMobileClose}
          className="absolute right-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Logo area */}
      <div className={cn(
        "flex items-center justify-center border-b border-sidebar-border px-4 bg-gradient-to-b from-background to-sidebar overflow-hidden",
        collapsed ? "h-20 py-3" : "h-32 py-4"
      )}>
        <div className="relative flex items-center justify-center">
          {/* Animated glow background */}
          {!collapsed && (
            <>
              <div className="absolute inset-0 -m-10 logo-glow rounded-full blur-2xl animate-pulse" />
              <div className="absolute inset-0 -m-6 logo-glow-inner rounded-full blur-xl" />
              <div className="absolute inset-0 -m-4 logo-glow-pulse rounded-full blur-lg animate-[pulse_3s_ease-in-out_infinite]" />
            </>
          )}
          <img 
            src={logoEhs} 
            alt="EHS Soluções Inteligentes" 
            className={cn(
              "object-contain transition-all duration-300 relative z-10",
              collapsed ? "h-14 w-14" : "h-28 w-auto drop-shadow-[0_0_15px_rgba(255,107,0,0.5)]"
            )}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const sectionActive = isSectionActive(item.children);
            const isOpen = openSections.includes(item.label);

            return (
              <Collapsible
                key={item.label}
                open={!collapsed && isOpen}
                onOpenChange={() => !collapsed && toggleSection(item.label)}
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    sectionActive
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-colors",
                      sectionActive ? "text-primary" : ""
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isOpen ? "rotate-180" : ""
                        )}
                      />
                    </>
                  )}
                </CollapsibleTrigger>

                {!collapsed && item.children && (
                  <CollapsibleContent className="pt-1 pl-8">
                    <div className="space-y-0.5 border-l border-sidebar-border pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm transition-all duration-150 sidebar-link",
                            isActive(child.href)
                              ? "text-primary bg-primary/10"
                              : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          })}
        </div>
      </nav>

      {/* Collapse button */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300",
          collapsed 
            ? "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
            : "border-primary/50 bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,107,0,0.5)] animate-[neon-pulse_2s_ease-in-out_infinite] hover:bg-primary/30"
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className={cn("h-3 w-3", "drop-shadow-[0_0_4px_rgba(255,107,0,0.8)]")} />
        )}
      </button>
    </aside>
  );
}
