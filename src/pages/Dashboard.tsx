import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Home, Users, User, Clock, IndianRupee, MapPin, Loader2, CheckCircle2, CreditCard, QrCode, ClipboardList, RefreshCw, MoreHorizontal, Filter, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { format, isValid } from "date-fns";
import { formatDisplayTime, formatDisplayDate, parseDate } from "@/lib/date-utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HouseholdManagement } from "@/components/HouseholdManagement";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

// --- MAP COMPONENTS ---

function MapController({ collectors }: { collectors: any[] }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  
  useEffect(() => {
    if (collectors && collectors.length > 0 && !hasCenteredRef.current) {
      const coords = collectors.filter(c => c.lat && c.lng).map(c => [c.lat, c.lng] as [number, number]);
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        hasCenteredRef.current = true;
      }
    }
  }, [collectors, map]);

  return null;
}

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIconRetina from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const statusColors: Record<string, string> = {
  collected: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  "not-available": "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
  skipped: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  paid: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  pending: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const isHousehold = role === 'household';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chartVisibility, setChartVisibility] = useState({
    collected: true,
    missed: true,
    pending: true
  });
  const [selectedCollectors, setSelectedCollectors] = useState<Record<number, string>>({});

  const formatDateForQuery = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { data: households, isLoading: householdsLoading } = useQuery({
    queryKey: ['households'],
    queryFn: () => api.getHouseholds(),
    enabled: isAdmin
  });

  const { data: currentResident, isLoading: residentLoading } = useQuery({
    queryKey: ['resident', user?.$id],
    queryFn: () => api.getHousehold(user?.$id),
    enabled: isHousehold && !!user?.$id
  });

  const { data: collectionLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => api.getCollectionLogs()
  });

  const { data: collectors, refetch: refetchCollectors } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.getCollectors(),
    enabled: isAdmin
  });

  const { data: dailyRoutes } = useQuery({
    queryKey: ['routes', formatDateForQuery(selectedDate)],
    queryFn: () => api.getRoutesByDate(formatDateForQuery(selectedDate)),
    enabled: isAdmin
  });

  const assignRouteMutation = useMutation({
    mutationFn: (vars: { collectorId: string, ward: number }) => {
      const collector = collectors?.find((c: any) => c.$id === vars.collectorId);
      return api.assignRoute(vars.collectorId, collector.name, vars.ward, formatDateForQuery(selectedDate));
    },
    onSuccess: () => {
      const dateStr = formatDateForQuery(selectedDate);
      queryClient.invalidateQueries({ queryKey: ['routes', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['households'] });
      toast({ title: "Route Assigned", description: "Collector assigned successfully." });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (vars: { routeId: string, ward: number }) => api.deleteRoute(vars.routeId, vars.ward),
    onSuccess: () => {
      const dateStr = formatDateForQuery(selectedDate);
      queryClient.invalidateQueries({ queryKey: ['routes', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['households'] });
      toast({ title: "Assignment Reset", description: "Route has been cleared and ward set to unassigned." });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });

  const payOnlineMutation = useMutation({
    mutationFn: () => api.payOnline(user.$id, currentResident?.residentName || user.residentName, 100),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['resident', user?.$id] });
      toast({ title: "Payment Successful", description: "Your payment has been logged." });
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Payment Failed", description: error.message });
    }
  });

  const stats = (() => {
    if (!isAdmin || !households || !collectionLogs) return null;
    const dateStr = formatDateForQuery(selectedDate);
    const dateStrLocal = selectedDate.toLocaleDateString('en-GB'); 
    const dateStrAlternative = format(selectedDate, "d/M/yyyy");

    const filteredLogs = collectionLogs.filter((l: any) => 
        l.timestamp && (l.timestamp.startsWith(dateStr) || l.timestamp.startsWith(dateStrLocal) || l.timestamp.includes(dateStrAlternative))
    );

    const uniqueLogsMap = new Map();
    filteredLogs.forEach((l: any) => {
      const existing = uniqueLogsMap.get(l.householdId);
      if (!existing || l.status === 'paid') {
        uniqueLogsMap.set(l.householdId, l);
      }
    });
    
    const uniqueLogs = Array.from(uniqueLogsMap.values());

    const total = households.length;
    const covered = uniqueLogs.filter((l: any) => {
        const s = (l.status || '').toLowerCase();
        return s === "collected" || s === "paid";
    }).length;
    
    const pending = total - covered;
    
    const revenue = uniqueLogs.filter((l: any) => {
        const s = (l.status || '').toLowerCase();
        return s === "collected" || s === "paid";
    }).reduce((a: number, l: any) => a + (l.amountCollected || 0), 0);
    
    return { total, covered, pending, revenue };
  })();

  const displayLogs = (() => {
    if (!collectionLogs) return [];
    
    const logsForDay = collectionLogs.filter((log: any) => {
      if (!log.timestamp) return false;
      const dateStr = formatDateForQuery(selectedDate);
      const dateStrLocal = selectedDate.toLocaleDateString('en-GB');
      const dateStrAlternative = format(selectedDate, "d/M/yyyy");
      return log.timestamp.startsWith(dateStr) || log.timestamp.startsWith(dateStrLocal) || log.timestamp.includes(dateStrAlternative);
    });

    if (statusFilter === "all") return logsForDay.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
    return logsForDay.filter((log: any) => (log.status || '').toLowerCase() === statusFilter).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
  })();

  const chartData = (() => {
    if (!isAdmin || !collectionLogs || !households) return [];
    const totalHouses = households.length;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - (6 - i));
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return {
        day: days[d.getDay()],
        dateStr: `${year}-${month}-${day}`,
        collected: 0,
        missed: 0,
        pending: totalHouses
      };
    });

    collectionLogs?.forEach((log: any) => {
      if (!log.timestamp) return;
      const date = parseDate(log.timestamp);
      if (!isValid(date)) return;
      const formattedLogDate = format(date, 'yyyy-MM-dd');

      const dayData = last7Days.find(d => d.dateStr === formattedLogDate);
      if (dayData) {
        const status = (log.status || '').toLowerCase();
        if (status === 'collected' || status === 'paid') {
          dayData.collected++;
          dayData.pending = Math.max(0, dayData.pending - 1);
        } else if (status === 'not-available') {
          dayData.missed++;
          dayData.pending = Math.max(0, dayData.pending - 1);
        }
      }
    });
    return last7Days;
  })();

  const residentStats = role === 'household' ? {
    residentName: currentResident?.residentName || user.residentName,
    address: currentResident?.address || user.address,
    paymentStatus: currentResident?.paymentStatus || user.paymentStatus,
    collectionStatus: currentResident?.collectionStatus || user.collectionStatus,
    lastDate: currentResident?.lastCollectionDate || user.lastCollectionDate,
    paymentMode: currentResident?.paymentMode || user.paymentMode || 'none'
  } : null;

  if (householdsLoading || logsLoading || residentLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // --- HOUSEHOLD VIEW ---
  if (!isAdmin && role === 'household') {
    const myLogs = (collectionLogs || []).filter((l: any) => l.householdId === user.$id);
    return (
      <Layout>
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="max-w-5xl mx-auto space-y-6"
        >
          {/* Header Card */}
          <motion.div variants={fadeInUp} className="bg-card rounded-2xl shadow-sm border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Welcome back, {residentStats?.residentName.split(' ')[0]}</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" /> {residentStats?.address}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
               {residentStats?.paymentStatus === 'paid' && (
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                   onClick={() => navigate(`/household/${user.$id}`)}
                 >
                   <ClipboardList className="h-4 w-4" /> My Receipt
                 </Button>
               )}
               {residentStats?.collectionStatus === 'collected' && residentStats?.paymentStatus !== 'paid' && residentStats?.paymentMode === 'online' && (
                <Button onClick={() => payOnlineMutation.mutate()} disabled={payOnlineMutation.isPending} className="shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700">
                  <CreditCard className="mr-2 h-4 w-4" /> Pay Online
                </Button>
               )}
               <Badge variant="outline" className={cn("justify-center py-1.5 px-4 text-sm font-medium border-2", residentStats?.paymentStatus === 'paid' ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
                 {residentStats?.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
               </Badge>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Stats & QR */}
            <div className="md:col-span-1 space-y-6">
               <motion.div variants={fadeInUp}>
                 <Card className="overflow-hidden border-border/60 shadow-sm">
                   <CardHeader className="bg-muted/30 pb-4">
                     <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">My QR Code</CardTitle>
                   </CardHeader>
                   <CardContent className="flex flex-col items-center justify-center p-8 bg-white">
                     <QRCodeSVG value={user.$id} size={180} level="H" className="drop-shadow-sm" />
                     <p className="mt-4 text-xs text-center text-muted-foreground font-medium">Show to collector</p>
                   </CardContent>
                 </Card>
               </motion.div>

               <motion.div variants={fadeInUp}>
                 <Card className="border-border/60 shadow-sm">
                   <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Status</span>
                        <Badge variant="secondary" className="capitalize">{residentStats?.collectionStatus}</Badge>
                      </div>
                      <div className="h-[1px] bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Last Visit</span>
                        <span className="text-sm font-bold">{residentStats?.lastDate || 'N/A'}</span>
                      </div>
                   </CardContent>
                 </Card>
               </motion.div>
            </div>

            {/* Right Column: History */}
            <motion.div variants={fadeInUp} className="md:col-span-2">
              <Card className="h-full border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Collection History</CardTitle>
                  <CardDescription>Recent waste collection records.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Collector</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myLogs.map((log: any) => (
                          <TableRow key={log.$id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{formatDisplayDateTime(log.timestamp)}</TableCell>
                            <TableCell>{log.collectorName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[log.status]}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">₹{log.amountCollected}</TableCell>
                          </TableRow>
                        ))}
                        {myLogs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                              No records found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </Layout>
    );
  }

  // --- ADMIN VIEW ---
  
  const widgets = [
    { label: "Total Houses", value: stats?.total || 0, icon: Home, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30", sub: "Registered Units" },
    { label: "Covered Today", value: stats?.covered || 0, icon: CheckCircle2, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30", sub: "Collections Done" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", sub: "Remaining" },
    { label: "Revenue", value: `₹${stats?.revenue || 0}`, icon: IndianRupee, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30", sub: "Today's Collection" },
  ];

  const wards = Array.from({ length: 8 }, (_, i) => i + 1);

  const handleRefreshLocations = () => {
    refetchCollectors();
    toast({ title: "Refreshing...", description: "Updating worker positions." });
  };

  return (
    <Layout>
      <motion.div 
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="space-y-6 max-w-[1600px] mx-auto"
      >
        {/* Top Bar */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live monitoring for {format(selectedDate, "EEEE, MMMM do, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 w-[240px] justify-start text-left font-normal bg-background/50 backdrop-blur border-border/60">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 h-10 rounded-lg w-full justify-start overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-hide border-none">
              <TabsTrigger value="overview" className="rounded-md px-4 text-xs font-medium uppercase tracking-wide flex-shrink-0">Overview</TabsTrigger>
              <TabsTrigger value="assignments" className="rounded-md px-4 text-xs font-medium uppercase tracking-wide flex-shrink-0">Routes</TabsTrigger>
              <TabsTrigger value="manage" className="rounded-md px-4 text-xs font-medium uppercase tracking-wide flex-shrink-0">Households</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-0">
              {/* Widget Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {widgets.map((w) => (
                  <motion.div key={w.label} variants={fadeInUp}>
                    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow border-none md:border-solid bg-card/50 md:bg-card h-full">
                      <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start justify-between text-center sm:text-left gap-2 sm:gap-0">
                        <div className="order-2 sm:order-1">
                          <p className="text-[10px] sm:text-sm font-medium text-muted-foreground">{w.label}</p>
                          <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-2 text-foreground">{w.value}</p>
                          <p className="text-[8px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">{w.sub}</p>
                        </div>                        <div className={cn("p-2 sm:p-2.5 rounded-xl order-1 sm:order-2", w.color)}>
                          <w.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                 {/* Main Chart Area */}
                 <motion.div variants={fadeInUp} className="col-span-1 lg:col-span-2">
                   <Card className="border-border/60 shadow-sm border-none md:border-solid overflow-hidden h-full">
                     <CardHeader className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                       <div>
                         <CardTitle className="text-sm md:text-base font-bold">Collection Trends</CardTitle>
                         <CardDescription className="text-xs hidden sm:block">Weekly performance monitoring.</CardDescription>
                       </div>
                       <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/40">
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className={cn("h-7 px-2 text-[10px] rounded-lg transition-all", chartVisibility.collected ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground opacity-50")}
                           onClick={() => setChartVisibility(v => ({...v, collected: !v.collected}))}
                         >
                           Collected
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className={cn("h-7 px-2 text-[10px] rounded-lg transition-all", chartVisibility.missed ? "bg-red-600 text-white shadow-sm" : "text-muted-foreground opacity-50")}
                           onClick={() => setChartVisibility(v => ({...v, missed: !v.missed}))}
                         >
                           Missed
                         </Button>                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className={cn("h-7 px-2 text-[10px] rounded-lg transition-all", chartVisibility.pending ? "bg-slate-500 text-white shadow-sm" : "text-muted-foreground opacity-50")}
                           onClick={() => setChartVisibility(v => ({...v, pending: !v.pending}))}
                         >
                           Pending
                         </Button>
                       </div>
                     </CardHeader>
                     <CardContent className="p-0 sm:p-6 pb-4">
                       <div className="h-[200px] sm:h-[300px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                             <defs>
                               <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                 <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                               </linearGradient>
                               <linearGradient id="colorMissed" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                 <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                               </linearGradient>
                               <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                                 <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                               </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                             <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                             <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px' }} />
                             {chartVisibility.collected && (
                               <Area 
                                 type="monotone" 
                                 dataKey="collected" 
                                 stroke="#10b981" 
                                 strokeWidth={2} 
                                 fillOpacity={1} 
                                 fill="url(#colorCollected)" 
                                 isAnimationActive={true}
                                 animationDuration={1500}
                                 animationEasing="ease-in-out"
                               />
                             )}
                             {chartVisibility.missed && (
                               <Area 
                                 type="monotone" 
                                 dataKey="missed" 
                                 stroke="#ef4444" 
                                 strokeWidth={2} 
                                 fillOpacity={1} 
                                 fill="url(#colorMissed)" 
                                 isAnimationActive={true}
                                 animationDuration={1500}
                                 animationEasing="ease-in-out"
                               />
                             )}
                             {chartVisibility.pending && (
                               <Area 
                                 type="monotone" 
                                 dataKey="pending" 
                                 stroke="#64748b" 
                                 strokeWidth={2} 
                                 fillOpacity={1} 
                                 fill="url(#colorPending)" 
                                 isAnimationActive={true}
                                 animationDuration={1500}
                                 animationEasing="ease-in-out"
                               />
                             )}
                           </AreaChart>
                         </ResponsiveContainer>
                       </div>
                     </CardContent>
                   </Card>
                 </motion.div>

                 {/* Live Map */}
                 <motion.div variants={fadeInUp} className="col-span-1">
                   <Card className="border-border/60 shadow-sm flex flex-col overflow-hidden border-none md:border-solid h-full">
                     <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/20">
                       <div className="space-y-1">
                         <CardTitle className="text-sm md:text-base font-bold">Live Tracker</CardTitle>
                         <div className="flex items-center gap-2">
                           <span className="relative flex h-2 w-2">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                           </span>
                           <span className="text-[10px] text-muted-foreground uppercase font-bold">{collectors?.length || 0} active</span>
                         </div>
                         </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-emerald-100 transition-colors" onClick={handleRefreshLocations} aria-label="Refresh locations" title="Refresh worker locations">
                         <RefreshCw className="h-4 w-4" />
                         </Button>
                         </CardHeader>
                         <div className="flex-1 h-[250px] md:h-auto min-h-[250px] relative bg-slate-100">
                         <MapContainer 
                          center={[9.9312, 76.2673]} 
                          zoom={11} 
                          scrollWheelZoom={false}
                          className="h-full w-full absolute inset-0 z-0"
                         >
                          <MapController collectors={collectors || []} />
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          {collectors?.filter((c: any) => c.lat && c.lng).map((c: any) => {
                            return (
                              <Marker
 
                                key={c.$id} 
                                position={[c.lat, c.lng]}
                                title={`Collector: ${c.name}`}
                                alt={`Collector: ${c.name}`}
                                icon={L.divIcon({
                                  className: "custom-pin",
                                  html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3);"></div>`,
                                  iconSize: [24, 24],
                                  iconAnchor: [12, 12]
                                })}
                              >                                 <Popup className="rounded-xl overflow-hidden p-0 border-none shadow-xl">
                                   <div className="px-3 py-2 bg-slate-900 text-white min-w-[140px]">
                                     <p className="font-bold text-sm">{c.name}</p>
                                     <p className="text-xs text-slate-300">Last seen: {formatDisplayTime(c.lastSeen)}</p>
                                   </div>

                                 </Popup>
                              </Marker>
                            );
                          })}
                        </MapContainer>
                     </div>
                   </Card>
                 </motion.div>
              </div>

              {/* Recent Activity Section */}
              <motion.div variants={fadeInUp}>
                <Card className="border-border/60 shadow-sm overflow-hidden border-none md:border-solid">
                   <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/20 px-4 md:px-6">
                     <div className="space-y-1">
                       <CardTitle className="text-base">Recent Collections</CardTitle>
                       <CardDescription className="text-[10px] sm:text-xs">Real-time log of household visits.</CardDescription>
                     </div>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="outline" size="sm" className="h-8 gap-2 border-primary/20 hover:border-primary/40 transition-colors rounded-xl text-[10px] sm:text-xs">
                           <Filter className="h-3.5 w-3.5" /> 
                           <span className="capitalize">{statusFilter === 'all' ? 'Filter' : statusFilter.replace('-', ' ')}</span>
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/60">
                         <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Filter by Status</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => setStatusFilter("all")} className="rounded-lg gap-2 cursor-pointer">
                           <div className="h-2 w-2 rounded-full bg-slate-400" /> All Collections
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setStatusFilter("paid")} className="rounded-lg gap-2 cursor-pointer">
                           <div className="h-2 w-2 rounded-full bg-blue-500" /> Paid
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setStatusFilter("not-available")} className="rounded-lg gap-2 cursor-pointer">
                           <div className="h-2 w-2 rounded-full bg-red-500" /> Not Available
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setStatusFilter("collected")} className="rounded-lg gap-2 cursor-pointer">
                           <div className="h-2 w-2 rounded-full bg-emerald-500" /> Collected
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </CardHeader>

                   {/* Desktop View Table */}
                   <div className="hidden md:block overflow-x-auto">
                     <Table>
                       <TableHeader className="bg-muted/30">
                         <TableRow>
                           <TableHead className="w-[200px]">Household</TableHead>
                           <TableHead>Collector</TableHead>
                           <TableHead>Time</TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead className="text-right">Amount</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {displayLogs.map((log: any) => (
                           <TableRow key={log.$id} className="hover:bg-muted/20 border-b border-border/40">
                             <TableCell className="font-medium">
                               <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                   {log.residentName.charAt(0)}
                                 </div>
                                 <div>
                                   <p className="text-sm font-semibold text-foreground">{log.residentName}</p>
                                   <p className="text-xs text-muted-foreground">{log.location || 'Unknown Area'}</p>
                                 </div>
                               </div>
                             </TableCell>
                             <TableCell className="text-sm text-muted-foreground">{log.collectorName}</TableCell>
                             <TableCell className="text-sm font-mono text-muted-foreground">
                               {formatDisplayTime(log.timestamp)}
                             </TableCell>
                             <TableCell>
                               <Badge variant="outline" className={cn("capitalize font-normal", statusColors[log.status] || statusColors['pending'])}>
                                 {log.status}
                               </Badge>
                             </TableCell>
                             <TableCell className="text-right font-medium text-foreground">₹{log.amountCollected}</TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>

                   {/* Mobile View Cards */}
                   <div className="md:hidden divide-y divide-border">
                     {displayLogs.map((log: any) => (
                        <div key={log.$id} className="p-4 space-y-3 bg-card">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs border border-emerald-100">
                                {log.residentName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-foreground leading-none">{log.residentName}</h4>
                                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {formatDisplayTime(log.timestamp)}
                                </p>
                              </div>
                            </div>
                            <p className="font-black text-emerald-700 text-sm">₹{log.amountCollected}</p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-3 w-3 text-slate-500" />
                              </div>
                              <span className="text-[10px] font-medium text-slate-600">{log.collectorName}</span>
                            </div>
                            <Badge variant="outline" className={cn("text-[9px] px-2 py-0 h-5 rounded-lg capitalize border-none bg-muted/50", statusColors[log.status] || statusColors['pending'])}>
                              {log.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {displayLogs.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground text-xs italic">
                          No collections found for this date.
                        </div>
                      )}
                   </div>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="assignments" className="mt-0">
              <Card className="border-border/60 shadow-sm border-none md:border-solid">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:p-6">
                   <div>
                     <CardTitle className="text-lg md:text-xl font-bold">Route Management</CardTitle>
                     <CardDescription className="text-xs md:text-sm">Assign daily routes to active collectors.</CardDescription>
                   </div>
                   <Button 
                      className="w-full sm:w-auto shadow-lg shadow-primary/20 rounded-xl h-11 sm:h-9"
                      onClick={async () => {
                        const assignments = Object.entries(selectedCollectors).map(([ward, cId]) => 
                          assignRouteMutation.mutateAsync({ collectorId: cId, ward: parseInt(ward) })
                        );
                        await Promise.all(assignments);
                        setSelectedCollectors({});
                        window.location.reload();
                      }}
                      disabled={Object.keys(selectedCollectors).length === 0 || assignRouteMutation.isPending}
                   >
                     {assignRouteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Save Changes
                   </Button>
                </CardHeader>
                
                <CardContent className="p-0 md:p-6">
                  {/* Desktop View */}
                  <div className="hidden md:block border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-[100px] font-semibold">Ward ID</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Assignment</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(ward => {
                          const activeRoute = dailyRoutes?.find((r: any) => r.ward === ward);
                          const availableCollectors = collectors?.filter((c: any) => (c.ward || []).includes(ward)) || [];
                          return (
                            <TableRow key={ward} className="hover:bg-muted/20">
                              <TableCell className="font-bold text-emerald-700">#W{ward}</TableCell>
                              <TableCell>
                                {activeRoute ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 rounded-lg">Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground border-dashed rounded-lg">Unassigned</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {activeRoute ? (
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                      {activeRoute.name.split(' - ')[1]?.charAt(0)}
                                    </div>
                                    <span className="text-sm font-semibold">{activeRoute.name.split(' - ')[1]}</span>
                                  </div>
                                ) : (
                                  <Select value={selectedCollectors[ward]} onValueChange={(v) => setSelectedCollectors(p => ({ ...p, [ward]: v }))}>
                                    <SelectTrigger className="w-[220px] h-10 rounded-xl border-border/60">
                                      <SelectValue placeholder="Select Collector" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      {availableCollectors.map((c: any) => (
                                        <SelectItem key={c.$id} value={c.$id}>{c.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {activeRoute && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-destructive hover:bg-destructive/10 rounded-lg" 
                                    onClick={() => deleteRouteMutation.mutate({ routeId: activeRoute.$id, ward })}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" /> Reset
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden divide-y divide-border">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(ward => {
                      const activeRoute = dailyRoutes?.find((r: any) => r.ward === ward);
                      const availableCollectors = collectors?.filter((c: any) => (c.ward || []).includes(ward)) || [];
                      return (
                        <div key={ward} className="p-4 bg-card space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-emerald-700">#W{ward}</span>
                              {!activeRoute && <Badge variant="outline" className="text-[10px] border-dashed">Pending</Badge>}
                            </div>
                            {activeRoute && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-destructive px-2"
                                onClick={() => deleteRouteMutation.mutate({ routeId: activeRoute.$id, ward })}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Collector Assignment</Label>
                            {activeRoute ? (
                              <div className="flex items-center gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                                <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                                  {activeRoute.name.split(' - ')[1]?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-emerald-900 leading-none">{activeRoute.name.split(' - ')[1]}</p>
                                  <p className="text-[10px] text-emerald-600 mt-1 uppercase font-bold">Currently Active</p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              </div>
                            ) : (                              <Select value={selectedCollectors[ward]} onValueChange={(v) => setSelectedCollectors(p => ({ ...p, [ward]: v }))}>
                                <SelectTrigger className="w-full h-12 rounded-2xl border-border/60 bg-muted/20">
                                  <SelectValue placeholder="Tap to assign worker..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                  {availableCollectors.length > 0 ? (
                                    availableCollectors.map((c: any) => (
                                      <SelectItem key={c.$id} value={c.$id} className="h-12 rounded-xl">{c.name}</SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center text-xs text-muted-foreground">No workers for this ward</div>
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage">
              <HouseholdManagement />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
