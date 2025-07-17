import { useState, useCallback } from 'react';

export default function useDialogState(dialogNames = []) {
  const initial = {};
  dialogNames.forEach(name => { initial[name] = false; });
  const [open, setOpen] = useState(initial);

  const openDialog = useCallback((name) => {
    setOpen(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeDialog = useCallback((name) => {
    setOpen(prev => ({ ...prev, [name]: false }));
  }, []);

  const setDialog = useCallback((name, value) => {
    setOpen(prev => ({ ...prev, [name]: !!value }));
  }, []);

  return { open, openDialog, closeDialog, setDialog };
} 