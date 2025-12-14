import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Truck, ArrowLeft } from "lucide-react";

export default function CustomerAuthPage() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

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
        if (user.role !== "customer") {
          toast.error("This login is for customers only. Please use the main login page.");
          return;
        }
        localStorage.setItem("currentUser", JSON.stringify(user));
        setLocation("/customer");
        toast.success("Welcome back!");
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
        email: signupEmail || undefined,
        phone: signupPhone,
        password: signupPassword,
        role: "customer",
      });
      if (user.error) {
        toast.error(user.error);
      } else {
        localStorage.setItem("currentUser", JSON.stringify(user));
        setLocation("/customer");
        toast.success("Account created successfully!");
      }
    } catch (error) {
      toast.error("Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Truck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter">
          WAY<span className="text-primary">KEL</span>
        </h1>
        <p className="text-muted-foreground mt-2">Book Commercial Transport</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-none bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Customer Portal</CardTitle>
          <CardDescription className="text-center">
            Book trucks, track shipments, and manage your deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" data-testid="tab-customer-login">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-customer-signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Phone Number</Label>
                  <Input 
                    id="identifier" 
                    placeholder="Enter your phone number" 
                    required 
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    data-testid="input-customer-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    data-testid="input-customer-password"
                  />
                </div>
                <Button className="w-full h-12 text-base" type="submit" disabled={isLoading} data-testid="button-customer-login">
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your full name" 
                    required 
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    data-testid="input-customer-name"
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
                    data-testid="input-customer-signup-phone"
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
                    data-testid="input-customer-signup-email"
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
                    placeholder="Create a password"
                    data-testid="input-customer-signup-password"
                  />
                </div>
                <Button className="w-full h-12 text-base bg-primary" type="submit" disabled={isLoading} data-testid="button-customer-signup">
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Button 
        variant="ghost" 
        className="mt-6 text-muted-foreground"
        onClick={() => setLocation("/auth")}
        data-testid="link-main-auth"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Driver/Transporter Login
      </Button>
      
      <p className="mt-4 text-xs text-gray-400 text-center max-w-xs">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
