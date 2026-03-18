import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useParams } from "wouter";
import { toast } from "sonner";
import { Download, Edit, FileText, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export default function InspectionDetail() {
  const params = useParams<{ id: string }>();
  const inspectionId = Number(params.id);
  const utils = trpc.useUtils();

  const { data: inspection, isLoading } = trpc.inspections.getById.useQuery({ id: inspectionId });
  const { data: inspectionItems = [] } = trpc.inspections.getItems.useQuery({ inspectionId });
  const { data: chatMessages = [] } = trpc.chat.messages.useQuery({ inspectionId });

  const [chatMsg, setChatMsg] = useState("");

  const sendChatMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setChatMsg("");
      utils.chat.messages.invalidate({ inspectionId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleExportPdf = () => {
    toast.info("Gerando PDF...");
    window.open(`/api/export/inspection/${inspectionId}`, "_blank");
  };

  if (isLoading) {
    return <div className="p-6"><div className="h-48 bg-card rounded-lg animate-pulse" /></div>;
  }

  if (!inspection) {
    return <div className="p-6 text-muted-foreground">Relatório não encontrado</div>;
  }

  const insp = inspection as any;
  const items = inspectionItems as any[];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={insp.title || "Relatório Técnico"}
        subtitle={`Criado em ${new Date(insp.createdAt).toLocaleDateString("pt-BR")}`}
        backHref="/relatorios"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" className="border-border text-xs"
              onClick={handleExportPdf}
            >
              <Download size={13} className="mr-1.5" />
              Exportar PDF
            </Button>
            <Button
              size="sm" className="bg-primary text-primary-foreground text-xs"
              onClick={() => window.location.href = `/relatorios/${inspectionId}/editar`}
            >
              <Edit size={13} className="mr-1.5" />
              Editar
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="details">
          <TabsList className="bg-secondary border border-border mb-6">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="items">Itens ({items.length})</TabsTrigger>
            <TabsTrigger value="chat">Chat ({(chatMessages as any[]).length})</TabsTrigger>
          </TabsList>

          {/* Details */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText size={15} className="text-primary" />
                    Informações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Status", value: <StatusBadge status={insp.status} /> },
                    { label: "Local", value: insp.address || insp.location },
                    { label: "Empresa", value: insp.company?.name },
                    { label: "Descrição", value: insp.description },
                    { label: "Marca d'água", value: insp.watermark },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex justify-between items-start text-sm gap-4">
                      <span className="text-muted-foreground shrink-0">{label}</span>
                      <span className="text-foreground font-medium text-right">{value}</span>
                    </div>
                  ) : null)}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Items */}
          <TabsContent value="items">
            {items.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <FileText size={32} className="mx-auto mb-2 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground text-sm">Nenhum item registrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {items.map((item: any, i: number) => (
                  <Card key={item.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-xs text-muted-foreground font-mono mr-2">#{i + 1}</span>
                          <span className="font-medium text-foreground text-sm">{item.title || `Item ${i + 1}`}</span>
                        </div>
                        <StatusBadge status={item.status || "pendente"} />
                      </div>
                      {item.situacao && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Situação Evidenciada</p>
                          <p className="text-sm text-foreground">{item.situacao}</p>
                        </div>
                      )}
                      {item.planoAcao && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Plano de Ação</p>
                          <p className="text-sm text-foreground">{item.planoAcao}</p>
                        </div>
                      )}
                      {item.observacoes && (
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Observações</p>
                          <p className="text-sm text-foreground">{item.observacoes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                  {(chatMessages as any[]).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare size={28} className="mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    (chatMessages as any[]).map((msg: any) => (
                      <div key={msg.id} className="p-3 bg-secondary/40 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-primary">{msg.user?.name || "Usuário"}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    className="bg-secondary border-border resize-none text-sm"
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (chatMsg.trim()) {
                          sendChatMutation.mutate({ inspectionId, message: chatMsg });
                        }
                      }
                    }}
                  />
                  <Button
                    className="bg-primary text-primary-foreground self-end"
                    onClick={() => chatMsg.trim() && sendChatMutation.mutate({ inspectionId, message: chatMsg })}
                    disabled={!chatMsg.trim() || sendChatMutation.isPending}
                  >
                    Enviar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
