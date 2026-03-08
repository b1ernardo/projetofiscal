import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DeliveryOrderItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    price: string | number;
    observation?: string;
}

export interface DeliveryOrder {
    id: string;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    payment_method: string;
    change_for?: string | number;
    subtotal: string | number;
    delivery_fee: string | number;
    total: string | number;
    status: 'pendente' | 'preparando' | 'saiu_entrega' | 'entregue' | 'cancelado';
    order_type: string;
    source: string;
    created_at: string;
    items: DeliveryOrderItem[];
}

const getApiUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && apiUrl !== '/api') return apiUrl.replace(/\/$/, '');

    // Check if we are in /projetofiscal/ context
    if (window.location.pathname.includes('/projetofiscal/')) {
        return '/projetofiscal/api';
    }
    return '/api';
};

const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

export function useDeliveryOrders(status?: string) {
    return useQuery({
        queryKey: ['delivery-orders', status],
        queryFn: async (): Promise<DeliveryOrder[]> => {
            let url = `${getApiUrl()}/delivery-orders`;
            if (status && status !== 'todos') {
                url += `?status=${status}`;
            }
            const response = await fetch(url, { headers: getHeaders() });
            if (!response.ok) throw new Error("Erro ao buscar pedidos");
            return response.json();
        },
        refetchInterval: 15000, // Auto refresh every 15s to check for new orders
    });
}

export function useUpdateDeliveryOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const response = await fetch(`${getApiUrl()}/delivery-orders/${id}/status`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error("Erro ao atualizar status");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
        }
    });
}

export function useCreateDeliveryOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            // public flag is used if the request comes from the public delivery page (no auth)
            const isPublic = !localStorage.getItem('auth_token');
            const url = `${getApiUrl()}/delivery-orders${isPublic ? '?public=true' : ''}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(!isPublic && { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` })
                },
                body: JSON.stringify(data)
            });

            const body = await response.json();
            if (!response.ok) throw new Error(body.message || "Erro ao criar pedido");
            return body;
        },
        onSuccess: () => {
            // Invalidate if we are in the admin panel. If we are public, it doesn't matter, but it's safe.
            queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
        }
    });
}
