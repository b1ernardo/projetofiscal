import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
}

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export function useSubCategories() {
  return useQuery({
    queryKey: ["sub-categories"],
    queryFn: async (): Promise<SubCategory[]> => {
      const apiURL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiURL}/sub-categories`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Erro ao carregar sub-categorias');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ category_id, name }: { category_id: string; name: string }) => {
      const apiURL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiURL}/sub-categories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ category_id, name }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao salvar sub-categoria');
      }
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sub-categories"] }),
  });
}

export function useDeleteSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const apiURL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiURL}/sub-categories/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao remover sub-categoria');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sub-categories"] }),
  });
}
