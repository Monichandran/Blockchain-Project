import * as React from "react";
import { cn } from "@/lib/utils";

interface FileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileChange?: (file: File | null) => void;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  accept?: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, onFileChange, label, description, icon, accept, ...props }, ref) => {
    const [fileName, setFileName] = React.useState<string>("");
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      if (file) {
        setFileName(file.name);
        onFileChange?.(file);
      } else {
        setFileName("");
        onFileChange?.(null);
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0] || null;
      if (file) {
        setFileName(file.name);
        onFileChange?.(file);
        
        // Update the input value
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInputRef.current.files = dataTransfer.files;
        }
      }
    };

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div
          className={cn(
            "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer transition-colors",
            isDragging 
              ? "border-primary-500 bg-primary-50" 
              : "border-gray-300 hover:border-primary-300",
            className
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <div className="space-y-1 text-center">
            {icon || (
              <i className="fas fa-file-upload text-4xl text-gray-400"></i>
            )}
            <div className="flex text-sm text-gray-600 mt-2">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  ref={ref}
                  onChange={handleFileChange}
                  accept={accept}
                  {...props}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              {fileName ? fileName : description || "PDF, PNG, JPG, GIF up to 10MB"}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput };
