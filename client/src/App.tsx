import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import EHSLayout from "./components/EHSLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { lazy, Suspense, useEffect } from "react";

// Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UsersList = lazy(() => import("./pages/users/UsersList"));
const UserForm = lazy(() => import("./pages/users/UserForm"));
const CompaniesList = lazy(() => import("./pages/companies/CompaniesList"));
const CompanyForm = lazy(() => import("./pages/companies/CompanyForm"));
const CompanyDetail = lazy(() => import("./pages/companies/CompanyDetail"));
const ChecklistExecutionsList = lazy(() => import("./pages/checklists/ChecklistExecutionsList"));
const ChecklistExecutionForm = lazy(() => import("./pages/checklists/ChecklistExecutionForm"));
const ChecklistTemplatesList = lazy(() => import("./pages/checklists/ChecklistTemplatesList"));
const ChecklistTemplateForm = lazy(() => import("./pages/checklists/ChecklistTemplateForm"));
const InspectionsList = lazy(() => import("./pages/inspections/InspectionsList"));
const InspectionForm = lazy(() => import("./pages/inspections/InspectionForm"));
const InspectionDetail = lazy(() => import("./pages/inspections/InspectionDetail"));
const PGRPage = lazy(() => import("./pages/pgr/PGRPage"));
const AdvertenciasPage = lazy(() => import("./pages/seguranca/AdvertenciasPage"));
const APRPage = lazy(() => import("./pages/seguranca/APRPage"));
const EPIPage = lazy(() => import("./pages/seguranca/EPIPage"));
const ITSPage = lazy(() => import("./pages/seguranca/ITSPage"));
const PTPage = lazy(() => import("./pages/seguranca/PTPage"));
const TactdriverPage = lazy(() => import("./pages/seguranca/TactdriverPage"));
const TreinamentosPage = lazy(() => import("./pages/seguranca/TreinamentosPage"));
const NotificacoesPage = lazy(() => import("./pages/NotificacoesPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const NRsPage = lazy(() => import("./pages/nrs/NRsPage"));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
          <div className="w-6 h-6 bg-primary rounded-md" />
        </div>
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, [loading, isAuthenticated]);

  if (loading || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <EHSLayout>
      <Suspense fallback={<LoadingScreen />}>
        <Component />
      </Suspense>
    </EHSLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => {
        const { isAuthenticated, loading } = useAuth();
        useEffect(() => {
          if (loading) return;
          window.location.href = isAuthenticated ? "/dashboard" : "/login";
        }, [loading, isAuthenticated]);
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 bg-primary rounded-md" />
            </div>
          </div>
        );
      }} />

      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />

      {/* Usuários */}
      <Route path="/usuarios" component={() => <ProtectedRoute component={UsersList} />} />
      <Route path="/usuarios/novo" component={() => <ProtectedRoute component={UserForm} />} />
      <Route path="/usuarios/:id/editar" component={() => <ProtectedRoute component={UserForm} />} />

      {/* Empresas */}
      <Route path="/empresas" component={() => <ProtectedRoute component={CompaniesList} />} />
      <Route path="/empresas/nova" component={() => <ProtectedRoute component={CompanyForm} />} />
      <Route path="/empresas/:id" component={() => <ProtectedRoute component={CompanyDetail} />} />
      <Route path="/empresas/:id/editar" component={() => <ProtectedRoute component={CompanyForm} />} />

      {/* Check Lists */}
      <Route path="/checklists/nova" component={() => <ProtectedRoute component={ChecklistExecutionForm} />} />
      <Route path="/checklists/realizados" component={() => <ProtectedRoute component={ChecklistExecutionsList} />} />
      <Route path="/checklists/realizados/:id" component={() => <ProtectedRoute component={ChecklistExecutionForm} />} />
      <Route path="/checklists/modelos" component={() => <ProtectedRoute component={ChecklistTemplatesList} />} />
      <Route path="/checklists/modelos/novo" component={() => <ProtectedRoute component={ChecklistTemplateForm} />} />
      <Route path="/checklists/modelos/:id/editar" component={() => <ProtectedRoute component={ChecklistTemplateForm} />} />

      {/* Relatórios */}
      <Route path="/relatorios" component={() => <ProtectedRoute component={InspectionsList} />} />
      <Route path="/relatorios/novo" component={() => <ProtectedRoute component={InspectionForm} />} />
      <Route path="/relatorios/editar" component={() => <ProtectedRoute component={InspectionsList} />} />
      <Route path="/relatorios/:id" component={() => <ProtectedRoute component={InspectionDetail} />} />
      <Route path="/relatorios/:id/editar" component={() => <ProtectedRoute component={InspectionForm} />} />

      {/* PGR */}
      <Route path="/pgr" component={() => <ProtectedRoute component={PGRPage} />} />

      {/* Gestão de Segurança */}
      <Route path="/seguranca/advertencias" component={() => <ProtectedRoute component={AdvertenciasPage} />} />
      <Route path="/seguranca/apr" component={() => <ProtectedRoute component={APRPage} />} />
      <Route path="/seguranca/epi" component={() => <ProtectedRoute component={EPIPage} />} />
      <Route path="/seguranca/its" component={() => <ProtectedRoute component={ITSPage} />} />
      <Route path="/seguranca/pt" component={() => <ProtectedRoute component={PTPage} />} />
      <Route path="/seguranca/tactdriver" component={() => <ProtectedRoute component={TactdriverPage} />} />
      <Route path="/seguranca/treinamentos" component={() => <ProtectedRoute component={TreinamentosPage} />} />

      {/* NRs */}
      <Route path="/nrs" component={() => <ProtectedRoute component={NRsPage} />} />

      {/* Notificações e Chat */}
      <Route path="/notificacoes" component={() => <ProtectedRoute component={NotificacoesPage} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={ChatPage} />} />

      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
