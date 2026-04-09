import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Clock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AlertInspection {
  id: string;
  name?: string;
  status: "pendente" | "atencao";
}

const POPUP_STORAGE_KEY = "admin_alert_popup_last_shown";
const AUTO_CLOSE_SECONDS = 30;

// Mock data - em produção virá do backend
const alertInspections: AlertInspection[] = [
  { id: "1769688471000", status: "pendente" },
  { id: "1769688415000", status: "pendente" },
  { id: "1764172729000", name: "Triu 1722", status: "pendente" },
  { id: "1763990893000", name: "Madrid", status: "pendente" },
  { id: "1763990665000", name: "Madri", status: "pendente" },
  { id: "1763566245000", status: "atencao" },
  { id: "1763474407000", name: "Msb Valencia", status: "pendente" },
];

const statusConfig = {
  pendente: {
    label: "Pendente",
    icon: Clock,
    className: "bg-warning/20 text-warning border-warning/30",
  },
  atencao: {
    label: "Atenção",
    icon: AlertTriangle,
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
};

export interface AdminAlertPopupRef {
  open: () => void;
}

export const AdminAlertPopup = forwardRef<AdminAlertPopupRef>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS);
  const navigate = useNavigate();

  // Expor método open para o componente pai
  useImperativeHandle(ref, () => ({
    open: () => {
      setCountdown(AUTO_CLOSE_SECONDS);
      setIsOpen(true);
    },
  }));

  useEffect(() => {
    // Verifica se já foi mostrado nas últimas 24 horas
    const lastShown = localStorage.getItem(POPUP_STORAGE_KEY);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (!lastShown || now - parseInt(lastShown) > twentyFourHours) {
      // Abre o popup após um pequeno delay para dar tempo da página carregar
      const openTimer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(POPUP_STORAGE_KEY, now.toString());
      }, 1500);

      return () => clearTimeout(openTimer);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsOpen(false);
          return AUTO_CLOSE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const pendentes = alertInspections.filter((i) => i.status === "pendente");
  const atencao = alertInspections.filter((i) => i.status === "atencao");

  const progressPercentage = (countdown / AUTO_CLOSE_SECONDS) * 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          >
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-r from-primary/20 via-destructive/10 to-warning/20 px-4 sm:px-6 py-4 sm:py-5">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
                
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/50 hover:bg-background/80"
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="relative flex items-center gap-3">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/30">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                      Alerta de Inspeções
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Inspeções que requerem sua atenção
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-close progress bar */}
              <div className="px-4 sm:px-6 pt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Fechando automaticamente em</span>
                  <span className="font-mono font-medium text-primary">{countdown}s</span>
                </div>
                <Progress value={progressPercentage} className="h-1" />
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 px-4 sm:px-6 py-4">
                <div className="flex items-center gap-3 rounded-xl bg-warning/10 p-4 border border-warning/20">
                  <Clock className="h-8 w-8 text-warning" />
                  <div>
                    <p className="text-2xl font-bold text-warning">{pendentes.length}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 border border-destructive/20">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-destructive">{atencao.length}</p>
                    <p className="text-xs text-muted-foreground">Atenção</p>
                  </div>
                </div>
              </div>

              {/* Inspection list */}
              <div className="max-h-48 sm:max-h-60 overflow-y-auto px-4 sm:px-6 pb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Inspeções em aberto
                </p>
                <div className="space-y-2">
                  {alertInspections.slice(0, 5).map((inspection, index) => {
                    const config = statusConfig[inspection.status];
                    const StatusIcon = config.icon;
                    
                    return (
                      <motion.div
                        key={inspection.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between rounded-lg bg-muted/30 p-2 sm:p-3 border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={cn(
                            "h-4 w-4",
                            inspection.status === "pendente" ? "text-warning" : "text-destructive"
                          )} />
                          <div>
                            {inspection.name && (
                              <p className="text-sm font-medium text-foreground">
                                {inspection.name}
                              </p>
                            )}
                            <p className="text-xs font-mono text-primary">
                              {inspection.id}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", config.className)}
                        >
                          {config.label}
                        </Badge>
                      </motion.div>
                    );
                  })}
                  
                  {alertInspections.length > 5 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      +{alertInspections.length - 5} mais inspeções...
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-muted/20 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-foreground w-full sm:w-auto order-2 sm:order-1"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      handleClose();
                      navigate("/inspecoes/aberto");
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto order-1 sm:order-2"
                  >
                    Ver Inspeções em Aberto
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

AdminAlertPopup.displayName = "AdminAlertPopup";
