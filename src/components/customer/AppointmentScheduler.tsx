import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePayment } from "@/contexts/PaymentContext";

const AppointmentScheduler = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const { isServiceUnlocked, consumeCredit, refreshData, user } = usePayment();

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00"
  ];

  const handleSchedule = async () => {
    // Vérifier les champs requis
    if (!selectedDate || !selectedTime || !serviceType) {
      toast({
        title: "Information manquante",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier l'authentification
    if (!user) {
      toast({
        title: "Authentification requise",
        description: "Veuillez vous connecter pour planifier un rendez-vous.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier l'accès au service
    const hasServiceAccess =
      isServiceUnlocked("home-service-monthly") ||
      isServiceUnlocked("home-service-per-use") ||
      isServiceUnlocked("premium-monitoring");

    if (!hasServiceAccess) {
      toast({
        title: "Abonnement requis",
        description: "Veuillez souscrire au service à domicile pour planifier un rendez-vous.",
        variant: "destructive",
      });
      return;
    }

    // Déterminer le service à envoyer en fonction de l'abonnement
    let service = "home-service-monthly";
    if (isServiceUnlocked("home-service-per-use") && !isServiceUnlocked("home-service-monthly") && !isServiceUnlocked("premium-monitoring")) {
      service = "home-service-per-use";
      const creditConsumed = await consumeCredit("home-service-per-use");
      if (!creditConsumed) {
        toast({
          title: "Aucun crédit restant",
          description: "Veuillez acheter plus de crédits pour le service à domicile.",
          variant: "destructive",
        });
        return;
      }
      await refreshData(); // Rafraîchir les données pour mettre à jour l'état des abonnements
    } else if (isServiceUnlocked("premium-monitoring")) {
      service = "premium-monitoring";
    }

    const scheduledDateTime = new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00Z`).toISOString();

    try {
      const token = localStorage.getItem("token");
      console.log("Token utilisé :", token);
      console.log("Envoi de la demande de service :", {
        service,
        service_type: serviceType,
        description: notes,
        scheduled_date: scheduledDateTime,
        scheduled_time: selectedTime,
      });
      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service,
          service_type: serviceType,
          description: notes,
          scheduled_date: scheduledDateTime,
          scheduled_time: selectedTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || "Échec de la planification du rendez-vous";
        if (response.status === 401) {
          errorMessage = "Session expirée. Veuillez vous reconnecter.";
        } else if (response.status === 403) {
          errorMessage = "Abonnement invalide ou crédits épuisés.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast({
        title: "Rendez-vous planifié",
        description: `Votre rendez-vous pour ${serviceType} a été planifié pour le ${format(selectedDate, "PPP")} à ${selectedTime}`,
      });
      setSelectedDate(undefined);
      setSelectedTime("");
      setServiceType("");
      setNotes("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la planification du rendez-vous",
        variant: "destructive",
      });
      console.error("Erreur lors de la création du rendez-vous :", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planifier un service à domicile</CardTitle>
        <CardDescription>Réservez un rendez-vous pour un support technique à domicile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type de service</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type de service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="installation">Installation d'équipement</SelectItem>
              <SelectItem value="repair">Réparation technique</SelectItem>
              <SelectItem value="maintenance">Vérification de maintenance</SelectItem>
              <SelectItem value="upgrade">Mise à niveau de service</SelectItem>
              <SelectItem value="troubleshooting">Dépannage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Heure</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une heure" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      {time}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes supplémentaires</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Exigences spécifiques ou problèmes à résoudre..."
            rows={3}
          />
        </div>

        <Button onClick={handleSchedule} className="w-full">
          Planifier le rendez-vous
        </Button>
      </CardContent>
    </Card>
  );
};

export default AppointmentScheduler;