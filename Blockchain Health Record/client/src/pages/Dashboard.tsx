import { FC, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import UploadRecord from "@/components/patient/UploadRecord";
import MyRecords from "@/components/patient/MyRecords";
import ManageAccess from "@/components/patient/ManageAccess";
import PatientRecords from "@/components/doctor/PatientRecords";

const Dashboard: FC = () => {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Check routes
  const [matchDashboard] = useRoute("/dashboard");
  const [matchUpload] = useRoute("/dashboard/upload");
  const [matchRecords] = useRoute("/dashboard/records");
  const [matchAccess] = useRoute("/dashboard/access");
  const [matchPatients] = useRoute("/dashboard/patients");
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);
  
  // Redirect to default views based on role
  useEffect(() => {
    if (user && matchDashboard) {
      if (user.role === "patient") {
        setLocation("/dashboard/upload");
      } else if (user.role === "doctor") {
        setLocation("/dashboard/patients");
      }
    }
  }, [user, matchDashboard, setLocation]);
  
  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Determine which view to show based on route and user role
  const getContent = () => {
    if (user.role === "patient") {
      if (matchUpload) return <UploadRecord />;
      if (matchRecords) return <MyRecords />;
      if (matchAccess) return <ManageAccess />;
      
      // Default to upload view for patients
      return <UploadRecord />;
    } else if (user.role === "doctor") {
      if (matchPatients || matchDashboard) return <PatientRecords />;
      
      // Default to patients view for doctors
      setLocation("/dashboard/patients");
      return <PatientRecords />;
    }
    
    return null;
  };
  
  return (
    <Layout>
      {getContent()}
    </Layout>
  );
};

export default Dashboard;
