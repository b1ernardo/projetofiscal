import { useQuery } from "@tanstack/react-query";

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/suppliers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar fornecedores');
      return response.json();
    },
  });
}
