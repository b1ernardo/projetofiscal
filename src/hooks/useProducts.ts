import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
export interface BoxConfig {
  label: string;
  quantity: number;
  price: number;
}

export interface ProductWithBoxConfigs {
  id: string;
  name: string;
  code: string;
  category_id: string;
  category_name: string | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_current: number;
  stock_min: number;
  photo_url: string;
  active: boolean;
  ncm: string | null;
  cest: string | null;
  cfop_padrao: string | null;
  origem: number | null;
  cst: string | null;
  csosn: string | null;
  pis_cst_entrada: string | null;
  pis_cst_saida: string | null;
  pis_aliquota: number | null;
  cofins_aliquota: number | null;
  ipi_cst: string | null;
  ipi_aliquota: number | null;
  product_code: number | null;
  boxConfigs: BoxConfig[];
}

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

async function fetchProducts(): Promise<ProductWithBoxConfigs[]> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/products`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao carregar produtos');
  }

  const products = await response.json();

  return (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    category_id: p.category_id,
    category_name: p.category_name ?? null,
    unit: p.unit,
    cost_price: Number(p.cost_price),
    sale_price: Number(p.sale_price),
    stock_current: Number(p.stock_current),
    stock_min: Number(p.stock_min),
    photo_url: p.photo_url,
    active: Boolean(p.active),
    ncm: p.ncm,
    cest: p.cest,
    cfop_padrao: p.cfop_padrao,
    origem: p.origem !== null ? Number(p.origem) : null,
    cst: p.cst,
    csosn: p.csosn,
    pis_cst_entrada: p.pis_cst_entrada,
    pis_cst_saida: p.pis_cst_saida,
    pis_aliquota: p.pis_aliquota !== null ? Number(p.pis_aliquota) : null,
    cofins_aliquota: p.cofins_aliquota !== null ? Number(p.cofins_aliquota) : null,
    ipi_cst: p.ipi_cst,
    ipi_aliquota: p.ipi_aliquota !== null ? Number(p.ipi_aliquota) : null,
    product_code: p.product_code !== null ? Number(p.product_code) : null,
    boxConfigs: (p.boxConfigs || []).map((bc: any) => ({
      label: bc.label,
      quantity: Number(bc.quantity),
      price: Number(bc.price)
    })),
  }));
}

export function useProducts() {
  return useQuery({
    queryKey: ["products-with-configs"],
    queryFn: fetchProducts,
  });
}

interface SaveProductData {
  name: string;
  code: string;
  category: string;
  unit: string;
  costPrice: number;
  margin: number;
  salePrice: number;
  stock: number;
  stockMin: number;
  imageUrl: string;
  ncm?: string;
  cest?: string;
  cfop_padrao?: string;
  origem?: number;
  cst?: string;
  csosn?: string;
  pis_cst_entrada?: string;
  pis_cst_saida?: string;
  pis_aliquota?: number;
  cofins_aliquota?: number;
  ipi_cst?: string;
  ipi_aliquota?: number;
  productCode?: number;
  boxConfigs: BoxConfig[];
}

export function useSaveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: SaveProductData }) => {
      const url = id
        ? `${import.meta.env.VITE_API_URL}/products`
        : `${import.meta.env.VITE_API_URL}/products`;

      const method = id ? 'PUT' : 'POST';

      const payload = {
        id, // For update
        name: data.name,
        code: data.code,
        category: data.category,
        unit: data.unit,
        cost_price: data.costPrice,
        sale_price: data.salePrice,
        stock_current: data.stock,
        stock_min: data.stockMin,
        photo_url: data.imageUrl,
        ncm: data.ncm,
        cest: data.cest,
        cfop_padrao: data.cfop_padrao,
        origem: data.origem,
        cst: data.cst,
        csosn: data.csosn,
        pis_cst_entrada: data.pis_cst_entrada,
        pis_cst_saida: data.pis_cst_saida,
        pis_aliquota: data.pis_aliquota,
        cofins_aliquota: data.cofins_aliquota,
        ipi_cst: data.ipi_cst,
        ipi_aliquota: data.ipi_aliquota,
        product_code: data.productCode,
        boxConfigs: data.boxConfigs
      };

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar produto');
      }

      const result = await response.json();
      return result.id || id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-with-configs"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao remover produto');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-with-configs"] });
    },
  });
}
