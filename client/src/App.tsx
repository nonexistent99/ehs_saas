import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import EHSLayout from "./components/EHSLayout";
import { useAuth } from "./_core/hooks/useAuth";

// Pages
import Dashboard from "./pages/Dashboard";
import UsersList from "./pages/users/UsersList";
import UserForm from "./pages/users/UserForm";
import CompaniesList from "./pages/companies/CompaniesList";
import CompanyForm from "./pages/companies/CompanyForm";
import CompanyDetail from "./pages/companies/CompanyDetail";
import ChecklistExecutionsList from "./pages/checklists/ChecklistExecutionsList";
import ChecklistExecutionForm from "./pages/checklists/ChecklistExecutionForm";
import ChecklistTemplatesList from "./pages/checklists/ChecklistTemplatesList";
import ChecklistTemplateForm from "./pages/checklists/ChecklistTemplateForm";
import InspectionsList from "./pages/inspections/InspectionsList";
import InspectionForm from "./pages/inspections/InspectionForm";
import InspectionDetail from "./pages/inspections/InspectionDetail";
import PGRPage from "./pages/pgr/PGRPage";
import AdvertenciasPage from "./pages/seguranca/AdvertenciasPage";
import APRPage from "./pages/seguranca/APRPage";
import EPIPage from "./pages/seguranca/EPIPage";
import ITSPage from "./pages/seguranca/ITSPage";
import PTPage from "./pages/seguranca/PTPage";
import TactdriverPage from "./pages/seguranca/TactdriverPage";
import TreinamentosPage from "./pages/seguranca/TreinamentosPage";
import NotificacoesPage from "./pages/NotificacoesPage";
import ChatPage from "./pages/ChatPage";
import NRsPage from "./pages/nrs/NRsPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return (
    <EHSLayout>
      <Component />
    </EHSLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => {
        const { isAuthenticated, loading } = useAuth();
        if (!loading && isAuthenticated) {
          window.location.href = "/dashboard";
          return null;
        }
        if (!loading && !isAuthenticated) {
          window.location.href = "/login";
          return null;
        }
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
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
