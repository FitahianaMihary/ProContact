import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, Calendar, Ticket, CreditCard, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';

interface ClientDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
  registeredAt: string;
  lastLogin: string;
}

interface ClientTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface ClientPayment {
  id: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
}

interface ClientComplaint {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const ClientDetails = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [complaints, setComplaints] = useState<ClientComplaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
      fetchClientTickets();
      fetchClientPayments();
      fetchClientComplaints();
    }
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      const response = await axios.get(`/users/${clientId}`);
      const userData = response.data;
      setClient({
        id: userData.id,
        name: userData.name || userData.email.split('@')[0],
        email: userData.email,
        phone: userData.phone || 'Not provided',
        address: userData.address || 'Not provided',
        status: userData.status || 'active',
        registeredAt: userData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        lastLogin: userData.last_login?.split('T')[0] || 'Never'
      });
    } catch (error) {
      console.error('Error fetching client details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch client details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientTickets = async () => {
    try {
      const response = await axios.get(`/tickets?userId=${clientId}`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching client tickets:', error);
    }
  };

  const fetchClientPayments = async () => {
    try {
      const response = await axios.get(`/payments?userId=${clientId}`);
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching client payments:', error);
    }
  };

  const fetchClientComplaints = async () => {
    try {
      const response = await axios.get(`/complaints?userId=${clientId}`);
      setComplaints(response.data);
    } catch (error) {
      console.error('Error fetching client complaints:', error);
    }
  };

  const handleToggleStatus = async () => {
    if (!client) return;
    
    try {
      const newStatus = client.status === "active" ? "inactive" : "active";
      await axios.patch(`/users/${clientId}`, { status: newStatus });
      setClient({ ...client, status: newStatus });
      toast({
        title: "Success",
        description: "Client status updated successfully"
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      toast({
        title: "Error",
        description: "Failed to update client status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading client details...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Client not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Client Details</h2>
            <p className="text-gray-600">Manage client information and view activity</p>
          </div>
        </div>
        <Button 
          variant={client.status === "active" ? "destructive" : "default"}
          onClick={handleToggleStatus}
        >
          {client.status === "active" ? "Deactivate" : "Activate"} Client
        </Button>
      </div>

      {/* Client Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{client.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {client.phone}
                </span>
                <Badge variant={client.status === "active" ? "default" : "secondary"}>
                  {client.status}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Client ID</label>
              <p className="text-sm font-mono">{client.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Registered</label>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {client.registeredAt}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Login</label>
              <p className="text-sm">{client.lastLogin}</p>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-sm">{client.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()} Ar
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complaints.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Tabs */}
      <Tabs defaultValue="tickets" className="w-full">
        <TabsList>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="complaints">Complaints ({complaints.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>All support tickets created by this client</CardDescription>
            </CardHeader>
            <CardContent>
              {tickets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.created_at?.split('T')[0]}</TableCell>
                        <TableCell>{ticket.updated_at?.split('T')[0]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">No tickets found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments made by this client</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.description}</TableCell>
                        <TableCell>{payment.amount.toLocaleString()} Ar</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.created_at?.split('T')[0]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">No payments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Complaints</CardTitle>
              <CardDescription>All complaints submitted by this client</CardDescription>
            </CardHeader>
            <CardContent>
              {complaints.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="font-medium">{complaint.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{complaint.status}</Badge>
                        </TableCell>
                        <TableCell>{complaint.created_at?.split('T')[0]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">No complaints found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetails;