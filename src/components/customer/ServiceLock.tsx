
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Star, Zap, Clock } from "lucide-react";

interface ServiceLockProps {
  serviceName: string;
  description: string;
  onUpgrade: () => void;
  children?: React.ReactNode;
}

const ServiceLock = ({ serviceName, description, onUpgrade, children }: ServiceLockProps) => {
  return (
    <Card className="relative">
      <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <h4 className="font-medium mb-2">With Premium Subscription:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-purple-600" />
                Automatic reminders
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-2 text-purple-600" />
                Priority ticket tracking
              </div>
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-2 text-purple-600" />
                Priority intervention
              </div>
            </div>
          </div>
          
          <Button onClick={onUpgrade} className="w-full">
            Upgrade to Premium
          </Button>
        </div>
      </div>
      
      {/* Blurred content behind */}
      <div className="blur-sm pointer-events-none">
        {children || (
          <CardHeader>
            <CardTitle>{serviceName}</CardTitle>
            <CardDescription>This feature requires a premium subscription</CardDescription>
          </CardHeader>
        )}
      </div>
    </Card>
  );
};

export default ServiceLock;
