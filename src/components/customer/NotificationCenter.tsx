import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle, Trash2, Filter, Search, MessageSquare, Calendar, UserPlus, FileText, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  user_id?: string;
}

interface NotificationCenterProps {
  role: "admin" | "employee";
  onUnreadCountChange?: (count: number) => void; // Rendu optionnel
}

const NotificationCenter = ({ role, onUnreadCountChange }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get("/notifications", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des notifications:", error);
        toast({
          title: "Erreur",
          description: "Échec de la récupération des notifications.",
          variant: "destructive",
        });
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("Aucun token d'authentification trouvé dans localStorage.");
          toast({
            title: "Erreur",
            description: "Veuillez vous reconnecter pour voir les notifications.",
            variant: "destructive",
          });
          return;
        }
        const response = await axios.get("/notifications/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const newUnreadCount = response.data.count;
        setUnreadCount(newUnreadCount);
        if (onUnreadCountChange) {
          onUnreadCountChange(newUnreadCount); // Vérification avant appel
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du nombre de notifications non lues:", error);
        toast({
          title: "Erreur",
          description: "Échec de la récupération du nombre de notifications non lues.",
          variant: "destructive",
        });
      }
    };

    fetchNotifications();
    fetchUnreadCount();
  }, [toast, onUnreadCountChange]);

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => prev - 1);
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadCount - 1); // Vérification avant appel
      }
      toast({
        title: "Notification marquée comme lue",
        description: "La notification a été marquée comme lue avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors du marquage de la notification comme lue:", error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour de la notification.",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put("/notifications/read-all", {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      if (onUnreadCountChange) {
        onUnreadCountChange(0); // Vérification avant appel
      }
      toast({
        title: "Notifications marquées comme lues",
        description: "Toutes les notifications ont été marquées comme lues.",
      });
    } catch (error) {
      console.error("Erreur lors du marquage de toutes les notifications comme lues:", error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour des notifications.",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await axios.delete(`/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression de la notification.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.related_id) {
      switch (notification.type) {
        case "registration":
          navigate(`/admin/clients/${notification.related_id}`);
          break;
        case "ticket":
          break;
        case "service":
          break;
        case "complaint":
          break;
        default:
          break;
      }
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesRole = role === "admin" || ["ticket", "service"].includes(notification.type);
    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !notification.is_read) ||
      (filter === "read" && notification.is_read) ||
      notification.type === filter;
    const matchesSearch =
      searchTerm === "" ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesFilter && matchesSearch;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "subscription":
      case "payment":
        return <span className="text-green-500">💳</span>;
      case "ticket":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "service":
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case "registration":
        return <UserPlus className="h-5 w-5 text-teal-500" />;
      case "report":
        return <FileText className="h-5 w-5 text-orange-500" />;
      case "complaint":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "rating":
        return <span className="text-yellow-500">⭐</span>;
      case "system":
        return <Bell className="h-5 w-5 text-gray-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "subscription":
      case "payment":
        return "bg-green-100 text-green-800";
      case "ticket":
        return "bg-blue-100 text-blue-800";
      case "service":
        return "bg-purple-100 text-purple-800";
      case "registration":
        return "bg-teal-100 text-teal-800";
      case "report":
        return "bg-orange-100 text-orange-800";
      case "complaint":
        return "bg-red-100 text-red-800";
      case "rating":
        return "bg-yellow-100 text-yellow-800";
      case "system":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 relative">
            <Bell className="h-6 w-6" />
            Centre de Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-medium text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher les notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les notifications</SelectItem>
              <SelectItem value="unread">Non lues</SelectItem>
              <SelectItem value="read">Lues</SelectItem>
              {role === "admin" && (
                <>
                  <SelectItem value="subscription">Abonnements</SelectItem>
                  <SelectItem value="payment">Paiements</SelectItem>
                  <SelectItem value="registration">Inscriptions</SelectItem>
                  <SelectItem value="report">Rapports</SelectItem>
                  <SelectItem value="complaint">Plaintes</SelectItem>
                  <SelectItem value="rating">Évaluations</SelectItem>
                </>
              )}
              <SelectItem value="ticket">Tickets</SelectItem>
              <SelectItem value="service">Services</SelectItem>
              <SelectItem value="system">Système</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification trouvée</h3>
            <p className="text-gray-500">
              {filter === "all"
                ? "Vous n'avez aucune notification pour le moment."
                : `Aucune notification de type ${filter} trouvée.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg flex items-start gap-4 ${
                  notification.is_read ? "bg-gray-50" : "bg-blue-50"
                } ${notification.related_id ? "cursor-pointer" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div>{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <Badge className={getNotificationColor(notification.type)}>
                        {notification.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          aria-label="Marquer comme lu"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        aria-label="Supprimer la notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(notification.created_at), "PPp", { locale: fr })}
                  </p>
                  {notification.related_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      ID associé : {notification.related_id}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;