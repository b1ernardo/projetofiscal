import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";

export interface SOItem {
    id?: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface SOService {
    id?: string;
    description: string;
    price: number;
}

export interface ServiceOrder {
    id: string;
    so_number?: number;
    company_id: string;
    customer_id: string;
    customer_name?: string;
    customer_phone?: string;
    customer_doc?: string;
    customer_address?: string;
    user_id: string;
    user_email?: string;
    status: 'pendente' | 'em_analise' | 'orcamento_aprovado' | 'orcamento_reprovado' | 'em_execucao' | 'aguardando_pecas' | 'pronto' | 'entregue' | 'cancelado';
    priority: 'baixa' | 'media' | 'alta';
    item_type: string;
    item_make?: string;
    item_model?: string;
    item_identifier?: string;
    item_color?: string;
    item_condition?: string;
    accessories?: string;
    problem_reported: string;
    problem_found?: string;
    service_performed?: string;
    internal_notes?: string;
    labor_total: number;
    parts_total: number;
    discount: number;
    total_amount: number;
    entry_date: string;
    expected_delivery?: string;
    exit_date?: string;
    created_at: string;
    items?: SOItem[];
    services?: SOService[];
}

export const useServiceOrders = () => {
    return useQuery({
        queryKey: ["service-orders"],
        queryFn: async () => {
            return api.get<ServiceOrder[]>("/service-orders");
        },
    });
};

export const useServiceOrderDetail = (id: string | null) => {
    return useQuery({
        queryKey: ["service-order", id],
        queryFn: async () => {
            if (!id) return null;
            return api.get<ServiceOrder>(`/service-orders/${id}`);
        },
        enabled: !!id,
    });
};

export const useSaveServiceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            if (data.id) {
                return api.put(`/service-orders/${data.id}`, data);
            }
            return api.post("/service-orders", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
            toast.success("Ordem de Serviço salva com sucesso!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao salvar Ordem de Serviço");
        },
    });
};

export const useUpdateSOStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            return api.put(`/service-orders/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
            toast.success("Status atualizado!");
        },
    });
};

export const useDeleteSO = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/service-orders/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
            toast.success("Ordem de Serviço excluída!");
        },
    });
};
