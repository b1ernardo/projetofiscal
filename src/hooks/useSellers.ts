import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Seller {
    id: string;
    company_id: string;
    name: string;
    email?: string;
    phone?: string;
    active: boolean;
    created_at: string;
}

const API = import.meta.env.VITE_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

export const useSellers = () => {
    return useQuery({
        queryKey: ["sellers"],
        queryFn: async (): Promise<Seller[]> => {
            const response = await fetch(`${API}/sellers`, { headers: authHeader() });
            if (!response.ok) throw new Error('Falha ao carregar vendedores');
            return response.json();
        },
    });
};

export const useAddSeller = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<Seller>) => {
            const response = await fetch(`${API}/sellers`, {
                method: "POST",
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao adicionar vendedor');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sellers"] });
            toast.success("Vendedor adicionado com sucesso!");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};

export const useUpdateSeller = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: Partial<Seller>) => {
            const response = await fetch(`${API}/sellers/${id}`, {
                method: "PUT",
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao atualizar vendedor');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sellers"] });
            toast.success("Vendedor atualizado com sucesso!");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};

export const useDeleteSeller = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API}/sellers/${id}`, {
                method: "DELETE",
                headers: authHeader(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao excluir vendedor');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sellers"] });
            toast.success("Vendedor excluído com sucesso!");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};
