import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Send,
  Paperclip,
  Mic,
  CheckCheck,
  Clock,
  Building2,
  Users,
  X,
  FileText,
  Image,
  Music,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
  company: string;
}

interface MessageHistory {
  id: string;
  recipients: string[];
  message: string;
  type: "text" | "file" | "audio";
  status: "enviado" | "pendente" | "erro";
  timestamp: Date;
}

const mockCompanies: Company[] = [
  { id: "1", name: "Equipe EHS" },
  { id: "2", name: "MSB Barcelona" },
  { id: "3", name: "MSB Madrid" },
  { id: "4", name: "MSB Valencia" },
];

const mockUsers: User[] = [
  { id: "1", name: "Daniel Rodrigues", phone: "+55 11 99999-0001", company: "Equipe EHS" },
  { id: "2", name: "Rodrigo Silva", phone: "+55 11 99999-0002", company: "Equipe EHS" },
  { id: "3", name: "Cleder Gobi", phone: "+55 11 99999-0003", company: "MSB Barcelona" },
  { id: "4", name: "Luciano Machado", phone: "+55 11 99999-0004", company: "MSB Madrid" },
  { id: "5", name: "Cliente Teste", phone: "+55 11 99999-0005", company: "MSB Valencia" },
];

export function WhatsAppNotification() {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([
    {
      id: "1",
      recipients: ["Daniel Rodrigues", "Rodrigo Silva"],
      message: "Lembrete: Inspeção agendada para amanhã às 14h",
      type: "text",
      status: "enviado",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      recipients: ["Cleder Gobi"],
      message: "Relatório de inspeção anexado",
      type: "file",
      status: "enviado",
      timestamp: new Date(Date.now() - 7200000),
    },
  ]);

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === mockUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(mockUsers.map((u) => u.id));
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
  };

  const handleSend = async () => {
    if (!message.trim() && !attachedFile) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem ou anexe um arquivo",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0 && selectedCompanies.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um destinatário",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const recipients = selectedUsers.map(
      (id) => mockUsers.find((u) => u.id === id)?.name || ""
    );

    const newMessage: MessageHistory = {
      id: Date.now().toString(),
      recipients,
      message: message || attachedFile?.name || "Áudio",
      type: attachedFile ? "file" : "text",
      status: "enviado",
      timestamp: new Date(),
    };

    setMessageHistory((prev) => [newMessage, ...prev]);
    setMessage("");
    setAttachedFile(null);
    setSelectedUsers([]);
    setSelectedCompanies([]);
    setIsSending(false);

    toast({
      title: "Mensagem enviada!",
      description: `Enviado para ${recipients.length} destinatário(s)`,
    });
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <Image className="h-4 w-4" />;
    if (fileName.match(/\.(mp3|wav|ogg)$/i)) return <Music className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card border-primary/20 overflow-hidden">
        <CardHeader 
          className="border-b border-border/50 bg-gradient-to-r from-green-500/10 to-transparent cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/20">
              <MessageCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <span className="text-foreground">Notificações WhatsApp</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Envie mensagens para empresas e usuários
              </p>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
            >
              <ChevronDown className="h-5 w-5 text-green-500" />
            </motion.div>
          </CardTitle>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CardContent className="p-4 space-y-4">
          <Tabs defaultValue="destinatarios" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="destinatarios" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Destinatários
              </TabsTrigger>
              <TabsTrigger value="mensagem" className="text-xs">
                <Send className="h-3 w-3 mr-1" />
                Mensagem
              </TabsTrigger>
              <TabsTrigger value="historico" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="destinatarios" className="space-y-4 mt-4">
              {/* Companies */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Empresas
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {mockCompanies.map((company) => (
                    <motion.div
                      key={company.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        selectedCompanies.includes(company.id)
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50"
                      }`}
                      onClick={() => toggleCompany(company.id)}
                    >
                      <Checkbox
                        checked={selectedCompanies.includes(company.id)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className="text-xs text-foreground truncate">
                        {company.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Users */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Usuários
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllUsers}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    {selectedUsers.length === mockUsers.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </Button>
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {mockUsers.map((user) => (
                      <motion.div
                        key={user.id}
                        whileHover={{ x: 4 }}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          selectedUsers.includes(user.id)
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50"
                        }`}
                        onClick={() => toggleUser(user.id)}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground block truncate">
                            {user.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {user.phone}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {user.company}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {(selectedUsers.length > 0 || selectedCompanies.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-2 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-medium">
                      {selectedUsers.length + selectedCompanies.length}
                    </span>{" "}
                    destinatário(s) selecionado(s)
                  </p>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="mensagem" className="space-y-4 mt-4">
              {/* Message Input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] bg-muted/30 border-border/50 resize-none"
                />

                {/* Attached File Preview */}
                <AnimatePresence>
                  {attachedFile && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50"
                    >
                      {getFileIcon(attachedFile.name)}
                      <span className="text-xs text-foreground flex-1 truncate">
                        {attachedFile.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={removeFile}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileAttach}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Anexar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${isRecording ? "bg-red-500/20 text-red-500 border-red-500/50" : ""}`}
                    onClick={() => setIsRecording(!isRecording)}
                  >
                    <Mic className={`h-4 w-4 mr-1 ${isRecording ? "animate-pulse" : ""}`} />
                    {isRecording ? "Gravando..." : "Áudio"}
                  </Button>
                </div>
              </div>

              {/* Send Button */}
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                  </motion.div>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {messageHistory.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {msg.type === "file" ? (
                            <FileText className="h-4 w-4 text-blue-400" />
                          ) : msg.type === "audio" ? (
                            <Mic className="h-4 w-4 text-purple-400" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-green-400" />
                          )}
                          <span className="text-xs text-foreground line-clamp-1">
                            {msg.message}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${
                            msg.status === "enviado"
                              ? "border-green-500/30 bg-green-500/10 text-green-500"
                              : msg.status === "pendente"
                              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                              : "border-red-500/30 bg-red-500/10 text-red-500"
                          }`}
                        >
                          <CheckCheck className="h-3 w-3 mr-1" />
                          {msg.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Para: {msg.recipients.join(", ")}</span>
                        <span>
                          {msg.timestamp.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
              </Tabs>
            </CardContent>
          </motion.div>
        )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
