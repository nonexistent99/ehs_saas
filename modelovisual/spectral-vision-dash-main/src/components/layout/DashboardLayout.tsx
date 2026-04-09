import { useState, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminAlertPopup, AdminAlertPopupRef } from "@/components/dashboard/AdminAlertPopup";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const alertPopupRef = useRef<AdminAlertPopupRef>(null);

  const handleNotificationClick = () => {
    alertPopupRef.current?.open();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Alert Popup */}
      <AdminAlertPopup ref={alertPopupRef} />

      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        collapsed={isMobile ? false : sidebarCollapsed}
        onToggle={() => isMobile ? setMobileMenuOpen(!mobileMenuOpen) : setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      
      <div
        className={cn(
          "transition-all duration-300",
          isMobile ? "ml-0" : (sidebarCollapsed ? "ml-[72px]" : "ml-64")
        )}
      >
        <Header 
          onMenuClick={() => setMobileMenuOpen(true)} 
          showMenuButton={isMobile}
          onNotificationClick={handleNotificationClick}
        />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
