import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Truck, Building2, User, Briefcase, UserCircle, Phone, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";

type AuthStep = "form" | "otp";

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>("form");

  // Login state
  const [loginPhone, setLoginPhone] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupRole, setSignupRole] = useState<"driver" | "transporter">("driver");
  const [transporterType, setTransporterType] = useState<"business" | "individual">("individual");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocationInput] = useState("");

  // OTP state
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [activePhone, setActivePhone] = useState(""); // phone used for the current OTP flow
  const [activePurpose, setActivePurpose] = useState<"signup" | "login">("login");
  const [resendTimer, setResendTimer] = useState(0);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const redirectByRole = useCallback((role: string) => {
    if (role === "driver") setLocation("/driver");
    else if (role === "transporter") setLocation("/transporter");
    else if (role === "admin") setLocation("/admin");
    else if (role === "customer") setLocation("/customer");
    else setLocation("/");
  }, [setLocation]);

  const handleLoginSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.sendOtp({ phone: loginPhone, purpose: "login" });
      if (result.error) {
        toast.error(result.error);
      } else {
        setVerificationId(result.verificationId);
        setActivePhone(loginPhone);
        setActivePurpose("login");
        setStep("otp");
        setResendTimer(30);
        toast.success("OTP sent to your phone!");
      }
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupRole === "transporter" && transporterType === "business" && !companyName) {
      toast.error("Please enter your company name");
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.auth.sendOtp({
        phone: signupPhone,
        purpose: "signup",
        name: signupName,
        role: signupRole,
        companyName: transporterType === "business" ? companyName : signupName,
        transporterType,
        location: location || "India",
        city: location || "India",
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        setVerificationId(result.verificationId);
        setActivePhone(signupPhone);
        setActivePurpose("signup");
        setStep("otp");
        setResendTimer(30);
        toast.success("OTP sent to your phone!");
      }
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error("Please enter the complete OTP");
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.auth.verifyOtp({
        phone: activePhone,
        otp,
        verificationId,
      });
      if (result.error) {
        toast.error(result.error);
        if (result.remainingAttempts !== undefined) {
          toast.info(`${result.remainingAttempts} attempts remaining`);
        }
      } else {
        localStorage.removeItem("currentUser");
        const userData = result.user || result;
        if (result.token) {
          localStorage.setItem("currentUser", JSON.stringify({ ...userData, token: result.token }));
        } else {
          localStorage.setItem("currentUser", JSON.stringify(userData));
        }
        toast.success(activePurpose === "signup" ? "Account created successfully!" : "Logged in successfully!");
        const role = userData.role;

        if (activePurpose === "signup" && role === "transporter" && transporterType === "business") {
          setLocation("/transporter/documents?onboarding=true");
        } else {
          redirectByRole(role);
        }
      }
    } catch {
      toast.error("OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      const payload: any = { phone: activePhone, purpose: activePurpose };
      if (activePurpose === "signup") {
        payload.name = signupName;
        payload.role = signupRole;
        payload.companyName = transporterType === "business" ? companyName : signupName;
        payload.transporterType = transporterType;
        payload.location = location || "India";
      }
      const result = await api.auth.sendOtp(payload);
      if (result.error) {
        toast.error(result.error);
      } else {
        setVerificationId(result.verificationId);
        setOtp("");
        setResendTimer(30);
        toast.success("OTP resent!");
      }
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep("form");
    setOtp("");
    setVerificationId("");
  };

  // OTP Verification Step
  if (step === "otp") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tighter">
            WAY<span className="text-primary">KEL</span>
          </h1>
          <p className="text-muted-foreground mt-2">Commercial Vehicle Logistics</p>
        </div>

        <Card className="w-full max-w-md shadow-lg border-none">
          <CardHeader>
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 -ml-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Verify OTP
            </CardTitle>
            <CardDescription className="text-center">
              Enter the OTP sent to <span className="font-semibold text-foreground">+91 {activePhone}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  placeholder="Enter 4-6 digit OTP"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-bold"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  data-testid="input-otp"
                />
              </div>
              <Button className="w-full h-12 text-base" type="submit" disabled={isLoading || otp.length < 4} data-testid="button-verify-otp">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-muted-foreground">Resend OTP in <span className="font-semibold text-primary">{resendTimer}s</span></p>
                ) : (
                  <button type="button" onClick={handleResendOtp} disabled={isLoading} className="text-sm text-primary hover:underline font-medium">
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-xs text-gray-400 text-center max-w-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    );
  }

  // Form Step (Login / Signup)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tighter">
          WAY<span className="text-primary">KEL</span>
        </h1>
        <p className="text-muted-foreground mt-2">Commercial Vehicle Logistics</p>
      </div>

      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Login or sign up with your mobile number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLoginSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-muted rounded-md border text-sm font-medium text-muted-foreground">
                      +91
                    </div>
                    <Input
                      id="login-phone"
                      placeholder="Enter your phone number"
                      required
                      type="tel"
                      inputMode="numeric"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 h-11"
                      data-testid="input-login-phone"
                    />
                  </div>
                </div>
                <Button className="w-full h-12 text-base gap-2" type="submit" disabled={isLoading || loginPhone.length < 10} data-testid="button-login">
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
                <div className="space-y-3">
                  <Label className="text-sm font-medium">I want to register as:</Label>
                  <RadioGroup
                    value={signupRole}
                    onValueChange={(v) => setSignupRole(v as "driver" | "transporter")}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${signupRole === "driver" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                      <RadioGroupItem value="driver" id="driver" />
                      <Label htmlFor="driver" className="flex items-center gap-2 cursor-pointer">
                        <Truck className="h-5 w-5" />
                        <span>Driver</span>
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${signupRole === "transporter" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                      <RadioGroupItem value="transporter" id="transporter" />
                      <Label htmlFor="transporter" className="flex items-center gap-2 cursor-pointer">
                        <Building2 className="h-5 w-5" />
                        <span>Transporter</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{signupRole === "transporter" ? "Owner Name" : "Full Name"}</Label>
                  <Input
                    id="name"
                    placeholder="Rajesh Kumar"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    data-testid="input-name"
                  />
                </div>

                {signupRole === "transporter" && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Entity Type:</Label>
                      <RadioGroup
                        value={transporterType}
                        onValueChange={(v) => setTransporterType(v as "business" | "individual")}
                        className="grid grid-cols-2 gap-2"
                      >
                        <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${transporterType === "individual" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                          <RadioGroupItem value="individual" id="individual" />
                          <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer">
                            <UserCircle className="h-5 w-5" />
                            <span>Individual</span>
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${transporterType === "business" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                          <RadioGroupItem value="business" id="business" />
                          <Label htmlFor="business" className="flex items-center gap-2 cursor-pointer">
                            <Briefcase className="h-5 w-5" />
                            <span>Business</span>
                          </Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-muted-foreground">
                        {transporterType === "business"
                          ? "Business registration document required after signup"
                          : "No business documents required"}
                      </p>
                    </div>

                    {transporterType === "business" && (
                      <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input
                          id="company-name"
                          placeholder="ABC Logistics Pvt Ltd"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          data-testid="input-company-name"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-muted rounded-md border text-sm font-medium text-muted-foreground">
                      +91
                    </div>
                    <Input
                      id="signup-phone"
                      placeholder="9999999999"
                      type="tel"
                      inputMode="numeric"
                      required
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 h-11"
                      data-testid="input-signup-phone"
                    />
                  </div>
                </div>

                <Button className="w-full h-12 text-base gap-2" type="submit" disabled={isLoading || signupPhone.length < 10} data-testid="button-signup">
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</>
                  ) : (
                    <><Phone className="h-4 w-4" /> Send OTP to Register</>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        className="mt-6 text-muted-foreground"
        onClick={() => setLocation("/customer/auth")}
        data-testid="link-customer-auth"
      >
        <User className="h-4 w-4 mr-2" />
        Looking to book transport? Customer Login
      </Button>

      <p className="mt-4 text-xs text-gray-400 text-center max-w-xs">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
