// src/utils/notifications.ts
import { toast } from "sonner";

type NotificationType = "success" | "info" | "error" | "warning";

interface NotificationProps {
  type: NotificationType;
  message: string;
  txid?: string;
  description?: string;
}

export function notify({
  type,
  message,
  txid,
  description,
}: NotificationProps): void {
  const content = (
    <div>
      {description && <div className="text-sm">{description}</div>}
      {txid && (
        <div className="text-xs mt-1">
          <a
            href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
          >
            View transaction
          </a>
        </div>
      )}
    </div>
  );

  switch (type) {
    case "success":
      toast.success(message, { description: content });
      break;
    case "error":
      toast.error(message, { description: content });
      break;
    case "info":
      toast.info(message, { description: content });
      break;
    case "warning":
      toast.warning(message, { description: content });
      break;
    default:
      toast(message, { description: content });
  }
}

// Add this to your layout or main component
export const ToasterSetup = () => (
  <div>
    {/* Sonner's Toaster component will be imported in your layout component */}
  </div>
);
