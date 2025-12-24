import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../lib/auth";
import { Truck, ArrowLeft } from "lucide-react";

interface PhoneLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhoneLoginModal({ open, onOpenChange }: PhoneLoginModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const isPhone = /^\d+$/.test(loginIdentifier);
      const credentials = isPhone ? { phone: loginIdentifier, password: loginPassword } : { phone: loginIdentifier, password: loginPassword };
      const result = await login(credentials.phone, credentials.password);
      if (result.success) {
        toast({ title: "Welcome back!" });
        onOpenChange(false);
        setLocation("/customer/dashboard");
      } else {
        toast({ title: "Login failed", description: result.error || "Invalid credentials", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Login failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await register({ name: signupName, email: signupEmail, phone: signupPhone, password: signupPassword });
      if (result.success) {
        toast({ title: "Account created!" });
        onOpenChange(false);
        setLocation("/customer/dashboard");
      } else {
        toast({ title: "Registration failed", description: result.error || "Could not create account", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Registration failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setLoginIdentifier("");
      setLoginPassword("");
      setSignupName("");
      setSignupPhone("");
      setSignupEmail("");
      setSignupPassword("");
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

        <Tabs value={mode} onValueChange={v => setMode(v as "login" | "signup")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login" data-testid="tab-customer-login">Login</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-customer-signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Phone Number</Label>
                <Input id="identifier" placeholder="Enter your phone number" required value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} data-testid="input-customer-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password" data-testid="input-customer-password" />
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
                <Input id="name" placeholder="Enter your full name" required value={signupName} onChange={e => setSignupName(e.target.value)} data-testid="input-customer-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone Number</Label>
                <Input id="signup-phone" placeholder="9999999999" type="tel" required value={signupPhone} onChange={e => setSignupPhone(e.target.value)} data-testid="input-customer-signup-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email (Optional)</Label>
                <Input id="signup-email" placeholder="email@example.com" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} data-testid="input-customer-signup-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input id="password-signup" type="password" required value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Create a password" data-testid="input-customer-signup-password" />
              </div>
              <Button className="w-full h-12 text-base bg-primary" type="submit" disabled={isLoading} data-testid="button-customer-signup">
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <Button variant="ghost" className="mt-4 text-muted-foreground w-full" onClick={() => setLocation("/customer") } data-testid="link-main-auth">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
