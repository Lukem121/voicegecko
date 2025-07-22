import { useEffect, useState } from "react";

export interface UseSearchParams {
  initialValue?: string;
  delay?: number;
}

export const useDebouncedSearch = ({
  initialValue = "",
  delay = 300,
}: UseSearchParams = {}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, delay]);

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    isSearching: searchTerm !== debouncedSearchTerm,
  };
};
