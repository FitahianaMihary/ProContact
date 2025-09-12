import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { API_BASE_URL } from "../config";

axios.defaults.baseURL = API_BASE_URL;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

interface User {
  id: string;
  email: string;
  role: "admin" | "employee" | "customer";
  name?: string;
  phone?: string;
  address?: string;
  age?: string;
  gender?: string;
  profile_picture?: string;
}

interface Customer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  age?: string;
  gender?: string;
  profile_picture?: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "open" | "assigned" | "in-progress" | "resolved" | "closed" | "transferred" | "pending";
  customer_id: string;
  customer: Customer;
  created_at: string;
  messages?: Array<{
    id: string;
    sender_id: string;
    sender_name: string;
    message: string;
    created_at: string;
    sender_type: string;
  }>;
}

interface ServiceRequest {
  id: string;
  service: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: "pending" | "scheduled" | "in-progress" | "completed" | "cancelled";
  customer_id: string;
  customer: Customer;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  service_id: string;
  subscription_type: "monthly" | "per-use";
  amount: number;
  remaining_credits?: number;
  expires_at?: string;
  is_active?: boolean;
  created_at: string;
}

interface Payment {
  id: string;
  user_id: string;
  service_id: string;
  subscription_type: "monthly" | "per-use";
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "payment" | "ticket" | "service" | "system";
  is_read: boolean;
  created_at: string;
}

