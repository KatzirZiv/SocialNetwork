import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { users, groups, posts } from '../services/api';

const useSearch = (type = 'all', debounceTime = 500) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceTime);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceTime]);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['search', 'users', debouncedTerm],
    queryFn: () => users.getAll({ search: debouncedTerm }),
    enabled: (type === 'all' || type === 'users') && debouncedTerm.length > 0,
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['search', 'groups', debouncedTerm],
    queryFn: () => groups.getAll({ search: debouncedTerm }),
    enabled: (type === 'all' || type === 'groups') && debouncedTerm.length > 0,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['search', 'posts', debouncedTerm],
    queryFn: () => posts.getAll({ search: debouncedTerm }),
    enabled: (type === 'all' || type === 'posts') && debouncedTerm.length > 0,
  });

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
  }, []);

  const isLoading = usersLoading || groupsLoading || postsLoading;

  const results = {
    users: usersData?.data || [],
    groups: groupsData?.data || [],
    posts: postsData?.data || [],
  };

  return {
    searchTerm,
    debouncedTerm,
    results,
    isLoading,
    handleSearch,
    clearSearch,
  };
};

export default useSearch; 