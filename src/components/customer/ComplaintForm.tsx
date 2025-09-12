import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayment } from "@/contexts/PaymentContext";

const ComplaintForm = () => {
  const [complaint, setComplaint] = useState({
    subject: "",
    description: "",
    relatedTicket: ""
  });
  const { toast } = useToast();
  const { createComplaint } = usePayment();

  const handleSubmitComplaint = async () => {
    if (!complaint.subject || !complaint.description) {
      toast({
        title: "Error",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }
    if (complaint.subject.length < 3 || complaint.description.length < 10) {
      toast({
        title: "Error",
        description: "Subject must be at least 3 characters, and description at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createComplaint({
        subject: complaint.subject,
        description: complaint.description,
        relatedTicket: complaint.relatedTicket || undefined,
      });
      toast({
        title: "Complaint Submitted",
        description: "Your complaint has been submitted and will be reviewed by our team.",
        variant: "default",
      });
      setComplaint({
        subject: "",
        description: "",
        relatedTicket: ""
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit complaint. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-800">File a Complaint</CardTitle>
        </div>
        <CardDescription>
          Submit a formal complaint about our service or experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={complaint.subject}
            onChange={(e) => setComplaint({...complaint, subject: e.target.value})}
            placeholder="Brief summary of your complaint"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="relatedTicket">Related Service Number (Optional, e.g., S-01)</Label>
          <Input
            id="relatedTicket"
            value={complaint.relatedTicket}
            onChange={(e) => setComplaint({...complaint, relatedTicket: e.target.value})}
            placeholder="e.g., S-01"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Detailed Description</Label>
          <Textarea
            id="description"
            value={complaint.description}
            onChange={(e) => setComplaint({...complaint, description: e.target.value})}
            placeholder="Please provide detailed information about your complaint..."
            rows={4}
          />
        </div>

        <Button onClick={handleSubmitComplaint} className="w-full">
          Submit Complaint
        </Button>
      </CardContent>
    </Card>
  );
};

export default ComplaintForm;