import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, User, Clock, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayment } from "@/contexts/PaymentContext";
import axios from "axios";
import { formatDisplayId } from "@/utils/formatId";

interface Employee {
  id: string;
  name: string;
  email: string;
  age?: string;
  gender?: string;
  status?: string;
  profile_picture?: string;
  created_at?: string;
}

interface ServiceRequest {
  id: string;
  service: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: string;
  customer_id: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  created_at: string;
  assigned_to?: string;
  priority?: string;
  rated?: boolean;
}

const ServiceAppointments = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customerDetails, setCustomerDetails] = useState<{ [key: string]: any }>({});
  const { toast } = useToast();
  const { serviceRequests, setServiceRequests, refreshTickets, user } = usePayment(); // ⚡ ajouter setServiceRequests

  const [localRequests, setLocalRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    if (user) {
      fetchEmployees();
      fetchCustomerDetails();
    }
  }, [user]);

  // ⚡ synchronisation locale pour re-render
  useEffect(() => {
    setLocalRequests(serviceRequests);
  }, [serviceRequests]);

  const fetchEmployees = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      const response = await axios.get("/users/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(response.data);
    } catch (error) {
      console.error("Erreur fetchEmployees:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les employés.",
        variant: "destructive",
      });
    }
  };

  const fetchCustomerDetails = async () => {
    if (!user) return;
    const uniqueCustomerIds = [...new Set(serviceRequests.map(req => req.customer_id).filter(id => id))];
    for (const customerId of uniqueCustomerIds) {
      if (!customerDetails[customerId] || !customerDetails[customerId].phone || !customerDetails[customerId].address) {
        try {
          const response = await axios.get(`/users/${customerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          setCustomerDetails(prev => ({ ...prev, [customerId]: response.data }));
        } catch (error) {
          console.error(`Erreur fetchCustomer ${customerId}:`, error);
          toast({
            title: "Erreur",
            description: `Impossible de récupérer les détails du client ${customerId}.`,
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await axios.put(`/services/${appointmentId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      // ⚡ mise à jour immédiate
      const updatedRequests = localRequests.map(req =>
        req.id === appointmentId ? { ...req, status: newStatus } : req
      );
      setLocalRequests(updatedRequests);
      if (setServiceRequests) setServiceRequests(updatedRequests);

      toast({
        title: "Statut mis à jour",
        description: `Le statut du rendez-vous ${appointmentId} a été changé.`,
      });
    } catch (error) {
      console.error("Erreur update status:", error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  const handleAssignTechnician = async (appointmentId: string, employeeId: string) => {
    const updatedAssignedTo = employeeId === "unassigned" ? null : employeeId;
    try {
      await axios.put(`/services/${appointmentId}`, { assigned_to: updatedAssignedTo }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const updatedRequests = localRequests.map(req =>
        req.id === appointmentId ? { ...req, assigned_to: updatedAssignedTo } : req
      );
      setLocalRequests(updatedRequests);
      if (setServiceRequests) setServiceRequests(updatedRequests);

      toast({
        title: "Technicien assigné",
        description: `Rendez-vous ${appointmentId} assigné à ${
          employeeId === "unassigned"
            ? "Non assigné"
            : employees.find(emp => emp.id === employeeId)?.name || "un employé"
        }`,
      });
    } catch (error) {
      console.error("Erreur assignTechnician:", error);
      toast({
        title: "Erreur",
        description: "Échec de l'assignation du technicien",
        variant: "destructive",
      });
    }
  };

  const filteredAppointments = localRequests.filter((request) => {
    const matchesFilter = filter === "all" || request.status === filter;
    const assignedEmployee = employees.find((emp) => emp.id === request.assigned_to)?.name || "Non assigné";
    const formattedDate = request.scheduled_date ? new Date(request.scheduled_date).toLocaleDateString() : "Non planifié";
    const matchesSearch =
      request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.service || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      formattedDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignedEmployee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.status || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.customer?.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.customer?.address || "").toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "completed": return "bg-purple-100 text-purple-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Gestion des rendez-vous de service
        </CardTitle>
        <CardDescription>Planifier et gérer les rendez-vous de service à domicile</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher des rendez-vous..."
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rendez-vous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="scheduled">Planifié</SelectItem>
              <SelectItem value="confirmed">Confirmé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              if (refreshTickets) refreshTickets();
              setLocalRequests([...serviceRequests]); // ⚡ re-render immédiat
              toast({
                title: "Rafraîchissement",
                description: "Les rendez-vous ont été mis à jour.",
              });
            }}
          >
            🔄 Rafraîchir
          </Button>
        </div>

        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">Aucune demande de service disponible</p>
            </div>
          ) : (
            filteredAppointments.map((request, index) => {
              const customer = customerDetails[request.customer_id] || request.customer || { name: 'Inconnu', phone: 'N/A', address: 'N/A' };
              return (
                <div key={request.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{formatDisplayId(request.id, index)}</span>
                      <Badge className={getPriorityColor(request.priority || "low")}>
                        {request.priority || "low"}
                      </Badge>
                      <Badge className={getStatusColor(request.status || "pending")}>
                        {request.status || "pending"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.scheduled_date
                        ? new Date(request.scheduled_date).toLocaleDateString()
                        : "Non planifié"}
                    </div>
                  </div>

                  <h4 className="font-medium text-gray-900 mb-3">{request.service}</h4>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span>
                          <strong>Client :</strong> {customer.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{customer.address}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>
                          <strong>Date :</strong> {request.scheduled_date ? new Date(request.scheduled_date).toLocaleDateString() : "Non planifié"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span><strong>Heure :</strong> {request.scheduled_time || "Non planifié"}</span>
                      </div>
                      <div className="text-sm">
                        <strong>Technicien :</strong> {employees.find((emp) => emp.id === request.assigned_to)?.name || "Non assigné"}
                      </div>
                    </div>
                  </div>

                  {request.description && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">
                        <strong>Notes :</strong> {request.description}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select
                      value={request.assigned_to || "unassigned"}
                      onValueChange={(value) => handleAssignTechnician(request.id, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Assigner un technicien..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Non assigné</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={request.status || "pending"}
                      onValueChange={(value) => handleStatusUpdate(request.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="scheduled">Planifié</SelectItem>
                        <SelectItem value="confirmed">Confirmé</SelectItem>
                        <SelectItem value="completed">Terminé</SelectItem>
                        <SelectItem value="cancelled">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceAppointments;
