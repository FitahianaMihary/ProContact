import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDisplayId } from "@/utils/formatId";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  is_archived?: boolean;
}

export default function TicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(6);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/tickets", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("Tickets API response:", response.data);
        setTickets(response.data.filter((ticket: Ticket) => !ticket.is_archived));
      } catch (error) {
        console.error("Failed to fetch tickets", error);
      }

      try {
        const archivedResponse = await axios.get("http://localhost:5000/api/tickets/archived", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("Archived Tickets API response:", archivedResponse.data);
        setArchivedTickets(archivedResponse.data);
      } catch (error) {
        console.error("Failed to fetch archived tickets", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
  const matchesFilter =
    filter === "all" ||
    ticket.status === filter ||
    (filter === "closed" && ticket.status === "resolved"); // Ajout de resolved pour le filtre closed

  const matchesSearch = (
    ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.customer?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.customer?.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.customer?.address || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return matchesFilter && matchesSearch && !ticket.is_archived;
});


  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const archiveTicket = async (ticketId: string) => {
    try {
      await axios.post(
        `http://localhost:5000/api/tickets/archive/${ticketId}`,
        { is_archived: true },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setTickets(tickets.filter((ticket) => ticket.id !== ticketId));
      const archivedResponse = await axios.get("http://localhost:5000/api/tickets/archived", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setArchivedTickets(archivedResponse.data);
    } catch (error) {
      console.error("Failed to archive ticket", error);
    }
  };

  const unarchiveTicket = async (ticketId: string) => {
    try {
      await axios.post(
        `http://localhost:5000/api/tickets/unarchive/${ticketId}`,
        { is_archived: false },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const activeResponse = await axios.get("http://localhost:5000/api/tickets", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setTickets(activeResponse.data.filter((ticket: Ticket) => !ticket.is_archived));
      const archivedResponse = await axios.get("http://localhost:5000/api/tickets/archived", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setArchivedTickets(archivedResponse.data.filter((t: Ticket) => t.id !== ticketId));
    } catch (error) {
      console.error("Failed to unarchive ticket", error);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "resolved") return "Fermé";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) return <p className="p-4">Chargement des tickets...</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestion des Tickets</h1>

      <Input
        type="text"
        placeholder="Rechercher un ticket..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />

      <Tabs defaultValue="active-tickets" className="w-full mb-4">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="active-tickets">Tickets Actifs</TabsTrigger>
          <TabsTrigger value="archived-tickets">Tickets Archivés</TabsTrigger>
        </TabsList>

        <TabsContent value="active-tickets">
          <Tabs defaultValue="all" className="w-full mb-4" onValueChange={(val) => setFilter(val)}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="open">Ouvert</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="closed">Fermé</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTickets.map((ticket, index) => {
              let statusClass = "";
              let borderClass = "";
              switch (ticket.status.toLowerCase()) {
                case "open":
                  statusClass = "text-blue-600 bg-blue-100";
                  borderClass = "border-blue-500";
                  break;
                case "pending":
                  statusClass = "text-yellow-600 bg-yellow-100";
                  borderClass = "border-yellow-500";
                  break;
                case "closed":
                case "resolved":
                  statusClass = "text-green-600 bg-green-100";
                  borderClass = "border-green-500";
                  break;
                default:
                  statusClass = "text-gray-600 bg-gray-100";
                  borderClass = "border-gray-500";
              }

              return (
                <Card key={ticket.id} className={`border-2 ${borderClass}`}>
                  <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <span>{formatDisplayId(ticket.id, indexOfFirstTicket + index)}</span>
                    </CardTitle>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                    >
                      {getStatusLabel(ticket.status)}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2 text-sm">
                      <strong>Titre:</strong> {ticket.title}
                    </p>
                    <p className="mb-2 text-sm">
                      <strong>Description:</strong> {ticket.description}
                    </p>
                    <p className="mb-1 text-sm">
                      <strong>Client:</strong>{" "}
                      {ticket.customer?.name || "Client inconnu"}
                    </p>
                    <p className="mb-1 text-sm">
                      <strong>Email:</strong>{" "}
                      {ticket.customer?.email || "N/A"}
                    </p>
                    <p className="mb-1 text-sm">
                      <strong>Téléphone:</strong>{" "}
                      {ticket.customer?.phone || "N/A"}
                    </p>
                    <p className="mb-1 text-sm">
                      <strong>Adresse:</strong>{" "}
                      {ticket.customer?.address || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Créé le:</strong>{" "}
                      {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => archiveTicket(ticket.id)}
                    >
                      Archiver
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTickets.length === 0 && (
            <p className="text-center mt-8 text-muted-foreground">Aucun ticket trouvé.</p>
          )}

          <div className="flex justify-center mt-4">
            <Button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="mr-2"
            >
              Précédent
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <Button
                key={number}
                onClick={() => paginate(number)}
                variant={currentPage === number ? "default" : "outline"}
                className="mx-1"
              >
                {number}
              </Button>
            ))}
            <Button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-2"
            >
              Suivant
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="archived-tickets">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedTickets.map((ticket, index) => (
              <Card key={ticket.id} className="border-2 border-gray-500">
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <span>{formatDisplayId(ticket.id, index)}</span>
                  </CardTitle>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold text-gray-600 bg-gray-100`}
                  >
                    {getStatusLabel(ticket.status)}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm">
                    <strong>Titre:</strong> {ticket.title}
                  </p>
                  <p className="mb-2 text-sm">
                    <strong>Description:</strong> {ticket.description}
                  </p>
                  <p className="mb-1 text-sm">
                    <strong>Client:</strong>{" "}
                    {ticket.customer?.name || "Client inconnu"}
                  </p>
                  <p className="mb-1 text-sm">
                    <strong>Email:</strong>{" "}
                    {ticket.customer?.email || "N/A"}
                  </p>
                  <p className="mb-1 text-sm">
                    <strong>Téléphone:</strong>{" "}
                    {ticket.customer?.phone || "N/A"}
                  </p>
                  <p className="mb-1 text-sm">
                    <strong>Adresse:</strong>{" "}
                    {ticket.customer?.address || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Créé le:</strong>{" "}
                    {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => unarchiveTicket(ticket.id)}
                  >
                    Restaurer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {archivedTickets.length === 0 && (
            <p className="text-center mt-4 text-muted-foreground">Aucun ticket archivé.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}