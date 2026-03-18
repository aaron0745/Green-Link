import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, CheckCircle2, XCircle, LogIn, MapPin, Clock, User, Users, Loader2, Banknote, CreditCard, Camera, ClipboardList, ChevronRight, Phone } from "lucide-react";
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

  // Track location on a fixed interval (30 mins) to optimize database requests
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

    // 1. Initial update when component mounts
    updateLocation();

    // 2. Fixed interval (30 minutes)
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
                // Stop scanner BEFORE updating state to prevent race conditions
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

  // 1. Fetch today's route assignment for the logged-in collector using IST
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
        <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading your route...</p>
        </div>
      </Layout>
    );
  }

  // --- ADMIN VIEW: Collector Management List ---
  if (!selectedCollectorId && role === 'admin') {
    return (
      <Layout>
        <div className="p-6 space-y-8 max-w-6xl mx-auto">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Collector Management</h1>
            <p className="text-muted-foreground">Monitor active routes and manage field staff.</p>
          </div>

          <Card className="border-none shadow-none bg-transparent">
             <CollectorManagement />
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(collectors || []).map((c: any) => (
              <div key={c.$id} className="group relative">
                <Button
                  variant="outline"
                  className="w-full h-auto p-6 flex flex-col items-center text-center gap-4 border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md transition-all rounded-2xl bg-card"
                  onClick={() => setSelectedCollectorId(c.$id)}
                >
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-2xl font-bold text-primary shadow-inner">
                    {c.avatar || c.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className="space-y-1 w-full">
                    <p className="font-bold text-lg text-foreground truncate">{c.name}</p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                      {(c.ward || []).map((w: number) => (
                        <Badge key={w} variant="secondary" className="px-2 py-0.5 text-xs font-medium">
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
                      className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Collector Record?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently remove {c.name} from the system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCollectorMutation.mutate(c.$id);
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!selectedCollectorId) {
      return (
        <Layout>
          <div className="flex h-[80vh] items-center justify-center flex-col gap-4 p-6 text-center">
             <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
               <User className="h-8 w-8 text-muted-foreground" />
             </div>
             <h2 className="text-xl font-bold">Authentication Required</h2>
             <p className="text-muted-foreground">Please log in as a collector to view your route.</p>
          </div>
        </Layout>
      );
  }

  // --- COLLECTOR / ROUTE VIEW ---
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
        {/* Header Card */}
        <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl border border-white/30">
              {collector?.avatar || collector?.name.substring(0,2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-foreground/80 uppercase tracking-wide">Good Morning,</p>
              <h1 className="text-2xl font-bold">{collector?.name.split(' ')[0]}</h1>
              <p className="text-xs text-primary-foreground/70 mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Wards {(collector?.ward || []).join(", ")}
              </p>
            </div>
            {role === 'admin' && (
              <Button variant="secondary" size="sm" className="h-8 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md" onClick={() => setSelectedCollectorId(null)}>
                Switch
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Today's Route
          </h2>
          <Badge variant="outline" className="h-7 px-3 text-sm font-medium bg-background">
            {assignedHouses.filter((h: any) => h.collectionStatus === 'collected').length} / {assignedHouses.length} Done
          </Badge>
        </div>

        {otherActiveAssignment && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Alternate Route Active</p>
              <p className="text-xs text-amber-700/80 mt-1">
                Ward {(otherActiveAssignment as any).ward} is currently assigned to <strong>{(otherActiveAssignment as any).name?.split(' - ')[1]}</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {assignedHouses.map((house: any) => {
            const currentStatus = house.collectionStatus;
            const isHouseScanned = scannedHouseId === house.$id;
            const isCurrentlyScanning = scanning && activelyScanningHouseId === house.$id;

            return (
              <Card key={house.$id} className={`overflow-hidden transition-all border-none shadow-sm ${currentStatus === "collected" ? "bg-muted/40 opacity-70" : "bg-card hover:shadow-md"}`}>
                <CardContent className="p-0">
                  <div className="p-4 flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-lg font-bold ${currentStatus === 'collected' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
                      {house.residentName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-foreground truncate">{house.residentName}</h3>
                        <Badge
                          className={`shrink-0 text-[10px] uppercase font-bold tracking-wider ${
                            currentStatus === "collected"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              : currentStatus === "not-available"
                              ? "bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          {currentStatus === 'collected' ? 'Done' : currentStatus === 'not-available' ? 'Missed' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" /> {house.address}
                      </p>
                      
                      {(currentStatus !== "pending" && currentStatus !== "not-available") && (
                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
                          <CheckCircle2 className="h-3 w-3" /> Collected at {house.lastCollectionDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Inline Action Area */}
                  {isCurrentlyScanning && (
                    <div className="mx-4 mb-4 bg-black rounded-2xl overflow-hidden border-2 border-primary shadow-2xl relative aspect-[4/3]">
                      <div id={qrcodeRegionId} className="w-full h-full bg-black"></div>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md" 
                        onClick={handleCloseScanner}
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
                      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                         <span className="text-[10px] text-white font-medium bg-black/50 py-1.5 px-3 rounded-full backdrop-blur-md border border-white/10">
                           Align QR code within frame
                         </span>
                      </div>
                    </div>
                  )}

                  {currentStatus === "pending" && !isCurrentlyScanning && (
                    <div className="grid grid-cols-2 gap-1 bg-muted/30 p-1">
                      {!isHouseScanned ? (
                        <Button
                          variant="ghost"
                          className="h-12 rounded-lg bg-white shadow-sm hover:bg-primary/5 text-primary font-semibold gap-2 border border-border/50"
                          onClick={() => handleScanClick(house.$id)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Camera className="h-4 w-4" /> Scan QR
                        </Button>
                      ) : (
                        <Button
                          className="h-12 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20"
                          onClick={() => {
                              setSelectedHouse(house);
                              setPaymentDialogOpen(true);
                          }}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Verify & Collect
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="h-12 rounded-lg bg-white shadow-sm hover:bg-red-50 text-muted-foreground hover:text-red-600 font-medium gap-2 border border-border/50"
                        onClick={() => handleMark(house, "not-available", "none")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" /> Skip / Away
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {assignedHouses.length === 0 && !scanning && (
           <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-muted/20 rounded-3xl border-2 border-dashed border-border/60 mx-4">
             <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
               <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
             </div>
             <h3 className="text-lg font-bold text-foreground">All Caught Up!</h3>
             <p className="text-muted-foreground text-sm mt-1 max-w-xs">
               No pending collections for today. Enjoy your day off!
             </p>
           </div>
        )}

        <Dialog open={paymentDialogOpen} onOpenChange={(val) => {
            setPaymentDialogOpen(val);
            if(!val) setSelectedPaymentMode(null);
        }}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-xl">Collect Payment</DialogTitle>
              <DialogDescription>
                How is the resident paying for this collection?
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              <Button 
                variant="outline" 
                className={`h-28 flex flex-col gap-3 border-2 rounded-2xl transition-all ${selectedPaymentMode === 'offline' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'hover:border-primary/30 hover:bg-muted/50'}`}
                onClick={() => setSelectedPaymentMode('offline')}
              >
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-semibold text-foreground">Cash</span>
              </Button>
              <Button 
                variant="outline" 
                className={`h-28 flex flex-col gap-3 border-2 rounded-2xl transition-all ${selectedPaymentMode === 'online' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'hover:border-primary/30 hover:bg-muted/50'}`}
                onClick={() => setSelectedPaymentMode('online')}
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-semibold text-foreground">Online</span>
              </Button>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20"
                disabled={!selectedPaymentMode || updateStatusMutation.isPending}
                onClick={() => handleMark(selectedHouse, "collected", selectedPaymentMode!)}
              >
                {updateStatusMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Confirm Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
