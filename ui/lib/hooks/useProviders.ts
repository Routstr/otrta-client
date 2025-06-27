import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProviderService } from '@/lib/api/services/providers';
import { toast } from 'sonner';

export function useProviders() {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await ProviderService.listProviders();
      return response;
    },
  });

  return {
    providers: data?.providers || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
  };
}

export function useSetDefaultProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (providerId: number) => ProviderService.setDefaultProvider(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success('Default provider updated successfully');
    },
    onError: (error) => {
      console.error('Error setting default provider:', error);
      toast.error('Failed to update default provider');
    },
  });
} 