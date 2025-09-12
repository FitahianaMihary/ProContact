import { useState, useEffect } from "react";
import HomePage from "@/components/HomePage";
import RoleSelection from "@/components/RoleSelection";
import CustomerAuth from "@/components/CustomerAuth";
import EmployeeLogin from "@/components/EmployeeLogin";
import AdminLogin from "@/components/AdminLogin";
import CustomerDashboard from "@/components/CustomerDashboard";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import { usePayment } from "@/contexts/PaymentContext";

const Index = () => {
  const [currentView, setCurrentView] = useState<string>("home");
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const { user, signOut, checkAuth } = usePayment();

  useEffect(() => {
    let isMounted = true;
    const verifyAuth = async () => {
      if (!isMounted || !isCheckingAuth) return;
      setIsCheckingAuth(false); // Empêche les appels multiples
      const isAuthenticated = await checkAuth();
      if (isAuthenticated && user && isMounted) {
        switch (user.role) {
          case "admin":
            setCurrentView("admin-dashboard");
            break;
          case "employee":
            setCurrentView("employee-dashboard");
            break;
          case "customer":
            setCurrentView("customer-dashboard");
            break;
          default:
            setCurrentView("home");
        }
      } else if (isMounted) {
        setCurrentView("home");
      }
    };
    verifyAuth();
    return () => {
      isMounted = false;
    };
  }, [checkAuth, isCheckingAuth]); // Ajout de isCheckingAuth pour contrôle

  const handleLogout = async () => {
    await signOut();
    setCurrentView("home");
    setIsCheckingAuth(true); // Permet une nouvelle vérification après déconnexion
  };

  const onLoginSuccess = () => {
    if (!user) return;
    switch (user.role) {
      case "admin":
        setCurrentView("admin-dashboard");
        break;
      case "employee":
        setCurrentView("employee-dashboard");
        break;
      case "customer":
        setCurrentView("customer-dashboard");
        break;
      default:
        setCurrentView("home");
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "role-selection":
        return (
          <RoleSelection
            onRoleSelect={(role) => {
              switch (role) {
                case "customer":
                  setCurrentView("customer-auth");
                  break;
                case "employee":
                  setCurrentView("employee-login");
                  break;
                case "admin":
                  setCurrentView("admin-login");
                  break;
              }
            }}
            onBack={() => setCurrentView("home")}
          />
        );

      case "customer-auth":
        return <CustomerAuth onBack={() => setCurrentView("role-selection")} onLoginSuccess={onLoginSuccess} />;

      case "employee-login":
        return <EmployeeLogin onBack={() => setCurrentView("role-selection")} onLoginSuccess={onLoginSuccess} />;

      case "admin-login":
        return <AdminLogin onBack={() => setCurrentView("role-selection")} onLoginSuccess={onLoginSuccess} />;

      case "customer-dashboard":
        return user?.role === "customer" ? (
          <CustomerDashboard onLogout={handleLogout} />
        ) : (
          <div>Accès non autorisé. Veuillez vous connecter.</div>
        );

      case "employee-dashboard":
        return user?.role === "employee" ? (
          <EmployeeDashboard onLogout={handleLogout} />
        ) : (
          <div>Accès non autorisé. Veuillez vous connecter.</div>
        );

      case "admin-dashboard":
        return user?.role === "admin" ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          <div>Accès non autorisé. Veuillez vous connecter.</div>
        );

      default:
        return (
          <HomePage
            onGetStarted={() => {
              setCurrentView("role-selection");
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {isCheckingAuth ? <div>Loading...</div> : renderCurrentView()}
    </div>
  );
};

export default Index;