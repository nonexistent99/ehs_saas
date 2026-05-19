import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  resolvido: { label: "Resolvido", className: "status-resolvido" },
  resolvida: { label: "Resolvida", className: "status-resolvido" },
  pendente: { label: "Pendente", className: "status-pendente" },
  atencao: { label: "Atenção", className: "status-atencao" },
  previsto: { label: "Previsto", className: "status-previsto" },
  nao_iniciada: { label: "Não Iniciada", className: "status-nao-iniciada" },
  concluida: { label: "Concluída", className: "status-resolvido" },
  ativo: { label: "Ativo", className: "status-resolvido" },
  inativo: { label: "Inativo", className: "status-nao-iniciada" },
  revisao: { label: "Revisão", className: "status-pendente" },
  vigente: { label: "Vigente", className: "status-resolvido" },
  em_elaboracao: { label: "Em Elaboração", className: "status-pendente" },
  cancelado: { label: "Cancelado", className: "status-atencao" },
  aberta: { label: "Aberta", className: "status-pendente" },
  em_andamento: { label: "Em Andamento", className: "status-previsto" },
  agendado: { label: "Agendado", className: "status-previsto" },
  realizado: { label: "Realizado", className: "status-resolvido" },
  aprovado: { label: "Aprovado", className: "status-resolvido" },
  reprovado: { label: "Reprovado", className: "status-atencao" },
  verbal: { label: "Verbal", className: "status-pendente" },
  escrita: { label: "Escrita", className: "status-atencao" },
  suspensao: { label: "Suspensão", className: "status-atencao" },
  demissao: { label: "Demissão", className: "status-atencao" },
  sent: { label: "Enviada", className: "status-resolvido" },
  read: { label: "Lida", className: "status-previsto" },
  pending: { label: "Pendente", className: "status-pendente" },
  failed: { label: "Falhou", className: "status-atencao" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "status-nao-iniciada" };
  return (
    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}

export default StatusBadge;
