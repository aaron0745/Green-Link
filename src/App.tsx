import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CollectorPage from "./pages/Collector";
import HouseholdPage from "./pages/Household";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Camera } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const requestInitialPermissions = async () => {
      try {
        console.log("[INIT] Requesting startup permissions...");
        // Request Camera Permission
        await Camera.requestPermissions();
        // Request Geolocation Permission
        await Geolocation.requestPermissions();
      } catch (err) {
        console.warn("[INIT] Permission request error (might be in browser):", err);
      }
    };
    requestInitialPermissions();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="greenlink-theme" attribute="class">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'household']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/collector" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'collector']}>
                      <CollectorPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/household/:id" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'collector', 'household']}>
                      <HouseholdPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reports" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Reports />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'collector' ? '/collector' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

export default App;
