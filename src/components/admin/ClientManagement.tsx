import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, UserX, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayment } from "@/contexts/PaymentContext";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

axios.defaults.baseURL = API_BASE_URL;

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  registeredAt: string;
  totalTickets: number;
}

interface ClientDetails {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  age?: string;
  gender?: string;
  profile_picture?: string;
  created_at?: string;
}

const ClientManagement = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const { toast } = useToast();
  const { user } = usePayment();

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      const response = await axios.get("/users/clients", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setClients(
        response.data.map((user: any) => ({
          id: user.id,
          firstName: user.name?.split(" ")[0] || user.email.split("@")[0],
          lastName: user.name?.split(" ")[1] || "",
          email: user.email,
          phone: user.phone || "+1234567890",
          status: user.status || "active",
          registeredAt: user.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          totalTickets: user.total_tickets || 0,
        }))
      );
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erreur",
        description: "Échec de la récupération des clients.",
        variant: "destructive",
      });
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (clientId: string) => {
    try {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return;

      const newStatus = client.status === "active" ? "inactive" : "active";
      await axios.patch(
        `/users/${clientId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      setClients(
        clients.map((client) =>
          client.id === clientId ? { ...client, status: newStatus } : client
        )
      );

      toast({
        title: "Succès",
        description: "Statut du client mis à jour avec succès.",
      });
    } catch (error) {
      console.error("Error updating client status:", error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du statut du client.",
        variant: "destructive",
      });
    }
  };

  const handleViewClient = async (client: Client) => {
    try {
      const response = await axios.get(`/users/${client.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSelectedClient(response.data);
    } catch (error) {
      console.error("Error fetching client details:", error);
      toast({
        title: "Erreur",
        description: "Échec de la récupération des détails du client.",
        variant: "destructive",
      });
    }
  };

  const closeModal = () => {
    setSelectedClient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Gestion des clients</h3>
          <p className="text-gray-600">Voir et gérer les comptes des clients</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher des clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total des clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {clients.filter((c) => c.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clients inactifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {clients.filter((c) => c.status === "inactive").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total des tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, client) => sum + client.totalTickets, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
          <CardDescription>
            Affichage de {filteredClients.length} sur {clients.length} clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {client.firstName[0]}
                        {client.lastName[0] || client.firstName[1] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{client.firstName} {client.lastName}</div>
                      <div className="text-sm text-gray-500">ID: {client.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.email}</div>
                      <div className="text-sm text-gray-500">{client.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.status === "active" ? "default" : "secondary"}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.registeredAt}</TableCell>
                  <TableCell>{client.totalTickets}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewClient(client)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(client.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedClient} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du client - {selectedClient?.name}</DialogTitle>
            <DialogDescription>Voir toutes les informations du client</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={selectedClient.profile_picture ? `${API_BASE_URL}/api/uploads/${selectedClient.profile_picture}` : undefined}
                    alt={`${selectedClient.name}'s profile`}
                    onError={(e) => {
                      console.error("Image failed to load:", selectedClient.profile_picture);
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <AvatarFallback>
                    {selectedClient.name.split(" ")[0][0]}
                    {selectedClient.name.split(" ")[1]?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedClient.name}</h3>
                  <p className="text-gray-500">ID: {selectedClient.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    <strong>Email:</strong> {selectedClient.email}
                  </p>
                  <p>
                    <strong>Téléphone:</strong> {selectedClient.phone || "N/A"}
                  </p>
                  <p>
                    <strong>Adresse:</strong> {selectedClient.address || "N/A"}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Âge:</strong> {selectedClient.age || "N/A"}
                  </p>
                  <p>
                    <strong>Genre:</strong> {selectedClient.gender || "N/A"}
                  </p>
                  <p>
                    <strong>Inscrit le:</strong>{" "}
                    {new Date(selectedClient.created_at || "").toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;