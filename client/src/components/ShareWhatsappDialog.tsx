import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  title: string;
  documentUrl?: string;
  trigger?: React.ReactNode;
  documentType?: "inspection" | "checklist" | "pgr" | "apr" | "pt" | "its" | "treinamento" | "advertencia" | "epi";
  documentId?: number;
}

export function ShareWhatsappDialog({ title, documentUrl, trigger, documentType, documentId }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const { data: companies } = trpc.companies.list.useQuery();

  // Update message when dialog opens or props change
  useEffect(() => {
    setMessage(`Confira o documento: ${title}\n${documentUrl || ""}`);
  }, [title, documentUrl, open]);

  const sendNotificationMutation = trpc.notifications.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
      setOpen(false);
      setPhone("");
    },
    onError: (err) => {
      toast.error(`Erro ao enviar: ${err.message}`);
    }
  });

  const shareDocumentMutation = trpc.wapi.shareDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento PDF enviado com sucesso!");
      setOpen(false);
      setPhone("");
    },
    onError: (err) => {
      toast.error(`Erro ao enviar documento: ${err.message}`);
    }
  });

  const handleSend = () => {
    if (!phone) {
      toast.error("Por favor, insira o número do WhatsApp");
      return;
    }

    if (documentType && documentId) {
      shareDocumentMutation.mutate({
        phone,
        message,
        documentType,
        documentId,
      });
    } else {
      sendNotificationMutation.mutate({
        type: "whatsapp",
        title: "Documento Compartilhado",
        message: message,
        recipientPhone: phone,
      });
    }
  };

  const handleCompanyChange = (val: string) => {
    setSelectedCompanyId(val);
    if (!val || val === "none") return;
    
    const company = companies?.find(c => c.id.toString() === val);
    if (company && company.phone) {
      const clean = company.phone.replace(/\D/g, "");
      if (clean) setPhone(clean);
    }
  };

  const isPending = sendNotificationMutation.isPending || shareDocumentMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageCircle size={14} className="text-green-500" />
            Compartilhar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Compartilhar via WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          
          <div className="space-y-2">
            <Label>Puxar número da Empresa (Opcional)</Label>
            <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione...</SelectItem>
                {companies?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Número do WhatsApp</Label>
            <Input 
              placeholder="Ex: 5511999999999 (Apenas números)" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
            />
            {documentType && (
              <p className="text-xs text-muted-foreground mt-1">
                * O arquivo PDF deste documento será processado e enviado automaticamente junto com a mensagem.
              </p>
            )}
          </div>
          
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white" 
            onClick={handleSend}
            disabled={isPending}
          >
            <Send size={14} className="mr-2" />
            {isPending ? "Enviando..." : "Enviar agora"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
