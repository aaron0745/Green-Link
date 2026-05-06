import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { Loader2 } from "lucide-react";
import { useEffect, lazy, Suspense } from "react";
import { Camera } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { client, DATABASE_ID, HOUSEHOLDS_COLLECTION_ID, COLLECTORS_COLLECTION_ID, ROUTES_COLLECTION_ID, TRANSACTIONS_COLLECTION_ID } from "@/lib/appwrite";

// Lazy load route components for code splitting (Performance Optimization)
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CollectorPage = lazy(() => import("./pages/Collector"));
const CollectorDetails = lazy(() => import("./pages/CollectorDetails"));
const HouseholdPage = lazy(() => import("./pages/Household"));
const Reports = lazy(() => import("./pages/Reports"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback for lazy components
const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  useEffect(() => {
    const requestInitialPermissions = async () => {
      try {
        console.log("[INIT] Requesting startup permissions...");
        await Camera.requestPermissions();
        await Geolocation.requestPermissions();
      } catch (err) {
        console.warn("[INIT] Permission request error (might be in browser):", err);
      }
    };
    requestInitialPermissions();

    // Global Realtime Synchronization
    // Listens to all relevant collections and forces all active devices to fetch the latest data instantly
    const channels = [
      `databases.${DATABASE_ID}.collections.${HOUSEHOLDS_COLLECTION_ID}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTORS_COLLECTION_ID}.documents`,
      `databases.${DATABASE_ID}.collections.${ROUTES_COLLECTION_ID}.documents`,
      `databases.${DATABASE_ID}.collections.${TRANSACTIONS_COLLECTION_ID}.documents`
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      console.log("[REALTIME] Database change detected globally:", response);
      // Invalidate all React Query caches
      queryClient.invalidateQueries();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="greenlink-theme" attribute="class">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
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
                    path="/collectordetails" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <CollectorDetails />
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
              </Suspense>
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
    return <PageLoader />;
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
