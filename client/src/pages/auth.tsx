import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Truck, Building2, User, Briefcase, UserCircle } from "lucide-react";

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"driver" | "transporter">("driver");
  const [transporterType, setTransporterType] = useState<"business" | "individual">("individual");
  const [companyName, setCompanyName] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [location, setLocationInput] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const isPhone = /^\d+$/.test(loginIdentifier);
      const credentials = isPhone
        ? { phone: loginIdentifier, password: loginPassword }
        : { username: loginIdentifier, password: loginPassword };

      const user = await api.auth.login(credentials);
      if (user.error) {
        toast.error(user.error);
      } else {
        // Clear any stale user data before storing new user to prevent cross-tenant data leaks
        localStorage.removeItem("currentUser");
        localStorage.setItem("currentUser", JSON.stringify(user));
        const role = user.role;
        if (role === "driver") setLocation("/driver");
        else if (role === "transporter") setLocation("/transporter");
        else if (role === "admin") setLocation("/admin");
        else if (role === "customer") setLocation("/customer");
        toast.success("Logged in successfully!");
      }
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (signupRole === "transporter") {
        // Simplified: Only require company name for business entities
        const effectiveCompanyName = transporterType === "business" ? companyName : signupName;
        if (transporterType === "business" && !companyName) {
          toast.error("Please enter your company name");
          setIsLoading(false);
          return;
        }

        // Backend creates transporter automatically during registration
        const user = await api.auth.register({
          name: signupName,
          email: signupEmail || undefined,
          phone: signupPhone,
          password: signupPassword,
          role: "transporter",
          companyName: effectiveCompanyName,
          transporterType, // Pass entity type to backend
          location: location || "India", // Default location
          city: location || "India",
          fleetSize: parseInt(fleetSize) || 1,
        });
        if (user.error) {
          toast.error(user.error);
        } else {
          localStorage.setItem("currentUser", JSON.stringify(user));
          // Business entities go to document upload first
          if (transporterType === "business") {
            toast.success("Registration successful! Please upload your business registration document to continue.");
            setLocation("/transporter/documents?onboarding=true");
          } else {
            toast.success("Registration successful! Add a vehicle to start bidding.");
            setLocation("/transporter");
          }
        }
      } else {
        const user = await api.auth.register({
          name: signupName,
          email: signupEmail || undefined,
          phone: signupPhone,
          password: signupPassword,
          role: signupRole,
        });
        if (user.error) {
          toast.error(user.error);
        } else {
          localStorage.setItem("currentUser", JSON.stringify(user));
          setLocation("/driver");
          toast.success("Registration successful!");
        }
      }
    } catch (error) {
      toast.error("Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

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
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Phone Number or Username</Label>
                  <Input
                    id="identifier"
                    placeholder="Enter phone number or username"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    data-testid="input-identifier"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setLocation("/forgot-password")}
                      data-testid="link-forgot-password"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    data-testid="input-password"
                  />
                </div>
                <Button className="w-full h-12 text-base" type="submit" disabled={isLoading} data-testid="button-login">
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
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
                  <Input
                    id="signup-phone"
                    placeholder="9999999999"
                    type="tel"
                    required
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    data-testid="input-signup-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email (Optional)</Label>
                  <Input
                    id="signup-email"
                    placeholder="email@example.com"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    data-testid="input-signup-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    data-testid="input-signup-password"
                  />
                </div>
                <Button className="w-full h-12 text-base" type="submit" disabled={isLoading} data-testid="button-signup">
                  {isLoading ? "Creating Account..." :
                    signupRole === "driver" ? "Register as Driver" :
                      "Register as Transporter"}
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
