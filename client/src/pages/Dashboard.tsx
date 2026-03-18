import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  AlertTriangle, Bell, Building2, CheckCircle2, ClipboardList, Clock, Eye, FileText,
  Shield, TrendingUp, Users, Zap, CheckSquare
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState } from "react";

const STATUS_COLORS = {
  resolvida: "#4ade80",
  pendente: "#fb923c",
  atencao: "#f87171",
  nao_iniciada: "#6b7280",
  concluida: "#60a5fa",
};

const STATUS_LABELS: Record<string, string> = {
  resolvida: "Resolvida",
  pendente: "Pendente",
  atencao: "Atenção",
  nao_iniciada: "Não Iniciada",
  concluida: "Concluída",
};

function StatCard({
  title, value, icon, color, subtitle, href
}: {
  title: string; value: number | string; icon: React.ReactNode;
  color: string; subtitle?: string; href?: string;
}) {
  const content = (
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.ehsRole === "adm_ehs";
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();

  const { data: companies = [] } = trpc.companies.list.useQuery(undefined, { enabled: isAdmin });
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  const pieData = stats ? [
    { name: "Resolvidas", value: stats.resolved, color: STATUS_COLORS.resolvida },
    { name: "Pendentes", value: stats.pending, color: STATUS_COLORS.pendente },
    { name: "Atenção", value: stats.attention, color: STATUS_COLORS.atencao },
    { name: "Não Iniciadas", value: stats.notStarted, color: STATUS_COLORS.nao_iniciada },
  ].filter(d => d.value > 0) : [];

  // Gráfico de barras com dados reais da semana atual
  const barData = stats?.weeklyData || [
    { name: "Seg", inspeções: 0 },
    { name: "Ter", inspeções: 0 },
    { name: "Qua", inspeções: 0 },
    { name: "Qui", inspeções: 0 },
    { name: "Sex", inspeções: 0 },
    { name: "Sáb", inspeções: 0 },
    { name: "Dom", inspeções: 0 },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Bem-vindo, <span className="text-primary font-medium">{user?.name || "Usuário"}</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Admin Multi-Tenant Company Selector */}
          {isAdmin && companies.length > 0 && (
            <Select
              value={selectedCompanyId?.toString() || "all"}
              onValueChange={(v: string) => setSelectedCompanyId(v === "all" ? undefined : Number(v))}
            >
              <SelectTrigger className="w-52 h-8 text-xs">
                <Building2 size={12} className="mr-1 text-primary" />
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🏢 Todas as empresas</SelectItem>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Link href="/relatorios/novo">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <FileText size={14} className="mr-2" />
              Novo Relatório
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Inspeções"
          value={stats?.totalInspections ?? 0}
          icon={<ClipboardList size={18} className="text-blue-400" />}
          color="bg-blue-500/10"
          href="/relatorios"
        />
        <StatCard
          title="Pendentes"
          value={stats?.pending ?? 0}
          icon={<Clock size={18} className="text-orange-400" />}
          color="bg-orange-500/10"
          subtitle="Aguardando resolução"
          href="/relatorios?status=pendente"
        />
        <StatCard
          title="Atenção"
          value={stats?.attention ?? 0}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="bg-red-500/10"
          subtitle="Requer ação imediata"
          href="/relatorios?status=atencao"
        />
        <StatCard
          title="Resolvidas"
          value={stats?.resolved ?? 0}
          icon={<CheckCircle2 size={18} className="text-green-400" />}
          color="bg-green-500/10"
          href="/relatorios?status=resolvida"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Usuários Ativos"
          value={stats?.totalUsers ?? 0}
          icon={<Users size={18} className="text-purple-400" />}
          color="bg-purple-500/10"
          href="/usuarios"
        />
        <StatCard
          title="Empresas Ativas"
          value={stats?.totalCompanies ?? 0}
          icon={<Building2 size={18} className="text-primary" />}
          color="bg-primary/10"
          href="/empresas"
        />
        <StatCard
          title="Notif. Enviadas"
          value={stats?.sentNotifications ?? 0}
          icon={<Bell size={18} className="text-yellow-400" />}
          color="bg-yellow-500/10"
          href="/notificacoes"
        />
        <StatCard
          title="Notif. Lidas"
          value={stats?.readNotifications ?? 0}
          icon={<Eye size={18} className="text-cyan-400" />}
          color="bg-cyan-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Weekly */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Inspeções por Dia (Semana Atual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.60 0.01 240)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.60 0.01 240)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.01 240)",
                      border: "1px solid oklch(0.25 0.01 240)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.005 240)",
                    }}
                  />
                  <Bar dataKey="inspeções" fill="oklch(0.68 0.18 45)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart - Status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              Status das Inspeções
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.01 240)",
                      border: "1px solid oklch(0.25 0.01 240)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0.005 240)",
                    }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: "oklch(0.75 0.01 240)", fontSize: 11 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma inspeção registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklists Stats */}
      <h2 className="text-lg font-semibold text-foreground mt-4 mb-2 flex items-center gap-2">
        <ClipboardList size={20} className="text-primary" />
        Gestão de Checklists
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Checklists Pendentes"
          value={stats?.pendingChecklists ?? 0}
          icon={<Clock size={18} className="text-orange-400" />}
          color="bg-orange-500/10"
          subtitle="Na linha do tempo"
          href="/checklists/realizados"
        />
        <StatCard
          title="Checklists Atrasados"
          value={stats?.overdueChecklists ?? 0}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="bg-red-500/10"
          subtitle="Urgente"
          href="/checklists/realizados"
        />
        <StatCard
          title="Conformidade Média"
          value={((stats?.averageChecklistScore || 0)).toFixed(1) + "%"}
          icon={<CheckSquare size={18} className="text-green-400" />}
          color="bg-green-500/10"
          subtitle="Média Geral"
          href="/checklists/realizados"
        />
      </div>

      {/* Recent Inspections */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Inspeções Recentes
            </CardTitle>
            <Link href="/relatorios">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs h-7">
                Ver todas
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.recentInspections && stats.recentInspections.length > 0 ? (
            <div className="space-y-2">
              {stats.recentInspections.map((item: any) => (
                <Link key={item.id} href={`/relatorios/${item.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.companyName} •{" "}
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      `status-${item.status.replace("_", "-")}`
                    )}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma inspeção registrada ainda</p>
              <Link href="/relatorios/novo">
                <Button size="sm" className="mt-3 bg-primary text-primary-foreground">
                  Criar primeiro relatório
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Novo Relatório", icon: <FileText size={16} />, href: "/relatorios/novo", color: "text-primary" },
          { label: "Nova Empresa", icon: <Building2 size={16} />, href: "/empresas/nova", color: "text-blue-400" },
          { label: "Novo Usuário", icon: <Users size={16} />, href: "/usuarios/novo", color: "text-purple-400" },
          { label: "Nova Inspeção", icon: <ClipboardList size={16} />, href: "/checklists/nova", color: "text-green-400" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className={action.color}>{action.icon}</span>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
