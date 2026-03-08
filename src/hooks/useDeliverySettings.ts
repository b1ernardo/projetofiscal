import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DeliverySettings {
    slug: string;
    logo_url: string;
    banner_url: string;
    primary_color: string;
    greeting_text: string;
    store_status: string;
    whatsapp_number: string;
    min_order_value: number;
    delivery_fee: number;
}

const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export function useDeliverySettings() {
    return useQuery({
        queryKey: ['delivery-settings'],
        queryFn: async (): Promise<DeliverySettings | null> => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-settings`, {
                headers: getHeaders()
            });
            if (!response.ok) throw new Error("Erro ao carregar configurações do delivery");
            const data = await response.json();
            return data;
        }
    });
}

export function usePublicDeliverySettings(slug: string) {
    return useQuery({
        queryKey: ['public-delivery-settings', slug],
        queryFn: async (): Promise<DeliverySettings | null> => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-settings/${slug}`);
            if (!response.ok) throw new Error("Restaurante não encontrado");
            return response.json();
        },
        enabled: !!slug
    });
}

export function useSaveDeliverySettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<DeliverySettings>) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-settings`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Erro ao salvar configurações do delivery");
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-settings'] });
        }
    });
}
export interface DeliveryNeighborhood {
    id: string;
    name: string;
    fee: number | string;
}

export function useDeliveryNeighborhoods() {
    return useQuery({
        queryKey: ['delivery-neighborhoods'],
        queryFn: async (): Promise<DeliveryNeighborhood[]> => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-neighborhoods`, {
                headers: getHeaders()
            });
            if (!response.ok) throw new Error("Erro ao carregar bairros");
            return response.json();
        }
    });
}

export function useSaveDeliveryNeighborhood() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<DeliveryNeighborhood>) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-neighborhoods`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error("Erro ao salvar bairro");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-neighborhoods'] });
        }
    });
}

export function useDeleteDeliveryNeighborhood() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-neighborhoods/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!response.ok) throw new Error("Erro ao excluir bairro");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-neighborhoods'] });
        }
    });
}
