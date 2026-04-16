import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { CheckCheck, MessageSquare, Send, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rawMessages = [], isLoading, error } = trpc.chat.messages.useQuery(
    { limit: 100 },
    { refetchInterval: 3000, retry: 2 }
  );

  // Show error if query fails
  useEffect(() => {
    if (error) {
      console.error("Chat error:", error);
      toast.error("Erro ao carregar mensagens", { description: error.message });
    }
  }, [error]);

  // Server returns { message: chatMessageRow, sender: userRow } in DESC order
  // We need to reverse for chronological display and normalize the shape
  const messages = useMemo(() => {
    if (!Array.isArray(rawMessages)) return [];
    return [...rawMessages]
      .filter((entry: any) => entry?.message?.id != null)
      .reverse()
      .map((entry: any) => ({
        id: entry.message.id,
        text: entry.message.message ?? "",
        senderId: entry.message.senderId ?? null,
        senderName: entry.sender?.name || "Usuário",
        isRead: entry.message.isRead ?? false,
        readAt: entry.message.readAt ?? null,
        createdAt: entry.message.createdAt ?? null,
      }));
  }, [rawMessages]);

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.chat.messages.invalidate();
    },
    onError: (err: any) => {
      console.error("Send error:", err);
      toast.error("Erro ao enviar mensagem", { description: err.message });
    },
  });

  const markReadMutation = trpc.chat.markRead.useMutation({
    onError: (err: any) => {
      console.error("Mark read error:", err);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const hasUnread = messages.some((m: any) => !m.isRead && m.senderId !== user?.id);
      if (hasUnread) markReadMutation.mutate({});
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ message: message.trim() });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
            <MessageSquare className="text-primary" size={22} />
            Chat Interno
          </h1>
          <p className="text-muted-foreground text-sm">
            Comunicação em tempo real com a equipe
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
          <Users size={14} className="text-primary" />
          <span className="font-bold text-foreground">{messages.length}</span>
          <span>mensagens</span>
        </div>
      </div>

      {/* Chat Card */}
      <Card className="glass border-border/40 overflow-hidden">
        <CardHeader className="pb-0 bg-muted/5 border-b border-border/30 py-3">
          <CardTitle className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-[0.15em]">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Canal Geral da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col" style={{ height: "calc(100vh - 320px)", minHeight: "400px" }}>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                    <div className="h-12 w-48 bg-muted/50 rounded-2xl animate-pulse" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <MessageSquare size={48} className="text-destructive opacity-40 mb-3" />
                <p className="text-foreground text-sm font-bold mb-1">Erro ao carregar mensagens</p>
                <p className="text-muted-foreground text-xs">{error.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs font-bold"
                  onClick={() => utils.chat.messages.invalidate()}
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare size={28} className="text-primary" />
                </div>
                <p className="text-foreground text-sm font-bold mb-1">Nenhuma mensagem ainda</p>
                <p className="text-muted-foreground text-xs">Inicie a conversa com a equipe!</p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isOwn = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[70%] flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
                      {!isOwn && (
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">{getInitials(msg.senderName)}</span>
                          </div>
                          <span className="text-xs text-primary font-bold">{msg.senderName}</span>
                        </div>
                      )}
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm shadow-md"
                          : "bg-secondary text-secondary-foreground rounded-bl-sm border border-border/30"
                      )}>
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                        {isOwn && msg.isRead && (
                          <CheckCheck size={12} className="text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 p-4 bg-muted/5">
            <div className="flex gap-3">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="bg-background border-border/50 flex-1 text-foreground placeholder:text-muted-foreground"
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
                className="bg-primary text-primary-foreground px-4 hover:bg-primary/90 shadow-[0_0_10px_-3px_hsla(var(--primary),0.4)]"
              >
                <Send size={16} />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              Pressione Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
