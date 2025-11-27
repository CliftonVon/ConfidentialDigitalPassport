import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

export const Dialog = ({ open, onOpenChange, title, description, children, trigger }) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto data-[state=open]:animate-slideIn">
          {title && (
            <DialogPrimitive.Title className="text-xl font-bold text-white mb-2">
              {title}
            </DialogPrimitive.Title>
          )}
          {description && (
            <DialogPrimitive.Description className="text-sm text-gray-400 mb-4">
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
          <DialogPrimitive.Close className="absolute top-4 right-4 text-gray-400 hover:text-white">
            ✕
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default Dialog;
