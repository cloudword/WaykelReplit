import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { OnboardingStatus } from "@/hooks/useOnboardingStatus";

type Props = {
  data: OnboardingStatus;
};

export function OnboardingTracker({ data }: Props) {
  const [, setLocation] = useLocation();

  if (data.verificationStatus === "approved" || data.overallStatus === "COMPLETED") {
    return null;
  }

  const steps = [
    {
      id: "business",
      label: data.steps.businessVerification.label,
      description: data.steps.businessVerification.description,
      status: data.steps.businessVerification.completed ? "approved" : "pending",
      required: data.steps.businessVerification.required,
      action: () => setLocation("/transporter/documents?tab=business"),
    },
    {
      id: "vehicles",
      label: data.steps.addVehicle.label,
      description: data.steps.addVehicle.description,
      status: data.steps.addVehicle.completed ? "approved" : "pending",
      required: data.steps.addVehicle.required,
      action: () => setLocation("/transporter/vehicles"),
    },
    {
      id: "drivers",
      label: data.steps.addDriver.label,
      description: data.steps.addDriver.description,
      status: data.steps.addDriver.completed ? "approved" : "pending",
      required: data.steps.addDriver.required,
      action: () => setLocation("/transporter/drivers"),
    },
  ];

  const progress = (data.completedCount / data.totalCount) * 100;

  const iconFor = (status: string, required: boolean) => {
    if (status === "approved") return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (!required) return <CheckCircle className="h-5 w-5 text-gray-300" />;
    return <Clock className="h-5 w-5 text-amber-500" />;
  };

  return (
    <div className="rounded-xl border p-5 bg-white space-y-4" data-testid="onboarding-tracker">
      <div>
        <h2 className="text-lg font-semibold">Complete Your Onboarding</h2>
        <p className="text-sm text-muted-foreground">Finish these steps to start receiving trips</p>
      </div>

      <Progress value={progress} />

      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex items-center gap-3">
              {iconFor(step.status, step.required)}
              <div>
                <p className="font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                <p className="text-xs text-muted-foreground mt-1 font-bold uppercase tracking-tight">
                  {step.status === "approved" ? "Verified" : "Pending"}
                </p>
              </div>
            </div>

            {step.status !== "approved" && step.required && (
              <Button size="sm" onClick={step.action}>
                Start
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
