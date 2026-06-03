import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface SaveQuoteParams {
    cart: CartItem[];
    total: number;
    discount?: number;
    customerId?: string;
    sellerId?: string;
    validityDays: number;
    observations?: string;
}

export function useSaveQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: SaveQuoteParams) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/quotes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao processar orçamento');
            }

            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
}

export function useUpdateQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...params }: SaveQuoteParams & { id: string }) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/quotes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao atualizar orçamento');
            }

            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
}
