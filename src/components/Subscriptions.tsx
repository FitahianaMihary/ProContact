import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Settings, Phone } from "lucide-react";

const Subscriptions = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">Plans d'Abonnement</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Ticketing (Par Utilisation)</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Accès au système de ticketing pour une seule demande de support. Idéal pour une assistance ponctuelle.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Ticketing (Mensuel)</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Support illimité par ticketing pour un mois complet. Parfait pour les besoins continus.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <Settings className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Services à Domicile (Par Utilisation)</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Planifiez une session de support technique à domicile. Idéal pour une réparation ou installation unique.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <Settings className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Services à Domicile (Mensuel)</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Support illimité à domicile pour un mois. Couverture complète des services à domicile.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <Phone className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Service Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Accès complet à tous les services (ticketing, services à domicile et monitoring) pour un mois. Forfait ultime de support.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        <div className="text-center mt-12">
          <Button
            onClick={() => window.history.back()}
            size="lg"
            className="text-lg px-8 py-3 bg-black hover:bg-gray-800 text-white"
          >
            Retour
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;