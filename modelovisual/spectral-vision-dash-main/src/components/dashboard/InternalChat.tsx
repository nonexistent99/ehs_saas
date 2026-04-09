import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Circle,
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isAdmin: boolean;
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Daniel Rodrigues",
    avatar: "DR",
    status: "online",
    lastMessage: "Ok, vou verificar agora",
    lastMessageTime: new Date(Date.now() - 300000),
    unreadCount: 2,
  },
  {
    id: "2",
    name: "Rodrigo Silva",
    avatar: "RS",
    status: "online",
    lastMessage: "A inspeção foi concluída",
    lastMessageTime: new Date(Date.now() - 1800000),
  },
  {
    id: "3",
    name: "Cleder Gobi",
    avatar: "CG",
    status: "away",
    lastMessage: "Pode me enviar o relatório?",
    lastMessageTime: new Date(Date.now() - 3600000),
    unreadCount: 1,
  },
  {
    id: "4",
    name: "Luciano Machado",
    avatar: "LM",
    status: "offline",
    lastMessage: "Obrigado pela ajuda!",
    lastMessageTime: new Date(Date.now() - 86400000),
  },
  {
    id: "5",
    name: "Cliente Teste",
    avatar: "CT",
    status: "offline",
    lastMessage: "Quando será a próxima inspeção?",
    lastMessageTime: new Date(Date.now() - 172800000),
  },
];

const mockMessages: Record<string, Message[]> = {
  "1": [
    { id: "1", senderId: "1", content: "Olá, preciso de ajuda com a inspeção", timestamp: new Date(Date.now() - 600000), isAdmin: false },
    { id: "2", senderId: "admin", content: "Claro! O que você precisa?", timestamp: new Date(Date.now() - 500000), isAdmin: true },
    { id: "3", senderId: "1", content: "Qual NR devo aplicar para trabalho em altura?", timestamp: new Date(Date.now() - 400000), isAdmin: false },
    { id: "4", senderId: "admin", content: "Para trabalho em altura, você deve aplicar a NR-35. Ela estabelece os requisitos mínimos para este tipo de atividade.", timestamp: new Date(Date.now() - 350000), isAdmin: true },
    { id: "5", senderId: "1", content: "Ok, vou verificar agora", timestamp: new Date(Date.now() - 300000), isAdmin: false },
  ],
  "2": [
    { id: "1", senderId: "2", content: "A inspeção da empresa MSB foi concluída", timestamp: new Date(Date.now() - 2000000), isAdmin: false },
    { id: "2", senderId: "admin", content: "Ótimo trabalho! Pode enviar o relatório?", timestamp: new Date(Date.now() - 1900000), isAdmin: true },
    { id: "3", senderId: "2", content: "A inspeção foi concluída", timestamp: new Date(Date.now() - 1800000), isAdmin: false },
  ],
  "3": [
    { id: "1", senderId: "3", content: "Pode me enviar o relatório?", timestamp: new Date(Date.now() - 3600000), isAdmin: false },
  ],
};

export function InternalChat() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredUsers = mockUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (selectedUser) {
      setMessages(mockMessages[selectedUser.id] || []);
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "admin",
      content: message,
      timestamp: new Date(),
      isAdmin: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-muted-foreground";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Ontem";
    } else {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setSelectedUser(null);
    setSearchTerm("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    setSearchTerm("");
    setMessage("");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card 
          className="glass-card border-primary/20 overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
          onClick={handleOpenDialog}
        >
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent py-3 px-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-foreground">Chat Interno</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Comunicação com usuários
                </p>
              </div>
              <Badge variant="outline" className="text-xs mr-2">
                {mockUsers.filter((u) => u.status === "online").length} online
              </Badge>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors">
                <ExternalLink className="h-4 w-4 text-primary" />
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Chat Dialog Popup */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl h-[600px] p-0 gap-0 bg-background border-primary/30">
          <DialogHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent p-4">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-foreground">Chat Interno</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Selecione um usuário para iniciar a conversa
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-[calc(600px-73px)]">
            {/* User List */}
            <AnimatePresence mode="wait">
              {!selectedUser && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full border-r border-border/50"
                >
                  {/* Search */}
                  <div className="p-3 border-b border-border/50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 bg-muted/30 border-border/50"
                      />
                    </div>
                  </div>

                  {/* User List */}
                  <ScrollArea className="h-[calc(100%-57px)]">
                    <div className="divide-y divide-border/30">
                      {filteredUsers.map((user, index) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedUser(user)}
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10 border border-border/50">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <Circle
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${getStatusColor(user.status)} rounded-full border-2 border-background`}
                              fill="currentColor"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground truncate">
                                {user.name}
                              </span>
                              {user.lastMessageTime && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatTime(user.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground truncate">
                                {user.lastMessage}
                              </span>
                              {user.unreadCount && (
                                <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-[10px]">
                                  {user.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}

              {/* Chat View */}
              {selectedUser && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-full flex flex-col"
                >
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-muted/20">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedUser(null)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="relative">
                      <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {selectedUser.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 ${getStatusColor(selectedUser.status)} rounded-full border-2 border-background`}
                        fill="currentColor"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">
                        {selectedUser.name}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {selectedUser.status === "online"
                          ? "Online"
                          : selectedUser.status === "away"
                          ? "Ausente"
                          : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {messages.map((msg, index) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                              msg.isAdmin
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted/50 text-foreground rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <span
                              className={`text-[10px] ${
                                msg.isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {msg.timestamp.toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-3 border-t border-border/50 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="h-9 bg-background/50 border-border/50"
                      />
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-primary hover:bg-primary/90 shrink-0"
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
