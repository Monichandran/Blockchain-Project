import { FC, ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation, useRoute } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  const isPatient = user.role === "patient";
  
  // Check routes for active view highlighting
  const [matchUpload] = useRoute("/dashboard/upload");
  const [matchRecords] = useRoute("/dashboard/records");
  const [matchAccess] = useRoute("/dashboard/access");
  const [matchPatients] = useRoute("/dashboard/patients");
  
  // Determine active view for styling
  let activeView = "upload";
  if (matchUpload) activeView = "upload";
  if (matchRecords) activeView = "records";
  if (matchAccess) activeView = "access";
  if (matchPatients) activeView = "patients";

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-primary-600">MediChain</h1>
            <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden md:inline-block truncate max-w-xs">
              {user.address}
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
            >
              <i className="fas fa-sign-out-alt mr-1"></i>
              <span>Logout</span>
            </button>
            <button
              className="md:hidden text-gray-600"
              onClick={toggleMobileMenu}
            >
              <i className={`fas ${isMobileMenuOpen ? "fa-times" : "fa-bars"}`}></i>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex-1 px-2 space-y-1">
                {isPatient ? (
                  <div className="space-y-1">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Patient Dashboard
                    </h3>
                    <Link 
                      href="/dashboard/upload" 
                      className={`${activeView === "upload" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                    >
                      <i className={`fas fa-file-upload mr-3 ${activeView === "upload" ? "text-primary-500" : "text-gray-500"}`}></i>
                      Upload Records
                    </Link>
                    <Link 
                      href="/dashboard/records" 
                      className={`${activeView === "records" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                    >
                      <i className={`fas fa-file-medical mr-3 ${activeView === "records" ? "text-primary-500" : "text-gray-500"}`}></i>
                      My Records
                    </Link>
                    <Link 
                      href="/dashboard/access" 
                      className={`${activeView === "access" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                    >
                      <i className={`fas fa-user-shield mr-3 ${activeView === "access" ? "text-primary-500" : "text-gray-500"}`}></i>
                      Manage Access
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Doctor Dashboard
                    </h3>
                    <Link 
                      href="/dashboard/patients" 
                      className={`${activeView === "patients" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                    >
                      <i className={`fas fa-users mr-3 ${activeView === "patients" ? "text-primary-500" : "text-gray-500"}`}></i>
                      Patient Records
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-full h-9 w-9 flex items-center justify-center">
                    <i className="fas fa-wallet text-gray-500"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {truncateAddress(user.address)}
                    </p>
                    <p className="text-xs font-medium text-gray-500">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 flex z-40 md:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleMobileMenu}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={toggleMobileMenu}
                >
                  <span className="sr-only">Close sidebar</span>
                  <i className="fas fa-times text-white"></i>
                </button>
              </div>
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4">
                  <h1 className="text-lg font-semibold text-primary-600">MediChain</h1>
                </div>
                <nav className="mt-5 px-2 space-y-1">
                  {isPatient ? (
                    <>
                      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Patient Dashboard
                      </h3>
                      <Link 
                        href="/dashboard/upload" 
                        className={`${activeView === "upload" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                        onClick={toggleMobileMenu}
                      >
                        <i className={`fas fa-file-upload mr-3 ${activeView === "upload" ? "text-primary-500" : "text-gray-500"}`}></i>
                        Upload Records
                      </Link>
                      <Link 
                        href="/dashboard/records" 
                        className={`${activeView === "records" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                        onClick={toggleMobileMenu}
                      >
                        <i className={`fas fa-file-medical mr-3 ${activeView === "records" ? "text-primary-500" : "text-gray-500"}`}></i>
                        My Records
                      </Link>
                      <Link 
                        href="/dashboard/access" 
                        className={`${activeView === "access" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                        onClick={toggleMobileMenu}
                      >
                        <i className={`fas fa-user-shield mr-3 ${activeView === "access" ? "text-primary-500" : "text-gray-500"}`}></i>
                        Manage Access
                      </Link>
                    </>
                  ) : (
                    <>
                      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Doctor Dashboard
                      </h3>
                      <Link 
                        href="/dashboard/patients" 
                        className={`${activeView === "patients" ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"} group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                        onClick={toggleMobileMenu}
                      >
                        <i className={`fas fa-users mr-3 ${activeView === "patients" ? "text-primary-500" : "text-gray-500"}`}></i>
                        Patient Records
                      </Link>
                    </>
                  )}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex-shrink-0 w-full group block">
                  <div className="flex items-center">
                    <div className="bg-gray-100 rounded-full h-9 w-9 flex items-center justify-center">
                      <i className="fas fa-wallet text-gray-500"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {truncateAddress(user.address)}
                      </p>
                      <p className="text-xs font-medium text-gray-500">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-14"></div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <main className="py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
