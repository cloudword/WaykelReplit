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
import { Truck, User, Building2 } from "lucide-react";

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"customer" | "driver">("customer");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await api.auth.login(loginPhone, loginPassword);
      if (user.error) {
        toast.error(user.error);
      } else {
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
      const user = await api.auth.register({
        name: signupName,
        email: signupEmail || `${signupPhone}@waykel.com`,
        phone: signupPhone,
        password: signupPassword,
        role: signupRole,
      });
      if (user.error) {
        toast.error(user.error);
      } else {
        localStorage.setItem("currentUser", JSON.stringify(user));
        if (signupRole === "customer") {
          setLocation("/customer");
        } else {
          setLocation("/driver");
        }
        toast.success("Registration successful!");
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
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="9111111111" 
                    type="tel" 
                    required 
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    data-testid="input-phone"
                  />
                  <p className="text-xs text-gray-500">
                    Test accounts: 9111111111 (Driver) / 9999999999 (Admin)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="driver123 or admin123"
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
                  <Label className="text-sm font-medium">I want to:</Label>
                  <RadioGroup 
                    value={signupRole} 
                    onValueChange={(v) => setSignupRole(v as "customer" | "driver")}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${signupRole === "customer" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                      <RadioGroupItem value="customer" id="customer" />
                      <Label htmlFor="customer" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        <span className="text-sm">Book Transport</span>
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${signupRole === "driver" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                      <RadioGroupItem value="driver" id="driver" />
                      <Label htmlFor="driver" className="flex items-center gap-2 cursor-pointer">
                        <Truck className="h-4 w-4" />
                        <span className="text-sm">Drive/Transport</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Rajesh Kumar" 
                    required 
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    data-testid="input-name"
                  />
                </div>
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
                  {isLoading ? "Creating Account..." : signupRole === "customer" ? "Create Customer Account" : "Register as Driver"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-gray-400 text-center max-w-xs">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
