import { cn } from "@/lib/utils";
import { CheckCircle, FileText, Mail, MailOpen, Users } from "lucide-react";

interface QuickStatProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  iconColor?: string;
}

function QuickStat({ icon: Icon, value, label, iconColor }: QuickStatProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
      <Icon className={cn("h-5 w-5", iconColor || "text-muted-foreground")} />
      <div>
        <span className="text-sm font-semibold text-foreground">{value}</span>
        <span className="ml-2 text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 gap-3 fade-in-up delay-200">
      <QuickStat
        icon={Users}
        value="0 técnicos"
        label=""
        iconColor="text-info"
      />
      <QuickStat
        icon={FileText}
        value="323"
        label="Normas em checklists"
        iconColor="text-success"
      />
      <QuickStat
        icon={Users}
        value="0 administradores"
        label=""
        iconColor="text-warning"
      />
      <QuickStat
        icon={Mail}
        value="52"
        label="Notificações enviadas"
        iconColor="text-primary"
      />
      <QuickStat
        icon={Users}
        value="3 clientes"
        label=""
        iconColor="text-primary"
      />
      <QuickStat
        icon={MailOpen}
        value="39"
        label="Notificações lidas"
        iconColor="text-success"
      />
      <QuickStat
        icon={CheckCircle}
        value="33"
        label="NRs em conformidade"
        iconColor="text-success"
      />
      <div /> {/* Empty space for grid alignment */}
    </div>
  );
}
