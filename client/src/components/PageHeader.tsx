import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, actions, icon }: PageHeaderProps) {
  const [, navigate] = useLocation();

  return (
    <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent backdrop-blur-sm">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-12 left-1/4 w-72 h-32 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex items-center justify-between gap-4 px-4 sm:px-6 py-5">
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all shrink-0"
              onClick={() => navigate(backHref)}
            >
              <ChevronLeft size={18} />
            </Button>
          )}

          {icon && (
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              "bg-primary/10 border border-primary/20 text-primary",
              "shadow-[inset_0_0_18px_rgba(255,107,0,0.15)]"
            )}>
              {icon}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate drop-shadow-sm">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-0.5 font-medium uppercase tracking-[0.12em] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
