import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, CheckCheck, Mail, MessageCircle, Plus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function NotificacoesPage() {
  const utils = trpc.useUtils();
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery();
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: "", title: "", message: "", channel: "email" as any, type: "info" as any });

  const sendMutation = trpc.notifications.send.useMutation({
    onSuccess: () => {
      toast.success("Notificação enviada!");
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      setOpen(false);
      setForm({ companyId: "", title: "", message: "", channel: "email", type: "info" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const channelIcon = (channel: string) => {
    if (channel === "whatsapp") return <MessageCircle size={13} className="text-green-500" />;
    if (channel === "email") return <Mail size={13} className="text-blue-500" />;
    return <Bell size={13} className="text-primary" />;
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Notificações"
        subtitle={unreadCount > 0 ? `${unreadCount} não lida(s)` : "Todas lidas"}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus size={14} className="mr-2" />
                Nova Notificação
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Notificação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Empresa (opcional)</Label>
                  <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Todas as empresas" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todas</SelectItem>
                      {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título da notificação" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Mensagem *</Label>
                  <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3} className="bg-secondary border-border resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Canal</Label>
                    <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="sistema">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="info">Informação</SelectItem>
                        <SelectItem value="alerta">Alerta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full bg-primary text-primary-foreground" disabled={sendMutation.isPending}
                  onClick={() => {
                    if (!form.title || !form.message) { toast.error("Título e mensagem são obrigatórios"); return; }
                    sendMutation.mutate({ recipientCompanyId: form.companyId ? Number(form.companyId) : undefined, title: form.title, message: form.message, type: form.channel as any });
                  }}>
                  <Send size={14} className="mr-2" />
                  {sendMutation.isPending ? "Enviando..." : "Enviar Notificação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-3">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />)}</div>
        ) : notifications.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Bell size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${!n.readAt ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
                <div className="mt-0.5">{channelIcon(n.channel)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    {!n.readAt && <Badge className="text-xs bg-primary/20 text-primary border-0 h-4">Nova</Badge>}
                    <Badge variant="outline" className="text-xs h-4 capitalize">{n.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                {!n.readAt && (
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => markReadMutation.mutate({ id: n.id as number })}>
                    <CheckCheck size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
