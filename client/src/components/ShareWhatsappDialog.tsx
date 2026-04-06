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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("none");
  const [selectedObraId, setSelectedObraId] = useState<string>("none");
  
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState("");

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const { data: companies } = trpc.companies.list.useQuery();
  const { data: obrasResponse } = trpc.obras.list.useQuery();
  const obras = obrasResponse || [];

  // Update message when dialog opens or props change
  useEffect(() => {
    setMessage(`Confira o documento: ${title}\n${documentUrl || ""}`);
  }, [title, documentUrl, open]);

  const sendNotificationMutation = trpc.notifications.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
      setOpen(false);
      setPhoneInput("");
      setEmailInput("");
      setSelectedContacts([]);
    },
    onError: (err) => {
      toast.error(`Erro ao enviar: ${err.message}`);
    }
  });

  const shareDocumentMutation = trpc.wapi.shareDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento PDF enviado com sucesso!");
      setOpen(false);
      setPhoneInput("");
      setEmailInput("");
      setSelectedContacts([]);
    },
    onError: (err) => {
      toast.error(`Erro ao enviar documento: ${err.message}`);
    }
  });

  const handleSend = () => {
    // Collect all contacts
    const phonesToUse: string[] = [];
    const emailsToUse: string[] = [];
    
    // Add manual inputs
    if (phoneInput) phonesToUse.push(phoneInput.replace(/\D/g, ""));
    if (emailInput) emailsToUse.push(emailInput.trim());

    // Add selected ones
    for (const c of selectedContacts) {
       if (c.includes("@")) emailsToUse.push(c);
       else phonesToUse.push(c.replace(/\D/g, ""));
    }

    if (phonesToUse.length === 0 && emailsToUse.length === 0) {
      toast.error("Por favor, insira ou selecione pelo menos um contato (WhatsApp ou Email)");
      return;
    }

    if (documentType && documentId) {
      shareDocumentMutation.mutate({
        phones: phonesToUse,
        emails: emailsToUse,
        message,
        documentType,
        documentId,
      });
    } else {
      sendNotificationMutation.mutate({
        type: "whatsapp",
        title: "Documento Compartilhado",
        message: message,
        recipientPhone: phonesToUse[0] || "",
      });
      // Email could be handled by sendNotificationMutation as well if it accepts recipientEmail
    }
  };

  const handleCompanyChange = (val: string) => {
    setSelectedCompanyId(val);
    setSelectedObraId("none");
  };

  const getAvailableContacts = () => {
    const list: string[] = [];
    if (selectedCompanyId !== "none") {
      const c = companies?.find(x => x.id.toString() === selectedCompanyId);
      if (c) {
        if (c.phone) list.push(c.phone);
        if (c.phones && Array.isArray(c.phones)) c.phones.forEach((p: string) => list.push(p));
        if (c.email) list.push(c.email);
        if (c.emails && Array.isArray(c.emails)) c.emails.forEach((e: string) => list.push(e));
      }
    }
    if (selectedObraId !== "none") {
      const o = obras.find((x: any) => x.id.toString() === selectedObraId);
      if (o) {
        if (o.phones && Array.isArray(o.phones)) o.phones.forEach((p: string) => list.push(p));
        if (o.emails && Array.isArray(o.emails)) o.emails.forEach((e: string) => list.push(e));
      }
    }
    return Array.from(new Set(list)).filter(Boolean);
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
          
          <div className="space-y-4 max-h-64 overflow-auto pr-2">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Opcional...</SelectItem>
                  {companies?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Obra</Label>
              <Select value={selectedObraId} onValueChange={setSelectedObraId} disabled={selectedCompanyId === "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Opcional...</SelectItem>
                  {obras
                    .filter((o: any) => o.companyId.toString() === selectedCompanyId)
                    .map((o: any) => (
                      <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {getAvailableContacts().length > 0 && (
              <div className="space-y-2 rounded border border-border p-3 bg-secondary/20">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Contatos Cadastrados</Label>
                <div className="flex flex-col gap-2">
                  {getAvailableContacts().map((cont) => (
                    <label key={cont} className="flex items-center gap-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={selectedContacts.includes(cont)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedContacts(prev => [...prev, cont]);
                          else setSelectedContacts(prev => prev.filter(x => x !== cont));
                        }}
                        className="rounded border-border"
                      />
                      {cont}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-2">
                 <Label>WhatsApp (Novo)</Label>
                 <Input 
                   placeholder="Ex: 11999999999" 
                   value={phoneInput} 
                   onChange={e => setPhoneInput(e.target.value)}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Email (Novo)</Label>
                 <Input 
                   type="email"
                   placeholder="Ex: admin@mail.com" 
                   value={emailInput} 
                   onChange={e => setEmailInput(e.target.value)}
                 />
               </div>
            </div>
            
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
              />
              {documentType && (
                <p className="text-xs text-muted-foreground mt-1 leading-tight">
                  * O PDF deste documento será processado e enviado automaticamente via WhatsApp e E-mail escolhidos.
                </p>
              )}
            </div>
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
