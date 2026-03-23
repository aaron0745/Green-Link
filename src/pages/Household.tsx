import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, User, Calendar, IndianRupee, Printer, ArrowLeft, Loader2, Leaf, ShieldCheck, MapPin, Clock, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

export default function HouseholdPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const isCollector = role === 'collector';
  const [isGenerating, setIsGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setIsGenerating(true);
    try {
      const element = receiptRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const fileName = `Receipt-${id?.substring(0,8)}.pdf`;
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache });
        await Share.share({ title: 'Your Waste Collection Receipt', text: 'Here is your digital receipt from Green-link.', url: savedFile.uri, dialogTitle: 'Save or Share Receipt' });
      } else { pdf.save(fileName); }
    } catch (err) { console.error("PDF Generation failed:", err); } finally { setIsGenerating(false); }
  };

  const printStyles = `
    @media print {
      @page { margin: 0; size: auto; }
      body { margin: 0; padding: 0; }
      header, footer, nav, aside { display: none !important; }
    }
  `;

  const { data: house, isLoading: houseLoading } = useQuery({
    queryKey: ['household', id],
    queryFn: () => api.getHousehold(id || ""),
    enabled: !!id
  });

  const { data: collectors, isLoading: collectorsLoading } = useQuery({
    queryKey: ['collectors'],
    queryFn: () => api.getCollectors()
  });

  if (houseLoading || collectorsLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!house) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Household not found.</p>
        </div>
      </Layout>
    );
  }

  const collector = (collectors || []).find((c: any) => c.$id === (house as any).assignedCollector);
  const paymentColor = (house as any).paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : (house as any).paymentStatus === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200";

  return (
    <Layout>
      <style>{printStyles}</style>
      <motion.div initial="initial" animate="animate" variants={staggerContainer} className="max-w-lg mx-auto p-4 sm:p-6 space-y-6 print:hidden">
        <motion.div variants={fadeInUp}>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Portal
          </Link>
        </motion.div>

        <motion.div variants={fadeInUp} className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Household Record</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Digital Verification — {house.$id}</p>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] sm:text-xs uppercase font-bold tracking-wider">House ID</p>
                  <p className="font-semibold text-foreground flex items-center gap-1.5"><Home className="h-3.5 w-3.5 text-primary/60" />{house.$id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] sm:text-xs uppercase font-bold tracking-wider">Resident Name</p>
                  <p className="font-semibold text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary/60" />{(house as any).residentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] sm:text-xs uppercase font-bold tracking-wider">Last Collection</p>
                  <p className="font-semibold text-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary/60" />{(house as any).lastCollectionDate || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] sm:text-xs uppercase font-bold tracking-wider">Payment Status</p>
                  <Badge variant="outline" className={cn("text-[10px] uppercase font-black px-2 py-0 h-5", paymentColor)}>{(house as any).paymentStatus}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!isCollector && (
          <motion.div variants={fadeInUp}>
            <Card className={cn("border-primary/30", (house as any).paymentStatus !== "paid" && "opacity-60 grayscale")}>
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Digital Receipt
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="bg-primary/5 rounded-2xl p-4 space-y-3 border border-primary/10 shadow-inner">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-bold text-foreground">{(house as any).lastCollectionDate || new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Collector</span>
                    <span className="font-bold text-foreground">{collector?.name || "Online System"}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-black text-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{(house as any).monthlyFee}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm items-center pt-2 border-t border-primary/10">
                    <span className="text-muted-foreground">Status</span>
                    <span className={cn("font-black flex items-center gap-1.5 uppercase text-[10px]", (house as any).paymentStatus === "paid" ? "text-emerald-600" : "text-destructive")}>
                      {(house as any).paymentStatus === "paid" ? <><CheckCircle2 className="h-3.5 w-3.5" /> Verified</> : <><Clock className="h-3.5 w-3.5" /> Pending</>}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full gap-2 rounded-xl h-12 shadow-sm border-primary/20 text-primary hover:bg-primary/5 font-bold text-xs sm:text-sm" onClick={handleDownloadPDF} disabled={(house as any).paymentStatus !== "paid" || isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isGenerating ? "Generating..." : (house as any).paymentStatus === "paid" ? "Download PDF Receipt" : "Payment Pending"}
                </Button>
                {(house as any).paymentStatus !== "paid" && <p className="text-[10px] text-center text-destructive font-bold italic tracking-tight">Receipts available only for paid collections.</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {(house as any).paymentStatus === "paid" && (
        <div className="absolute left-[-9999px] top-0 w-[800px]">
          <div ref={receiptRef} className="p-10 font-sans text-slate-900 bg-white">
            <div className="max-w-2xl mx-auto border-2 border-slate-200 p-8 rounded-none bg-white">
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center"><Leaf className="h-7 w-7 text-white" /></div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-green-700">Green-link</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Smart Waste Management</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-400 uppercase">Official Receipt</p>
                  <p className="text-xs text-slate-500">#{house.$id.substring(0,8).toUpperCase()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Resident Details</p>
                  <p className="font-bold text-slate-800">{(house as any).residentName}</p>
                  <p className="text-sm text-slate-600">{(house as any).address}</p>
                  <p className="text-sm text-slate-600">Phone: {(house as any).phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Collection Date</p>
                  <p className="font-bold text-slate-800">{(house as any).lastCollectionDate || "Verified Date"}</p>
                  <p className="text-sm text-slate-600">Ward: {(house as any).ward}</p>
                </div>
              </div>
              <table className="w-full mb-10">
                <thead><tr className="border-b-2 border-slate-100 text-left"><th className="py-2 text-[10px] uppercase font-bold text-slate-400">Description</th><th className="py-2 text-[10px] uppercase font-bold text-slate-400 text-right">Amount</th></tr></thead>
                <tbody>
                  <tr className="border-b border-slate-50"><td className="py-4"><p className="font-bold text-slate-800">Monthly Waste Collection Fee</p><p className="text-xs text-slate-500 italic">Verified Doorstep Service</p></td><td className="py-4 text-right font-bold text-slate-800">₹{(house as any).monthlyFee}.00</td></tr>
                  <tr><td className="py-4 text-right pr-4 text-sm font-bold text-slate-500">Total Paid:</td><td className="py-4 text-right text-xl font-black text-green-600">₹{(house as any).monthlyFee}.00</td></tr>
                </tbody>
              </table>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-10 w-10 text-green-600" />
                  <div><p className="text-sm font-bold text-slate-800">Transaction Verified</p><p className="text-xs text-slate-500">This is a system-generated digital receipt. No signature required.</p></div>
                </div>
                <div className="h-16 w-16 opacity-20"><Leaf className="h-full w-full text-green-600" /></div>
              </div>
              <div className="mt-10 text-center"><p className="text-[9px] text-slate-400 uppercase tracking-[0.2em]">Generated via Green-link Digital Initiative © 2026</p></div>
            </div>
          </div>
        </div>
      )}

      {(house as any).paymentStatus === "paid" && (
        <div className="hidden print:block p-10 font-sans text-slate-900 bg-white min-h-screen">
          <div className="max-w-2xl mx-auto border-2 border-slate-200 p-8 rounded-none">
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center"><Leaf className="h-7 w-7 text-white" /></div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-green-700">Green-link</h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Smart Waste Management</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-400 uppercase">Official Receipt</p>
                <p className="text-xs text-slate-500">#{house.$id.substring(0,8).toUpperCase()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Resident Details</p>
                <p className="font-bold text-slate-800">{(house as any).residentName}</p>
                <p className="text-sm text-slate-600">{(house as any).address}</p>
                <p className="text-sm text-slate-600">Phone: {(house as any).phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Collection Date</p>
                <p className="font-bold text-slate-800">{(house as any).lastCollectionDate || "Verified Date"}</p>
                <p className="text-sm text-slate-600">Ward: {(house as any).ward}</p>
              </div>
            </div>
            <table className="w-full mb-10">
              <thead><tr className="border-b-2 border-slate-100 text-left"><th className="py-2 text-[10px] uppercase font-bold text-slate-400">Description</th><th className="py-2 text-[10px] uppercase font-bold text-slate-400 text-right">Amount</th></tr></thead>
              <tbody>
                <tr className="border-b border-slate-50"><td className="py-4"><p className="font-bold text-slate-800">Monthly Waste Collection Fee</p><p className="text-xs text-slate-500 italic">Verified Doorstep Service</p></td><td className="py-4 text-right font-bold text-slate-800">₹{(house as any).monthlyFee}.00</td></tr>
                <tr><td className="py-4 text-right pr-4 text-sm font-bold text-slate-500">Total Paid:</td><td className="py-4 text-right text-xl font-black text-green-600">₹{(house as any).monthlyFee}.00</td></tr>
              </tbody>
            </table>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-10 w-10 text-green-600" />
                <div><p className="text-sm font-bold text-slate-800">Transaction Verified</p><p className="text-xs text-slate-500">This is a system-generated digital receipt. No signature required.</p></div>
              </div>
              <div className="h-16 w-16 opacity-20"><Leaf className="h-full w-full" /></div>
            </div>
            <div className="mt-10 text-center"><p className="text-[9px] text-slate-400 uppercase tracking-[0.2em]">Generated via Green-link Digital Initiative © 2026</p></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
