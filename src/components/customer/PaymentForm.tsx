import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentFormProps {
  service: {
    id: string;
    name: string;
    price: number;
    currency: string;
    type: 'monthly' | 'per-use';
    description: string;
  };
  onPaymentSuccess: (serviceId: string, type: 'monthly' | 'per-use', credits?: number) => void;
  onCancel: () => void;
}

const PaymentForm = ({ service, onPaymentSuccess, onCancel }: PaymentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
    phone: '',
  });
  const { toast } = useToast();

  // Obtenir la date actuelle au format YYYY-MM-DD pour l'attribut min
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      toast({
        title: "Méthode de paiement requise",
        description: "Veuillez sélectionner une méthode de paiement.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.cardholderName) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les détails de la carte.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que la date d'expiration est postérieure à aujourd'hui
    const selectedDate = new Date(formData.expiryDate);
    const currentDate = new Date();
    if (selectedDate <= currentDate) {
      toast({
        title: "Date d'expiration invalide",
        description: "Veuillez sélectionner une date d'expiration future.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simuler le traitement du paiement
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simuler le succès du paiement
      const credits = service.type === 'per-use' ? 1 : undefined;
      onPaymentSuccess(service.id, service.type, credits);
      
      toast({
        title: "Paiement réussi",
        description: `Vous vous êtes abonné avec succès à ${service.name} !`,
      });
    } catch (error) {
      toast({
        title: "Échec du paiement",
        description: "Veuillez réessayer ou contacter le support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mg-MG').format(price);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={onCancel} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux services
        </Button>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Résumé du paiement
              <Badge variant="secondary">
                {service.type === 'monthly' ? 'Abonnement mensuel' : 'Paiement unique'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">{service.name}</span>
                <span className="font-bold text-lg">
                  {formatPrice(service.price)} {service.currency}
                  {service.type === 'monthly' && '/mois'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{service.description}</p>
              {service.type === 'monthly' && (
                <div className="flex items-center text-sm text-blue-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  Renouvellement automatique tous les 30 jours
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Informations de paiement
          </CardTitle>
          <CardDescription>
            Effectuez votre paiement en toute sécurité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection de la méthode de paiement */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une méthode de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="microcred">Microcred</SelectItem>
                  <SelectItem value="paytech">PayTech</SelectItem>
                  <SelectItem value="madapay">MadaPay</SelectItem>
                  <SelectItem value="visa">Visa Card</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Détails de la carte */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardholder-name">Nom du titulaire de la carte</Label>
                <Input
                  id="cardholder-name"
                  value={formData.cardholderName}
                  onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-number">Numéro de carte</Label>
                <Input
                  id="card-number"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Date d'expiration</Label>
                  <Input
                    id="expiry"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    min={today}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    value={formData.cvv}
                    onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+261 XX XX XXX XX"
                  required
                />
              </div>
            </div>

            {/* Notification de sécurité */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center text-blue-700">
                <Lock className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Paiement sécurisé</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Vos informations de paiement sont cryptées et sécurisées. Nous ne stockons pas les détails de votre carte.
              </p>
            </div>

            {/* Bouton de soumission */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              size="lg"
            >
              {loading ? (
                "Traitement du paiement..."
              ) : (
                `Payer ${formatPrice(service.price)} ${service.currency}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentForm;