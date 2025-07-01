import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProviderService, CreateCustomProviderRequest } from '@/lib/api/services/providers';
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

export function useDefaultProvider() {
  const {
    data: defaultProvider,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['defaultProvider'],
    queryFn: async () => {
      return await ProviderService.getDefaultProvider();
    },
  });

  return {
    defaultProvider,
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
      queryClient.invalidateQueries({ queryKey: ['defaultProvider'] });
      toast.success('Default provider updated successfully');
    },
    onError: (error) => {
      console.error('Error setting default provider:', error);
      toast.error('Failed to update default provider');
    },
  });
}

export function useCreateCustomProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCustomProviderRequest) => ProviderService.createCustomProvider(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['defaultProvider'] });
      toast.success('Custom provider created successfully');
    },
    onError: (error: unknown) => {
      console.error('Error creating custom provider:', error);
      const apiError = error as { response?: { data?: { error?: { type?: string; message?: string } } } };
      if (apiError?.response?.data?.error?.type === 'duplicate_error') {
        toast.error('A provider with this URL already exists');
      } else if (apiError?.response?.data?.error?.type === 'validation_error') {
        toast.error(apiError.response.data.error.message || 'Validation error');
      } else {
        toast.error('Failed to create custom provider');
      }
    },
  });
}

export function useDeleteCustomProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (providerId: number) => ProviderService.deleteCustomProvider(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['defaultProvider'] });
      toast.success('Custom provider deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting custom provider:', error);
      toast.error('Failed to delete custom provider');
    },
  });
} 