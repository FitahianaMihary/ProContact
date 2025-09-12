import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  Star,
  Shield,
  Zap,
  Ticket,
  Home,
  Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayment, ServiceSubscription } from "@/contexts/PaymentContext";
import PaymentForm from "./PaymentForm";

interface SubscriptionServiceProps {
  onSubscribe?: (serviceId: string) => void;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: "monthly" | "per-use";
  features: string[];
  benefits: { icon: React.ComponentType<any>; text: string }[];
  isPremium?: boolean;
}

const SubscriptionService = ({ onSubscribe }: SubscriptionServiceProps) => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const {
    isServiceUnlocked,
    subscribeToService,
    getServiceSubscription,
  } = usePayment();
  const { toast } = useToast();

  const services: Service[] = [
    {
      id: "ticketing-per-use",
      name: "Ticketing Service (Per Ticket)",
      description: "Create support tickets as needed",
      price: 10000,
      currency: "Ar",
      type: "per-use",
      features: [
        "Create support tickets",
        "Track ticket status",
        "Response from support team",
        "Basic priority handling",
      ],
      benefits: [
        { icon: Ticket, text: "Per-Ticket Pricing" },
        { icon: Clock, text: "Standard Response" },
        { icon: CheckCircle, text: "Issue Tracking" },
      ],
    },
    {
      id: "ticketing-monthly",
      name: "Ticketing Service (Monthly)",
      description: "Unlimited ticket creation for a month",
      price: 150000,
      currency: "Ar",
      type: "monthly",
      features: [
        "Unlimited ticket creation",
        "Priority ticket handling",
        "Faster response times",
        "Dedicated support queue",
      ],
      benefits: [
        { icon: Ticket, text: "Unlimited Tickets" },
        { icon: Zap, text: "Priority Support" },
        { icon: Clock, text: "Fast Response" },
      ],
    },
    {
      id: "home-service-per-use",
      name: "Home Service (Per Intervention)",
      description: "Schedule home service visits as needed",
      price: 25000,
      currency: "Ar",
      type: "per-use",
      features: [
        "Schedule home visits",
        "Professional technician",
        "Equipment maintenance",
        "Service report provided",
      ],
      benefits: [
        { icon: Home, text: "On-Site Service" },
        { icon: Star, text: "Professional Tech" },
        { icon: CheckCircle, text: "Service Report" },
      ],
    },
    {
      id: "home-service-monthly",
      name: "Home Service (Monthly)",
      description: "Unlimited home service visits for a month",
      price: 200000,
      currency: "Ar",
      type: "monthly",
      features: [
        "Unlimited home visits",
        "Priority scheduling",
        "Preventive maintenance",
        "Monthly service reports",
      ],
      benefits: [
        { icon: Home, text: "Unlimited Visits" },
        { icon: Zap, text: "Priority Scheduling" },
        { icon: Star, text: "Preventive Care" },
      ],
    },
    {
      id: "premium-monitoring",
      name: "Premium Monitoring Service",
      description: "Comprehensive premium service with priority intervention",
      price: 300000,
      currency: "Ar",
      type: "monthly",
      features: [
        "Priority intervention on all services",
        "Includes unlimited ticketing",
        "Includes unlimited home visits",
        "Dedicated account manager",
        "24/7 premium support",
        "Monthly performance reports",
      ],
      benefits: [
        { icon: Crown, text: "Premium Priority" },
        { icon: Zap, text: "All Services Included" },
        { icon: Shield, text: "24/7 Support" },
      ],
      isPremium: true,
    },
  ];

  const handlePaymentSuccess = (
    serviceId: string,
    type: "monthly" | "per-use",
    credits?: number
  ) => {
    subscribeToService(serviceId, type, credits);
    setSelectedService(null);
    onSubscribe?.(serviceId);
    toast({
      title: "Abonnement réussi",
      description: `Vous êtes maintenant abonné à ${serviceId.replace(/-/g, " ")}`,
      variant: "success",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("mg-MG").format(price);
  };

  const getRemainingTime = (subscription: ServiceSubscription) => {
    if (subscription.subscriptionType === "monthly" && subscription.expiresAt) {
      const now = new Date();
      const expiry = new Date(subscription.expiresAt);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} jours restants` : "Expiré";
    }
    if (subscription.subscriptionType === "per-use") {
      return `${subscription.remainingCredits || 0} crédits restants`;
    }
    return "";
  };

  if (selectedService) {
    return (
      <PaymentForm
        service={selectedService}
        onPaymentSuccess={handlePaymentSuccess}
        onCancel={() => setSelectedService(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Abonnements aux Services
        </h2>
        <p className="text-gray-600">
          Choisissez les services qui correspondent à vos besoins
        </p>
      </div>

      <div className="grid gap-6">
        {services.map((service) => {
          const isSubscribed = isServiceUnlocked(service.id);
          const subscription = getServiceSubscription(service.id);

          return (
            <Card
              key={service.id}
              className={`relative ${
                isSubscribed ? "ring-2 ring-green-500" : ""
              } ${
                service.isPremium
                  ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50"
                  : ""
              }`}
            >
              {service.isPremium && (
                <div className="absolute -top-2 -left-2">
                  <Badge className="bg-yellow-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
              )}

              {isSubscribed && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={`text-xl ${
                      service.isPremium ? "text-yellow-800" : ""
                    }`}
                  >
                    {service.name}
                  </CardTitle>
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${
                        service.isPremium
                          ? "text-yellow-600"
                          : "text-purple-600"
                      }`}
                    >
                      {formatPrice(service.price)} {service.currency}
                    </div>
                    <div className="text-sm text-gray-500">
                      {service.type === "monthly" ? "par mois" : "par usage"}
                    </div>
                  </div>
                </div>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>

                {isSubscribed && subscription && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                    <p className="text-sm text-green-700 font-medium">
                      {getRemainingTime(subscription)}
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <h4
                    className={`font-semibold mb-3 flex items-center ${
                      service.isPremium ? "text-yellow-800" : ""
                    }`}
                  >
                    <Shield
                      className={`h-4 w-4 mr-2 ${
                        service.isPremium
                          ? "text-yellow-600"
                          : "text-purple-600"
                      }`}
                    />
                    Bénéfices Clés
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {service.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center p-3 rounded-lg ${
                          service.isPremium ? "bg-yellow-50" : "bg-purple-50"
                        }`}
                      >
                        <benefit.icon
                          className={`h-5 w-5 mr-3 ${
                            service.isPremium
                              ? "text-yellow-600"
                              : "text-purple-600"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          {benefit.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Ce qui est inclus</h4>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  {isSubscribed ? (
                    <Button disabled className="w-full">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Service Actif
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setSelectedService(service)}
                      className={`w-full ${
                        service.isPremium
                          ? "bg-yellow-600 hover:bg-yellow-700"
                          : ""
                      }`}
                    >
                      S'abonner - {formatPrice(service.price)}{" "}
                      {service.currency}
                      {service.type === "monthly" && "/mois"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionService;
