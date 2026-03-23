import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, CheckCircle2, XCircle, LogIn, MapPin, Clock, User, Users, Loader2, Banknote, CreditCard, Camera, ClipboardList, ChevronRight, Phone, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

import { CollectorManagement } from "@/components/CollectorManagement";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { type: "spring", stiffness: 300, damping: 25 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

export default function CollectorPage() {
  const { user, role } = useAuth();
  
  // IST Date Helpers
  const getISTDate = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  };

  const formatIST = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayIST = formatIST(getISTDate());

  const [scanning, setScanning] = useState<boolean>(false);
  const [activelyScanningHouseId, setActivelyScanningHouseId] = useState<string | null>(null);
  const [scannedHouseId, setScannedHouseId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastErrorShownRef = useRef<number>(0);
  const qrcodeRegionId = "qrcode-reader";

  const [selectedCollectorId, setSelectedCollectorId] = useState<string | null>(null);

  const updateLocationMutation = useMutation({
    mutationFn: (vars: { id: string, lat: number, lng: number }) => api.updateCollectorLocation(vars.id, vars.lat, vars.lng),
  });

  useEffect(() => {
    if (!selectedCollectorId || role !== 'collector') return;

    const updateLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            updateLocationMutation.mutate({ 
              id: selectedCollectorId, 
              lat: latitude, 
              lng: longitude 
            });
          },
          (error) => console.error("[GEO] Error:", error),
          { enableHighAccuracy: true }
        );
      }
    };

    updateLocation();
    const intervalId = setInterval(updateLocation, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [selectedCollectorId, role]);

  useEffect(() => {
    if (role === 'collector' && user) {
      setSelectedCollectorId(user.$id);
    }
  }, [role, user]);

  const deleteCollectorMutation = useMutation({
    mutationFn: (id: string) => api.deleteCollector(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      toast({ title: "Success", description: "Collector removed from database." });
    }
  });

  useEffect(() => {
    let isMounted = true;

    if (scanning) {
      const startScanner = async () => {
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(qrcodeRegionId);
          }
          
          const config = {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewFinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewFinderHeight);
              const edgeSize = Math.floor(minEdge * 0.8);
              return { width: edgeSize, height: edgeSize };
            },
            aspectRatio: 1.0
          };

          await scannerRef.current.start(
            { facingMode: "environment" }, 
            config,
            async (decodedText) => {
              if (!isMounted) return;
              
              if (decodedText === activelyScanningHouseId) {
                if (scannerRef.current?.isScanning) {
                  await scannerRef.current.stop();
                }
                setScannedHouseId(decodedText);
                setScanning(false);
                toast({ title: "QR Verified", description: "Correct household identified." });
              } else {
                const now = Date.now();
                if (now - lastErrorShownRef.current > 3000) {
                  lastErrorShownRef.current = now;
                  toast({ 
                    variant: "destructive", 
                    title: "Verification Failed", 
                    description: "QR does not match the selected household." 
                  });
                }
              }
            },
            () => {} 
          );
        } catch (err) {
          if (isMounted) {
            console.error("[SCAN] Error starting scanner:", err);
            setScanning(false);
            toast({ 
              variant: "destructive", 
              title: "Camera Error", 
              description: "Could not access back camera. Please check permissions." 
            });
          }
        }
      };

      startScanner();
    }

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [scanning, activelyScanningHouseId]);

  const { data: collectors, isLoading: collectorsLoading } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.getCollectors()
  });

  const { data: todayRoute, isLoading: routeLoading } = useQuery({
    queryKey: ['myRoute', selectedCollectorId, todayIST],
    queryFn: async () => {
        const result = await api.getDailyAssignment(selectedCollectorId || "", todayIST);
        return result;
    },
    enabled: !!selectedCollectorId,
    refetchInterval: 10000, 
  });

  const { data: allActiveRoutes } = useQuery({
    queryKey: ['allRoutesToday', todayIST],
    queryFn: () => api.getRoutesByDate(todayIST),
    refetchInterval: 10000,
  });

  const { data: assignedHousesRaw, isLoading: householdsLoading } = useQuery({
    queryKey: ['myHouseholds', todayRoute?.ward],
    queryFn: () => todayRoute ? api.getHouseholdsByWard(todayRoute.ward) : Promise.resolve([]),
    enabled: !!todayRoute,
    refetchInterval: 10000, 
  });

  const assignedHouses = assignedHousesRaw || [];

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { houseId: string, status: string, residentName: string, location: string, paymentMode?: string, paymentStatus?: string }) => 
      api.updateHouseholdStatus(
        vars.houseId, 
        vars.status, 
        vars.status === "collected" ? 100 : 0, 
        collector?.$id || "", 
        collector?.name || "", 
        vars.residentName, 
        vars.location,
        vars.paymentMode,
        vars.paymentStatus
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myHouseholds'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setScannedHouseId(null); 
      setPaymentDialogOpen(false);
      window.location.reload(); 
    }
  });

  const collector = (collectors || []).find((c: any) => c.$id === selectedCollectorId);

  const otherActiveAssignment = !todayRoute && collector?.ward?.map((w: number) => 
    allActiveRoutes?.find((r: any) => r.ward === w && r.collectorId !== selectedCollectorId)
  ).find(Boolean);

  const handleCloseScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.error("[SCAN] Error stopping scanner on close:", err);
    } finally {
      setScanning(false);
      setActivelyScanningHouseId(null);
    }
  };

  const handleScanClick = (houseId: string) => {
    setScanning(true);
    setActivelyScanningHouseId(houseId);
    setScannedHouseId(null); 
  };

  const handleMark = (house: any, status: "collected" | "not-available", paymentMode?: string) => {
    const newPaymentStatus = paymentMode === 'offline' ? 'paid' : house.paymentStatus;

    updateStatusMutation.mutate({ 
      houseId: house.$id, 
      status, 
      residentName: house.residentName, 
      location: house.address,
      paymentMode,
      paymentStatus: newPaymentStatus
    });
    
    toast({
      title: status === "collected" ? "✅ Collection Logged Successfully" : "⚠️ Marked as Not Available",
      description: `House ${house.residentName} — ${paymentMode ? `Payment: ${paymentMode}` : ''}`,
    });
    setPaymentDialogOpen(false);
    setSelectedPaymentMode(null); 
  };

  if (collectorsLoading || householdsLoading || routeLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center flex-col gap-6 p-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
            className="relative"
          >
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-3xl border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground font-bold tracking-widest uppercase text-[10px] md:text-xs"
          >
            Syncing field data...
          </motion.p>
        </div>
      </Layout>
    );
  }

  // --- ADMIN VIEW: Collector Management List ---
  if (!selectedCollectorId && role === 'admin') {
    return (
      <Layout>
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="p-4 md:p-6 space-y-6 md:space-y-10 max-w-6xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="flex flex-col gap-1 md:gap-2">
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground">Field Personnel</h1>
            <p className="text-muted-foreground text-sm md:text-lg">Manage and monitor your workforce in real-time.</p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="border-none shadow-none bg-transparent overflow-hidden">
               <CollectorManagement />
            </Card>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
          >
            {(collectors || []).map((c: any) => (
              <motion.div 
                key={c.$id} 
                variants={fadeInUp} 
                whileHover={{ y: -5 }}
                className="group relative"
              >
                <Button
                  variant="outline"
                  className="w-full h-auto p-6 md:p-8 flex flex-col items-center text-center gap-4 md:gap-5 border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:shadow-2xl transition-all rounded-[1.5rem] md:rounded-[2.5rem] bg-card overflow-hidden"
                  onClick={() => setSelectedCollectorId(c.$id)}
                >
                  <div className="h-16 w-16 md:h-24 md:w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xl md:text-3xl font-black text-primary shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {c.avatar || c.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className="space-y-1 md:space-y-2 w-full">
                    <p className="font-black text-lg md:text-xl text-foreground truncate">{c.name}</p>
                    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mt-2 md:mt-3">
                      {(c.ward || []).map((w: number) => (
                        <Badge key={w} variant="secondary" className="px-2 py-0.5 md:px-3 md:py-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-full">
                          Ward {w}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 md:top-4 md:right-4 h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[1.5rem] md:rounded-[2rem] w-[90vw] max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl md:text-2xl font-bold">Delete Collector Record?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm md:text-md">
                        This action cannot be undone. This will permanently remove <strong>{c.name}</strong> from the system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 md:mt-6 gap-2">
                      <AlertDialogCancel className="rounded-xl h-10 md:h-12 font-bold" onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive hover:bg-destructive/90 rounded-xl h-10 md:h-12 font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCollectorMutation.mutate(c.$id);
                        }}
                      >
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </Layout>
    );
  }

  if (!selectedCollectorId) {
      return (
        <Layout>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex h-[80vh] items-center justify-center flex-col gap-4 md:gap-6 p-6 text-center"
          >
             <div className="h-20 w-20 md:h-24 md:w-24 rounded-[1.5rem] md:rounded-[2rem] bg-muted flex items-center justify-center shadow-inner">
               <User className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
             </div>
             <div className="space-y-1 md:space-y-2">
               <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Access Restricted</h2>
               <p className="text-muted-foreground text-sm md:text-lg max-w-xs mx-auto">Please log in as a field collector to manage your assigned route.</p>
             </div>
             <Button onClick={() => navigate('/login')} size="lg" className="rounded-xl md:rounded-2xl h-12 md:h-14 px-8 md:px-10 font-bold text-md md:text-lg shadow-xl shadow-primary/20">
                Go to Login
             </Button>
          </motion.div>
        </Layout>
      );
  }

  // --- COLLECTOR / ROUTE VIEW ---
  return (
    <Layout>
      <motion.div 
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="max-w-2xl mx-auto p-3 md:p-4 space-y-6 md:space-y-8 pb-24"
      >
        {/* Header Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="bg-primary text-primary-foreground rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-2xl shadow-primary/30 relative overflow-hidden group"
        >
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 md:h-40 md:w-40 rounded-full bg-white/10 blur-3xl" 
          />
          <div className="relative z-10 flex items-center gap-4 md:gap-6">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="h-14 w-14 md:h-20 md:w-20 rounded-[1rem] md:rounded-[1.5rem] bg-white/20 backdrop-blur-xl flex items-center justify-center font-black text-xl md:text-3xl border border-white/30 shadow-2xl shrink-0"
            >
              {collector?.avatar || collector?.name.substring(0,2).toUpperCase()}
            </motion.div>
            <div className="flex-1 min-w-0">
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 0.8, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em] truncate"
              >
                On-Duty Collector
              </motion.p>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl md:text-3xl font-black tracking-tight truncate"
              >
                {collector?.name.split(' ')[0]}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5 }}
                className="text-[10px] md:text-sm mt-0.5 md:mt-1 flex items-center gap-1.5 md:gap-2 font-medium"
              >
                <MapPin className="h-3 w-3 md:h-4 md:w-4 shrink-0" /> Wards {(collector?.ward || []).join(", ")}
              </motion.p>
            </div>
            {role === 'admin' && (
              <Button variant="secondary" size="sm" className="h-8 md:h-10 rounded-xl md:rounded-2xl bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 md:px-4 font-bold text-xs md:text-sm" onClick={() => setSelectedCollectorId(null)}>
                Switch
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="flex items-center justify-between px-2 md:px-4">
          <h2 className="text-lg md:text-xl font-black text-foreground flex items-center gap-2 md:gap-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            Today's Route
          </h2>
          <Badge variant="outline" className="h-8 md:h-10 px-3 md:px-5 text-[10px] md:text-sm font-black rounded-full bg-background border-2 shadow-sm shrink-0">
            {assignedHouses.filter((h: any) => h.collectionStatus === 'collected').length} / {assignedHouses.length} DONE
          </Badge>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {otherActiveAssignment && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50 border-2 border-amber-200 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] flex items-start gap-3 md:gap-4 mx-1 md:mx-2 overflow-hidden"
            >
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-black text-amber-800 text-[10px] md:text-sm uppercase tracking-wider">Alternate Route Active</p>
                <p className="text-[11px] md:text-sm text-amber-700/80 mt-0.5 md:mt-1 leading-relaxed">
                  Ward {(otherActiveAssignment as any).ward} is currently assigned to <strong>{(otherActiveAssignment as any).name?.split(' - ')[1]}</strong>.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={staggerContainer} className="space-y-3 md:space-y-4 px-1 md:px-2">
          <AnimatePresence mode="popLayout">
            {assignedHouses.map((house: any) => {
              const currentStatus = house.collectionStatus;
              const isHouseScanned = scannedHouseId === house.$id;
              const isCurrentlyScanning = scanning && activelyScanningHouseId === house.$id;

              return (
                <motion.div 
                  layout
                  key={house.$id} 
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className={`overflow-hidden transition-all border-2 rounded-[1.5rem] md:rounded-[2rem] shadow-sm ${currentStatus === "collected" ? "bg-emerald-50/30 border-emerald-100 opacity-80" : "bg-card hover:shadow-xl hover:border-primary/20"}`}>
                    <CardContent className="p-0">
                      <div className="p-4 md:p-6 flex items-start gap-3 md:gap-5">
                        <motion.div 
                          animate={currentStatus === 'collected' ? { scale: [1, 1.2, 1] } : {}}
                          className={`h-10 w-10 md:h-14 md:w-14 rounded-full flex items-center justify-center shrink-0 text-lg md:text-2xl font-black shadow-inner ${currentStatus === 'collected' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'}`}
                        >
                          {house.residentName.charAt(0)}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-black text-md md:text-xl text-foreground truncate">{house.residentName}</h3>
                            <Badge
                              className={`shrink-0 text-[8px] md:text-[10px] uppercase font-black tracking-[0.05em] md:tracking-[0.1em] px-2 md:px-3 py-0.5 md:py-1 rounded-full border-2 ${
                                currentStatus === "collected"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : currentStatus === "not-available"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {currentStatus === 'collected' ? 'Success' : currentStatus === 'not-available' ? 'Missed' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-[11px] md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1 font-medium italic truncate">
                            <MapPin className="h-3 w-3 md:h-4 md:w-4 shrink-0 text-primary/50" /> {house.address}
                          </p>
                          
                          {currentStatus === 'collected' && (
                            <motion.p 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-[9px] md:text-[10px] text-emerald-600 font-black flex items-center gap-1 md:gap-1.5 mt-2 md:mt-3 uppercase tracking-wider"
                            >
                              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" /> Logged at {house.lastCollectionDate}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      {/* Inline Action Area */}
                      <AnimatePresence>
                        {isCurrentlyScanning && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mx-4 md:mx-6 mb-4 md:mb-6 bg-black rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 border-primary shadow-2xl relative aspect-square"
                          >
                            <div id={qrcodeRegionId} className="w-full h-full bg-black"></div>
                            
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="absolute top-3 right-3 md:top-4 md:right-4 h-8 w-8 md:h-10 md:w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md z-30" 
                              onClick={handleCloseScanner}
                            >
                              <XCircle className="h-5 w-5 md:h-6 md:w-6" />
                            </Button>
                            <div className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center pointer-events-none z-30 px-4">
                               <span className="text-[8px] md:text-[10px] text-white font-black bg-primary/80 py-1.5 px-4 md:py-2 md:px-5 rounded-full backdrop-blur-md border border-white/20 uppercase tracking-widest shadow-xl">
                                 Scanning QR Code...
                               </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {currentStatus === "pending" && !isCurrentlyScanning && (
                        <div className="grid grid-cols-2 gap-1.5 p-1.5 md:p-2 bg-muted/20 border-t border-border/50">
                          {!isHouseScanned ? (
                            <Button
                              variant="ghost"
                              className="h-12 md:h-16 rounded-xl md:rounded-[1.5rem] bg-white shadow-sm hover:bg-primary hover:text-white transition-all font-black text-xs md:text-sm gap-2 md:gap-3 border-2 border-border/50 group text-slate-900"
                              onClick={() => handleScanClick(house.$id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <Camera className="h-4 w-4 md:h-5 md:w-5 group-hover:scale-125 transition-transform text-slate-900" /> START SCAN
                            </Button>
                          ) : (
                            <Button
                              className="h-12 md:h-16 rounded-xl md:rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm gap-2 md:gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                              onClick={() => {
                                  setSelectedHouse(house);
                                  setPaymentDialogOpen(true);
                              }}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 animate-pulse" /> VERIFY
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            className="h-12 md:h-16 rounded-xl md:rounded-[1.5rem] bg-white shadow-sm hover:bg-red-50 text-slate-900 hover:text-red-600 font-bold text-xs md:text-sm gap-2 md:gap-3 border-2 border-border/50 transition-all"
                            onClick={() => handleMark(house, "not-available", "none")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 md:h-5 md:w-5 text-slate-500 hover:text-red-600" /> SKIP
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {assignedHouses.length === 0 && !scanning && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="flex flex-col items-center justify-center py-16 md:py-24 px-6 md:px-8 text-center bg-primary/5 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed border-primary/20 mx-2 md:mx-4 space-y-4 md:space-y-6"
           >
             <motion.div 
               animate={{ rotate: [0, 360] }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="h-24 w-24 md:h-32 md:w-32 bg-primary/10 rounded-full flex items-center justify-center relative"
             >
               <Sparkles className="h-12 w-12 md:h-16 md:w-16 text-primary/40" />
               <motion.div 
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="absolute inset-0 border-4 border-primary/20 rounded-full"
               />
             </motion.div>
             <div className="space-y-1 md:space-y-2">
               <h3 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Mission Accomplished!</h3>
               <p className="text-muted-foreground text-md md:text-lg font-medium">
                 All households have been processed. Great work today!
               </p>
             </div>
             <Button variant="outline" className="rounded-xl md:rounded-2xl h-10 md:h-12 px-6 md:px-8 font-bold border-2" onClick={() => window.location.reload()}>
                REFRESH DATA
             </Button>
           </motion.div>
        )}


        <Dialog open={paymentDialogOpen} onOpenChange={(val) => {
            setPaymentDialogOpen(val);
            if(!val) setSelectedPaymentMode(null);
        }}>
          <DialogContent className="sm:max-w-md rounded-[2rem] md:rounded-[3rem] p-0 overflow-hidden border-none shadow-3xl w-[95vw] mx-auto">
            <div className="bg-primary p-6 md:p-10 text-primary-foreground relative overflow-hidden text-center">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-white/20 blur-3xl rounded-full" 
              />
              <DialogHeader className="relative z-10 flex flex-col items-center space-y-2 md:space-y-4">
                <div className="h-14 w-14 md:h-20 md:w-20 bg-white/20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center backdrop-blur-md border border-white/30 shadow-2xl">
                  <Banknote className="h-7 w-7 md:h-10 md:w-10 text-white" />
                </div>
                <DialogTitle className="text-2xl md:text-3xl font-black">Finalize Collection</DialogTitle>
                <DialogDescription className="text-primary-foreground/80 text-sm md:text-lg font-medium">
                  Select the payment method used by the resident.
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="p-4 md:p-8 bg-background grid grid-cols-2 gap-3 md:gap-6">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  className={`h-32 md:h-40 w-full flex flex-col gap-2 md:gap-4 border-2 md:border-4 rounded-xl md:rounded-[2rem] transition-all ${selectedPaymentMode === 'offline' ? 'border-primary bg-primary/5 ring-4 md:ring-8 ring-primary/10 shadow-xl' : 'hover:border-primary/30 hover:bg-muted/50 border-border/60'}`}
                  onClick={() => setSelectedPaymentMode('offline')}
                >
                  <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                    <Banknote className="h-5 w-5 md:h-7 md:w-7 text-emerald-600" />
                  </div>
                  <span className="font-black text-md md:text-xl uppercase tracking-wider">Cash</span>
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  className={`h-32 md:h-40 w-full flex flex-col gap-2 md:gap-4 border-2 md:border-4 rounded-xl md:rounded-[2rem] transition-all ${selectedPaymentMode === 'online' ? 'border-primary bg-primary/5 ring-4 md:ring-8 ring-primary/10 shadow-xl' : 'hover:border-primary/30 hover:bg-muted/50 border-border/60'}`}
                  onClick={() => setSelectedPaymentMode('online')}
                >
                  <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-blue-100 flex items-center justify-center shadow-inner">
                    <CreditCard className="h-5 w-5 md:h-7 md:w-7 text-blue-600" />
                  </div>
                  <span className="font-black text-md md:text-xl uppercase tracking-wider">Online</span>
                </Button>
              </motion.div>
            </div>

            <div className="p-4 md:p-8 pt-0">
              <Button 
                type="button" 
                className="w-full h-12 md:h-16 rounded-xl md:rounded-[1.5rem] text-md md:text-xl font-black shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all uppercase tracking-widest"
                disabled={!selectedPaymentMode || updateStatusMutation.isPending}
                onClick={() => handleMark(selectedHouse, "collected", selectedPaymentMode!)}
              >
                {updateStatusMutation.isPending ? <Loader2 className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <Sparkles className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6" />}
                CONFIRM & LOG
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}
