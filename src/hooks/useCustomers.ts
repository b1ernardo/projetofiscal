import { useQuery, useMutation } from "@tanstack/react-query";

export interface Customer {
    id: string;
    name: string;
    cpf_cnpj?: string;
    phone?: string;
    email?: string;
    ie?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    codigo_municipio?: string;
    uf?: string;
    address?: string;
    status?: string;
}

const fetchCustomers = async (): Promise<Customer[]> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
    });
    if (!response.ok) {
        throw new Error('Falha ao carregar clientes');
    }
    return response.json();
};

export const useCustomers = () => {
    return useQuery({
        queryKey: ["customers"],
        queryFn: fetchCustomers,
    });
};

export const useDeleteCustomer = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Falha ao deletar cliente');
            }
            return response.json();
        }
    });
};

export const useUpdateCustomer = () => {
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Customer> }) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Falha ao atualizar cliente');
            }
            return response.json();
        }
    });
};
