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
  Shield, TrendingUp, Users, Zap, CheckSquare, PlusCircle, ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState } from "react";

const STATUS_COLORS = {
  resolvida: "hsl(142, 71%, 45%)",
  pendente: "hsl(38, 92%, 50%)",
  atencao: "hsl(0, 72%, 51%)",
  nao_iniciada: "hsl(240, 5%, 55%)",
  concluida: "hsl(142, 71%, 45%)", // Aliased to success
};

const STATUS_LABELS: Record<string, string> = {
  resolvida: "Resolvida",
  pendente: "Pendente",
  atencao: "Crítico",
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
    <Card className="glass border-border/40 hover:border-primary/50 transition-all duration-300 cursor-pointer group stat-card card-hover overflow-hidden">
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em] opacity-70">{title}</p>
            <p className="text-4xl font-black text-white tracking-tight drop-shadow-sm count-up">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground/80 font-medium mt-1.5">{subtitle}</p>}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner",
            color
          )}>
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
      <div className="flex items-center justify-between flex-wrap gap-4 bg-muted/10 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Zap className="text-primary fill-primary/20" size={24} />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Bem-vindo ao centro de comando, <span className="text-primary font-bold gradient-text">{user?.name || "Operador"}</span>
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Admin Multi-Tenant Company Selector */}
          {isAdmin && companies.length > 0 && (
            <Select
              value={selectedCompanyId?.toString() || "all"}
              onValueChange={(v: string) => setSelectedCompanyId(v === "all" ? undefined : Number(v))}
            >
              <SelectTrigger className="w-60 h-10 glass text-xs font-bold border-white/10">
                <Building2 size={14} className="mr-2 text-primary" />
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="all" className="text-xs font-bold font-mono">🏢 Todas as empresas</SelectItem>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Link href="/relatorios/novo">
            <Button size="lg" variant="glow" className="h-10 text-xs font-bold uppercase tracking-wider">
              <PlusCircle size={16} className="mr-2" />
              Nova Inspeção
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
          <Card className="glass border-border/40 overflow-hidden">
            <CardHeader className="pb-4 bg-muted/5 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                <TrendingUp size={14} className="text-primary" />
                Produtividade Semanal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontWeight: 600 }} 
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{
                      backgroundColor: "rgba(13, 13, 15, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      backdropBlur: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                    itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px", fontWeight: "bold" }}
                    labelStyle={{ color: "white", marginBottom: "4px", fontSize: "11px" }}
                  />
                  <Bar 
                    dataKey="inspeções" 
                    fill="url(#colorBar)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={24}
                  />
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart - Status */}
        <Card className="glass border-border/40 overflow-hidden">
          <CardHeader className="pb-4 bg-muted/5 border-b border-border/30">
            <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-widest">
              <Zap size={14} className="text-primary" />
              Distribuição de Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(13, 13, 15, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      backdropBlur: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm font-medium opacity-50">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklists Stats */}
      <h2 className="text-[11px] font-black text-white mt-8 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
        <ClipboardList size={16} className="text-primary" />
        Gestão de Checklists
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pendentes"
          value={stats?.pendingChecklists ?? 0}
          icon={<Clock size={18} className="text-orange-400" />}
          color="bg-orange-500/10"
          subtitle="Cronograma atual"
          href="/checklists/realizados"
        />
        <StatCard
          title="Atrasados"
          value={stats?.overdueChecklists ?? 0}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="bg-red-500/10"
          subtitle="Ações urgentes"
          href="/checklists/realizados"
        />
        <StatCard
          title="Conformidade"
          value={((stats?.averageChecklistScore || 0)).toFixed(1) + "%"}
          icon={<CheckSquare size={18} className="text-green-400" />}
          color="bg-green-500/10"
          subtitle="Performance global"
          href="/checklists/realizados"
        />
      </div>

      {/* Recent Inspections */}
      <Card className="glass border-border/40 overflow-hidden mt-8">
        <CardHeader className="pb-4 bg-muted/5 border-b border-border/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-[0.2em]">
              <FileText size={14} className="text-primary" />
              Inspeções Recentes
            </CardTitle>
            <Link href="/relatorios">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 text-[10px] font-bold uppercase tracking-widest h-7">
                Ver Todas <ChevronRight size={12} className="ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stats?.recentInspections && stats.recentInspections.length > 0 ? (
            <div className="divide-y divide-white/5">
              {stats.recentInspections.map((item: any) => (
                <Link key={item.id} href={`/relatorios/${item.id}`}>
                  <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/[0.02] transition-colors cursor-pointer group table-row-hover">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-tight font-medium">
                          {item.companyName} <span className="mx-1 opacity-30">•</span>{" "}
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-[10px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest border shadow-sm",
                        item.status === "atencao" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        item.status === "pendente" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                        "bg-green-500/10 text-green-400 border-green-500/20"
                      )}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-3 opacity-10" />
              <p className="text-sm font-medium">Nenhuma inspeção registrada</p>
              <Link href="/relatorios/novo">
                <Button variant="outline" size="sm" className="mt-4 text-xs font-bold border-white/10">
                  Criar Primeiro Relatório
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {[
          { label: "Novo Relatório", icon: <FileText size={16} />, href: "/relatorios/novo", color: "text-primary" },
          { label: "Nova Empresa", icon: <Building2 size={16} />, href: "/empresas/nova", color: "text-blue-400" },
          { label: "Novo Usuário", icon: <Users size={16} />, href: "/usuarios/novo", color: "text-purple-400" },
          { label: "Nova Inspeção", icon: <ClipboardList size={16} />, href: "/checklists/nova", color: "text-green-400" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="glass border-border/40 hover:border-primary/50 transition-all duration-300 cursor-pointer card-hover">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-white/5", action.color)}>
                  {action.icon}
                </div>
                <span className="text-sm font-bold text-white tracking-tight">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
