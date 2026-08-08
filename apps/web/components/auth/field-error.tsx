interface FieldErrorProps {
  id: string;
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="text-xs font-medium text-destructive duration-200 animate-in fade-in slide-in-from-top-1"
    >
      {message}
    </p>
  );
}
