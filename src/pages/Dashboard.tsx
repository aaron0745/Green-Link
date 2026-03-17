import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Home, Users, Clock, IndianRupee, MapPin, Loader2, CheckCircle2, CreditCard, QrCode, ClipboardList, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HouseholdManagement } from "@/components/HouseholdManagement";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Helper component to center map on workers
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

// Fix for default Leaflet icon not showing
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
  collected: "bg-primary/15 text-primary border-primary/20",
  "not-available": "bg-destructive/15 text-destructive border-destructive/20",
  skipped: "bg-warning/15 text-warning border-warning/20",
  paid: "bg-primary/15 text-primary border-primary/20",
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const isHousehold = role === 'household';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
    enabled: isHousehold && !!user?.$id,
    refetchInterval: 5000,
  });

  const { data: collectionLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => api.getCollectionLogs()
  });

  const { data: collectors, refetch: refetchCollectors } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.getCollectors(),
    enabled: isAdmin,
    refetchInterval: 10000, // Background poll every 10s
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
    }
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (vars: { routeId: string, ward: number }) => api.deleteRoute(vars.routeId, vars.ward),
    onSuccess: () => {
      const dateStr = formatDateForQuery(selectedDate);
      queryClient.invalidateQueries({ queryKey: ['routes', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['households'] });
      toast({ title: "Assignment Reset", description: "Route has been cleared and ward set to unassigned." });
    }
  });

  const payOnlineMutation = useMutation({
    mutationFn: () => api.payOnline(user.$id, currentResident?.residentName || user.residentName, 100),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['resident', user?.$id] });
      toast({ title: "Payment Successful", description: "Your payment has been logged." });
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
        l.timestamp && (
            l.timestamp.startsWith(dateStr) || 
            l.timestamp.startsWith(dateStrLocal) ||
            l.timestamp.includes(dateStrAlternative)
        )
    );

    const total = households.length;
    const covered = filteredLogs.filter((l: any) => {
        const s = (l.status || '').toLowerCase();
        return s === "collected" || s === "paid";
    }).length;
    const pending = total - covered;
    const revenue = filteredLogs.filter((l: any) => {
        const s = (l.status || '').toLowerCase();
        return s === "collected" || s === "paid";
    }).reduce((a: number, l: any) => a + (l.amountCollected || 0), 0);
    return { total, covered, pending, revenue };
  })();

  if (householdsLoading || logsLoading || residentLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const getDynamicChartData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - (6 - i));
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return {
        day: days[d.getDay()],
        dateStr: `${year}-${month}-${day}`,
        collected: 0,
        missed: 0
      };
    });

    collectionLogs?.forEach((log: any) => {
      if (!log.timestamp) return;
      const rawDate = log.timestamp.split(',')[0].split(' ')[0];
      let formattedLogDate = rawDate;
      if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2].trim();
          formattedLogDate = `${y}-${m}-${d}`;
        }
      }

      const dayData = last7Days.find(d => d.dateStr === formattedLogDate);
      if (dayData) {
        const status = (log.status || '').toLowerCase();
        if (status === 'collected' || status === 'paid') dayData.collected++;
        else dayData.missed++;
      }
    });
    return last7Days;
  };

  const chartData = getDynamicChartData();

  const residentStats = role === 'household' ? {
    residentName: currentResident?.residentName || user.residentName,
    address: currentResident?.address || user.address,
    paymentStatus: currentResident?.paymentStatus || user.paymentStatus,
    collectionStatus: currentResident?.collectionStatus || user.collectionStatus,
    lastDate: currentResident?.lastCollectionDate || user.lastCollectionDate,
    paymentMode: currentResident?.paymentMode || user.paymentMode || 'none'
  } : null;

  if (!isAdmin && role === 'household') {
    const myLogs = (collectionLogs || []).filter((l: any) => l.householdId === user.$id);

    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Resident Portal</h1>
              <p className="text-sm text-muted-foreground">{residentStats?.residentName} — {residentStats?.address}</p>
            </div>
            <div className="flex items-center gap-3">
              {residentStats?.paymentStatus !== 'paid' && residentStats?.paymentMode === 'online' && (
                <Button 
                  size="sm" 
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => payOnlineMutation.mutate()}
                  disabled={payOnlineMutation.isPending}
                >
                  <CreditCard className="h-4 w-4" /> Pay Online
                </Button>
              )}
              <Badge variant="outline" className={`h-fit text-sm py-1 ${residentStats?.paymentStatus === 'paid' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                Payment: {residentStats?.paymentStatus === 'pending' ? 'PENDING' : residentStats?.paymentStatus.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <CalendarIcon className="h-5 w-5 mb-1 text-primary" />
                  <p className="text-xl font-bold text-foreground">{residentStats?.lastDate || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Last Collection</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <MapPin className="h-5 w-5 mb-1 text-primary" />
                  <p className="text-xl font-bold text-foreground truncate w-full">{residentStats?.address}</p>
                  <p className="text-xs text-muted-foreground">Location</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <CheckCircle2 className="h-5 w-5 mb-1 text-primary" />
                  <p className="text-xl font-bold text-foreground capitalize">{residentStats?.collectionStatus}</p>
                  <p className="text-xs text-muted-foreground">Status</p>
                </CardContent>
              </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Your Household QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="p-4 bg-white rounded-lg shadow-inner">
                <QRCodeSVG value={user.$id} size={180} level="H" />
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Scan this QR code for waste collection verification.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5" /> Your Collection History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Collector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Fee Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myLogs.map((log: any) => (
                    <TableRow key={log.$id}>
                      <TableCell className="text-sm">{log.timestamp}</TableCell>
                      <TableCell className="text-sm font-medium">{log.collectorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[log.status] || ""}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">₹{log.amountCollected}</TableCell>
                    </TableRow>
                  ))}
                  {myLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No collection records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const widgets = [
    { label: "Total Houses", value: stats?.total || 0, icon: Home, color: "text-primary" },
    { label: "Covered Today", value: stats?.covered || 0, icon: Users, color: "text-primary" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "text-warning" },
    { label: "Revenue Today", value: `₹${stats?.revenue || 0}`, icon: IndianRupee, color: "text-primary" },
  ];

  const wards = Array.from({ length: 8 }, (_, i) => i + 1);

  const handleRefreshLocations = () => {
    refetchCollectors();
    toast({
      title: "Refreshing...",
      description: "Fetching latest worker positions from database.",
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground"><span className="text-green-600">Green</span>-link Admin</h1>
            <p className="text-sm text-muted-foreground">Panchayat-wide waste collection overview</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assignments">Daily Assignments</TabsTrigger>
            <TabsTrigger value="manage">Manage Households</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {widgets.map((w) => (
                <Card key={w.label}>
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <w.icon className={`h-5 w-5 mb-1 ${w.color}`} />
                    <p className="text-2xl font-bold text-foreground">{w.value}</p>
                    <p className="text-xs text-muted-foreground">{w.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="collected" fill="hsl(152, 55%, 28%)" name="Collected" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="missed" fill="hsl(0, 72%, 51%)" name="Missed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">Live Collection Map</CardTitle>
                  <Button variant="ghost" size="icon" onClick={handleRefreshLocations} title="Update all worker locations">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full bg-muted rounded-lg overflow-hidden border border-border z-0">
                    <MapContainer 
                      center={[9.9312, 76.2673]} 
                      zoom={11} 
                      scrollWheelZoom={false}
                      className="h-full w-full"
                    >
                      <MapController collectors={collectors || []} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      
                      {/* Worker Locations */}
                      {collectors?.filter((c: any) => c.lat && c.lng).map((c: any) => {
                        const lastSeenDate = c.lastSeen ? new Date(c.lastSeen) : null;
                        const statusColor = "#16a34a"; // Consistent green for all markers

                        return (
                          <Marker 
                            key={c.$id} 
                            position={[c.lat, c.lng]} 
                            icon={L.divIcon({
                              className: "collector-marker",
                              html: `<div style="background-color: ${statusColor}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${c.name.substring(0, 1).toUpperCase()}</div>`,
                              iconSize: [30, 30],
                              iconAnchor: [15, 15],
                            })}
                          >
                            <Popup>
                              <div className="text-xs">
                                <p className="font-bold mb-1">{c.name}</p>
                                <p className="text-muted-foreground italic">Worker - Ward {(c.ward || []).join(",")}</p>
                                <p className="mt-1 text-primary/70 font-medium">Last Known Location: {lastSeenDate ? lastSeenDate.toLocaleTimeString() : 'Never'}</p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collector</TableHead>
                      <TableHead>Household</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Visit</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(collectionLogs || [])
                      .filter((log: any) => {
                        if (!log.timestamp) return false;
                        const dateStr = formatDateForQuery(selectedDate);
                        const dateStrLocal = selectedDate.toLocaleDateString('en-GB');
                        const dateStrAlternative = format(selectedDate, "d/M/yyyy");
                        return log.timestamp.startsWith(dateStr) || 
                               log.timestamp.startsWith(dateStrLocal) ||
                               log.timestamp.includes(dateStrAlternative);
                      })
                      .map((log: any) => (
                      <TableRow key={log.$id}>
                        <TableCell className="font-medium text-sm">{log.collectorName}</TableCell>
                        <TableCell className="text-sm">{log.residentName}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{log.timestamp.includes(',') ? log.timestamp.split(',')[1].trim() : log.timestamp}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[log.status.toLowerCase()] || ''}`}>
                            {(log.status || 'unknown').toUpperCase()} 
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.paymentMode && log.paymentMode !== 'none' ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase">
                              {log.paymentMode}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">₹{log.amountCollected || 0}</TableCell>
                      </TableRow>
                    ))}
                    {(collectionLogs || []).filter((log: any) => {
                        if (!log.timestamp) return false;
                        const dateStr = formatDateForQuery(selectedDate);
                        const dateStrLocal = selectedDate.toLocaleDateString('en-GB');
                        const dateStrAlternative = format(selectedDate, "d/M/yyyy");
                        return log.timestamp.startsWith(dateStr) || 
                               log.timestamp.startsWith(dateStrLocal) ||
                               log.timestamp.includes(dateStrAlternative);
                    }).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No records found for this date.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Route Assignments — {format(selectedDate, "PPP")}
                </CardTitle>
                <Button 
                  size="sm" 
                  disabled={Object.keys(selectedCollectors).length === 0 || assignRouteMutation.isPending}
                  onClick={async () => {
                    try {
                      const assignments = Object.entries(selectedCollectors).map(([ward, cId]) => 
                        assignRouteMutation.mutateAsync({ collectorId: cId, ward: parseInt(ward) })
                      );
                      await Promise.all(assignments);
                      setSelectedCollectors({});
                      toast({ title: "All Routes Confirmed", description: "Assignments updated in database." });
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (err: any) {
                      toast({ variant: "destructive", title: "Assignment Failed", description: err.message });
                    }
                  }}
                >
                  {assignRouteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm All Assignments
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ward</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Select Collector</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wards.map(ward => {
                      const activeRoute = dailyRoutes?.find((r: any) => r.ward === ward);
                      const availableCollectors = collectors?.filter((c: any) => (c.ward || []).includes(ward)) || [];
                      
                      return (
                        <TableRow key={ward}>
                          <TableCell className="font-medium">Ward {ward}</TableCell>
                          <TableCell>
                            {activeRoute ? (
                              <Badge className="bg-green-600">
                                {activeRoute.name.split(' - ')[1]}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!activeRoute && (
                              <Select 
                                value={selectedCollectors[ward]}
                                onValueChange={(val) => setSelectedCollectors(prev => ({ ...prev, [ward]: val }))}
                              >
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                  <SelectValue placeholder="Select Collector" />
                                </SelectTrigger>
                                <SelectContent>
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
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                                onClick={() => deleteRouteMutation.mutate({ routeId: activeRoute.$id, ward })}
                                disabled={deleteRouteMutation.isPending}
                              >
                                {deleteRouteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reset'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader><CardTitle>Household Management</CardTitle></CardHeader>
              <CardContent><HouseholdManagement /></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
