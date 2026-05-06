import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, AlertTriangle, TrendingUp, Percent, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format, isValid } from "date-fns";
import { parseDate } from "@/lib/date-utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function Reports() {
  const [reportDate, setReportDate] = useState<Date>(new Date());

  const { data: households, isLoading: householdsLoading } = useQuery({
    queryKey: ['households'],
    queryFn: () => api.getHouseholds()
  });

  const { data: collectionLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => api.getCollectionLogs()
  });

  if (householdsLoading || logsLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const getTodaysStats = () => {
    if (!households || !collectionLogs) return { total: 0, covered: 0 };
    const dateStr = format(reportDate, "yyyy-MM-dd");
    const dateStrLocal = reportDate.toLocaleDateString('en-GB');
    const dateStrAlternative = format(reportDate, "d/M/yyyy");
    const dailyLogs = collectionLogs.filter((l: any) => 
        l.timestamp && (l.timestamp.startsWith(dateStr) || l.timestamp.startsWith(dateStrLocal) || l.timestamp.includes(dateStrAlternative))
    );
    const coveredIds = new Set(dailyLogs.filter((l: any) => {
        const s = (l.status || '').toLowerCase();
        return s === 'collected' || s === 'paid';
    }).map((l: any) => l.householdId));
    return { total: households.length, covered: coveredIds.size };
  };

  const stats = getTodaysStats();
  const coveragePercent = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
  const missedHouses = (households || []).filter((h: any) => {
    const dateStr = format(reportDate, "yyyy-MM-dd");
    const dateStrLocal = reportDate.toLocaleDateString('en-GB');
    const dateStrAlternative = format(reportDate, "d/M/yyyy");
    const hasLog = collectionLogs?.some((l: any) => 
        l.householdId === h.$id && l.timestamp && (l.timestamp.startsWith(dateStr) || l.timestamp.startsWith(dateStrLocal) || l.timestamp.includes(dateStrAlternative))
    );
    return !hasLog;
  });

  const getMonthlyRevenue = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        revenueMap[months[d.getMonth()]] = 0;
    }
    collectionLogs?.forEach((log: any) => {
      if (log.status === 'collected' || log.status === 'paid') {
        if (!log.timestamp) return;
        const date = parseDate(log.timestamp);
        if (!isValid(date)) return;
        const monthName = months[date.getMonth()];
        if (revenueMap[monthName] !== undefined) revenueMap[monthName] += log.amountCollected || 0;
      }
    });
    return Object.entries(revenueMap).map(([month, revenue]) => ({ month, revenue }));
  };

  const monthlyRevenueData = getMonthlyRevenue();

  const handleExport = async () => {
    const dateStr = format(reportDate, "yyyy-MM-dd");
    const dateStrLocal = reportDate.toLocaleDateString('en-GB');
    const dateStrAlternative = format(reportDate, "d/M/yyyy");
    
    const dailyLogs = (collectionLogs || []).filter((l: any) => 
      l.timestamp && (l.timestamp.startsWith(dateStr) || l.timestamp.startsWith(dateStrLocal) || l.timestamp.includes(dateStrAlternative))
    );

    const reportData = (households || []).map((h: any) => {
      const log = dailyLogs.find((l: any) => l.householdId === h.$id);
      return `${h.$id},${h.residentName},${h.address.replace(/,/g, ' ')},${log ? log.status : 'Pending'},${log && (log.status === 'paid' || log.status === 'collected') ? 'Paid' : 'Unpaid'}`;
    });

    const csv = ["House ID,Resident,Address,Status,Payment", ...reportData].join("\n");
    const fileName = `greenlink-report-${dateStr}.csv`;
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = btoa(unescape(encodeURIComponent(csv)));
        const savedFile = await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Cache });
        await Share.share({ title: 'Green-link Collection Report', text: 'Here is the exported CSV report from Green-link.', url: savedFile.uri, dialogTitle: 'Save or Share Report' });
      } catch (err) { console.error("Mobile export failed:", err); }
    } else {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Layout>
      <motion.div initial="initial" animate="animate" variants={staggerContainer} className="p-3 sm:p-6 space-y-6 max-w-[100vw] overflow-x-hidden">
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground"><span className="text-green-600">Green</span>-link Analytics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Monitoring and compliance data from Appwrite</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !reportDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {reportDate ? format(reportDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={reportDate} onSelect={(date) => date && setReportDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
            <Button onClick={handleExport} variant="secondary" className="gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <motion.div variants={fadeInUp}>
            <Card className="h-full">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-bold">
                  <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Daily Collection Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="flex flex-col items-center py-4">
                  <div className="relative h-28 w-28 sm:h-36 sm:w-36">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
                      <motion.circle initial={{ strokeDasharray: "0 264" }} animate={{ strokeDasharray: `${coveragePercent * 2.64} 264` }} transition={{ duration: 1, ease: "easeOut" }} cx="50" cy="50" r="42" stroke="hsl(var(--primary))" strokeWidth="10" fill="none" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl sm:text-3xl font-bold text-foreground">{coveragePercent}%</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Covered</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 mt-4 text-xs sm:text-sm">
                    <span className="text-muted-foreground font-medium">{stats.covered}/{stats.total} houses</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="h-full">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-bold">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-[180px] sm:h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyRevenueData} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: number) => `₹${value}`} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                Missed / Pending Houses ({format(reportDate, "PP")})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              {missedHouses.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">All houses covered today! 🎉</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-auto pr-1">
                  {missedHouses.map((h: any) => (
                    <div key={h.$id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50 transition-colors hover:bg-muted/50">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="font-bold text-foreground text-xs sm:text-sm truncate">{h.residentName}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{h.address}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 shrink-0 font-bold uppercase tracking-tight", h.collectionStatus === "not-available" ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                        {h.collectionStatus === 'not-available' ? 'Missed' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  );
}
