import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  address: string;
  role: "patient" | "doctor";
}

interface AuthContextType {
  user: User | null;
  login: (address: string, role: "patient" | "doctor") => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  
  // Check for existing session on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setUser({
              address: data.address,
              role: data.role,
            });
            // Redirect to dashboard if on login page
            if (window.location.pathname === "/") {
              setLocation("/dashboard");
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const login = async (address: string, role: "patient" | "doctor") => {
    // Set user in state
    setUser({ address, role });
    
    // Also store in session
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, role }),
      });
    } catch (error) {
      console.error("Login error:", error);
    }
    
    // Navigate to dashboard
    setLocation("/dashboard");
  };
  
  const logout = async () => {
    // Clear user from state
    setUser(null);
    
    // Also clear from session
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    // Navigate to login page
    setLocation("/");
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
