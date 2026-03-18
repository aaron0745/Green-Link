import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Loader2, Mail, Lock, KeyRound, ArrowRight, Eye, EyeOff } from "lucide-react";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      await api.requestOTP(forgotEmail);
      toast({ title: "OTP Sent", description: "If the email exists, an OTP has been sent to it." });
      setStep(2);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      await api.resetPasswordWithOTP(forgotEmail, otpCode, newPassword);
      toast({ title: "Success", description: "Password reset. You can now login." });
      setIsForgotOpen(false);
      setStep(1);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel - Brand & Visuals (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542601906990-b4d3fb7d5fa5?q=80&w=2613&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/60"></div>
        
        <div className="relative z-10 text-primary-foreground max-w-lg space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Building a Cleaner <br/> Tomorrow, Today.
          </h1>
          <p className="text-lg text-primary-foreground/90 font-light leading-relaxed">
            Empowering panchayats with smart, real-time waste management solutions. Track collections, manage routes, and ensure a greener community.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative">
        <div className="absolute top-6 right-6">
           <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4 shadow-lg shadow-primary/20">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue.</p>
          </div>

          <Tabs defaultValue="household" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-secondary/50 p-1 rounded-2xl">
              <TabsTrigger value="household" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Household</TabsTrigger>
              <TabsTrigger value="collector" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Collector</TabsTrigger>
              <TabsTrigger value="admin" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Admin</TabsTrigger>
            </TabsList>

            {['household', 'collector', 'admin'].map((role) => (
              <TabsContent key={role} value={role} className="space-y-6">
                <form onSubmit={(e) => handleLogin(e, role)}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${role}-email`}>Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/60" />
                        <Input 
                          id={`${role}-email`} 
                          type="email" 
                          placeholder="name@example.com" 
                          className="pl-10 h-11 bg-muted/30 border-input/60 focus:bg-background transition-colors rounded-xl" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${role}-pass`}>Password</Label>
                        <Dialog open={isForgotOpen} onOpenChange={(val) => {
                          setIsForgotOpen(val);
                          if (!val) setStep(1);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="link" size="sm" className="px-0 font-normal h-auto text-primary hover:text-primary/80">
                              Forgot password?
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reset Password</DialogTitle>
                              <DialogDescription>
                                {step === 1 ? "Enter your email to receive a secure OTP." : "Enter the OTP sent to your email and your new password."}
                              </DialogDescription>
                            </DialogHeader>
                            {step === 1 ? (
                              <form onSubmit={handleRequestOTP} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Email Address</Label>
                                  <Input type="email" placeholder="name@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                                </div>
                                <DialogFooter>
                                  <Button type="submit" className="w-full" disabled={isForgotLoading}>
                                    {isForgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send OTP
                                  </Button>
                                </DialogFooter>
                              </form>
                            ) : (
                              <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>6-Digit OTP</Label>
                                  <Input placeholder="123456" className="text-center tracking-widest text-lg" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>New Password</Label>
                                  <div className="relative">
                                    <Input 
                                      type={showNewPassword ? "text" : "password"} 
                                      className="pr-10"
                                      value={newPassword} 
                                      onChange={(e) => setNewPassword(e.target.value)} 
                                      required 
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                                      onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit" className="w-full" disabled={isForgotLoading}>
                                    {isForgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset Password
                                  </Button>
                                </DialogFooter>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/60" />
                        <Input 
                          id={`${role}-pass`} 
                          type={showPassword ? "text" : "password"} 
                          className="pl-10 pr-10 h-11 bg-muted/30 border-input/60 focus:bg-background transition-colors rounded-xl" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full h-11 mt-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <>Login as {role.charAt(0).toUpperCase() + role.slice(1)} <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
          
          <div className="pt-6 text-center text-xs text-muted-foreground">
            <p>By logging in, you agree to our Terms of Service & Privacy Policy.</p>
            <Button variant="link" size="sm" className="text-muted-foreground mt-2" onClick={() => { localStorage.clear(); window.location.reload(); }}>
              Trouble logging in? Reset Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
