import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Calendar, AlertTriangle } from "lucide-react";
import { usePayment } from "@/contexts/PaymentContext";
import axios from "axios";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const AdminStats = () => {
  const { tickets, serviceRequests } = usePayment();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);

  // Calculs dynamiques des statistiques
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === "open").length;
  const inProgressTickets = tickets.filter(t => t.status === "in-progress").length;
  const resolvedTickets = tickets.filter(t => t.status === "resolved").length;
  const totalAppointments = serviceRequests.length;
  const totalCustomers = [...new Set([...tickets.map(t => t.customer_id), ...serviceRequests.map(req => req.customer_id)])].length;
  const urgentIssues = tickets.filter(t => t.priority === "high").length;

  // Tickets urgents
  const urgentTickets = tickets
    .filter(t => t.priority === "high")
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      title: t.title,
      customer: t.customer?.name || "Unknown",
      created_at: t.created_at,
    }));

  // Rendez-vous du jour
  const today = new Date().toISOString().split("T")[0];
  const todaysAppointments = serviceRequests
    .filter(req => req.scheduled_date?.startsWith(today))
    .slice(0, 5)
    .map(req => ({
      id: req.id,
      customer: req.customer?.name || "Unknown",
      scheduled_date: req.scheduled_date,
      status: req.status,
    }));

  // Récupération des plaintes critiques
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

  const criticalComplaints = complaints
    .filter(c => c.priority === "urgent" || c.status === "escalated")
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      subject: c.subject,
      customer: c.customer_name || "Unknown",
      created_at: c.created_at,
    }));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalTickets}</p>
                <p className="text-sm text-gray-600">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{totalAppointments}</p>
                <p className="text-sm text-gray-600">Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{totalCustomers}</p>
                <p className="text-sm text-gray-600">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{urgentIssues}</p>
                <p className="text-sm text-gray-600">Urgent Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Overview</CardTitle>
            <CardDescription>Current ticket status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span>Open Tickets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl">{openTickets}</span>
                  <Badge className="bg-blue-100 text-blue-800">Open</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-yellow-600" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl">{inProgressTickets}</span>
                  <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span>Resolved</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl">{resolvedTickets}</span>
                  <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urgent Tickets</CardTitle>
            <CardDescription>Tickets requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {urgentTickets.length === 0 ? (
              <p className="text-gray-500">No urgent tickets at the moment.</p>
            ) : (
              <div className="space-y-3">
                {urgentTickets.map(ticket => (
                  <div key={ticket.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{ticket.title}</p>
                        <p className="text-xs text-gray-500">Customer: {ticket.customer}</p>
                        <p className="text-xs text-gray-500">Created: {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">High Priority</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Sections */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Critical Complaints</CardTitle>
            <CardDescription>Urgent or escalated complaints</CardDescription>
          </CardHeader>
          <CardContent>
            {criticalComplaints.length === 0 ? (
              <p className="text-gray-500">No critical complaints at the moment.</p>
            ) : (
              <div className="space-y-3">
                {criticalComplaints.map(complaint => (
                  <div key={complaint.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{complaint.subject}</p>
                        <p className="text-xs text-gray-500">Customer: {complaint.customer}</p>
                        <p className="text-xs text-gray-500">Created: {new Date(complaint.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">Critical</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>Service appointments scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            {todaysAppointments.length === 0 ? (
              <p className="text-gray-500">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {todaysAppointments.map(appointment => (
                  <div key={appointment.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Appointment {appointment.id}</p>
                        <p className="text-xs text-gray-500">Customer: {appointment.customer}</p>
                        <p className="text-xs text-gray-500">Time: {new Date(appointment.scheduled_date).toLocaleTimeString('fr-FR')}</p>
                      </div>
                      <Badge className={appointment.status === "scheduled" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStats;