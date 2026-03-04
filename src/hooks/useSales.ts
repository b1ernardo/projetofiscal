import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export interface SaleListItem {
    id: string;
    sale_number: number;
    customer_id: string | null;
    customer_name: string | null;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    fiscal_id: string | null;
    fiscal_tipo: 'NFE' | 'NFCE' | null;
    fiscal_numero: number | null;
    fiscal_status: string | null;
}

export interface SalesFilters {
    start_date?: string;
    end_date?: string;
    sale_number?: string;
    customer_id?: string;
    fiscal_status?: string;
}

export interface SaleDetail extends SaleListItem {
    discount: number;
    customer: {
        id: string;
        name: string;
        cpf_cnpj: string;
        email: string;
        phone: string;
        ie?: string;
        cep?: string;
        logradouro?: string;
        numero?: string;
        bairro?: string;
        municipio?: string;
        codigo_municipio?: string;
        uf?: string;
    } | null;
    items: Array<{
        id: string;
        product_id: string;
        product_name: string;
        product_code?: string;
        product_ncm?: string;
        product_cest?: string;
        product_cfop?: string;
        product_unit?: string;
        product_cst?: string;
        product_csosn?: string;
        product_origem?: number;
        quantity: number;
        unit_price: number;
    }>;
    payments: Array<{
        id: string;
        method_name: string;
        amount: number;
    }>;
}

const fetchSales = async (filters: SalesFilters): Promise<SaleListItem[]> => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.sale_number) params.append('sale_number', filters.sale_number);
    if (filters.customer_id) params.append('customer_id', filters.customer_id);
    if (filters.fiscal_status) params.append('fiscal_status', filters.fiscal_status);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/sales?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
    });

    if (!response.ok) {
        throw new Error('Erro ao carregar vendas');
    }

    return response.json();
};

const fetchSaleDetail = async (id: string): Promise<SaleDetail> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/${id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
    });

    if (!response.ok) {
        throw new Error('Erro ao carregar detalhes da venda');
    }

    return response.json();
};

export const useSales = (filters: SalesFilters) => {
    return useQuery({
        queryKey: ['sales', filters],
        queryFn: () => fetchSales(filters),
    });
};

export const useSaleDetail = (id: string | null) => {
    return useQuery({
        queryKey: ['sale-detail', id],
        queryFn: () => fetchSaleDetail(id!),
        enabled: !!id,
    });
};

export const useUpdateSale = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Erro ao atualizar venda');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sale-detail'] });
            toast.success("Venda atualizada com sucesso!");
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });
};
