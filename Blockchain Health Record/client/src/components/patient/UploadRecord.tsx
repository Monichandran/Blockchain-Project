import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMedicalRecordSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { simulateBlockchainUpload } from "@/lib/blockchain";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileInput } from "@/components/ui/file-input";
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

// Extend the schema with client-side validation
const uploadRecordSchema = insertMedicalRecordSchema.extend({
  recordDate: z.string().min(1, { message: "Record date is required" }),
});

type UploadRecordFormValues = z.infer<typeof uploadRecordSchema>;

const UploadRecord: FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<UploadRecordFormValues>({
    resolver: zodResolver(uploadRecordSchema),
    defaultValues: {
      title: "",
      recordType: "lab-result",
      recordDate: new Date().toISOString().split("T")[0],
      patientAddress: user?.address || "",
    },
  });

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
  };

  const onSubmit = async (data: UploadRecordFormValues) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please upload a file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Start progress modal
      setShowProgress(true);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", data.title);
      formData.append("recordType", data.recordType);
      formData.append("recordDate", data.recordDate);
      formData.append("patientAddress", data.patientAddress);
      
      // Simulate blockchain progress
      simulateBlockchainUpload(
        (progress) => {
          setUploadProgress(progress);
        },
        async () => {
          // When blockchain simulation completes, upload to server
          const response = await fetch("/api/records", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error("Failed to upload record");
          }
          
          // Reset form
          form.reset();
          setSelectedFile(null);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/records"] });
          
          toast({
            title: "Success",
            description: "Record uploaded successfully",
          });
        }
      );
    } catch (error) {
      console.error("Error uploading record:", error);
      setShowProgress(false);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your record. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Upload Health Record</h2>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Upload your health records securely to the blockchain.
        </p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">New Record</h3>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Annual Physical Exam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="recordType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a record type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lab-result">Lab Result</SelectItem>
                        <SelectItem value="medical-report">Medical Report</SelectItem>
                        <SelectItem value="prescription">Prescription</SelectItem>
                        <SelectItem value="vaccination">Vaccination Record</SelectItem>
                        <SelectItem value="imaging">Imaging (X-ray, MRI, etc.)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="recordDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormItem>
                <FormLabel>Upload File</FormLabel>
                <FormControl>
                  <FileInput
                    onFileChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.gif"
                    description="PDF, PNG, JPG, GIF up to 10MB"
                    icon={<i className="fas fa-file-upload text-4xl text-gray-400"></i>}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              
              <Button type="submit" className="w-full flex items-center justify-center gap-2">
                <i className="fas fa-upload"></i> Upload to Blockchain
              </Button>
            </form>
          </Form>
        </div>
      </div>
      
      <Notification
        title="Uploading Record"
        message="Your record is being securely uploaded and processed on the blockchain."
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
        showProgress={true}
        progressValue={uploadProgress}
      />
    </div>
  );
};

export default UploadRecord;
