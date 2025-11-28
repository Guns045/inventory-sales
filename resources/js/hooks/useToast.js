import { useToast as useShadcnToast } from '@/hooks/use-toast';

/**
 * Custom hook for toast notifications using Shadcn UI
 * @returns {object} Toast notification methods
 */
export function useToast() {
    const { toast } = useShadcnToast();

    const showSuccess = (message, title = 'Success') => {
        toast({
            title: title,
            description: message,
            className: "bg-green-600/90 text-white border-green-600/90",
        });
    };

    const showError = (message, title = 'Error') => {
        toast({
            title: title,
            description: message,
            variant: "destructive",
            className: "bg-red-600/90 text-white border-red-600/90",
        });
    };

    const showInfo = (message, title = 'Info') => {
        toast({
            title: title,
            description: message,
            className: "bg-background/90 backdrop-blur-sm",
        });
    };

    const showWarning = (message, title = 'Warning') => {
        toast({
            title: title,
            description: message,
            className: "bg-yellow-500/90 text-white border-yellow-500/90",
        });
    };

    return {
        showSuccess,
        showError,
        showInfo,
        showWarning,
        toast
    };
}
