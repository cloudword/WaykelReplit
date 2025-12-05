import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

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
        email: `${signupPhone}@waykel.com`,
        phone: signupPhone,
        password: signupPassword,
        role: "driver",
      });
      if (user.error) {
        toast.error(user.error);
      } else {
        toast.success("Registration successful! Please login.");
        setLoginPhone(signupPhone);
        setLoginPassword(signupPassword);
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
                  <p className="text-xs text-gray-500">Test: 9111111111 / 9222222222 / 9333333333</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="driver123"
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
                  {isLoading ? "Registering..." : "Register as Driver"}
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
