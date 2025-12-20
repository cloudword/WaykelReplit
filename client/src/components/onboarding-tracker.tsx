import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, Circle, Building2, Truck, Users, 
  ArrowRight, Clock, AlertCircle, ChevronRight
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface OnboardingStep {
  required: boolean;
  completed: boolean;
  label: string;
  description: string;
}

interface OnboardingStatus {
  transporterType: string;
  onboardingStatus: string;
  steps: {
    businessVerification: OnboardingStep;
    addVehicle: OnboardingStep;
    addDriver: OnboardingStep;
  };
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  canBid: boolean;
}

export function OnboardingTracker() {
  const [_, setLocation] = useLocation();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/transporter/onboarding-status`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const completeOnboarding = async () => {
    setCompleting(true);
    try {
      const response = await fetch(`${API_BASE}/transporter/complete-onboarding`, {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        await fetchStatus();
      } else {
        const error = await response.json();
        console.error("Failed to complete onboarding:", error);
      }
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Card data-testid="onboarding-tracker-loading">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="space-y-2">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  if (status.onboardingStatus === "completed" && status.canBid) {
    return null;
  }

  const progressPercent = (status.completedCount / status.totalCount) * 100;

  const getStepIcon = (step: OnboardingStep) => {
    if (!step.required) return <Circle className="h-5 w-5 text-muted-foreground/40" />;
    if (step.completed) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    return <Clock className="h-5 w-5 text-amber-500" />;
  };

  const getStepStatus = (step: OnboardingStep) => {
    if (!step.required) return { label: "Not Required", variant: "outline" as const };
    if (step.completed) return { label: "Completed", variant: "default" as const };
    return { label: "Pending", variant: "secondary" as const };
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50" data-testid="onboarding-tracker">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Complete Your Setup
            </CardTitle>
            <CardDescription>
              {status.transporterType === "business" ? "Business" : "Individual"} Transporter
            </CardDescription>
          </div>
          <Badge 
            variant={status.isComplete ? "default" : "secondary"}
            className={status.isComplete ? "bg-emerald-500" : ""}
            data-testid="onboarding-progress-badge"
          >
            {status.completedCount} / {status.totalCount} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-2" data-testid="onboarding-progress" />
        
        <div className="space-y-3">
          {status.steps.businessVerification.required && (
            <div 
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                status.steps.businessVerification.completed 
                  ? "bg-emerald-50 border-emerald-200" 
                  : "bg-white border-muted"
              }`}
              data-testid="step-business-verification"
            >
              {getStepIcon(status.steps.businessVerification)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{status.steps.businessVerification.label}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {status.steps.businessVerification.description}
                </p>
              </div>
              <Badge variant={getStepStatus(status.steps.businessVerification).variant} className="text-xs">
                {getStepStatus(status.steps.businessVerification).label}
              </Badge>
              {!status.steps.businessVerification.completed && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="ml-2"
                  onClick={() => setLocation("/transporter/documents")}
                  data-testid="button-upload-business-docs"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <div 
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              status.steps.addVehicle.completed 
                ? "bg-emerald-50 border-emerald-200" 
                : "bg-white border-muted"
            }`}
            data-testid="step-add-vehicle"
          >
            {getStepIcon(status.steps.addVehicle)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{status.steps.addVehicle.label}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {status.steps.addVehicle.description}
              </p>
            </div>
            <Badge variant={getStepStatus(status.steps.addVehicle).variant} className="text-xs">
              {getStepStatus(status.steps.addVehicle).label}
            </Badge>
            {!status.steps.addVehicle.completed && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="ml-2"
                onClick={() => setLocation("/transporter/vehicles")}
                data-testid="button-add-vehicle"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div 
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              status.steps.addDriver.completed 
                ? "bg-emerald-50 border-emerald-200" 
                : "bg-white border-muted"
            }`}
            data-testid="step-add-driver"
          >
            {getStepIcon(status.steps.addDriver)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{status.steps.addDriver.label}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {status.steps.addDriver.description}
              </p>
            </div>
            <Badge variant={getStepStatus(status.steps.addDriver).variant} className="text-xs">
              {getStepStatus(status.steps.addDriver).label}
            </Badge>
            {!status.steps.addDriver.completed && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="ml-2"
                onClick={() => setLocation("/transporter/drivers")}
                data-testid="button-add-driver"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {status.isComplete && status.onboardingStatus !== "completed" && (
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={completeOnboarding}
            disabled={completing}
            data-testid="button-complete-onboarding"
          >
            {completing ? "Completing..." : "Complete Setup & Start Bidding"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {!status.canBid && status.onboardingStatus === "completed" && (
          <div className="flex items-center gap-2 p-3 bg-amber-100 rounded-lg text-amber-800 text-sm" data-testid="waiting-approval-message">
            <Clock className="h-4 w-4" />
            <span>Waiting for admin approval. You'll be able to bid once approved.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
