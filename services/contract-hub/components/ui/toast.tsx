'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { ring: string; icon: React.ReactNode }> = {
  success: {
    ring: 'ring-1 ring-[#10B981]/30',
    icon: <CheckCircle2 className="h-5 w-5 text-[#10B981]" strokeWidth={1.75} />,
  },
  error: {
    ring: 'ring-1 ring-[#EF4444]/30',
    icon: <XCircle className="h-5 w-5 text-[#EF4444]" strokeWidth={1.75} />,
  },
  warning: {
    ring: 'ring-1 ring-[#F59E0B]/30',
    icon: <AlertTriangle className="h-5 w-5 text-[#F59E0B]" strokeWidth={1.75} />,
  },
  info: {
    ring: 'ring-1 ring-[#64748B]/30',
    icon: <Info className="h-5 w-5 text-[#64748B]" strokeWidth={1.75} />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback((msg: Omit<ToastMessage, 'id'>) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
        {children}
        {messages.map((m) => {
          const v = VARIANT_STYLES[m.variant];
          return (
            <ToastPrimitive.Root
              key={m.id}
              onOpenChange={(open) => !open && dismiss(m.id)}
              className={cn(
                'group pointer-events-auto relative flex w-full items-start gap-3 rounded-[1.25rem] border border-[rgba(148,163,184,0.15)] bg-white p-4 pr-10 shadow-[0_4px_16px_rgba(15,23,42,0.08)]',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-4',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
                v.ring
              )}
            >
              <div className="flex-shrink-0 pt-0.5">{v.icon}</div>
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-[0.875rem] font-semibold text-[#0F172A]">
                  {m.title}
                </ToastPrimitive.Title>
                {m.description ? (
                  <ToastPrimitive.Description className="mt-1 text-[0.8125rem] leading-relaxed text-[#64748B]">
                    {m.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                className="absolute right-3 top-3 rounded-md p-1 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