interface Complaint {
  id: string;
  customer_id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

export interface ServiceSubscription {
  id: string;
  serviceId: string;
  subscriptionType: "monthly" | "per-use";
  amount: number;
  remainingCredits?: number;
  expiresAt?: Date;
  isActive: boolean;
}

interface PaymentContextType {
  user: User | null;
  tickets: Ticket[];
  serviceRequests: ServiceRequest[];
  subscribedServices: Subscription[];
  payments: Payment[];
  notifications: Notification[];
  complaints: Complaint[];
  isServiceUnlocked: (serviceId: string) => boolean;
  getServiceSubscription: (serviceId: string) => ServiceSubscription | null;
  subscribeToService: (
    serviceId: string,
    type: "monthly" | "per-use",
    credits?: number
  ) => Promise<void>;
  consumeCredit: (serviceId: string) => Promise<boolean>;
  createTicket: (ticket: {
    title: string;
    category: string;
    priority: string;
    description: string;
  }) => Promise<void>;
  createServiceRequest: (request: {
    service: string;
    description?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  }) => Promise<void>;
  createComplaint: (complaint: {
    subject: string;
    description: string;
  }) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
    role: "admin" | "employee" | "customer"
  ) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    phone?: string,
    address?: string,
    age?: string,
    gender?: string,
    profilePicture?: File
  ) => Promise<{ error?: string }>;
  fetchTicketById: (ticketId: string) => Promise<Ticket>;
  replyToTicket: (ticketId: string, message: string) => Promise<Ticket>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [subscribedServices, setSubscribedServices] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const { toast } = useToast();

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("currentUser");
    if (!token || !storedUser) {
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      delete axios.defaults.headers.common["Authorization"];
      return false;
    }
    try {
      // Remplacer /auth/verify par /auth/me ou un autre endpoint existant
      const response = await axios.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data.user;
      setUser(userData);
      localStorage.setItem("currentUser", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      await refreshData();
      return true;
    } catch (error: any) {
      console.error("Error verifying auth:", error.response?.data || error.message);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      delete axios.defaults.headers.common["Authorization"];
      if (error.response?.status === 404) {
        console.warn("Endpoint /auth/me not found. Please implement an authentication verification endpoint in the backend.");
        toast({
          title: "Erreur de configuration",
          description: "L'endpoint de vérification d'authentification n'est pas disponible. Contactez l'administrateur.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Session invalide",
          description: "Veuillez vous reconnecter.",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${localStorage.getItem("token")}`;
      refreshData().catch((error) => {
        console.error("Error in initial refreshData:", error);
        if (error.response?.status === 404) {
          toast({
            title: "Erreur",
            description: "Certains endpoints ne sont pas disponibles. Vérifiez votre configuration backend.",
            variant: "destructive",
          });
        } else if (error.response?.status === 500) {
          toast({
            title: "Erreur",
            description: "Erreur interne du serveur. Vérifiez les logs backend.",
            variant: "destructive",
          });
        }
      });
    } else {
      delete axios.defaults.headers.common["Authorization"];
      setTickets([]);
      setServiceRequests([]);
      setSubscribedServices([]);
      setPayments([]);
      setNotifications([]);
      setComplaints([]);
    }
  }, [user]);

  const refreshData = async (retryCount = 3, delay = 1000) => {
    if (!user) return;
    try {
      const [
        ticketsRes,
        serviceRequestsRes,
        subscriptionsRes,
        paymentsRes,
        notificationsRes,
        complaintsRes,
      ] = await Promise.all([
        axios.get("/tickets"),
        axios.get("/services"),
        axios.get("/subscriptions"),
        axios.get("/payments"),
        axios.get("/notifications"),
        axios.get("/complaints"),
      ]);

      console.log("Subscriptions fetched:", subscriptionsRes.data.length);

      setTickets(ticketsRes.data);
      setServiceRequests(serviceRequestsRes.data);
      setSubscribedServices(subscriptionsRes.data);
      setPayments(paymentsRes.data);
      setNotifications(notificationsRes.data);
      setComplaints(complaintsRes.data);
    } catch (error: any) {
      console.error("Error refreshing data:", error.response?.data || error.message);
      if (error.response?.status === 429 && retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return refreshData(retryCount - 1, delay * 2);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        delete axios.defaults.headers.common["Authorization"];
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter.",
          variant: "destructive",
        });
      } else if (error.response?.status === 404) {
        toast({
          title: "Erreur",
          description: "Certains endpoints (ex. /subscriptions, /payments) ne sont pas trouvés. Vérifiez votre backend.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Échec du rafraîchissement des données.",
          variant: "destructive",
        });
      }
    }
  };

  const isServiceUnlocked = (serviceId: string): boolean => {
    const premiumSubscription = subscribedServices.find((sub) =>
      (sub.service_id === "premium" || sub.service_id === "premium-monitoring") && sub.is_active
    );
    if (premiumSubscription) return true;

    const subscription = subscribedServices.find((sub) =>
      sub.service_id === serviceId || sub.service_id.startsWith(serviceId + "-")
    );
    if (!subscription) return false;

    if (subscription.subscription_type === "monthly") {
      return subscription.expires_at
        ? new Date(subscription.expires_at) > new Date()
        : false;
    }
    if (subscription.subscription_type === "per-use") {
      return (subscription.remaining_credits || 0) > 0;
    }
    return false;
  };

  const getServiceSubscription = (serviceId: string): ServiceSubscription | null => {
    const subscription = subscribedServices.find((sub) => sub.service_id === serviceId);
    if (!subscription) return null;

    const isActive =
      subscription.is_active &&
      ((subscription.subscription_type === "monthly" && subscription.expires_at
        ? new Date(subscription.expires_at) > new Date()
        : false) ||
        (subscription.subscription_type === "per-use" && (subscription.remaining_credits || 0) > 0));

    return {
      id: subscription.id,
      serviceId: subscription.service_id,
      subscriptionType: subscription.subscription_type,
      amount: subscription.amount,
      remainingCredits: subscription.remaining_credits || 0,
      expiresAt: subscription.expires_at ? new Date(subscription.expires_at) : undefined,
      isActive,
    };
  };

  const consumeCredit = async (serviceId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await refreshData();
      const subscription = subscribedServices.find((sub) => sub.service_id === serviceId);
      if (!subscription) return false;

      const creditsRemaining = subscription.remaining_credits || 0;
      if (creditsRemaining <= 0) {
        toast({
          title: "Crédits épuisés",
          description: "Aucun crédit restant pour ce service. Veuillez réabonner.",
          variant: "destructive",
        });
        return false;
      }

      setSubscribedServices((prev) =>
        prev.map((sub) =>
          sub.service_id === serviceId
            ? { ...sub, remaining_credits: creditsRemaining - 1 }
            : sub
        )
      );

      return true;
    } catch (error: any) {
      console.error("Error checking credit:", error.response?.data || error.message);
      await refreshData();
      toast({
        title: "Erreur",
        description: "Échec de la vérification des crédits.",
        variant: "destructive",
      });
      return false;
    }
  };

  const subscribeToService = async (
    serviceId: string,
    type: "monthly" | "per-use",
    credits?: number
  ) => {
    if (!user) return;
    try {
      const response = await axios.post("/subscriptions", {
        service_id: serviceId,
        subscription_type: type,
        amount: type === "monthly" ? 150000 : 25000,
        remaining_credits: credits || (type === "per-use" ? 1 : 0),
      });
      const newSubscription = response.data;
      if (newSubscription && newSubscription.is_active) {
        setSubscribedServices((prev) => {
          const updated = prev.map((sub) =>
            sub.service_id === serviceId ? newSubscription : sub
          );
          if (!updated.find((sub) => sub.service_id === serviceId)) {
            updated.push(newSubscription);
          }
          return updated;
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));
        await refreshData();
        toast({
          title: "Succès",
          description: `Abonnement réussi au service ${serviceId} !`,
        });
      } else {
        throw new Error("L'abonnement n'a pas été activé correctement.");
      }
    } catch (error: any) {
      console.error("Error subscribing to service:", error.response?.data || error.message);
      toast({
        title: "Erreur",
        description: "Échec de l'abonnement. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const createTicket = async (ticketData: {
    title: string;
    category: string;
    priority: string;
    description: string;
  }, retryCount = 3, delay = 1000) => {
    if (!user) return;
    try {
      const { title, category, priority, description } = ticketData;
      const response = await axios.post("/tickets", {
        title,
        category,
        priority,
        description,
      });
      if (response.data && response.data.ticket) {
        await refreshData();
        toast({
          title: "Succès",
          description: "Ticket créé avec succès !",
        });
      }
    } catch (error: any) {
      console.error("Error creating ticket:", error.response?.data || error.message);
      if (error.response?.status === 429 && retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return createTicket(ticketData, retryCount - 1, delay * 2);
      }
      toast({
        title: "Erreur",
        description: "Échec de la création du ticket. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const fetchTicketById = async (ticketId: string): Promise<Ticket> => {
    try {
      const response = await axios.get(`/tickets/${ticketId}`);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching ticket by ID:", error.response?.data || error.message);
      throw error;
    }
  };

  const sendTicketReply = async (ticketId: string, message: string): Promise<void> => {
    try {
      await axios.post(`/tickets/${ticketId}/messages`, { message });
    } catch (error: any) {
      console.error("Error sending ticket reply:", error.response?.data || error.message);
      throw error;
    }
  };

  const replyToTicket = async (ticketId: string, message: string): Promise<Ticket> => {
    if (!user) throw new Error("Utilisateur non authentifié");
    try {
      await sendTicketReply(ticketId, message);
      const updatedTicket = await fetchTicketById(ticketId);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));
      toast({
        title: "Réponse envoyée",
        description: "Votre message a été envoyé avec succès.",
      });
      return updatedTicket;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse. Veuillez réessayer.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createServiceRequest = async (requestData: {
    service: string;
    description?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  }, retryCount = 3, delay = 1000) => {
    if (!user) return;
    try {
      const { service, description, scheduledDate, scheduledTime } = requestData;
      await axios.post("/services", {
        service,
        description,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        customer_id: user.id,
      });
      await refreshData();
      toast({
        title: "Succès",
        description: "Demande de service créée avec succès !",
      });
    } catch (error: any) {
      console.error("Error creating service request:", error.response?.data || error.message);
      if (error.response?.status === 429 && retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return createServiceRequest(requestData, retryCount - 1, delay * 2);
      }
      toast({
        title: "Erreur",
        description: "Échec de la demande de service. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const createComplaint = async (complaintData: {
    subject: string;
    description: string;
  }, retryCount = 3, delay = 1000) => {
    if (!user) return;
    try {
      await axios.post("/complaints", complaintData);
      await refreshData();
      toast({
        title: "Succès",
        description: "Réclamation envoyée avec succès !",
      });
    } catch (error: any) {
      console.error("Error creating complaint:", error.response?.data || error.message);
      if (error.response?.status === 429 && retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return createComplaint(complaintData, retryCount - 1, delay * 2);
      }
      toast({
        title: "Erreur",
        description: "Échec de l'envoi de la réclamation. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const markNotificationAsRead = async (id: string, retryCount = 3, delay = 1000) => {
    if (!user) return;
    try {
      await axios.patch(`/notifications/${id}`, { is_read: true });
      await refreshData();
    } catch (error: any) {
      console.error("Error marking notification as read:", error.response?.data || error.message);
      if (error.response?.status === 429 && retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return markNotificationAsRead(id, retryCount - 1, delay * 2);
      }
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour de la notification.",
        variant: "destructive",
      });
    }
  };

  const signIn = async (
    email: string,
    password: string,
    role: "admin" | "employee" | "customer"
  ): Promise<{ error?: string }> => {
    try {
      const response = await axios.post("/auth/login", { email, password, role });
      const { token, user: userData } = response.data;

      setUser(userData);
      localStorage.setItem("token", token);
      localStorage.setItem("currentUser", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      toast({
        title: "Bienvenue !",
        description: `Connexion réussie en tant que ${role}.`,
      });

      return {};
    } catch (error: any) {
      console.error("Sign in error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Email, mot de passe ou rôle invalide";
      toast({
        title: "Échec de la connexion",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone?: string,
    address?: string,
    age?: string,
    gender?: string,
    profilePicture?: File
  ): Promise<{ error?: string }> => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("name", name);
      if (phone) formData.append("phone", phone);
      if (address) formData.append("address", address);
      if (age) formData.append("age", age);
      if (gender) formData.append("gender", gender);
      if (profilePicture) formData.append("profile_picture", profilePicture);
      formData.append("role", "customer");

      const response = await axios.post("/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { token, user: userData } = response.data;

      setUser(userData);
      localStorage.setItem("token", token);
      localStorage.setItem("currentUser", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      toast({
        title: "Compte créé !",
        description: "Votre compte a été créé avec succès.",
      });

      return {};
    } catch (error: any) {
      console.error("Sign up error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message || "Un compte avec cet email existe déjà";
      toast({
        title: "Échec de l'inscription",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const signOut = async () => {
  try {
    // Pas besoin d'appeler le backend
    setUser(null);
    setTickets([]);
    setServiceRequests([]);
    setSubscribedServices([]);
    setPayments([]);
    setNotifications([]);
    setComplaints([]);

    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    delete axios.defaults.headers.common["Authorization"];

    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès.",
    });
  } catch (error: any) {
    console.error("Sign out error:", error.message);
    toast({
      title: "Erreur lors de la déconnexion",
      description: "Une erreur inattendue est survenue.",
      variant: "destructive",
    });
  }
};


  return (
    <PaymentContext.Provider
      value={{
        user,
        tickets,
        serviceRequests,
        setTickets,
        subscribedServices,
        payments,
        notifications,
        complaints,
        isServiceUnlocked,
        getServiceSubscription,
        subscribeToService,
        consumeCredit,
        createTicket,
        createServiceRequest,
        createComplaint,
        markNotificationAsRead,
        refreshData,
        signIn,
        signUp,
        signOut,
        fetchTicketById,
        replyToTicket,
        checkAuth,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error("usePayment doit être utilisé dans un PaymentProvider");
  }
  return context;
};

export default PaymentContext;