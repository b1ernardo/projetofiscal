import { useQuery } from "@tanstack/react-query";

interface FiscalConfig {
    cnpj: string;
    ie: string;
    razao_social: string;
    nome_fantasia?: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    cod_municipio: string;
    uf: string;
    cep: string;
    fone?: string;
    ambiente: string;
    ultimo_numero_nfe: number;
    serie_nfe: number;
    ultimo_numero_nfce: number;
    serie_nfce: number;
    csc_id?: string;
    csc_token?: string;
    certificado_senha?: string;
    percentual_tributos?: number;
}

export function useFiscalConfig() {
    return useQuery<FiscalConfig>({
        queryKey: ['fiscalConfig'],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/fiscal/config`);
            if (!response.ok) {
                throw new Error('Falha ao obter configurações fiscais');
            }
            return response.json();
        }
    });
}
