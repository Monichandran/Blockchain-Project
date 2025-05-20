import { FC, useEffect, useState } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

interface NotificationProps {
  title: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  showProgress?: boolean;
  progressValue?: number;
}

export const Notification: FC<NotificationProps> = ({
  title,
  message,
  isOpen,
  onClose,
  showProgress = false,
  progressValue = 0
}) => {
  const [open, setOpen] = useState(isOpen);
  const [progress, setProgress] = useState(progressValue);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setProgress(progressValue);
  }, [progressValue]);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  // Auto-close after certain threshold if progress reaches 100%
  useEffect(() => {
    if (progress >= 100 && showProgress) {
      const timeout = setTimeout(() => {
        handleClose();
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        
        {showProgress && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
            <div 
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
            <p className="text-xs text-gray-500 text-center mt-2">
              {progress}% - {progress < 100 ? "Please don't close this window" : "Complete!"}
            </p>
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose}>
            {showProgress && progress < 100 ? "Cancel" : "Close"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
