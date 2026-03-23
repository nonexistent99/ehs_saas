import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  title: string;
  documentUrl?: string;
  trigger?: React.ReactNode;
}

export function ShareWhatsappDialog({ title, documentUrl, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  // Update message when dialog opens or props change
  useEffect(() => {
    setMessage(`Confira o documento: ${title}\n${documentUrl || ""}`);
  }, [title, documentUrl, open]);

  const sendMutation = trpc.notifications.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
      setOpen(false);
      setPhone("");
    },
    onError: (err) => {
      toast.error(`Erro ao enviar: ${err.message}`);
    }
  });

  const handleSend = () => {
    if (!phone) {
      toast.error("Por favor, insira o número do WhatsApp");
      return;
    }
    sendMutation.mutate({
      type: "whatsapp",
      title: "Documento Compartilhado",
      message: message,
      recipientPhone: phone,
    });
  };

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
          </div>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white" 
            onClick={handleSend}
            disabled={sendMutation.isPending}
          >
            <Send size={14} className="mr-2" />
            {sendMutation.isPending ? "Enviando..." : "Enviar agora"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
