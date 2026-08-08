import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormAlertProps {
  message: string;
}

export function FormAlert({ message }: FormAlertProps) {
  return (
    <Alert
      variant="destructive"
      className="border-destructive/20 bg-destructive/5 duration-300 animate-in fade-in slide-in-from-top-1"
    >
      <CircleAlert aria-hidden="true" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
