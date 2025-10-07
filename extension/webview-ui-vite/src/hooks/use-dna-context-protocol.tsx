import { useState, useCallback } from 'react';

export function useDnaContextProtocol() {
  const [isDnaContextProtocolOpen, setIsDnaContextProtocolOpen] =
    useState(false);

  const toggleDnaContextProtocol = useCallback(() => {
    setIsDnaContextProtocolOpen((prev) => !prev);
  }, []);

  const openDnaContextProtocol = useCallback(() => {
    setIsDnaContextProtocolOpen(true);
  }, []);

  const closeDnaContextProtocol = useCallback(() => {
    setIsDnaContextProtocolOpen(false);
  }, []);

  return {
    isDnaContextProtocolOpen,
    toggleDnaContextProtocol,
    openDnaContextProtocol,
    closeDnaContextProtocol,
  };
}
