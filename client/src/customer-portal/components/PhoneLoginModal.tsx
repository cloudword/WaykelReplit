import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { waykelApi, setAuthToken } from "../lib/waykelApi";
import { Truck, ArrowLeft, Phone, ShieldCheck, Loader2 } from "lucide-react";

interface PhoneLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalStep = "form" | "otp";

export function PhoneLoginModal({ open, onOpenChange }: PhoneLoginModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<ModalStep>("form");

  // Login
  const [loginPhone, setLoginPhone] = useState("");

  // Signup
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // OTP
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [activePhone, setActivePhone] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleLoginSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhone.length < 10) return;
    setIsLoading(true);
    try {
      const result = await waykelApi.auth.sendOtpGlobal({ phone: loginPhone, purpose: "login" }) as any;
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        setVerificationId(result.verificationId);
        setActivePhone(loginPhone);
        setStep("otp");
        setResendTimer(30);
        toast({ title: "OTP sent to your phone!" });
      }
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPhone.length < 10 || !signupName.trim()) return;
    setIsLoading(true);
    try {
      const result = await waykelApi.auth.sendOtpGlobal({
        phone: signupPhone,
        purpose: "signup",
        name: signupName,
        role: "customer",
      }) as any;
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        setVerificationId(result.verificationId);
        setActivePhone(signupPhone);
        setStep("otp");
        setResendTimer(30);
        toast({ title: "OTP sent to your phone!" });
      }
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;
    setIsLoading(true);
    try {
      const result = await waykelApi.auth.verifyOtpGlobal({
        phone: activePhone,
        otp,
        verificationId,
      }) as any;
      if (result.error) {
        toast({ title: "Invalid OTP", description: result.error, variant: "destructive" });
        if (result.remainingAttempts !== undefined) {
          toast({ title: `${result.remainingAttempts} attempts remaining` });
        }
      } else {
        const userData = result.user || result;
        if (result.token) {
          setAuthToken(result.token, userData);
        }
        localStorage.setItem("currentUser", JSON.stringify({ token: result.token, user: userData, ...userData }));
        toast({ title: mode === "signup" ? "Account created!" : "Welcome back!" });
        onOpenChange(false);
        setLocation("/customer/dashboard");
        window.location.reload(); // Ensure auth context picks up the new user
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      const payload: any = { phone: activePhone, purpose: mode === "signup" ? "signup" : "login" };
      if (mode === "signup") {
        payload.name = signupName;
        payload.role = "customer";
      }
      const result = await waykelApi.auth.sendOtpGlobal(payload) as any;
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        setVerificationId(result.verificationId);
        setOtp("");
        setResendTimer(30);
        toast({ title: "OTP resent!" });
      }
    } catch {
      toast({ title: "Failed to resend OTP", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep("form");
    setOtp("");
    setVerificationId("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setLoginPhone("");
      setSignupName("");
      setSignupPhone("");
      setOtp("");
      setVerificationId("");
      setStep("form");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Customer Portal</DialogTitle>
          <DialogDescription>Book trucks, track shipments, and manage deliveries</DialogDescription>
        </DialogHeader>

        {step === "otp" ? (
          <div className="space-y-6">
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="text-center space-y-1">
              <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Enter the OTP sent to <span className="font-semibold text-foreground">+91 {activePhone}</span>
              </p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  placeholder="Enter OTP"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-bold"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  data-testid="input-customer-otp"
                />
              </div>
              <Button className="w-full h-12 text-base" type="submit" disabled={isLoading || otp.length < 4} data-testid="button-customer-verify-otp">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-muted-foreground">Resend in <span className="font-semibold text-primary">{resendTimer}s</span></p>
                ) : (
                  <button type="button" onClick={handleResend} disabled={isLoading} className="text-sm text-primary hover:underline font-medium">
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <Tabs value={mode} onValueChange={v => setMode(v as "login" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" data-testid="tab-customer-login">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-customer-signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLoginSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-muted rounded-md border text-sm font-medium text-muted-foreground">+91</div>
                    <Input
                      id="login-phone"
                      placeholder="Enter your phone number"
                      required
                      type="tel"
                      inputMode="numeric"
                      value={loginPhone}
                      onChange={e => setLoginPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 h-11"
                      data-testid="input-customer-phone"
                    />
                  </div>
                </div>
                <Button className="w-full h-12 text-base gap-2" type="submit" disabled={isLoading || loginPhone.length < 10} data-testid="button-customer-login">
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</>
                  ) : (
                    <><Phone className="h-4 w-4" /> Send OTP</>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignupSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    required
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-muted rounded-md border text-sm font-medium text-muted-foreground">+91</div>
                    <Input
                      id="signup-phone"
                      placeholder="9999999999"
                      type="tel"
                      inputMode="numeric"
                      required
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 h-11"
                      data-testid="input-customer-signup-phone"
                    />
                  </div>
                </div>
                <Button className="w-full h-12 text-base bg-primary gap-2" type="submit" disabled={isLoading || signupPhone.length < 10} data-testid="button-customer-signup">
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</>
                  ) : (
                    <><Phone className="h-4 w-4" /> Send OTP to Register</>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <Button variant="ghost" className="mt-4 text-muted-foreground w-full" onClick={() => setLocation("/customer")} data-testid="link-main-auth">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
