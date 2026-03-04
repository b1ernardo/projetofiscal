import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface NaturezaOperacao {
    id: string;
    descricao: string;
    cfop?: string | null;
    padrao?: boolean;
}

const API = import.meta.env.VITE_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

const fetchNaturezas = async (search?: string): Promise<NaturezaOperacao[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${API}/fiscal/naturezas${params}`, { headers: authHeader() });
    if (!response.ok) throw new Error('Falha ao carregar naturezas de operação');
    return response.json();
};

export const useNaturezas = (search?: string) => {
    return useQuery({
        queryKey: ["naturezas", search ?? ""],
        queryFn: () => fetchNaturezas(search),
    });
};

export const useAddNatureza = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { descricao: string; cfop?: string }) => {
            const response = await fetch(`${API}/fiscal/naturezas`, {
                method: "POST",
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao adicionar natureza de operação');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["naturezas"] });
            toast.success("Natureza de Operação adicionada!");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};

export const useSetNaturezaPadrao = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API}/fiscal/naturezas/${id}/set-padrao`, {
                method: "POST",
                headers: authHeader(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao definir natureza padrão');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["naturezas"] });
            toast.success("Natureza padrão definida! Será pré-selecionada nas NF-e.");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};

export const useDeleteNatureza = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API}/fiscal/naturezas/${id}`, {
                method: "DELETE",
                headers: authHeader(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao excluir natureza de operação');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["naturezas"] });
            toast.success("Natureza de Operação excluída!");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
};
