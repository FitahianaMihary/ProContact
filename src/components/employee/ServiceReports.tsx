import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const ServiceReports = () => {
  const [showNewReport, setShowNewReport] = useState(false);
  const [newReport, setNewReport] = useState({
    related_id: "",
    report_type: "",
    priority: "",
    subject: "",
    description: "",
    suggested_action: "",
  });
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false); // État pour la soumission
  const { toast } = useToast();

  // Récupérer les rapports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/reports", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setReports(response.data);
      } catch (error: any) {
        console.error("Error fetching reports:", error);
        if (error.response?.status === 403) {
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas les permissions pour accéder aux rapports.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: "Échec de la récupération des rapports.",
            variant: "destructive",
          });
        }
      }
    };
    fetchReports();
  }, [toast]);

  // Filtrer les rapports pour la recherche
  const filteredReports = reports.filter(
    (report) =>
      (report.related_id &&
        report.related_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      report.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(report.created_at).toLocaleDateString("fr-FR").includes(searchTerm)
  );

  // Soumettre un nouveau rapport
  const handleSubmitReport = async () => {
    if (!newReport.report_type || !newReport.priority || !newReport.subject || !newReport.description) {
      toast({
        title: "Erreur",
        description: "Les champs Type, Priorité, Sujet et Description sont requis.",
        variant: "destructive",
      });
      return;
    }

    // Validation de related_id (doit être vide ou au format S-XXX)
    if (newReport.related_id && !/^S-\d+$/.test(newReport.related_id)) {
      toast({
        title: "Erreur",
        description: "L'ID de service doit être au format S-XXX (ex. S-001).",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/reports",
        {
          report_type: newReport.report_type,
          priority: newReport.priority,
          related_id: newReport.related_id || null,
          subject: newReport.subject,
          description: newReport.description,
          suggested_action: newReport.suggested_action || null,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setReports([response.data, ...reports]);
      setNewReport({
        related_id: "",
        report_type: "",
        priority: "",
        subject: "",
        description: "",
        suggested_action: "",
      });
      setShowNewReport(false);
      toast({
        title: "Rapport soumis",
        description: "Le rapport de service a été soumis avec succès.",
      });
    } catch (error: any) {
      console.error("Error creating report:", error);
      if (error.response?.status === 403) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions pour soumettre un rapport.",
          variant: "destructive",
        });
      } else if (error.response?.status === 400 && error.response.data.error.includes("related_id")) {
        toast({
          title: "Erreur",
          description: "L'ID de service fourni est invalide. Vérifiez le format ou l'existence du service.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Échec de la soumission du rapport.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Service Reports</h3>
        <Button onClick={() => setShowNewReport(!showNewReport)} disabled={submitting}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {showNewReport && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create Service Report
            </CardTitle>
            <CardDescription>Document the service performed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Related Service ID</Label>
                <Input
                  value={newReport.related_id}
                  onChange={(e) => setNewReport({ ...newReport, related_id: e.target.value })}
                  placeholder="e.g., S-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select
                  value={newReport.report_type}
                  onValueChange={(value) => setNewReport({ ...newReport, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newReport.priority}
                  onValueChange={(value) => setNewReport({ ...newReport, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={newReport.subject}
                  onChange={(e) => setNewReport({ ...newReport, subject: e.target.value })}
                  placeholder="Report subject"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                placeholder="Describe the work performed..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Suggested Action</Label>
              <Textarea
                value={newReport.suggested_action}
                onChange={(e) => setNewReport({ ...newReport, suggested_action: e.target.value })}
                placeholder="Any recommendations for the customer..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitReport} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewReport(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Previous Reports</CardTitle>
          <CardDescription>View and search your service reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by Related ID, Subject, or Date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full md:w-96"
              />
            </div>
          </div>
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No reports available.</p>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">RPT{String(report.id).padStart(3, "0")}</span>
                    </div>
                    <Badge
                      className={
                        report.priority === "urgent"
                          ? "bg-red-100 text-red-800"
                          : report.priority === "high"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {report.priority}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Type:</strong> {report.report_type}
                      </p>
                      <p>
                        <strong>Related ID:</strong> {report.related_id || "N/A"}
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(report.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Subject:</strong> {report.subject}
                      </p>
                      <p>
                        <strong>Description:</strong>{" "}
                        {report.description.substring(0, 100) +
                          (report.description.length > 100 ? "..." : "")}
                      </p>
                      <p>
                        <strong>Suggested Action:</strong>{" "}
                        {report.suggested_action || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceReports;