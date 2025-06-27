import { useQuery } from '@tanstack/react-query';
import { MintService } from '@/lib/api/services/mints';

export function useMints() {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['mints'],
    queryFn: async () => {
      const response = await MintService.listMints();
      return response;
    },
  });

  return {
    mints: data?.mints || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
  };
} 