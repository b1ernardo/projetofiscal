import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Category {
    id: string;
    name: string;
}

const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

export function useCategories() {
    return useQuery({
        queryKey: ["categories"],
        queryFn: async (): Promise<Category[]> => {
            const apiURL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiURL}/categories`, {
                headers: getHeaders(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao carregar categorias');
            }

            return response.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useSaveCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (name: string) => {
            const apiURL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiURL}/categories`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao salvar categoria');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const apiURL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiURL}/categories/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ name }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao atualizar categoria');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const apiURL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiURL}/categories/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Não foi possível remover. Pode haver produtos vinculados.');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
    });
}
