import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Phone, Mail, Calendar, MessageSquare } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { debounce } from 'lodash'; // Importez lodash pour debounce

const CustomerHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetailsCache, setCustomerDetailsCache] = useState<Record<string, any>>({}); // Cache pour stocker les détails par ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/users/clients`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        const data = response.data.map((user: any) => ({
          id: user.id,
          name: user.name || `${user.email.split("@")[0]}`,
          email: user.email,
          phone: user.phone || "+1234567890",
          address: user.address || "N/A",
          created_at: user.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          lastContact: user.updated_at?.split("T")[0] || "N/A",
          tickets: [],
          services: [],
        }));
        setCustomers(data);
      } catch (error: any) {
        console.error("Error fetching customers:", error);
        if (error.response && error.response.status === 403) {
          setError("Insufficient permissions to view customers. Please contact an administrator.");
        } else if (error.response?.status === 429) {
          setError("Trop de requêtes. Veuillez réessayer plus tard.");
        } else {
          setError("Failed to fetch customers. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Débouncer pour fetchCustomerDetails (500ms pour éviter appels rapides)
  const debouncedFetchCustomerDetails = debounce(async (customerId: string, retryCount = 3, delay = 1000) => {
    if (customerDetailsCache[customerId]) {
      // Utiliser le cache si disponible
      setSelectedCustomer((prev: any) => ({
        ...prev,
        ...customerDetailsCache[customerId],
      }));
      return;
    }

    try {
      // Séquentialiser les requêtes pour réduire la charge
      const userResponse = await axios.get(`${API_BASE_URL}/users/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      const ticketsResponse = await axios.get(`${API_BASE_URL}/users/${customerId}/tickets`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });

      const userDetails = userResponse.data;
      const tickets = ticketsResponse.data || [];

      const details = {
        address: userDetails.address || selectedCustomer.address,
        created_at: userDetails.created_at?.split("T")[0] || selectedCustomer.created_at,
        tickets: tickets,
        services: [], // À remplir si endpoint pour services existe
      };

      // Mettre à jour le cache
      setCustomerDetailsCache((prev) => ({ ...prev, [customerId]: details }));

      // Mettre à jour selectedCustomer
      setSelectedCustomer((prev: any) => ({
        ...prev,
        ...details,
      }));
    } catch (error: any) {
      console.error("Error fetching customer details:", error);
      if (error.response?.status === 429 && retryCount > 0) {
        const retryAfter = error.response.headers['retry-after'] ? parseInt(error.response.headers['retry-after']) * 1000 : delay;
        console.warn(`Limite de taux dépassée, réessai après ${retryAfter}ms`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        debouncedFetchCustomerDetails(customerId, retryCount - 1, delay * 2);
      } else {
        setError("Échec du chargement des détails du client. Veuillez réessayer.");
      }
    }
  }, 500);

  useEffect(() => {
    if (selectedCustomer) {
      debouncedFetchCustomerDetails(selectedCustomer.id);
    }
    return () => debouncedFetchCustomerDetails.cancel(); // Nettoyer le debounce
  }, [selectedCustomer]);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "in-progress": return "bg-yellow-100 text-yellow-800";
      case "resolved":
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Liste des clients */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Customer Search
          </CardTitle>
          <CardDescription>Search and view customer history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="pl-10"
              />
            </div>

            <div className="space-y-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? "bg-green-50 border-green-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-sm text-gray-500">({customer.id})</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Last contact: {customer.lastContact}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No customers found.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détails du client */}
      {selectedCustomer ? (
        <Card className="border-green-200 h-fit">
          <CardHeader>
            <CardTitle>Customer Details: {selectedCustomer.name}</CardTitle>
            <CardDescription>Complete customer history and information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Infos principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">Contact Information</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Email:</strong> {selectedCustomer.email}</p>
                  <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                  <p><strong>Address:</strong> {selectedCustomer.address}</p>
                  <p><strong>Join Date:</strong> {selectedCustomer.created_at}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Account Summary</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Total Tickets:</strong> {selectedCustomer.tickets.length}</p>
                  <p><strong>Total Services:</strong> {selectedCustomer.services.length}</p>
                  <p><strong>Last Contact:</strong> {selectedCustomer.lastContact}</p>
                </div>
              </div>
            </div>

            {/* Tickets */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Support Tickets
              </h4>
              <div className="space-y-2">
                {selectedCustomer.tickets.length > 0 ? (
                  selectedCustomer.tickets.map((ticket) => (
                    <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{ticket.id}</span>
                          <span className="ml-2">{ticket.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <span className="text-sm text-gray-500">{ticket.date || ticket.created_at?.split("T")[0]}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No tickets available</p>
                )}
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Service History
              </h4>
              <div className="space-y-2">
                {selectedCustomer.services.length > 0 ? (
                  selectedCustomer.services.map((service) => (
                    <div key={service.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{service.id}</span>
                          <span className="ml-2">{service.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(service.status)}>
                            {service.status}
                          </Badge>
                          <span className="text-sm text-gray-500">{service.date}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No services available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="hidden md:flex items-center justify-center text-gray-400 border rounded-lg p-6">
          Select a customer to view details
        </div>
      )}
    </div>
  );
};

export default CustomerHistory;