import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface EmitFiscalParams {
    saleId: string;
    model: '55' | '65';
}

export function useFiscal() {
    return useMutation({
        mutationFn: async ({ saleId, model }: EmitFiscalParams) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/fiscal/emitir`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ saleId, model }),
            });

            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                // throw the rawText wrapped properly so we can see the PHP error
                throw new Error(!response.ok ? `Erro Servidor: ${rawText.substring(0, 100)}...` : 'Falha ao analisar a resposta');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao emitir nota fiscal');
            }

            return data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Nota fiscal emitida com sucesso!", {
                action: data.noteId ? {
                    label: "Ver DANFE",
                    onClick: () => window.open(`${import.meta.env.VITE_API_URL}/fiscal/danfe/${data.noteId}`, '_blank')
                } : undefined
            });
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });
}

export interface CancelFiscalParams {
    saleId: string;
    justificativa: string;
}

export function useCancelFiscal() {
    return useMutation({
        mutationFn: async ({ saleId, justificativa }: CancelFiscalParams) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/fiscal/cancelar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ saleId, justificativa }),
            });

            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                // Return generic error if not JSON
                throw new Error(!response.ok ? 'Erro do servidor (Resposta inválida)' : 'Falha ao analisar a resposta');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao cancelar a nota fiscal na SEFAZ');
            }

            return data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Nota fiscal cancelada com sucesso!");
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });
}
