import { createContext, useContext, useState, ReactNode } from 'react';

interface DialogContextType {
  isArchiveDialogOpen: boolean;
  setArchiveDialogOpen: (isOpen: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isArchiveDialogOpen, setArchiveDialogOpen] = useState(false);

  return (
    <DialogContext.Provider value={{ isArchiveDialogOpen, setArchiveDialogOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogContext must be used within DialogProvider');
  }
  return context;
}
