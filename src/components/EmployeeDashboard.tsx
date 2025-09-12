import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, Calendar, FileText, Search, BarChart3, Bell } from "lucide-react";
import ServiceReports from "./employee/ServiceReports";
import CustomerHistory from "./employee/CustomerHistory";
import NotificationCenter from "./customer/NotificationCenter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayment } from "@/contexts/PaymentContext";
import { formatDisplayId } from "@/utils/formatId";

interface EmployeeDashboardProps {
  onLogout: () => void;
}

const EmployeeDashboard = ({ onLogout }: EmployeeDashboardProps) => {
  const { tickets = [], serviceRequests = [], refreshTickets, setTickets } = usePayment();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [customerDetails, setCustomerDetails] = useState<{ [key: string]: any }>({}); // Stocke les détails des clients par customer_id
  const { toast } = useToast();

  // Récupérer les détails des clients au montage du composant
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      const uniqueCustomerIds = [...new Set([...tickets.map(t => t.customer_id), ...serviceRequests.map(req => req.customer_id)].filter(id => id))];
      for (const customerId of uniqueCustomerIds) {
        if (!customerDetails[customerId]) {
          try {
            const response = await axios.get(`/users/${customerId}`);
            setCustomerDetails(prev => ({ ...prev, [customerId]: response.data }));
          } catch (error) {
            console.error(`Erreur lors de la récupération des détails du client ${customerId} :`, error);
            toast({
              title: "Erreur",
              description: "Vous n'avez pas les permissions pour accéder aux détails du client. Contactez un administrateur.",
              variant: "destructive"
            });
          }
        }
      }
    };
    if (tickets.length > 0 || serviceRequests.length > 0) fetchCustomerDetails();
  }, [tickets, serviceRequests, customerDetails, toast]);

  useEffect(() => {
    if (!selectedTicket) {
      setTicketMessages([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/tickets/${selectedTicket.id}/messages`);
        setTicketMessages(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des messages du ticket :', error);
        toast({
          title: "Erreur",
          description: "Échec du chargement des messages",
          variant: "destructive"
        });
      }
    };
    fetchMessages();
  }, [selectedTicket, toast]);

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      await axios.post(`/tickets/${selectedTicket.id}/messages`, { message: replyMessage });
      toast({
        title: "Réponse envoyée",
        description: "Votre réponse a été envoyée au client.",
      });
      setReplyMessage("");
      const response = await axios.get(`/tickets/${selectedTicket.id}/messages`);
      setTicketMessages(response.data);
      if (refreshTickets) refreshTickets();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec de l'envoi de la réponse",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      await axios.put(`/tickets/${ticketId}`, { status: newStatus });
      toast({
        title: "Statut mis à jour",
        description: `Statut du ticket #${ticketId} changé en ${newStatus}`,
      });
      // Mise à jour locale de la liste des tickets
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      ));
      if (refreshTickets) refreshTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du statut",
        variant: "destructive"
      });
    }
  };

  // Gérer le clic sur un ticket
  const handleTicketClick = async (ticket: any) => {
    setSelectedTicket(ticket);
    if (ticket.status === "pending") {
      await handleStatusUpdate(ticket.id, "open");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord des employés</h1>
            <Button variant="ghost" onClick={onLogout} aria-label="Déconnexion">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Rapports</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Tickets */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{tickets.length}</div>
                  <div className="text-sm text-gray-500">Total Tickets</div>
                </CardContent>
              </Card>
              {/* Resolved */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'resolved').length}</div>
                  <div className="text-sm text-gray-500">Résolus</div>
                </CardContent>
              </Card>
              {/* Pending */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{tickets.filter(t => ['open', 'in-progress', 'pending'].includes(t.status)).length}</div>
                  <div className="text-sm text-gray-500">En attente</div>
                </CardContent>
              </Card>
              {/* Appointments */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{serviceRequests.length}</div>
                  <div className="text-sm text-gray-500">Rendez-vous</div>
                </CardContent>
              </Card>
              {/* Avg Response */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">2.5 heures</div>
                  <div className="text-sm text-gray-500">Temps de réponse moyen</div>
                </CardContent>
              </Card>
              {/* Rating */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">4.8</div>
                  <div className="text-sm text-gray-500">Note</div>
                </CardContent>
              </Card>
            </div>

            {/* My Recent Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Nos tickets</CardTitle>
                <CardDescription>Les details sur les tickets Proncontact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-500">Aucun ticket disponible</p>
                  </div>
                ) : (
                  tickets.slice(0, 3).map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleTicketClick(ticket)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTicketClick(ticket); }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{formatDisplayId(ticket.id, index)}</span>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{ticket.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">Client : {ticket.customer?.name || "Inconnu"}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Rendez-vous à venir</CardTitle>
                <CardDescription>Notre rendez-vous de service programmés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviceRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-500">Aucune demande de service disponible</p>
                  </div>
                ) : (
                  serviceRequests.map((request) => {
                    const customer = customerDetails[request.customer_id] || { name: 'Inconnu', phone: 'N/A', address: 'N/A' };
                    return (
                      <div key={request.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{request.service}</h4>
                          <Badge className={request.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {request.status}
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Client :</strong> {customer.name}</p>
                            <p><strong>Téléphone :</strong> {customer.phone}</p>
                            <p><strong>Adresse :</strong> {customer.address}</p>
                          </div>
                          <div>
                            <p><strong>Date prévue :</strong> {request.scheduled_date ? new Date(request.scheduled_date).toLocaleDateString("fr-FR") : 'Non planifiée'}</p>
                            <p><strong>Heure prévue :</strong> {request.scheduled_time || 'Non planifiée'}</p>
                            <p><strong>Créé :</strong> {new Date(request.created_at).toLocaleDateString("fr-FR")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tickets clients</CardTitle>
                  <CardDescription>
                    Tickets de support des clients
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-gray-500">Aucun ticket disponible</p>
                    </div>
                  ) : (
                    tickets.map((ticket, index) => (
                      <div
                        key={ticket.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleTicketClick(ticket)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleTicketClick(ticket); }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{formatDisplayId(ticket.id, index)}</span>
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
                          <User className="h-4 w-4 mr-1" />
                          {ticket.customer?.name || "Inconnu"}
                          <Clock className="h-4 w-4 ml-4 mr-1" />
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
                    {selectedTicket ? `Ticket ${formatDisplayId(selectedTicket.id, tickets.findIndex(t => t.id === selectedTicket.id))}` : 'Sélectionner un ticket'}
                  </CardTitle>
                  <CardDescription>
                    {selectedTicket ? 'Détails et conversation du ticket' : 'Choisissez un ticket pour voir les détails'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTicket ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Informations client</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Nom :</strong> {selectedTicket.customer?.name || "Inconnu"}</p>
                          <p><strong>Email :</strong> {selectedTicket.customer?.email || "N/A"}</p>
                          <p><strong>Téléphone :</strong> {selectedTicket.customer?.phone || "N/A"}</p>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="status-select" className="block text-sm font-medium mb-2">Mettre à jour le statut</label>
                        <Select
                          id="status-select"
                          defaultValue={selectedTicket.status}
                          onValueChange={(value) => handleStatusUpdate(selectedTicket.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="open">Ouvert</SelectItem>
                            <SelectItem value="assigned">Assigné</SelectItem>
                            <SelectItem value="in-progress">En cours</SelectItem>
                            <SelectItem value="resolved">Résolu</SelectItem>
                            <SelectItem value="transferred">Transféré</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Conversation</h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {ticketMessages.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Aucun message pour l'instant</p>
                          ) : (
                            ticketMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-lg ${
                                  msg.sender_type === 'customer'
                                    ? 'bg-blue-100 ml-4'
                                    : 'bg-green-100 mr-4'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium capitalize">
                                    {msg.sender_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(msg.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm">{msg.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="reply-textarea" className="block text-sm font-medium mb-2">Répondre au client</label>
                        <Textarea
                          id="reply-textarea"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Tapez votre réponse..."
                          className="mb-3"
                        />
                        <Button onClick={handleReply} className="w-full" aria-label="Envoyer la réponse">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Envoyer la réponse
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez un ticket dans la liste pour voir les détails</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demandes de services à domicile</CardTitle>
                <CardDescription>
                  Rendez-vous et interventions des services clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {serviceRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-500">Aucune demande de service disponible</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceRequests.map((request, index) => {
                      const customer = customerDetails[request.customer_id] || { name: 'Inconnu', phone: 'N/A', address: 'N/A' };
                      return (
                        <div key={request.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{formatDisplayId(request.id, index)} - {request.service}</h4>
                            <Badge className={request.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {request.status}
                            </Badge>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Client :</strong> {customer.name}</p>
                              <p><strong>Téléphone :</strong> {customer.phone}</p>
                              <p><strong>Adresse :</strong> {customer.address}</p>
                            </div>
                            <div>
                              <p><strong>Date prévue :</strong> {request.scheduled_date ? new Date(request.scheduled_date).toLocaleDateString("fr-FR") : 'Non planifiée'}</p>
                              <p><strong>Heure prévue :</strong> {request.scheduled_time || 'Non planifiée'}</p>
                              <p><strong>Créé :</strong> {new Date(request.created_at).toLocaleDateString("fr-FR")}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ServiceReports />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerHistory />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationCenter role="employee" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EmployeeDashboard;