import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, User, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ComplaintManagement = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const response = await axios.get("/complaints", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setComplaints(response.data);
      } catch (error) {
        console.error("Error fetching complaints:", error);
        toast({
          title: "Erreur",
          description: "Échec de la récupération des plaintes.",
          variant: "destructive",
        });
      }
    };
    fetchComplaints();
  }, [toast]);

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      await axios.put(
        `/complaints/${complaintId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
      );
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint({ ...selectedComplaint, status: newStatus });
      }
      toast({
        title: "Statut mis à jour",
        description: `Le statut de la plainte ${complaintId} a été changé en ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du statut.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-review":
        return "bg-yellow-100 text-yellow-800";
      case "escalated":
        return "bg-red-100 text-red-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Gestion des plaintes
          </CardTitle>
          <CardDescription>Gérer et résoudre les plaintes des clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div
                key={complaint.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedComplaint?.id === complaint.id ? "bg-orange-50 border-orange-200" : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedComplaint(complaint)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{complaint.id}</span>
                    <Badge className={getPriorityColor(complaint.priority)}>{complaint.priority}</Badge>
                    <Badge className={getStatusColor(complaint.status)}>{complaint.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-500">{complaint.created_at}</div>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{complaint.subject}</h4>
                <p className="text-sm text-gray-600 mb-3">{complaint.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Client : {complaint.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="h-4 w-4" />
                    <span>Numéro : {complaint.related_ticket || "N/A"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedComplaint && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle>Détails de la plainte : {selectedComplaint.id}</CardTitle>
            <CardDescription>Informations complètes sur la plainte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Informations sur le client</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Nom :</strong> {selectedComplaint.customer_name}</p>
                    <p><strong>Email :</strong> {selectedComplaint.customer?.email || "N/A"}</p>
                    <p><strong>Téléphone :</strong> {selectedComplaint.customer?.phone || "N/A"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Détails de la plainte</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Priorité :</strong> {selectedComplaint.priority}</p>
                    <p><strong>Statut :</strong> {selectedComplaint.status}</p>
                    <p><strong>Numéro :</strong> {selectedComplaint.related_ticket || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Mettre à jour le statut</h4>
                  <Select
                    defaultValue={selectedComplaint.status}
                    onValueChange={(value) => handleStatusUpdate(selectedComplaint.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-review">En revue</SelectItem>
                      <SelectItem value="escalated">Escaladé</SelectItem>
                      <SelectItem value="resolved">Résolu</SelectItem>
                      <SelectItem value="closed">Fermé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComplaintManagement;