import { FC, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWeb3 } from "@/hooks/useWeb3";
import { useToast } from "@/hooks/use-toast";

const LoginScreen: FC = () => {
  const { login } = useAuth();
  const { connectWallet } = useWeb3();
  const { toast } = useToast();
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectMetaMask = async () => {
    try {
      setIsLoading(true);
      const address = await connectWallet();
      
      // Check if user exists, if not, show role selection
      const response = await fetch(`/api/users/check/${address}`);
      const data = await response.json();
      
      if (data.exists) {
        // Existing user, log them in
        login(address, data.role);
      } else {
        // New user, show role selection
        setIsFirstTimeUser(true);
      }
    } catch (error) {
      console.error("MetaMask connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect with MetaMask. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectRole = async (role: "patient" | "doctor") => {
    try {
      setIsLoading(true);
      const address = await connectWallet();
      
      // Create new user with selected role
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, role }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create user");
      }
      
      // Log in the new user
      login(address, role);
    } catch (error) {
      console.error("Role selection error:", error);
      toast({
        title: "Registration Failed",
        description: "Failed to register with selected role. Please try again.",
        variant: "destructive",
      });
      setIsFirstTimeUser(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Welcome to MediChain</h2>
            <p className="mt-2 text-sm text-gray-600">Secure Electronic Health Records on the Blockchain</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="h-32 w-32 rounded-full mb-6 bg-primary-100 flex items-center justify-center">
              <i className="fas fa-heartbeat text-6xl text-primary-600"></i>
            </div>
            
            {!isFirstTimeUser ? (
              <Button 
                onClick={handleConnectMetaMask} 
                className="w-full flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <i className="fas fa-wallet"></i>
                {isLoading ? "Connecting..." : "Connect with MetaMask"}
              </Button>
            ) : (
              <div className="mt-8 w-full">
                <p className="text-sm text-center text-gray-700 mb-4">Please select your role:</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => selectRole("patient")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-user-injured"></i>
                    Patient
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectRole("doctor")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-user-md"></i>
                    Doctor
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;
