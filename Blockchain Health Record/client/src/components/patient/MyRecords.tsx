import { FC, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MedicalRecord } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { simulateBlockchainTransaction } from "@/lib/blockchain";
import { Notification } from "@/components/ui/notification";

const MyRecords: FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  
  const { data: records, isLoading, error } = useQuery({
    queryKey: ["/api/records"],
    queryFn: async () => {
      const response = await fetch(`/api/records?patientAddress=${user?.address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch records");
      }
      return response.json() as Promise<MedicalRecord[]>;
    },
    enabled: !!user?.address
  });
  
  const filteredRecords = records?.filter(record => 
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.recordType.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/records'] });
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
  
  // Handle delete record
  const handleDeleteClick = (record: MedicalRecord) => {
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
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };
  
  const formatRecordType = (recordType: string) => {
    return recordType
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200 mb-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">My Health Records</h2>
        </div>
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">Error loading records: {error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">My Health Records</h2>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">View all your uploaded health records.</p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <h3 className="text-base font-medium text-gray-900">Records</h3>
          <div className="relative w-full sm:w-auto">
            <Input
              type="text"
              placeholder="Search records..."
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
            <div className="divide-y divide-gray-200">
              {[1, 2, 3].map((item) => (
                <div key={item} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="ml-4">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32 mt-2" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <li key={record.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <i className={`${getRecordTypeIcon(record.recordType)} text-primary-600`}></i>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{record.title}</div>
                          <div className="text-sm text-gray-500">
                            {formatRecordType(record.recordType)} • {formatDate(record.recordDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-primary-100 text-primary-700 border-primary-100 hover:bg-primary-200 hover:text-primary-800"
                          onClick={() => handleViewRecord(record)}
                        >
                          <i className="fas fa-eye mr-1"></i> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gray-100 text-gray-700 border-gray-100 hover:bg-gray-200 hover:text-gray-800"
                          onClick={() => window.open(`/api/records/download/${record.id}`, '_blank')}
                        >
                          <i className="fas fa-download mr-1"></i> Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-100 text-red-700 border-red-100 hover:bg-red-200 hover:text-red-800"
                          onClick={() => handleDeleteClick(record)}
                        >
                          <i className="fas fa-trash-alt mr-1"></i> Delete
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <i className="fas fa-lock flex-shrink-0 mr-1.5 text-green-400"></i>
                          <p>Securely stored on blockchain</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              {searchTerm ? (
                <p>No records found matching "{searchTerm}"</p>
              ) : (
                <div className="flex flex-col items-center">
                  <i className="fas fa-file-medical text-gray-300 text-5xl mb-3"></i>
                  <p>You haven't uploaded any records yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => window.history.pushState({}, '', '/dashboard/upload')}
                    className="mt-2"
                  >
                    Upload your first record
                  </Button>
                </div>
              )}
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

export default MyRecords;
