import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: number;
  user_id: string;
  type: string;
  priority: string;
  related_id: string | null;
  subject: string;
  description: string;
  suggested_action: string | null;
  created_at: string;
}

const RolePermissions = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/reports', {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  credentials: "include",
});
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: "Error",
          description: "Failed to fetch service reports.",
          variant: "destructive",
        });
      }
    };
    fetchReports();
  }, [toast]);

  const filteredReports = reports.filter(report =>
    (report.related_id?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (report.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (new Date(report.created_at).toLocaleDateString('fr-FR').includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900">Service Reports</h3>
        <p className="text-gray-600">View and manage employee service reports</p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Employee Reports</CardTitle>
          <CardDescription>Overview of all submitted service reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No reports available.</p>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">RPT{String(report.id).padStart(3, '0')}</span>
                    </div>
                    <Badge className={report.priority === 'urgent' ? 'bg-red-100 text-red-800' : 
                                      report.priority === 'high' ? 'bg-orange-100 text-orange-800' : 
                                      'bg-green-100 text-green-800'}>
                      {report.priority}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Type:</strong> {report.type}</p>
                      <p><strong>Related ID:</strong> {report.related_id || 'N/A'}</p>
                      <p><strong>Date:</strong> {new Date(report.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <p><strong>Subject:</strong> {report.subject}</p>
                      <p><strong>Description:</strong> {report.description.substring(0, 100) + (report.description.length > 100 ? '...' : '')}</p>
                      <p><strong>Suggested Action:</strong> {report.suggested_action || 'N/A'}</p>
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

export default RolePermissions;