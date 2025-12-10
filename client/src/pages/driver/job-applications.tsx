import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Briefcase, Building2, MapPin, IndianRupee, Clock, Send, CheckCircle, XCircle, Hourglass, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BottomNav } from "@/components/layout/bottom-nav";

interface DriverApplication {
  id: string;
  status: string;
  preferredLocations?: string;
  expectedSalary?: string;
  experienceYears?: number;
  licenseTypes?: string;
  notes?: string;
  transporterId?: string;
  transporterName?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function DriverJobApplications() {
  const [_, setLocation] = useLocation();
  const [application, setApplication] = useState<DriverApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [formData, setFormData] = useState({
    preferredLocations: "",
    expectedSalary: "",
    experienceYears: "",
    licenseTypes: "commercial",
    notes: "",
  });

  useEffect(() => {
    loadApplication();
  }, []);

  const loadApplication = async () => {
    setLoading(true);
    try {
      const data = await api.driverApplications.getMyApplication();
      if (data && !data.error) {
        setApplication(data);
      }
    } catch (error) {
      console.error("Failed to load application:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await api.driverApplications.create({
        ...formData,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Application submitted successfully!");
        setShowApplyDialog(false);
        loadApplication();
      }
    } catch (error) {
      toast.error("Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;
    setIsSubmitting(true);
    try {
      const result = await api.driverApplications.withdraw(application.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Application withdrawn");
        setApplication(null);
      }
    } catch (error) {
      toast.error("Failed to withdraw application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-600"><Hourglass className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "reviewed":
        return <Badge className="bg-blue-600"><FileText className="h-3 w-3 mr-1" />Under Review</Badge>;
      case "hired":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Hired</Badge>;
      case "rejected":
        return <Badge className="bg-red-600"><XCircle className="h-3 w-3 mr-1" />Not Selected</Badge>;
      case "withdrawn":
        return <Badge variant="secondary">Withdrawn</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center h-16 gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/driver")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Briefcase className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Job Applications</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : application ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Your Application</CardTitle>
                  {getStatusBadge(application.status)}
                </div>
                <CardDescription>
                  Submitted on {new Date(application.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.preferredLocations && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Preferred Locations</p>
                      <p className="text-sm text-gray-600">{application.preferredLocations}</p>
                    </div>
                  </div>
                )}

                {application.expectedSalary && (
                  <div className="flex items-start gap-3">
                    <IndianRupee className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Expected Salary</p>
                      <p className="text-sm text-gray-600">₹{application.expectedSalary}/month</p>
                    </div>
                  </div>
                )}

                {application.experienceYears && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Experience</p>
                      <p className="text-sm text-gray-600">{application.experienceYears} years</p>
                    </div>
                  </div>
                )}

                {application.transporterName && application.status === "hired" && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Hired By</p>
                      <p className="text-sm text-green-600 font-medium">{application.transporterName}</p>
                    </div>
                  </div>
                )}

                {application.notes && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-gray-900 mb-1">Additional Notes</p>
                    <p className="text-sm text-gray-600">{application.notes}</p>
                  </div>
                )}

                {application.status === "pending" && (
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 hover:text-red-700"
                      onClick={handleWithdraw}
                      disabled={isSubmitting}
                      data-testid="button-withdraw"
                    >
                      {isSubmitting ? "Withdrawing..." : "Withdraw Application"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {application.status === "hired" && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-medium text-green-900">Congratulations!</h3>
                      <p className="text-sm text-green-800">
                        You have been hired by {application.transporterName}. 
                        You will now be able to receive trip assignments from this transporter.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Looking for Work?</h3>
                <p className="text-gray-600 mb-6">
                  Submit a job application to get hired by transporters and fleet owners
                </p>
                <Button onClick={() => setShowApplyDialog(true)} data-testid="button-apply">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <p className="font-medium text-gray-900">Submit Your Application</p>
                      <p className="text-sm text-gray-600">Share your experience, preferred locations, and salary expectations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <p className="font-medium text-gray-900">Transporters Review</p>
                      <p className="text-sm text-gray-600">Fleet owners and transporters will review your application</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <p className="font-medium text-gray-900">Get Hired</p>
                      <p className="text-sm text-gray-600">Once hired, you'll receive trip assignments directly</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Job Application</DialogTitle>
            <DialogDescription>
              Fill in your details to apply for driving jobs with transporters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="preferredLocations">Preferred Work Locations</Label>
              <Input
                id="preferredLocations"
                placeholder="e.g., Delhi, Mumbai, Pune"
                value={formData.preferredLocations}
                onChange={(e) => setFormData({ ...formData, preferredLocations: e.target.value })}
                data-testid="input-locations"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experienceYears">Experience (Years)</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  data-testid="input-experience"
                />
              </div>
              <div>
                <Label htmlFor="expectedSalary">Expected Salary (₹/month)</Label>
                <Input
                  id="expectedSalary"
                  type="number"
                  placeholder="e.g., 25000"
                  value={formData.expectedSalary}
                  onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                  data-testid="input-salary"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="licenseTypes">License Type</Label>
              <Select value={formData.licenseTypes} onValueChange={(val) => setFormData({ ...formData, licenseTypes: val })}>
                <SelectTrigger data-testid="select-license">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial (HMV)</SelectItem>
                  <SelectItem value="transport">Transport License</SelectItem>
                  <SelectItem value="all">All Categories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Additional Information</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details about your experience, vehicle types you can drive, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="button-submit-application">
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav role="driver" />
    </div>
  );
}
