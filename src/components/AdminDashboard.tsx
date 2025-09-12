import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Shield, LogOut, BarChart3, MessageSquare, Calendar, AlertTriangle, Bell } from "lucide-react";
import EmployeeManagement from "./admin/EmployeeManagement";
import ClientManagement from "./admin/ClientManagement";
import TicketManagement from "./admin/TicketManagement";
import ServiceAppointments from "./admin/ServiceAppointments";
import AdminStats from "./admin/AdminStats";
import ComplaintManagement from "./admin/ComplaintManagement";
import NotificationCenter from "./customer/NotificationCenter";
import { usePayment } from "@/contexts/PaymentContext";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

interface Report {
  id: number;
  employee_id: string;
  report_type: string;
  priority: string;
  related_id: string | null;
  subject: string;
  description: string;
  suggested_action: string | null;
  created_at: string;
  employee_name: string;
  employee_email: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { tickets, serviceRequests, subscribedServices, payments, refreshData } = usePayment();
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Calcul du revenu basé sur les paiements effectués
  const revenue = payments && Array.isArray(payments) && payments.length > 0
    ? `${payments
        .filter(p => p.status === "completed")
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
        .toLocaleString()} Ar`
    : "0Ar";

  // Calcul des abonnements actifs
  const activeSubscriptions = subscribedServices && Array.isArray(subscribedServices) && subscribedServices.length > 0
    ? subscribedServices.filter(sub => 
        sub.is_active && 
        (sub.subscription_type === "monthly" 
          ? new Date(sub.expires_at) > new Date() 
          : (sub.remaining_credits || 0) > 0)
      ).length
    : 0;

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get("/reports", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setReports(response.data);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: "Erreur",
          description: "Échec de la récupération des rapports.",
          variant: "destructive",
        });
      }
    };
    if (activeTab === "roles") fetchReports();
  }, [activeTab, toast]);

  const filteredReports = reports.filter(report =>
    (report.related_id?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (report.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (new Date(report.created_at).toLocaleDateString('fr-FR').includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue, Administrateur</h2>
          <p className="text-lg text-gray-600">Gérez les opérations de votre centre d'appels ici</p>
         
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
            <TabsTrigger value="complaints" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Plaintes</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Employés</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Rapports</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <AdminStats />
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            <TicketManagement />
          </TabsContent>

          <TabsContent value="appointments" className="mt-6">
            <ServiceAppointments />
          </TabsContent>

          <TabsContent value="complaints" className="mt-6">
            <ComplaintManagement />
          </TabsContent>

          <TabsContent value="employees" className="mt-6">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <ClientManagement />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rapports des Employés</CardTitle>
                <CardDescription>Aperçu de tous les rapports soumis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Rechercher par ID associé, sujet ou date..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-full md:w-96"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  {filteredReports.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">Aucun rapport disponible.</p>
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
                            <p><strong>Type:</strong> {report.report_type}</p>
                            <p><strong>ID associé:</strong> {report.related_id || 'N/A'}</p>
                            <p><strong>Date:</strong> {new Date(report.created_at).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Employé:</strong> {report.employee_name}</p>
                          </div>
                          <div>
                            <p><strong>Sujet:</strong> {report.subject}</p>
                            <p><strong>Description:</strong> {report.description.substring(0, 100) + (report.description.length > 100 ? '...' : '')}</p>
                            <p><strong>Action suggérée:</strong> {report.suggested_action || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationCenter role="admin" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;