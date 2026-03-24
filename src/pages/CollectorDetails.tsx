import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Loader2, 
  UserCog, 
  Calendar,
  ClipboardList,
  ShieldAlert
} from "lucide-react";
import { motion } from "framer-motion";
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

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 25 }
};

export default function CollectorDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get ID from router state
  const id = location.state?.id;
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    wards: "",
    password: ""
  });

  const { data: collector, isLoading, error } = useQuery({
    queryKey: ['collector', id],
    queryFn: () => api.getCollector(id || ""),
    enabled: !!id
  });

  useEffect(() => {
    if (collector) {
      setFormData({
        name: collector.name || "",
        email: collector.email || "",
        phone: collector.phone || "",
        wards: (collector.ward || []).join(", "),
        password: "" // Keep blank unless changing
      });
    }
  }, [collector]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateCollector(id || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector', id] });
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      toast({ title: "Success", description: "Personnel record updated." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCollector(id || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors'] });
      toast({ title: "Success", description: "Personnel record deleted permanently." });
      navigate("/collector");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Deletion Failed", description: err.message });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const wardArray = formData.wards.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    const updateData: any = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      ward: wardArray,
      avatar: formData.name.substring(0, 2).toUpperCase()
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    updateMutation.mutate(updateData);
  };

  if (!id) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
          <h2 className="text-xl font-bold">No personnel selected</h2>
          <Button onClick={() => navigate("/collector")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Personnel
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !collector) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
          <h2 className="text-xl font-bold">Personnel record not found</h2>
          <Button onClick={() => navigate("/collector")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Personnel
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 p-4">
        <motion.div initial="initial" animate="animate" variants={fadeInUp} className="flex flex-col gap-4">
          <Link to="/collector" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Personnel List
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-3xl font-black text-primary border-4 border-primary/5 shadow-inner">
                {collector.avatar || collector.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight text-foreground">{collector.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-bold text-[10px]">
                    {collector.status || "Active"}
                  </Badge>
                  <span className="text-sm font-medium">Joined: {new Date(collector.$createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="rounded-2xl gap-2 font-bold h-12 px-6 shadow-lg shadow-destructive/20 transition-all hover:scale-105 active:scale-95">
                  <Trash2 className="h-5 w-5" /> Terminate Record
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] p-8 border-destructive/20">
                <AlertDialogHeader className="space-y-4">
                  <div className="h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldAlert className="h-8 w-8 text-destructive" />
                  </div>
                  <div className="text-center space-y-2">
                    <AlertDialogTitle className="text-2xl font-black">Confirm Termination?</AlertDialogTitle>
                    <AlertDialogDescription className="text-md">
                      You are about to permanently delete <strong>{collector.name}</strong> from the system. This will revoke their access and remove their collection history.
                    </AlertDialogDescription>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-8 gap-3 sm:flex-row">
                  <AlertDialogCancel className="rounded-xl flex-1 h-12 font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteMutation.mutate()} 
                    className="rounded-xl flex-1 h-12 bg-destructive text-white hover:bg-destructive/90 font-bold"
                  >
                    Confirm Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Stats */}
          <motion.div initial="initial" animate="animate" variants={fadeInUp} transition={{ delay: 0.1 }} className="lg:col-span-1 space-y-6">
            <Card className="rounded-[2rem] border-border/60 shadow-xl overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Operational Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Total Collections</p>
                    <p className="text-2xl font-black">{collector.totalCollections || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Primary Wards</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(collector.ward || []).map((w: number) => (
                        <Badge key={w} className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100">W{w}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Calendar className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Last Active</p>
                    <p className="text-sm font-bold">{collector.lastSeen ? new Date(collector.lastSeen).toLocaleDateString() : 'Never'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Edit Form */}
          <motion.div initial="initial" animate="animate" variants={fadeInUp} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card className="rounded-[2.5rem] border-border/60 shadow-2xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <UserCog className="h-7 w-7 text-primary" /> Update Profile
                </CardTitle>
                <CardDescription className="text-md">Modify the personnel's contact details and system access.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                        <Input 
                          id="name" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleInputChange} 
                          className="h-12 pl-12 rounded-xl bg-muted/30 border-none focus:bg-background transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={formData.email} 
                          onChange={handleInputChange} 
                          className="h-12 pl-12 rounded-xl bg-muted/30 border-none focus:bg-background transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                        <Input 
                          id="phone" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleInputChange} 
                          className="h-12 pl-12 rounded-xl bg-muted/30 border-none focus:bg-background transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wards" className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Wards (Comma Separated)</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                        <Input 
                          id="wards" 
                          name="wards" 
                          value={formData.wards} 
                          onChange={handleInputChange} 
                          className="h-12 pl-12 rounded-xl bg-muted/30 border-none focus:bg-background transition-all" 
                          placeholder="e.g. 1, 2, 5" 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 bg-muted/30 p-6 rounded-[1.5rem] border border-border/40">
                    <Label htmlFor="password" title="Leave blank to keep current password" className="text-[10px] uppercase font-black text-primary tracking-widest pl-1">Change Password (Optional)</Label>
                    <Input 
                      id="password" 
                      name="password" 
                      type="password" 
                      value={formData.password} 
                      onChange={handleInputChange} 
                      className="h-12 rounded-xl bg-background border-none shadow-inner" 
                      placeholder="Enter new password to reset" 
                    />
                    <p className="text-[10px] text-muted-foreground italic">If you enter a new password here, it will overwrite the current login credentials for this collector.</p>
                  </div>

                  <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black shadow-2xl shadow-primary/30 gap-3" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                    {updateMutation.isPending ? "Updating Personnel..." : "Save Personnel Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
