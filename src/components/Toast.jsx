import React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';

export const Toast = ({ title, description, open, onOpenChange, variant = 'default' }) => {
  const variantStyles = {
    default: 'bg-slate-800 text-white border-slate-700',
    success: 'bg-green-900 text-green-100 border-green-700',
    error: 'bg-red-900 text-red-100 border-red-700',
    warning: 'bg-yellow-900 text-yellow-100 border-yellow-700',
  };

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        className={`${variantStyles[variant]} border rounded-lg shadow-lg p-4 flex flex-col gap-1 data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=end]:animate-swipeOut`}
      >
        {title && (
          <ToastPrimitive.Title className="font-semibold text-sm">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="text-sm opacity-90">
            {description}
          </ToastPrimitive.Description>
        )}
        <ToastPrimitive.Close className="absolute top-2 right-2 text-white/70 hover:text-white">
          ✕
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 flex flex-col p-6 gap-2 w-96 max-w-full m-0 list-none z-50" />
    </ToastPrimitive.Provider>
  );
};

export default Toast;
