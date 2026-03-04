

# Venda por Unidade e Caixa (Grade)

## Objetivo
Permitir que produtos (especialmente bebidas) possam ser vendidos tanto por unidade quanto por caixa/grade. As configuracoes de caixa (nome e quantidade de unidades) serao definidas no cadastro do produto.

## Como vai funcionar

**No Cadastro do Produto:**
- Um novo campo "Formatos de Venda (Grades/Caixas)" aparecera no formulario
- O usuario podera adicionar multiplas configuracoes de caixa, por exemplo:
  - "Caixa c/ 12 un" -> 12 unidades
  - "Caixa c/ 24 un" -> 24 unidades
- Cada configuracao tera: nome (label) e quantidade de unidades
- O preco da caixa sera calculado automaticamente (preco unitario x quantidade), mas podera ser ajustado manualmente

**No PDV (Ponto de Venda):**
- Ao clicar em um produto que tem grades configuradas, um mini-dialog aparecera perguntando o formato de venda: "Unidade" ou as caixas configuradas (ex: "Caixa c/ 12")
- O item sera adicionado ao carrinho com o nome indicando o formato e o preco correspondente

## Detalhes Tecnicos

### 1. Banco de Dados - Nova tabela `product_box_configs`

```text
product_box_configs
-----------------------------
id          uuid (PK)
product_id  uuid (FK -> products)
label       text (ex: "Caixa c/ 12")
quantity    integer (ex: 12)
price       numeric (preco da caixa, padrao = sale_price * quantity)
created_at  timestamptz
```

- RLS: mesmas regras da tabela `products` (admin/estoquista manage, authenticated read)

### 2. Formulario do Produto (`ProductFormDialog.tsx`)

- Adicionar secao "Formatos de Venda" abaixo dos campos de estoque
- Botao "+ Adicionar Caixa/Grade" que cria uma linha com campos: Label, Qtd Unidades, Preco
- O preco sera pre-calculado ao preencher a quantidade (preco de venda x qtd), mas editavel
- Botao de remover em cada linha de configuracao

### 3. Pagina de Produtos (`Produtos.tsx`)

- Na tabela, adicionar indicador visual (icone ou badge) quando o produto tem grades configuradas
- Os dados das grades serao salvos junto com o produto

### 4. PDV (`PDV.tsx`)

- Ao clicar num produto com grades, abrir um dialog compacto com opcoes:
  - "Unidade - R$ X,XX"
  - "Caixa c/ 12 - R$ XX,XX"
  - "Caixa c/ 24 - R$ XX,XX"
- Ao selecionar, o item entra no carrinho com nome e preco corretos
- Produtos sem grade continuam adicionando direto ao carrinho como hoje

### 5. Novos arquivos

- `src/components/pdv/SaleFormatDialog.tsx` - Dialog de selecao de formato no PDV
- `src/components/produtos/BoxConfigSection.tsx` - Secao de configuracao de grades no formulario de produto

### 6. Arquivos editados

- `src/components/produtos/ProductFormDialog.tsx` - Adicionar secao de grades
- `src/pages/Produtos.tsx` - Indicador de grades na tabela, salvar/carregar configs
- `src/pages/PDV.tsx` - Logica de selecao de formato ao adicionar ao carrinho
- Migration SQL para criar tabela `product_box_configs`

