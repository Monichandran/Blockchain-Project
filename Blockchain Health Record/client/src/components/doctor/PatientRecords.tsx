import { FC, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Access, MedicalRecord } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { simulateBlockchainTransaction } from "@/lib/blockchain";
import { Notification } from "@/components/ui/notification";

interface PatientAccessGroup {
  patientAddress: string;
  accessDetails: Access;
  records: MedicalRecord[];
}

const PatientRecords: FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  
  // Fetch accessible records for the doctor
  const { data: accessGroups, isLoading } = useQuery({
    queryKey: ["/api/access/doctor"],
    queryFn: async () => {
      const response = await fetch(`/api/access/doctor?doctorAddress=${user?.address}`);
      if (!response.ok) throw new Error("Failed to fetch accessible records");
      
      const accessData = await response.json() as {
        accessList: Access[],
        records: MedicalRecord[]
      };
      
      // Group records by patient
      const groupedData: PatientAccessGroup[] = [];
      
      for (const access of accessData.accessList) {
        const patientRecords = accessData.records.filter(
          record => record.patientAddress === access.patientAddress && 
                   access.recordIds.includes(record.id)
        );
        
        groupedData.push({
          patientAddress: access.patientAddress,
          accessDetails: access,
          records: patientRecords
        });
      }
      
      return groupedData;
    },
    enabled: !!user?.address
  });
  
  // Filter patients based on search term
  const filteredAccessGroups = accessGroups?.filter(group => 
    group.patientAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Toggle patient records expansion
  const togglePatientRecords = (patientAddress: string) => {
    if (expandedPatient === patientAddress) {
      setExpandedPatient(null);
    } else {
      setExpandedPatient(patientAddress);
    }
  };
  
  // Delete record mutation
  const deleteMutation = useMutation({
    mutationFn: async (recordId: number) => {
      const response = await fetch(`/api/records/${recordId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete record');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/access/doctor'] });
      toast({
        title: 'Record Deleted',
        description: 'The medical record has been successfully deleted.',
      });
      setDeleteModalOpen(false);
      setRecordToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete record',
        variant: 'destructive',
      });
    },
  });

  // Handle view record
  const handleViewRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setViewModalOpen(true);
  };
  
  // Handle delete click
  const handleDeleteClick = (record: MedicalRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordToDelete(record);
    setDeleteModalOpen(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    
    try {
      setShowProgress(true);
      setProgressValue(0);
      
      // Simulate blockchain transaction for deletion
      simulateBlockchainTransaction(
        (progress) => {
          setProgressValue(progress);
        },
        async () => {
          await deleteMutation.mutateAsync(recordToDelete.id);
          setShowProgress(false);
        }
      );
    } catch (error) {
      setShowProgress(false);
      console.error('Error deleting record:', error);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };
  
  // Format record type
  const formatRecordType = (recordType: string) => {
    return recordType
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  
  // Get expiry text
  const getExpiryText = (access: Access) => {
    if (access.duration === "permanent") {
      return "Permanent access";
    }
    
    // Calculate days remaining based on createdAt + duration
    const createdDate = new Date(access.createdAt || new Date());
    let daysToAdd = 0;
    
    switch (access.duration) {
      case "1-day": daysToAdd = 1; break;
      case "7-days": daysToAdd = 7; break;
      case "30-days": daysToAdd = 30; break;
      default: daysToAdd = 0;
    }
    
    const expiryDate = new Date(createdDate);
    expiryDate.setDate(expiryDate.getDate() + daysToAdd);
    
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
      return "Access expired";
    } else {
      return `Access expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
    }
  };
  
  // Get record type icon
  const getRecordTypeIcon = (recordType: string) => {
    switch (recordType) {
      case "lab-result":
        return "fas fa-flask";
      case "medical-report":
        return "fas fa-file-medical";
      case "prescription":
        return "fas fa-prescription";
      case "vaccination":
        return "fas fa-syringe";
      case "imaging":
        return "fas fa-x-ray";
      default:
        return "fas fa-file-medical-alt";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Patient Records</h2>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">View medical records shared with you by patients.</p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <h3 className="text-base font-medium text-gray-900">Accessible Records</h3>
          <div className="relative w-full sm:w-auto">
            <Input
              type="text"
              placeholder="Search patients..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
          </div>
        </div>
        
        <div>
          {isLoading ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">Loading patient records...</p>
            </div>
          ) : filteredAccessGroups && filteredAccessGroups.length > 0 ? (
            filteredAccessGroups.map((group) => (
              <div key={group.patientAddress} className="border-b border-gray-200">
                <div 
                  className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => togglePatientRecords(group.patientAddress)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-gray-600"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Patient</div>
                        <div className="text-sm text-gray-500">{group.patientAddress}</div>
                      </div>
                    </div>
                    <div>
                      <i className={`fas fa-chevron-${expandedPatient === group.patientAddress ? 'up' : 'down'} text-gray-400`}></i>
                    </div>
                  </div>
                </div>
                
                <div className={`${expandedPatient === group.patientAddress ? '' : 'hidden'} patient-records bg-gray-50 px-4 py-3 sm:px-6`}>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Shared Records</h4>
                  {group.records.length > 0 ? (
                    <ul className="space-y-3">
                      {group.records.map((record) => (
                        <li key={record.id} className="bg-white p-3 rounded-md shadow-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{record.title}</p>
                              <p className="text-xs text-gray-500">
                                {formatRecordType(record.recordType)} • {formatDate(record.recordDate)}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-primary-100 text-primary-700 border-primary-100 hover:bg-primary-200 hover:text-primary-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewRecord(record);
                                }}
                              >
                                <i className="fas fa-eye mr-1"></i> View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-red-100 text-red-700 border-red-100 hover:bg-red-200 hover:text-red-800"
                                onClick={(e) => handleDeleteClick(record, e)}
                              >
                                <i className="fas fa-trash-alt mr-1"></i> Delete
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No records available</p>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    <i className="far fa-clock mr-1"></i>
                    {getExpiryText(group.accessDetails)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 sm:px-6 text-center">
              <div className="flex flex-col items-center">
                <i className="fas fa-user-md text-gray-300 text-5xl mb-3"></i>
                <p className="text-sm text-gray-500">
                  {searchTerm 
                    ? `No patients found matching "${searchTerm}"` 
                    : "No patients have shared records with you yet"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* View Record Modal */}
      <AlertDialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex justify-between items-center">
              <span>{selectedRecord?.title}</span>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                  {selectedRecord && formatRecordType(selectedRecord.recordType)}
                </span>
                <span className="text-sm text-gray-500">
                  {selectedRecord && formatDate(selectedRecord.recordDate)}
                </span>
              </div>
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="mt-4">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 h-96 flex items-center justify-center">
              {selectedRecord?.filePath ? (
                <iframe 
                  src={`/api/records/view/${selectedRecord.id}`}
                  className="w-full h-full" 
                  title={selectedRecord.title}
                />
              ) : (
                <div className="text-center">
                  <i className={`${getRecordTypeIcon(selectedRecord?.recordType || "medical-report")} text-gray-400 text-6xl mb-4`}></i>
                  <p className="text-gray-500">Document Preview</p>
                  <p className="text-xs text-gray-400 mt-2">Unable to preview this document</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex items-center">
            <div className="flex-shrink-0 h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
              <i className="fas fa-shield-alt text-green-600 text-sm"></i>
            </div>
            <p className="text-xs text-green-600">
              Blockchain verification: Record hash verified and authentic
            </p>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => window.open(`/api/records/download/${selectedRecord?.id}`, '_blank')}>
              Download
            </AlertDialogAction>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record "{recordToDelete?.title}"? 
              This action cannot be undone and will permanently remove the record from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center">
                  <i className="fas fa-circle-notch fa-spin mr-2"></i> Deleting...
                </span>
              ) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Blockchain Transaction Progress Notification */}
      <Notification
        title="Deleting Record"
        message="Submitting transaction to blockchain..."
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
        showProgress={true}
        progressValue={progressValue}
      />
    </div>
  );
};

export default PatientRecords;
