import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PaymentEntry {
  methodName: string;
  amount: number;
}

interface SaveSaleParams {
  cart: CartItem[];
  total: number;
  payments: PaymentEntry[];
  userId: string;
  discount?: number;
  customerId?: string;
}

export function useSaveSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cart, total, payments, userId, discount = 0, customerId }: SaveSaleParams) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          cart,
          total,
          payments,
          userId,
          discount,
          customerId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao processar venda');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      // Invalidate all related queries so every module refreshes
      queryClient.invalidateQueries({ queryKey: ["products-with-configs"] });
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["today-sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register"] });
      queryClient.invalidateQueries({ queryKey: ["cash-movements"] });
      queryClient.invalidateQueries({ queryKey: ["cash-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
