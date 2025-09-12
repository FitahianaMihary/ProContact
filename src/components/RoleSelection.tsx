
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, HeadphonesIcon, Users, ArrowLeft } from "lucide-react";

interface RoleSelectionProps {
  onRoleSelect: (role: 'admin' | 'employee' | 'customer') => void;
  onBack: () => void;
}

const RoleSelection = ({ onRoleSelect, onBack }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Role</h1>
            <p className="text-lg text-gray-600">Select how you'd like to access procontactTelecom</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onRoleSelect('admin')}>
            <CardHeader className="text-center">
              <ShieldCheck className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Administrator</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="mb-4">
                Full system access for managing employees, 
                configuring settings, and overseeing operations.
              </CardDescription>
              <Button className="w-full">
                Admin Login
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onRoleSelect('employee')}>
            <CardHeader className="text-center">
              <HeadphonesIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Employee</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="mb-4">
                Access your workstation to assist customers 
                and manage your daily tasks.
              </CardDescription>
              <Button className="w-full" variant="secondary">
                Employee Login
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onRoleSelect('customer')}>
            <CardHeader className="text-center">
              <Users className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="mb-4">
                Register for an account or login to access 
                support services and manage your requests.
              </CardDescription>
              <Button className="w-full" variant="outline">
                Customer Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
