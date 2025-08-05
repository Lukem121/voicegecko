import { useCallback, useState } from 'react';

/**
 * Custom hook for managing student discount modal state.
 * This allows reusing the student discount logic across different pages while maintaining
 * flexibility for custom trigger UI styling.
 *
 * @returns Object containing modal state management functions
 */
export const useStudentDiscountModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleModal = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    // State
    isOpen,

    // Actions
    openModal,
    closeModal,
    toggleModal,
  };
};
