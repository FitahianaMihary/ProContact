import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageSquare, Settings, Users } from "lucide-react";
import heroImage from "@/assets/hero-telecom.jpg";
import { useNavigate } from "react-router-dom";

interface HomePageProps {
  onGetStarted: () => void;
}

const HomePage = ({ onGetStarted }: HomePageProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="relative mb-8 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src={heroImage} 
              alt="Professional telecom support center" 
              className="w-full h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-purple-900/70 flex items-center justify-center">
              <div className="text-white text-center">
                <h1 className="text-5xl font-bold mb-4">
                  procontact<span className="text-blue-300">Telecom</span>
                </h1>
                <p className="text-xl mb-6 max-w-2xl">
                  Your comprehensive telecommunications support platform
                </p>
              </div>
            </div>
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Access ticketing services, home service requests, and premium monitoring solutions all in one place.
          </p>
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="text-lg px-8 py-3 bg-black hover:bg-gray-800 text-white"
          >
            Get Started
          </Button>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Support Ticketing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Submit and track support tickets with our comprehensive ticketing system. 
                Get help from our expert team when you need it most.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Settings className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Home Services</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Schedule on-site technical support and home service appointments. 
                Our technicians come to you for installations and repairs.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Phone className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Premium Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                24/7 network monitoring and proactive support to keep your 
                telecommunications infrastructure running smoothly.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Experience Better Support?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of satisfied customers who trust procontactTelecom for their telecommunications needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate("/subscriptions")}
              size="lg"
              className="text-lg px-8 py-3 bg-black hover:bg-gray-800 text-white"
            >
              <Users className="h-5 w-5 mr-2" />
              Voir les Abonnements
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;