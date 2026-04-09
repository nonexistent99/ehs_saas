import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/Login";

// Inspeções
import CriarInspecao from "./pages/inspecoes/CriarInspecao";
import InspecoesEmAberto from "./pages/inspecoes/InspecoesEmAberto";
import BuscarInspecao from "./pages/inspecoes/BuscarInspecao";
import HistoricoInspecoes from "./pages/inspecoes/HistoricoInspecoes";

// Normas
import ListarNormas from "./pages/normas/ListarNormas";
import CriarNorma from "./pages/normas/CriarNorma";

// Usuários
import ListarUsuarios from "./pages/usuarios/ListarUsuarios";
import AdicionarUsuario from "./pages/usuarios/AdicionarUsuario";

// Empresas
import ListarEmpresas from "./pages/empresas/ListarEmpresas";
import AdicionarEmpresa from "./pages/empresas/AdicionarEmpresa";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth Flow */}
            <Route path="/splash" element={<SplashScreen />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            
            {/* Inspeções */}
            <Route path="/inspecoes/criar" element={
              <ProtectedRoute><CriarInspecao /></ProtectedRoute>
            } />
            <Route path="/inspecoes/aberto" element={
              <ProtectedRoute><InspecoesEmAberto /></ProtectedRoute>
            } />
            <Route path="/inspecoes/buscar" element={
              <ProtectedRoute><BuscarInspecao /></ProtectedRoute>
            } />
            <Route path="/inspecoes/historico" element={
              <ProtectedRoute><HistoricoInspecoes /></ProtectedRoute>
            } />
            
            {/* Normas */}
            <Route path="/normas" element={
              <ProtectedRoute><ListarNormas /></ProtectedRoute>
            } />
            <Route path="/normas/criar" element={
              <ProtectedRoute><CriarNorma /></ProtectedRoute>
            } />
            
            {/* Usuários */}
            <Route path="/usuarios" element={
              <ProtectedRoute><ListarUsuarios /></ProtectedRoute>
            } />
            <Route path="/usuarios/adicionar" element={
              <ProtectedRoute><AdicionarUsuario /></ProtectedRoute>
            } />
            
            {/* Empresas */}
            <Route path="/empresas" element={
              <ProtectedRoute><ListarEmpresas /></ProtectedRoute>
            } />
            <Route path="/empresas/adicionar" element={
              <ProtectedRoute><AdicionarEmpresa /></ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
