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

  const steps = [
    {
      label: "Business Documents",
      // render backend-provided status verbatim
      status: data.businessDocuments?.status || "not_started",
      action: () => setLocation("/transporter/documents?tab=business"),
    },
    {
      label: "Vehicles",
      // vehicles has count and completed flag — show a derived but simple status
      status: data.vehicles?.completed ? "approved" : (data.vehicles?.count ? "in_progress" : "not_started"),
      count: data.vehicles?.count || 0,
      action: () => setLocation("/transporter/vehicles"),
    },
    {
      label: "Drivers",
      status: data.drivers?.completed ? "approved" : (data.drivers?.count ? "in_progress" : "not_started"),
      count: data.drivers?.count || 0,
      action: () => setLocation("/transporter/drivers"),
    },
  ];

  const completedSteps = steps.filter((s) => s.status === "approved").length;
  const progress = (completedSteps / steps.length) * 100;

  const iconFor = (status: string) => {
    if (status === "approved") return <CheckCircle className="text-green-600" />;
    if (status === "pending") return <Clock className="text-yellow-600" />;
    if (status === "rejected") return <AlertTriangle className="text-red-600" />;
    if (status === "not_required") return <CheckCircle className="text-gray-400" />;
    return <AlertTriangle className="text-gray-400" />;
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
          <div key={step.label} className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex items-center gap-3">
              {iconFor(step.status as string)}
              <div>
                <p className="font-medium">{step.label}</p>
                {"count" in step && (
                  <p className="text-xs text-muted-foreground">{step.count} added</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Status: <strong>{String(step.status)}</strong></p>
              </div>
            </div>

            {step.status !== "approved" && !(step.label === "Business Documents" && step.status === "not_required") && (
              <Button size="sm" onClick={step.action} data-testid={`onboarding-cta-${step.label.replace(/\s+/g, "-").toLowerCase()}`}>
                {step.status === "rejected" ? "Fix" : "Start"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
