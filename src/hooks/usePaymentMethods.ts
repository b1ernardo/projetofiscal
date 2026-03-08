import { useQuery } from "@tanstack/react-query";

export interface PaymentMethod {
    id: string;
    name: string;
    active: boolean;
    show_in_delivery: boolean;
}

const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export function usePaymentMethods() {
    return useQuery({
        queryKey: ['payment-methods'],
        queryFn: async (): Promise<PaymentMethod[]> => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/payment_methods`, {
                headers: getHeaders()
            });
            if (!response.ok) throw new Error("Erro ao carregar formas de pagamento");
            const data = await response.json();
            return data.map((m: any) => ({
                ...m,
                active: typeof m.active === 'string' ? parseInt(m.active) === 1 : !!m.active,
                show_in_delivery: typeof m.show_in_delivery === 'string' ? parseInt(m.show_in_delivery) === 1 : !!m.show_in_delivery
            }));
        }
    });
}
