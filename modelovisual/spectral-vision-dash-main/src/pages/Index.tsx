import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentInspections } from "@/components/dashboard/RecentInspections";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { CompanySelector } from "@/components/dashboard/CompanySelector";
import { WhatsAppNotification } from "@/components/dashboard/WhatsAppNotification";
import { InternalChat } from "@/components/dashboard/InternalChat";
import { EmailNotification } from "@/components/dashboard/EmailNotification";
import {
  ClipboardCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo ao painel de controle EHS
            </p>
          </div>
          <div className="w-full sm:w-72">
            <CompanySelector />
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total de Inspeções"
            value={12}
            subtitle="inspeções"
            icon={ClipboardCheck}
            variant="primary"
            delay={0}
          />
          <StatCard
            title="Não Iniciadas"
            value={3}
            subtitle="aguardando início"
            icon={XCircle}
            variant="default"
            delay={100}
          />
          <StatCard
            title="Pendentes"
            value={9}
            subtitle="em andamento"
            icon={Clock}
            variant="warning"
            delay={200}
          />
          <StatCard
            title="Atenção"
            value={0}
            subtitle="requer atenção"
            icon={AlertTriangle}
            variant="destructive"
            delay={300}
          />
          <StatCard
            title="Concluídas"
            value={0}
            subtitle="finalizadas"
            icon={CheckCircle2}
            variant="success"
            delay={400}
          />
        </div>

        {/* Quick Stats Row */}
        <QuickStats />

        {/* Communication Section - WhatsApp, Email & Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <WhatsAppNotification />
          <EmailNotification />
          <InternalChat />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RecentInspections />
          <WeeklyChart />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
