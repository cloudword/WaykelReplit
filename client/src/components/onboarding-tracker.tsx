import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, Building2, Truck, Users, 
  ArrowLeft, ArrowRight, User
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userNavigated, setUserNavigated] = useState(false);

  // Calculate suggested step based on completion status
  const getSuggestedStep = (data: OnboardingStatus) => {
    const isBusiness = data.transporterType === "business";
    if (isBusiness && !data.steps.businessVerification.completed) {
      return 0;
    } else if (!data.steps.addVehicle.completed) {
      return isBusiness ? 1 : 0;
    } else if (!data.steps.addDriver.completed) {
      return isBusiness ? 2 : 1;
    } else {
      return isBusiness ? 3 : 2;
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/transporter/onboarding-status`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        const suggestedStep = getSuggestedStep(data);
        
        // Only auto-advance on initial load, or when completion status changes
        // and user hasn't manually navigated
        if (!isInitialized) {
          setCurrentStep(suggestedStep);
          setIsInitialized(true);
        } else if (!userNavigated) {
          // Auto-advance when a step is completed (progress forward only)
          const prevSuggested = status ? getSuggestedStep(status) : 0;
          if (suggestedStep > prevSuggested) {
            setCurrentStep(suggestedStep);
          }
        }
        
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
        toast.success("Onboarding completed! You can now start bidding.");
        await fetchStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to complete onboarding");
      }
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error("Failed to complete onboarding");
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
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  // Hide tracker if onboarding is complete and can bid
  if (status.onboardingStatus === "completed" && status.canBid) {
    return null;
  }

  // Build steps array based on transporter type
  const isBusiness = status.transporterType === "business";
  
  const steps = isBusiness ? [
    {
      id: "business",
      label: "Business Docs",
      icon: Building2,
      completed: status.steps.businessVerification.completed,
      description: status.steps.businessVerification.description,
      action: () => setLocation("/transporter/documents"),
    },
    {
      id: "vehicle",
      label: "Add Vehicle",
      icon: Truck,
      completed: status.steps.addVehicle.completed,
      description: status.steps.addVehicle.description,
      action: () => setLocation("/transporter/vehicles"),
    },
    {
      id: "driver",
      label: "Add Driver",
      icon: Users,
      completed: status.steps.addDriver.completed,
      description: status.steps.addDriver.description,
      action: () => setLocation("/transporter/drivers"),
    },
    {
      id: "review",
      label: "Complete",
      icon: CheckCircle2,
      completed: status.isComplete && status.onboardingStatus === "completed",
      description: "Review and complete setup",
      action: completeOnboarding,
    },
  ] : [
    {
      id: "vehicle",
      label: "Add Vehicle",
      icon: Truck,
      completed: status.steps.addVehicle.completed,
      description: status.steps.addVehicle.description,
      action: () => setLocation("/transporter/vehicles"),
    },
    {
      id: "driver",
      label: "Add Driver",
      icon: Users,
      completed: status.steps.addDriver.completed,
      description: status.steps.addDriver.description,
      action: () => setLocation("/transporter/drivers"),
    },
    {
      id: "review",
      label: "Complete",
      icon: CheckCircle2,
      completed: status.isComplete && status.onboardingStatus === "completed",
      description: "Review and complete setup",
      action: completeOnboarding,
    },
  ];

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setUserNavigated(true);
      setCurrentStep(currentStep - 1);
    }
  };

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setUserNavigated(true);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepAction = () => {
    const step = steps[currentStep];
    if (step.id === "review") {
      if (status.isComplete) {
        completeOnboarding();
      } else {
        toast.error("Please complete all previous steps first");
      }
    } else {
      step.action();
    }
  };

  return (
    <Card className="border-emerald-200 bg-white shadow-sm" data-testid="onboarding-tracker">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-muted-foreground">
              {isBusiness ? "Business" : "Individual"} Transporter Setup
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevStep}
              disabled={currentStep === 0}
              data-testid="button-prev-step"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous step
            </Button>
            <Button
              size="sm"
              onClick={currentStep === steps.length - 1 ? handleStepAction : goToNextStep}
              disabled={completing}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-next-step"
            >
              {currentStep === steps.length - 1 ? (
                completing ? "Completing..." : "Complete Setup"
              ) : (
                <>
                  Next step
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="relative mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = step.completed;
              const isCurrent = index === currentStep;
              const isPast = index < currentStep;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1 relative">
                  {/* Connector Line */}
                  {index > 0 && (
                    <div 
                      className={`absolute top-5 right-1/2 w-full h-0.5 -z-10 ${
                        isPast || isCompleted ? "bg-emerald-500" : "border-t-2 border-dashed border-gray-300"
                      }`}
                      style={{ left: "-50%" }}
                    />
                  )}
                  
                  {/* Step Circle */}
                  <button
                    onClick={() => { setUserNavigated(true); setCurrentStep(index); }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all z-10 ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                        : "bg-gray-100 text-gray-500 border-2 border-gray-300"
                    }`}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>

                  {/* Step Label */}
                  <span 
                    className={`mt-2 text-xs font-medium text-center ${
                      isCurrent ? "text-emerald-600" : isCompleted ? "text-emerald-500" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Step Details */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            {(() => {
              const StepIcon = steps[currentStep].icon;
              return <StepIcon className="h-5 w-5 text-emerald-600 mt-0.5" />;
            })()}
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{steps[currentStep].label}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {steps[currentStep].description}
              </p>
              {currentStep < steps.length - 1 && !steps[currentStep].completed && (
                <Button
                  variant="link"
                  className="p-0 h-auto mt-2 text-emerald-600"
                  onClick={handleStepAction}
                  data-testid="button-step-action"
                >
                  {steps[currentStep].id === "business" ? "Upload Documents" : 
                   steps[currentStep].id === "vehicle" ? "Add Vehicle" : "Add Driver"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {steps[currentStep].completed && currentStep < steps.length - 1 && (
                <div className="flex items-center gap-2 mt-2 text-emerald-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Waiting for approval message */}
        {!status.canBid && status.onboardingStatus === "completed" && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm border border-amber-200" data-testid="waiting-approval-message">
            <span>Waiting for admin approval. You'll be able to bid once approved.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
