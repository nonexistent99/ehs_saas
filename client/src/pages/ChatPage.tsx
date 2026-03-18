import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function ChatPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = trpc.chat.messages.useQuery(
    { limit: 100 },
    { refetchInterval: 3000 }
  );

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.chat.messages.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markReadMutation = trpc.chat.markRead.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const hasUnread = messages.some((m: any) => !m.readAt && m.userId !== user?.id);
    if (hasUnread) markReadMutation.mutate({});
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ message });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Chat Interno"
        subtitle="Comunicação em tempo real com a equipe"
      />

      <div className="flex-1 flex flex-col p-6 min-h-0">
        <Card className="bg-card border-border flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-secondary rounded-lg animate-pulse" />)}</div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <MessageSquare size={40} className="text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda. Inicie a conversa!</p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isOwn = msg.userId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        {!isOwn && (
                          <span className="text-xs text-primary font-semibold px-1">{msg.user?.name || "Usuário"}</span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        }`}>
                          {msg.message}
                        </div>
                        <span className="text-xs text-muted-foreground px-1">
                          {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              <div className="flex gap-3">
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="bg-secondary border-border flex-1"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  className="bg-primary text-primary-foreground px-4"
                >
                  <Send size={16} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Pressione Enter para enviar · Shift+Enter para nova linha</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
