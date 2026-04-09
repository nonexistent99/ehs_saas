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
  Mail,
  Send,
  Paperclip,
  CheckCheck,
  Clock,
  Building2,
  X,
  FileText,
  Image,
  AtSign,
  Type,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
  email: string;
  contact: string;
}

interface EmailHistory {
  id: string;
  recipients: string[];
  subject: string;
  message: string;
  hasAttachment: boolean;
  status: "enviado" | "pendente" | "erro";
  timestamp: Date;
}

const mockCompanies: Company[] = [
  { id: "1", name: "Equipe EHS", email: "contato@equipeehs.com.br", contact: "Daniel Rodrigues" },
  { id: "2", name: "MSB Barcelona", email: "barcelona@msb.com", contact: "Carlos Martinez" },
  { id: "3", name: "MSB Madrid", email: "madrid@msb.com", contact: "Ana García" },
  { id: "4", name: "MSB Valencia", email: "valencia@msb.com", contact: "Pedro Sanchez" },
];

export function EmailNotification() {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([
    {
      id: "1",
      recipients: ["Equipe EHS", "MSB Barcelona"],
      subject: "Relatório Mensal de Inspeções - Janeiro 2026",
      message: "Segue em anexo o relatório mensal de inspeções...",
      hasAttachment: true,
      status: "enviado",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      recipients: ["MSB Madrid"],
      subject: "Agendamento de Inspeção",
      message: "Prezados, gostaríamos de agendar uma inspeção...",
      hasAttachment: false,
      status: "enviado",
      timestamp: new Date(Date.now() - 86400000),
    },
    {
      id: "3",
      recipients: ["MSB Valencia"],
      subject: "Pendências NR-35",
      message: "Identificamos algumas pendências...",
      hasAttachment: true,
      status: "erro",
      timestamp: new Date(Date.now() - 172800000),
    },
  ]);

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const selectAllCompanies = () => {
    if (selectedCompanies.length === mockCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(mockCompanies.map((c) => c.id));
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({
        title: "Erro",
        description: "Digite um assunto para o e-mail",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem para o e-mail",
        variant: "destructive",
      });
      return;
    }

    if (selectedCompanies.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma empresa destinatária",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const recipients = selectedCompanies.map(
      (id) => mockCompanies.find((c) => c.id === id)?.name || ""
    );

    const newEmail: EmailHistory = {
      id: Date.now().toString(),
      recipients,
      subject,
      message,
      hasAttachment: attachedFiles.length > 0,
      status: "enviado",
      timestamp: new Date(),
    };

    setEmailHistory((prev) => [newEmail, ...prev]);
    setSubject("");
    setMessage("");
    setAttachedFiles([]);
    setSelectedCompanies([]);
    setIsSending(false);

    toast({
      title: "E-mail enviado!",
      description: `Enviado para ${recipients.length} empresa(s)`,
    });
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getTotalFileSize = () => {
    const totalBytes = attachedFiles.reduce((acc, file) => acc + file.size, 0);
    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-card border-primary/20 overflow-hidden">
        <CardHeader 
          className="border-b border-border/50 bg-gradient-to-r from-blue-500/10 to-transparent cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <span className="text-foreground">Notificações por E-mail</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Envie e-mails para empresas cadastradas
              </p>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
            >
              <ChevronDown className="h-5 w-5 text-blue-500" />
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
                <Building2 className="h-3 w-3 mr-1" />
                Empresas
              </TabsTrigger>
              <TabsTrigger value="mensagem" className="text-xs">
                <Send className="h-3 w-3 mr-1" />
                Compor
              </TabsTrigger>
              <TabsTrigger value="historico" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="destinatarios" className="space-y-4 mt-4">
              {/* Companies Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Empresas Cadastradas
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllCompanies}
                    className="text-xs text-blue-500 hover:text-blue-400"
                  >
                    {selectedCompanies.length === mockCompanies.length
                      ? "Desmarcar todas"
                      : "Selecionar todas"}
                  </Button>
                </div>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {mockCompanies.map((company, index) => (
                      <motion.div
                        key={company.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedCompanies.includes(company.id)
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-border/50 hover:border-blue-500/50"
                        }`}
                        onClick={() => toggleCompany(company.id)}
                      >
                        <Checkbox
                          checked={selectedCompanies.includes(company.id)}
                          className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {company.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <AtSign className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-blue-400 truncate">
                              {company.email}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            Contato: {company.contact}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {selectedCompanies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20"
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="text-blue-500 font-medium">
                      {selectedCompanies.length}
                    </span>{" "}
                    empresa(s) selecionada(s)
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedCompanies.map((id) => {
                      const company = mockCompanies.find((c) => c.id === id);
                      return (
                        <Badge
                          key={id}
                          variant="outline"
                          className="text-[10px] border-blue-500/30 bg-blue-500/10 text-blue-400"
                        >
                          {company?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="mensagem" className="space-y-4 mt-4">
              {/* Subject Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Assunto</span>
                </div>
                <Input
                  placeholder="Digite o assunto do e-mail..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Mensagem</span>
                </div>
                <Textarea
                  placeholder="Digite o conteúdo do e-mail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] bg-muted/30 border-border/50 resize-none"
                />
              </div>

              {/* Attached Files Preview */}
              <AnimatePresence>
                {attachedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {attachedFiles.length} arquivo(s) anexado(s)
                      </span>
                      <span className="text-xs text-blue-400">
                        Total: {getTotalFileSize()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {attachedFiles.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50"
                        >
                          {getFileIcon(file.name)}
                          <span className="text-xs text-foreground flex-1 truncate">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="email-file-upload"
                  className="hidden"
                  multiple
                  onChange={handleFileAttach}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-border/50"
                  onClick={() => document.getElementById("email-file-upload")?.click()}
                >
                  <Paperclip className="h-4 w-4 mr-1" />
                  Anexar Arquivos
                </Button>
              </div>

              {/* Send Button */}
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
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
                {isSending ? "Enviando..." : "Enviar E-mail"}
              </Button>
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {emailHistory.map((email, index) => (
                    <motion.div
                      key={email.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">
                              {email.subject}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {email.message}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${
                            email.status === "enviado"
                              ? "border-green-500/30 bg-green-500/10 text-green-500"
                              : email.status === "pendente"
                              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                              : "border-red-500/30 bg-red-500/10 text-red-500"
                          }`}
                        >
                          {email.status === "enviado" ? (
                            <CheckCheck className="h-3 w-3 mr-1" />
                          ) : email.status === "erro" ? (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {email.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>Para: {email.recipients.join(", ")}</span>
                          {email.hasAttachment && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                              Anexo
                            </Badge>
                          )}
                        </div>
                        <span>
                          {email.timestamp.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}{" "}
                          às{" "}
                          {email.timestamp.toLocaleTimeString("pt-BR", {
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
