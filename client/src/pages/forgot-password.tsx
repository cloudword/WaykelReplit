import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Phone, KeyRound, Lock } from "lucide-react";

type Step = "phone" | "otp" | "password";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, purpose: "forgot_password" }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("OTP sent to your phone number");
        setStep("otp");
      } else {
        toast.error(data.error || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, otp, purpose: "forgot_password" }),
      });
      
      const data = await res.json();
      if (res.ok && data.success && data.resetToken) {
        setResetToken(data.resetToken);
        toast.success("OTP verified successfully");
        setStep("password");
      } else {
        toast.error(data.error || "Invalid OTP");
      }
    } catch (error) {
      toast.error("Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password-with-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resetToken, newPassword }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Password reset successfully! Please login with your new password.");
        setLocation("/auth");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (error) {
      toast.error("Failed to reset password. Please try again.");
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
        <p className="text-muted-foreground mt-2">Reset Your Password</p>
      </div>

      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                if (step === "phone") {
                  setLocation("/auth");
                } else if (step === "otp") {
                  setStep("phone");
                } else {
                  setStep("otp");
                }
              }}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-xl">
                {step === "phone" && "Forgot Password"}
                {step === "otp" && "Enter OTP"}
                {step === "password" && "Set New Password"}
              </CardTitle>
              <CardDescription>
                {step === "phone" && "Enter your registered phone number"}
                {step === "otp" && "We sent a 6-digit code to your phone"}
                {step === "password" && "Create a new secure password"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    placeholder="9999999999" 
                    type="tel"
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                    data-testid="input-phone"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter your 10-digit registered phone number</p>
              </div>
              <Button className="w-full h-12" type="submit" disabled={isLoading} data-testid="button-send-otp">
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit OTP</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="otp" 
                    placeholder="123456" 
                    type="text"
                    inputMode="numeric"
                    className="pl-10 text-center text-xl tracking-widest font-mono"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    data-testid="input-otp"
                  />
                </div>
                <p className="text-xs text-muted-foreground">OTP sent to {phone}</p>
              </div>
              <Button className="w-full h-12" type="submit" disabled={isLoading} data-testid="button-verify-otp">
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={handleRequestOtp}
                disabled={isLoading}
                data-testid="button-resend-otp"
              >
                Resend OTP
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="new-password" 
                    type="password"
                    placeholder="Enter new password"
                    className="pl-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirm-password" 
                    type="password"
                    placeholder="Confirm new password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
              <Button className="w-full h-12" type="submit" disabled={isLoading} data-testid="button-reset-password">
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Button 
        variant="ghost" 
        className="mt-6 text-muted-foreground"
        onClick={() => setLocation("/auth")}
        data-testid="link-back-to-login"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Login
      </Button>
    </div>
  );
}
