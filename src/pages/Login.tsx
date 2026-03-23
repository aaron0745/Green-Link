import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Loader2, Mail, Lock, KeyRound, ArrowRight, Eye, EyeOff, Send, CheckCircle2 as CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("household");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent, role: string) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(role, email, password);
      toast({ title: `Welcome, ${role.charAt(0).toUpperCase() + role.slice(1)}`, description: "Successfully logged in." });
      navigate(role === 'collector' ? "/collector" : "/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally { setIsSubmitting(false); }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      await api.requestOTP(forgotEmail);
      toast({ title: "OTP Sent", description: "If the email exists, an OTP has been sent to it." });
      setStep(2);
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message });
    } finally { setIsForgotLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      await api.resetPasswordWithOTP(forgotEmail, otpCode, newPassword);
      toast({ title: "Success", description: "Password reset. You can now login." });
      setIsForgotOpen(false); setStep(1);
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message });
    } finally { setIsForgotLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden">
      <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <motion.div initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 0.2, scale: 1 }} transition={{ duration: 2, delay: 0.5 }} className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542601906990-b4d3fb7d5fa5?q=80&w=2613&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-primary/70"></div>
        <div className="relative z-10 text-primary-foreground max-w-lg space-y-8">
          <motion.div initial={{ scale: 0, rotate: -270 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.8 }} className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-2xl"><Leaf className="h-10 w-10 text-white" /></motion.div>
          <div className="space-y-4">
            <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1, ease: "easeOut" }} className="text-6xl font-black tracking-tight leading-[1.1]">Building a <br/><span className="text-white/70 italic">Cleaner</span> <br/>Tomorrow.</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ duration: 1, delay: 1.4 }} className="text-xl text-primary-foreground/80 font-light leading-relaxed border-l-2 border-white/20 pl-6">Empowering Kerala's panchayats with real-time waste tracking and verified digital workflows.</motion.p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.8, delay: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative bg-slate-50/30 dark:bg-transparent overflow-y-auto">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6"><ThemeToggle /></div>
        <div className="w-full max-w-md space-y-6 sm:space-y-10 py-8">
          <div className="text-center lg:text-left space-y-2 sm:space-y-3">
            <motion.div initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, delay: 0.6 }} className="lg:hidden inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary mb-1 shadow-2xl shadow-primary/30"><Leaf className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" /></motion.div>
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">Welcome Back</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.9 }} className="text-muted-foreground text-sm sm:text-lg">Select your portal to continue.</motion.p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-8 h-12 sm:h-14 bg-muted/50 p-1 rounded-2xl border border-border/50">
              <TabsTrigger value="household" className="rounded-xl text-[10px] sm:text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all px-1">Resident</TabsTrigger>
              <TabsTrigger value="collector" className="rounded-xl text-[10px] sm:text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all px-1">Collector</TabsTrigger>
              <TabsTrigger value="admin" className="rounded-xl text-[10px] sm:text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all px-1">Admin</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {['household', 'collector', 'admin'].map((role) => role === activeTab && (
                <TabsContent key={role} value={role} forceMount className="mt-0">
                  <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }} transition={{ duration: 0.4, ease: "circOut" }} onSubmit={(e) => handleLogin(e, role)} className="space-y-4 sm:space-y-6">
                    <div className="space-y-4 sm:space-y-5">
                      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 100 }} className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor={`${role}-email`} className="text-[10px] sm:text-sm font-bold ml-1 uppercase tracking-wider text-muted-foreground">Email Address</Label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input id={`${role}-email`} type="email" placeholder="name@example.com" className="pl-10 sm:pl-12 h-11 sm:h-12 bg-white dark:bg-muted/20 border-border/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-xl sm:rounded-2xl shadow-sm text-sm sm:text-base" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, type: "spring", stiffness: 100 }} className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <Label htmlFor={`${role}-pass`} className="text-[10px] sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                          <Dialog open={isForgotOpen} onOpenChange={(val) => { setIsForgotOpen(val); if (!val) setStep(1); }}>
                            <DialogTrigger asChild><Button variant="link" size="sm" className="px-0 font-bold h-auto text-primary hover:text-primary/80 transition-colors text-[10px] sm:text-xs">Forgot password?</Button></DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl w-[95vw] mx-auto">
                              <div className="bg-primary p-6 sm:p-8 text-primary-foreground relative overflow-hidden"><div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" /><DialogHeader className="relative z-10"><DialogTitle className="text-xl sm:text-2xl font-bold">Secure Recovery</DialogTitle><DialogDescription className="text-primary-foreground/80 font-medium text-xs sm:text-sm">{step === 1 ? "We'll send a code to your email." : "Verify identity to reset access."}</DialogDescription></DialogHeader></div>
                              <div className="p-6 sm:p-8 bg-background"><AnimatePresence mode="wait">{step === 1 ? (<motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleRequestOTP} className="space-y-4 sm:space-y-6"><div className="space-y-3"><Label className="font-bold text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">Registered Email</Label><Input type="email" placeholder="name@example.com" className="h-11 sm:h-12 rounded-xl text-sm" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required /></div><Button type="submit" className="w-full h-11 sm:h-12 rounded-xl text-sm font-bold shadow-xl shadow-primary/20" disabled={isForgotLoading}>{isForgotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Request OTP</Button></motion.form>) : (<motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5"><div className="space-y-3"><Label className="font-bold text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">6-Digit Code</Label><Input placeholder="0 0 0 0 0 0" className="text-center tracking-[0.3em] sm:tracking-[0.5em] text-lg sm:text-xl font-black h-12 sm:h-14 rounded-xl bg-muted/30" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required /></div><div className="space-y-3"><Label className="font-bold text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">New Password</Label><div className="relative"><Input type={showNewPassword ? "text" : "password"} className="h-11 sm:h-12 rounded-xl pr-10 sm:pr-12 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /><Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div><Button type="submit" className="w-full h-11 sm:h-12 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200" disabled={isForgotLoading}>{isForgotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Update Password</Button></motion.form>)}</AnimatePresence></div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input id={`${role}-pass`} type={showPassword ? "text" : "password"} className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-11 sm:h-12 bg-white dark:bg-muted/20 border-border/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-xl sm:rounded-2xl shadow-sm text-sm sm:text-base" value={password} onChange={(e) => setPassword(e.target.value)} required />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                      </motion.div>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                      <Button className="w-full h-12 sm:h-14 mt-2 sm:mt-4 text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-[0.98]" type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : <>Continue <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" /></>}</Button>
                    </motion.div>
                  </motion.form>
                </TabsContent>
              ))}
            </AnimatePresence>
          </Tabs>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.2 }} className="pt-4 sm:pt-10 text-center space-y-3 sm:space-y-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground px-4 sm:px-10 leading-relaxed font-medium">Secured by Green-link Infrastructure. By logging in, you agree to our <span className="text-primary underline">Terms</span> & <span className="text-primary underline">Privacy Policy</span>.</p>
            <Button variant="ghost" size="sm" className="text-muted-foreground font-bold hover:bg-transparent hover:text-primary transition-colors text-[10px] sm:text-xs" onClick={() => { localStorage.clear(); window.location.reload(); }}>Reset Application Session</Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
