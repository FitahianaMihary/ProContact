import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { usePayment } from "@/contexts/PaymentContext";

// Type pour les données du formulaire, sans modifier l'interface existante
interface FormData {
  title: string;
  category: string;
  priority: string;
  description: string;
}

interface CreateTicketFormProps {
  isPriority?: boolean;
  onTicketCreated?: () => void;
}

const CreateTicketForm = ({ isPriority = false, onTicketCreated }: CreateTicketFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    category: "",
    priority: isPriority ? "high" : "medium",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { createTicket, user, isServiceUnlocked, consumeCredit, refreshData } = usePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier les champs requis
    if (!formData.title || !formData.category || !formData.description) {
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
        description: "Veuillez vous connecter pour créer un ticket.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier l'accès au service
    const hasTicketingAccess =
      isServiceUnlocked("ticketing-monthly") ||
      isServiceUnlocked("ticketing-per-use") ||
      isServiceUnlocked("premium-monitoring");

    if (!hasTicketingAccess) {
      toast({
        title: "Abonnement requis",
        description: "Veuillez souscrire à un service de ticketing pour créer des tickets.",
        variant: "destructive",
      });
      return;
    }

    // Consommer un crédit si abonnement per-use (et non premium)
    if (
      isServiceUnlocked("ticketing-per-use") &&
      !isServiceUnlocked("ticketing-monthly") &&
      !isServiceUnlocked("premium-monitoring")
    ) {
      const creditConsumed = await consumeCredit("ticketing-per-use");
      if (!creditConsumed) {
        toast({
          title: "Aucun crédit restant",
          description: "Veuillez acheter plus de crédits de ticketing.",
          variant: "destructive",
        });
        return;
      }
      await refreshData(); // Rafraîchir les données pour mettre à jour l'état des abonnements
    }

    setIsSubmitting(true);
    try {
      // Passer les propriétés avec status: "pending"
      await createTicket({
        title: formData.title,
        category: formData.category,
        priority: formData.priority,
        description: formData.description,
        status: "pending", // Ajout du statut par défaut
      });

      toast({
        title: "Ticket créé",
        description: "Votre ticket a été créé avec succès.",
      });

      // Réinitialiser le formulaire
      setFormData({
        title: "",
        category: "",
        priority: isPriority ? "high" : "medium",
        description: "",
      });

      onTicketCreated?.();
    } catch (error: any) {
      console.error("Erreur lors de la création du ticket :", error);
      let errorMessage = "Échec de la création du ticket.";
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Session expirée. Veuillez vous reconnecter.";
        } else if (error.response.status === 403) {
          errorMessage = "Abonnement invalide ou crédits épuisés.";
        } else {
          errorMessage = error.response.data?.error || error.message;
        }
      }
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Créer un nouveau ticket
            </CardTitle>
            <CardDescription>
              Soumettez une nouvelle demande de support ou un problème technique
            </CardDescription>
          </div>
          {isPriority && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <Star className="h-3 w-3 mr-1" />
              Support prioritaire
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre du ticket *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Brève description de votre problème"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Problème technique</SelectItem>
                  <SelectItem value="billing">Facturation et compte</SelectItem>
                  <SelectItem value="service">Demande de service</SelectItem>
                  <SelectItem value="complaint">Réclamation</SelectItem>
                  <SelectItem value="general">Demande générale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
                disabled={isPriority}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isPriority && <SelectItem value="high">Élevée (Premium)</SelectItem>}
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Fournissez des informations détaillées sur votre problème..."
              rows={4}
              required
            />
          </div>

          {isPriority && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-700">
                <Star className="h-4 w-4 inline mr-1" />
                Ce ticket recevra un traitement prioritaire et des temps de réponse plus rapides grâce à votre abonnement premium.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Création du ticket..." : "Créer le ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateTicketForm;