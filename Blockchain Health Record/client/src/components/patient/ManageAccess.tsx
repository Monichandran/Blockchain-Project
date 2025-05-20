import { FC, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Access, MedicalRecord } from "@shared/schema";
import { simulateBlockchainTransaction } from "@/lib/blockchain";
import { Notification } from "@/components/ui/notification";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Form schema for granting access
const grantAccessSchema = z.object({
  doctorAddress: z
    .string()
    .min(1, { message: "Doctor's wallet address is required" })
    .regex(/^0x[a-fA-F0-9]{40}$/, { message: "Invalid Ethereum address format" }),
  recordIds: z.array(z.number()).min(1, { message: "Select at least one record" }),
  accessDuration: z.string().min(1, { message: "Select an access duration" }),
});

type GrantAccessFormValues = z.infer<typeof grantAccessSchema>;

const ManageAccess: FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

  // Fetch patient's records
  const { data: records, isLoading: isLoadingRecords } = useQuery({
    queryKey: ["/api/records"],
    queryFn: async () => {
      const response = await fetch(`/api/records?patientAddress=${user?.address}`);
      if (!response.ok) throw new Error("Failed to fetch records");
      return response.json() as Promise<MedicalRecord[]>;
    },
    enabled: !!user?.address,
  });

  // Fetch access permissions
  const { data: accessPermissions, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["/api/access"],
    queryFn: async () => {
      const response = await fetch(`/api/access?patientAddress=${user?.address}`);
      if (!response.ok) throw new Error("Failed to fetch access permissions");
      return response.json() as Promise<Access[]>;
    },
    enabled: !!user?.address,
  });

  // Set up form
  const form = useForm<GrantAccessFormValues>({
    resolver: zodResolver(grantAccessSchema),
    defaultValues: {
      doctorAddress: "",
      recordIds: [],
      accessDuration: "7-days",
    },
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async (data: GrantAccessFormValues) => {
      return fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          patientAddress: user?.address,
        }),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to grant access");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access"] });
      form.reset();
      toast({
        title: "Access Granted",
        description: "The doctor now has access to your selected medical records.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to grant access",
        variant: "destructive",
      });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (accessId: number) => {
      return fetch(`/api/access/${accessId}`, {
        method: "DELETE",
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to revoke access");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access"] });
      toast({
        title: "Access Revoked",
        description: "The doctor's access has been revoked successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to revoke access",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: GrantAccessFormValues) => {
    try {
      // Show progress notification
      setShowProgress(true);
      setProgressValue(0);
      
      // Simulate blockchain transaction
      simulateBlockchainTransaction(
        (progress) => {
          setProgressValue(progress);
        },
        async () => {
          // When blockchain simulation completes, submit to API
          await grantAccessMutation.mutateAsync(data);
          setShowProgress(false);
        }
      );
    } catch (error) {
      setShowProgress(false);
      console.error("Error granting access:", error);
    }
  };

  // Handle revoke access
  const handleRevokeAccess = async (accessId: number) => {
    try {
      // Show progress notification for revocation
      setShowProgress(true);
      setProgressValue(0);
      
      // Simulate blockchain transaction for revocation
      simulateBlockchainTransaction(
        (progress) => {
          setProgressValue(progress);
        },
        async () => {
          // When blockchain simulation completes, submit to API
          await revokeAccessMutation.mutateAsync(accessId);
          setShowProgress(false);
        }
      );
    } catch (error) {
      setShowProgress(false);
      console.error("Error revoking access:", error);
    }
  };

  // Helper function to format duration
  const formatDuration = (duration: string) => {
    switch (duration) {
      case "1-day": return "1 day";
      case "7-days": return "7 days";
      case "30-days": return "30 days";
      case "permanent": return "Permanent access";
      default: return duration;
    }
  };

  // Helper function to calculate expiry text
  const getExpiryText = (access: Access) => {
    if (access.duration === "permanent") {
      return "Permanent access";
    }
    
    // Calculate days remaining based on createdAt + duration
    const createdDate = new Date(access.createdAt);
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
      return "Expired";
    } else {
      return `Access expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
    }
  };

  // Find record title by id
  const getRecordTitle = (recordId: number) => {
    const record = records?.find(r => r.id === recordId);
    return record?.title || `Record #${recordId}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Manage Access</h2>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">Control which doctors can access your health records.</p>
      </div>
      
      {/* Grant Access Form */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">Grant Access</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="doctorAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor's Wallet Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="recordIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Records to Share</FormLabel>
                    <div className="mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {isLoadingRecords ? (
                        <p className="text-sm text-gray-500 py-2 text-center">Loading records...</p>
                      ) : records && records.length > 0 ? (
                        <div className="space-y-2">
                          {records.map((record) => (
                            <div key={record.id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`record-${record.id}`}
                                value={record.id}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                onChange={(e) => {
                                  const currentValues = form.getValues().recordIds;
                                  const recordId = Number(e.target.value);
                                  
                                  if (e.target.checked) {
                                    form.setValue("recordIds", [...currentValues, recordId]);
                                  } else {
                                    form.setValue(
                                      "recordIds",
                                      currentValues.filter((id) => id !== recordId)
                                    );
                                  }
                                }}
                              />
                              <label htmlFor={`record-${record.id}`} className="ml-2 block text-sm text-gray-900">
                                {record.title}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 py-2 text-center">No records available</p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accessDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Duration</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1-day">1 Day</SelectItem>
                        <SelectItem value="7-days">7 Days</SelectItem>
                        <SelectItem value="30-days">30 Days</SelectItem>
                        <SelectItem value="permanent">Permanent Access</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoadingRecords || grantAccessMutation.isPending}
              >
                <i className="fas fa-user-shield mr-2"></i> Grant Access
              </Button>
            </form>
          </Form>
        </div>
      </div>
      
      {/* Currently Shared With */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">Currently Shared With</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoadingAccess ? (
            <div className="px-4 py-4 sm:px-6 text-center">
              <p className="text-sm text-gray-500">Loading access permissions...</p>
            </div>
          ) : accessPermissions && accessPermissions.length > 0 ? (
            accessPermissions.map((permission) => (
              <div key={permission.id} className="px-4 py-4 sm:px-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Doctor</p>
                    <p className="text-xs text-gray-500 mt-1">{permission.doctorAddress}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permission.recordIds.map((recordId) => (
                        <Badge key={recordId} variant="outline" className="bg-blue-100 text-blue-800 border-blue-100">
                          {getRecordTitle(recordId)}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <i className="far fa-clock mr-1"></i>
                      {getExpiryText(permission)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-red-100 text-red-700 border-red-100 hover:bg-red-200 hover:text-red-800"
                    onClick={() => handleRevokeAccess(permission.id)}
                    disabled={revokeAccessMutation.isPending}
                  >
                    <i className="fas fa-times mr-1"></i> Revoke
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 sm:px-6 text-center">
              <div className="flex flex-col items-center">
                <i className="fas fa-user-shield text-gray-300 text-5xl mb-3"></i>
                <p className="text-sm text-gray-500">You haven't shared your records with any doctors yet</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Transaction Progress Modal */}
      <Notification
        title="Processing Blockchain Transaction"
        message="Your request is being securely processed on the blockchain."
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
        showProgress={true}
        progressValue={progressValue}
      />
    </div>
  );
};

export default ManageAccess;
