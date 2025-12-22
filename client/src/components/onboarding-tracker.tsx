import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

type Props = {
  data: {
    overallStatus: "not_started" | "in_progress" | "completed";
    businessDocuments: { status: string };
    vehicles: { count: number; completed: boolean };
    drivers: { count: number; completed: boolean };
  };
};

export function OnboardingTracker({ data }: Props) {
  const [, setLocation] = useLocation();

  const steps = [
    {
      label: "Business Documents",
      status: data.businessDocuments.status,
      action: () => setLocation("/transporter/documents"),
    },
    {
      label: "Vehicles",
      status: data.vehicles.completed ? "approved" : "not_started",
      count: data.vehicles.count,
      action: () => setLocation("/transporter/vehicles"),
    },
    {
      label: "Drivers",
      status: data.drivers.completed ? "approved" : "not_started",
      count: data.drivers.count,
      action: () => setLocation("/transporter/drivers"),
    },
  ];

  const completedSteps = steps.filter(
    (s) => s.status === "approved"
  ).length;

  const progress = (completedSteps / steps.length) * 100;

  const iconFor = (status: string) => {
    if (status === "approved") return <CheckCircle className="text-green-600" />;
    if (status === "pending") return <Clock className="text-yellow-600" />;
    if (status === "rejected") return <AlertTriangle className="text-red-600" />;
    return <AlertTriangle className="text-gray-400" />;
  };

  return (
    <div className="rounded-xl border p-5 bg-white space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Complete Your Onboarding
        </h2>
        <p className="text-sm text-muted-foreground">
          Finish these steps to start receiving trips
        </p>
      </div>

      <Progress value={progress} />

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center justify-between border rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              {iconFor(step.status)}
              <div>
                <p className="font-medium">{step.label}</p>
                {"count" in step && (
                  <p className="text-xs text-muted-foreground">
                    {step.count} added
                  </p>
                )}
              </div>
            </div>

            {step.status !== "approved" && (
              <Button size="sm" onClick={step.action}>
                {step.status === "rejected" ? "Fix" : "Start"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
