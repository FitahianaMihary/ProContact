import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, Calendar, AlertTriangle, CreditCard, Plus, Home, Clock } from "lucide-react";
import AppointmentScheduler from "./customer/AppointmentScheduler";
import ComplaintForm from "./customer/ComplaintForm";
import SubscriptionService from "./customer/SubscriptionService";
import CreateTicketForm from "./customer/CreateTicketForm";
import { usePayment } from "@/contexts/PaymentContext";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDisplayId } from "@/utils/formatId";

interface CustomerDashboardProps {
  onLogout: () => void;
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
  rating?: number;
  completed_at?: string;
  reported?: boolean;
}

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: string;
  customer_id: string;
  created_at: string;
  assigned_to?: string;
  rated?: boolean;
  rating?: number;
  display_id?: string;
  resolved_at?: string;
  priority?: string;
}

const CustomerDashboard = ({ onLogout }: CustomerDashboardProps) => {
  const {
    user,
    subscribedServices = [],
    isServiceUnlocked,
    consumeCredit,
    tickets = [],
    serviceRequests = [],
    replyToTicket,
    refreshData,
  } = usePayment();

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [replyMessage, setReplyMessage] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [serviceRequestsData, setServiceRequestsData] = useState<ServiceRequest[]>([]);
  const [ticketData, setTicketData] = useState<Ticket[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchServiceRequests();
      fetchTickets();
    }
  }, [user, serviceRequests, tickets]);

  const fetchServiceRequests = async () => {
    if (!user) return;
    const cacheBuster = new Date().getTime();
    const token = localStorage.getItem("token");
    console.log("Token utilisé :", token);
    try {
      const response = await fetch(`/api/services?cache=${cacheBuster}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          toast({
            title: "Error",
            description: "Please log in to view service requests.",
            variant: "destructive",
          });
          onLogout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const text = await response.text();
      const data = JSON.parse(text);
      setServiceRequestsData(data);
    } catch (error) {
      console.error("Error fetching service requests:", error);
      toast({
        title: "Error",
        description: `Failed to fetch service requests. ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchTickets = async () => {
    if (!user) return;
    const cacheBuster = new Date().getTime();
    const token = localStorage.getItem("token");
    console.log("Token utilisé :", token);
    try {
      const response = await fetch(`/api/tickets?cache=${cacheBuster}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          toast({
            title: "Erreur",
            description: "Veuillez vous connecter pour voir les tickets.",
            variant: "destructive",
          });
          onLogout();
          return;
        }
        throw new Error(`Erreur HTTP ! statut : ${response.status} - ${errorText}`);
      }
      const text = await response.text();
      const data = JSON.parse(text);
      console.log("Tickets récupérés :", data.map(t => ({ id: t.id, status: t.status })));
      setTicketData(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des tickets :", error);
      toast({
        title: "Erreur",
        description: `Échec de la récupération des tickets. ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleTabChange = async (value: string) => {
    if (value === "appointments") {
      await refreshData();
      if (!isServiceUnlocked("home-service-per-use")) {
        toast({
          title: "Service Required",
          description: "Please subscribe to Home Service to schedule an appointment.",
          variant: "destructive",
        });
        setActiveTab("subscription");
        return;
      }
    }
    setActiveTab(value);
  };

  const handleUpgradeClick = () => {
    setActiveTab("subscription");
  };

  const fetchTicketDetails = async (ticketId: string) => {
    if (!user) return;
    setLoadingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch ticket details");
      const data = await res.json();
      setSelectedTicket(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load ticket details", variant: "destructive" });
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleSelectTicket = (ticket: any) => {
    if (!user) return;
    fetchTicketDetails(ticket.id);
  };

  const handleReply = async () => {
    if (!user || !replyMessage.trim() || !selectedTicket) return;

    if (selectedTicket.status === "resolved") {
      toast({
        title: "Ticket Résolu",
        description: "Ce ticket est déjà résolu. Veuillez créer un nouveau ticket pour continuer.",
        variant: "destructive",
      });
      return;
    }

    setLoadingReply(true);
    try {
      const updatedTicket = await replyToTicket(selectedTicket.id, replyMessage);
      setSelectedTicket(updatedTicket);
      setReplyMessage("");
      toast({
        title: "Réponse envoyée",
        description: "Votre message a été envoyée à l'équipe de support.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reply.",
        variant: "destructive",
      });
    } finally {
      setLoadingReply(false);
    }
  };

  const handleCreateTicket = () => {
    if (!user) return;
    const hasTicketingAccess =
      isServiceUnlocked("ticketing-monthly") ||
      isServiceUnlocked("ticketing-per-use") ||
      isServiceUnlocked("premium-monitoring");

    if (!hasTicketingAccess) {
      toast({
        title: "Service Required",
        description: "Please subscribe to a ticketing service to create tickets.",
        variant: "destructive",
      });
      setActiveTab("subscription");
      return;
    }

    if (
      isServiceUnlocked("ticketing-per-use") &&
      !isServiceUnlocked("ticketing-monthly") &&
      !isServiceUnlocked("premium-monitoring")
    ) {
      if (!consumeCredit("ticketing-per-use")) {
        toast({
          title: "No Credits Remaining",
          description: "Please purchase more ticketing credits.",
          variant: "destructive",
        });
        setActiveTab("subscription");
        return;
      }
    }

    setActiveTab("create-ticket");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
      case "completed":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRemainingTime = (subscription: any) => {
    if (subscription.subscription_type === "monthly" && subscription.expires_at) {
      const now = new Date();
      const expiry = new Date(subscription.expires_at);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} days remaining` : "Expired";
    }
    if (subscription.subscription_type === "per-use") {
      return `${subscription.remaining_credits || 0} credits remaining`;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
            <Button variant="ghost" onClick={() => { localStorage.removeItem("token"); onLogout(); }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="create-ticket" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Ticket</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="complaints" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Complaints</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Services</CardTitle>
                  <CardDescription>Your current service subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  {(subscribedServices?.length ?? 0) === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No active services</p>
                      <Button onClick={() => setActiveTab("subscription")}>
                        Browse Services
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subscribedServices.map((subscription, index) => {
                        const serviceName = subscription.service_id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const uniqueKey = `${subscription.service_id}-${index}`;
                        return (
                          <div key={uniqueKey} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">{serviceName}</h4>
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {subscription.subscription_type === 'monthly' ? 'Monthly Subscription' : 'Per-Use Service'}
                            </p>
                            <p className="text-sm font-medium text-blue-600">
                              {getRemainingTime(subscription)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleCreateTicket}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Ticket
                  </Button>
                  <Button 
                    onClick={() => {
                      if (!isServiceUnlocked("home-service-per-use")) {
                        toast({
                          title: "Service Required",
                          description: "Please subscribe to Home Service to schedule an appointment.",
                          variant: "destructive",
                        });
                        setActiveTab("subscription");
                        return;
                      }
                      setActiveTab("appointments");
                    }}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("subscription")}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Services
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Tickets</CardTitle>
                  <CardDescription>Your latest support requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {(ticketData?.length ?? 0) === 0 ? (
                    <p className="text-gray-500 text-center py-4">No tickets created yet</p>
                  ) : (
                    <div className="space-y-3">
                      {ticketData.slice(0, 3).map((ticket, index) => (
                        <div
                          key={ticket.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ticket.display_id || formatDisplayId(ticket.id, index)}</span>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                              {ticket.priority && (
                                <Badge className={getPriorityColor(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{ticket.title}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {ticket.description || "No description provided"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Requests</CardTitle>
                  <CardDescription>Your scheduled interventions</CardDescription>
                </CardHeader>
                <CardContent>
                  {(serviceRequestsData?.length ?? 0) === 0 ? (
                    <p className="text-gray-500 text-center py-4">No service requests yet</p>
                  ) : (
                    <div className="space-y-3">
                      {serviceRequestsData
                        .filter(service => service.service === 'home-service-per-use')
                        .map((request, index) => (
                          <div
                            key={request.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatDisplayId(request.id, index)}</span>
                                <Badge className={getStatusColor(request.status)}>
                                  {request.status}
                                </Badge>
                                {request.priority && (
                                  <Badge className={getPriorityColor(request.priority)}>
                                    {request.priority}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(request.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{request.service}</h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {request.description || "No description provided"}
                            </p>
                            <div className="text-sm text-gray-600 mb-2">
                              <p><strong>Technician:</strong> {request.assigned_to || "Unassigned"}</p>
                              {request.scheduled_date && (
                                <p>
                                  <strong>Scheduled:</strong>{" "}
                                  {new Date(request.scheduled_date).toLocaleDateString('fr-FR')}
                                  {request.scheduled_time ? ` at ${request.scheduled_time}` : ""}
                                </p>
                              )}
                              <p><strong>Reported:</strong> {request.reported ? "Yes" : "No"}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>
                    Track your support requests and responses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(ticketData?.length ?? 0) === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-gray-500 mb-4">No tickets created yet</p>
                      <Button onClick={handleCreateTicket}>
                        Create Your First Ticket
                      </Button>
                    </div>
                  ) : (
                    ticketData.map((ticket, index) => (
                      <div
                        key={ticket.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectTicket(ticket)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{ticket.display_id || formatDisplayId(ticket.id, index)}</span>
                          <div className="flex gap-2">
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{ticket.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedTicket ? `Ticket ${selectedTicket.display_id || formatDisplayId(selectedTicket.id, ticketData.findIndex(t => t.id === selectedTicket.id))}` : 'Select a Ticket'}
                  </CardTitle>
                  <CardDescription>
                    {selectedTicket ? 'Ticket conversation and details' : 'Choose a ticket to view details'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTicket ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : selectedTicket ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Status:</strong> {selectedTicket.status}</p>
                            <p><strong>Priority:</strong> {selectedTicket.priority}</p>
                          </div>
                          <div>
                            <p><strong>Category:</strong> {selectedTicket.category || "N/A"}</p>
                            <p><strong>Created:</strong> {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR")}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Conversation</h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {(selectedTicket.messages?.length ?? 0) === 0 ? (
                            <p className="text-gray-500 text-center py-4">No messages yet</p>
                          ) : (
                            selectedTicket.messages.map((msg: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg max-w-[85%] ${
                                  msg.sender_type === 'employee'
                                    ? 'bg-green-100 ml-auto text-black'
                                    : 'bg-blue-100 mr-auto text-black'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium">
                                    {msg.sender_name || (msg.sender_type ?? msg.sender_id)}
                                  </span>
                                  <span className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm">{msg.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Add Reply</label>
                        <Textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder={selectedTicket?.status === "resolved" ? "Ticket résolu. Vous ne pouvez plus répondre." : "Tapez votre message..."}
                          className="mb-3"
                          disabled={selectedTicket?.status === "resolved"}
                        />
                        <Button 
                          onClick={handleReply} 
                          className="w-full"
                          disabled={selectedTicket?.status === "resolved" || loadingReply}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Envoyer la réponse
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a ticket from the list to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="create-ticket" className="space-y-6">
            {isServiceUnlocked("premium-monitoring") ? (
              <CreateTicketForm 
                isPriority={true}
                onTicketCreated={() => setActiveTab("tickets")}
              />
            ) : isServiceUnlocked("ticketing-monthly") || isServiceUnlocked("ticketing-per-use") ? (
              <CreateTicketForm 
                isPriority={false}
                onTicketCreated={() => setActiveTab("tickets")}
              />
            ) : (
              <div className="text-center p-8">
                <p className="text-red-600 mb-4">You must subscribe to a ticketing service to create tickets.</p>
                <Button onClick={() => setActiveTab("subscription")}>
                  Go to Services
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentScheduler />
          </TabsContent>

          <TabsContent value="complaints">
            <ComplaintForm />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionService />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CustomerDashboard;