<?php
// /api/controllers/ProductsController.php

require_once 'ApiController.php';

class ProductsController extends ApiController {
    
    public function list() {
        $this->authenticate();

        $query = "SELECT p.*, c.name as category_name 
                  FROM products p 
                  LEFT JOIN categories c ON p.category_id = c.id 
                  WHERE p.active = 1 AND p.company_id = :company_id
                  ORDER BY p.name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':company_id' => $this->company_id]);
        $products = $stmt->fetchAll();

        // Busca configurações de caixa para todos os produtos da empresa
        $bc_query = "SELECT pbc.* FROM product_box_configs pbc 
                     INNER JOIN products p ON pbc.product_id = p.id
                     WHERE p.company_id = :company_id";
        $bc_stmt = $this->conn->prepare($bc_query);
        $bc_stmt->execute([':company_id' => $this->company_id]);
        $all_configs = $bc_stmt->fetchAll();

        // Agrupa as configs por produto
        $configs_by_product = [];
        foreach ($all_configs as $bc) {
            $configs_by_product[$bc['product_id']][] = [
                "id" => $bc['id'],
                "label" => $bc['label'],
                "quantity" => (int)$bc['quantity'],
                "price" => (float)$bc['price']
            ];
        }

        // Monta o objeto final
        foreach ($products as &$p) {
            $p['boxConfigs'] = $configs_by_product[$p['id']] ?? [];
            $p['sale_price'] = (float)$p['sale_price'];
            $p['sale_price2'] = isset($p['sale_price2']) ? (float)$p['sale_price2'] : 0.0;
            $p['cost_price'] = (float)$p['cost_price'];
            $p['stock_current'] = (int)$p['stock_current'];
            $p['stock_min'] = (int)$p['stock_min'];
            $p['active'] = (bool)$p['active'];
            $p['ncm'] = $p['ncm'] ?? null;
            $p['cest'] = $p['cest'] ?? null;
            $p['cfop_padrao'] = $p['cfop_padrao'] ?? null;
            $p['origem'] = $p['origem'] !== null ? (int)$p['origem'] : null;
            $p['cst'] = $p['cst'] ?? '00';
            $p['csosn'] = $p['csosn'] ?? '102';
            $p['pis_cst_entrada'] = $p['pis_cst_entrada'] ?? '07';
            $p['pis_cst_saida'] = $p['pis_cst_saida'] ?? '07';
            $p['pis_aliquota'] = $p['pis_aliquota'] !== null ? (float)$p['pis_aliquota'] : null;
            $p['cofins_aliquota'] = $p['cofins_aliquota'] !== null ? (float)$p['cofins_aliquota'] : null;
            $p['ipi_cst'] = $p['ipi_cst'] ?? '53';
            $p['ipi_aliquota'] = $p['ipi_aliquota'] !== null ? (float)$p['ipi_aliquota'] : null;
            $p['product_code'] = $p['product_code'] !== null ? (int)$p['product_code'] : null;
            $p['venda_delivery'] = (bool)($p['venda_delivery'] ?? 0);
            $p['icms_aliquota'] = isset($p['icms_aliquota']) ? (float)$p['icms_aliquota'] : 0.0;
            $p['gross_weight']  = isset($p['gross_weight'])  ? (float)$p['gross_weight']  : 0.0;
            // Reforma Tributária EC 132/2023
            $p['cbs_regime']    = $p['cbs_regime']  ?? 'padrao';
            $p['is_incide']     = (bool)($p['is_incide']    ?? 0);
            $p['is_aliquota']   = isset($p['is_aliquota'])  ? (float)$p['is_aliquota'] : 0.0;
        }

        $this->jsonResponse($products);
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();

        $data = $this->getPostData();

        if (empty($data->name) || empty($data->sale_price)) {
            $this->jsonResponse(["message" => "Nome e preço de venda são obrigatórios"], 400);
        }

        try {
            $this->conn->beginTransaction();

            $id = generateUUID();
            $categoryId = getOrCreateCategory($this->conn, $data->category ?? "", $this->company_id);

            $cst = isset($data->cst) ? $data->cst : '00';
            $csosn = isset($data->csosn) ? $data->csosn : '102';
            $pis_cst_entrada = isset($data->pis_cst_entrada) ? $data->pis_cst_entrada : '07';
            $pis_cst_saida = isset($data->pis_cst_saida) ? $data->pis_cst_saida : '07';
            $pis_aliquota = isset($data->pis_aliquota) ? $data->pis_aliquota : 0.0;
            $cofins_aliquota = isset($data->cofins_aliquota) ? $data->cofins_aliquota : 0.0;
            $ipi_cst = isset($data->ipi_cst) ? $data->ipi_cst : '53';
            $ipi_aliquota = isset($data->ipi_aliquota) ? $data->ipi_aliquota : 0.0;

            $venda_delivery = isset($data->venda_delivery) ? (int)$data->venda_delivery : 0;

            $stmt = $this->conn->prepare("INSERT INTO products
                  (id, company_id, name, category_id, product_code, code, cost_price, sale_price, sale_price2,
                   stock_current, stock_min, unit, photo_url, active,
                   ncm, cest, cfop_padrao, origem, cst, csosn,
                   pis_cst_entrada, pis_cst_saida, pis_aliquota, cofins_aliquota,
                   ipi_cst, ipi_aliquota, icms_aliquota, gross_weight, venda_delivery,
                   cbs_regime, is_incide, is_aliquota)
                  VALUES (:id, :company_id, :name, :category_id, :product_code, :code, :cost_price, :sale_price, :sale_price2,
                   :stock_current, :stock_min, :unit, :photo_url, :active,
                   :ncm, :cest, :cfop_padrao, :origem, :cst, :csosn,
                   :pis_cst_entrada, :pis_cst_saida, :pis_aliquota, :cofins_aliquota,
                   :ipi_cst, :ipi_aliquota, :icms_aliquota, :gross_weight, :venda_delivery,
                   :cbs_regime, :is_incide, :is_aliquota)");

            $stmt->execute([
                ":id"             => $id,
                ":company_id"     => $this->company_id,
                ":name"           => $data->name,
                ":category_id"    => $categoryId,
                ":product_code"   => $data->product_code ?? null,
                ":code"           => $data->code ?? null,
                ":cost_price"     => $data->cost_price ?? 0,
                ":sale_price"     => $data->sale_price,
                ":sale_price2"    => isset($data->sale_price2) ? (float)$data->sale_price2 : 0.0,
                ":stock_current"  => $data->stock_current ?? 0,
                ":stock_min"      => $data->stock_min ?? 0,
                ":unit"           => $data->unit ?? 'UN',
                ":photo_url"      => $data->photo_url ?? null,
                ":active"         => 1,
                ":ncm"            => preg_replace('/\D/', '', $data->ncm ?? ''),
                ":cest"           => preg_replace('/\D/', '', $data->cest ?? ''),
                ":cfop_padrao"    => preg_replace('/\D/', '', $data->cfop_padrao ?? '5102'),
                ":origem"         => $data->origem !== null ? (int)$data->origem : 0,
                ":cst"            => $cst,
                ":csosn"          => $csosn,
                ":pis_cst_entrada"=> $pis_cst_entrada,
                ":pis_cst_saida"  => $pis_cst_saida,
                ":pis_aliquota"   => $pis_aliquota,
                ":cofins_aliquota"=> $cofins_aliquota,
                ":ipi_cst"        => $ipi_cst,
                ":ipi_aliquota"   => $ipi_aliquota,
                ":icms_aliquota"  => $data->icms_aliquota ?? 0.0,
                ":gross_weight"   => $data->gross_weight ?? 0.0,
                ":venda_delivery" => $venda_delivery,
                // Reforma Tributária EC 132/2023
                ":cbs_regime"     => $data->cbs_regime  ?? 'padrao',
                ":is_incide"      => !empty($data->is_incide) ? 1 : 0,
                ":is_aliquota"    => isset($data->is_aliquota) ? (float)$data->is_aliquota : 0.0,
            ]);

            if (!empty($data->boxConfigs) && is_array($data->boxConfigs)) {
                foreach ($data->boxConfigs as $bc) {
                    if (!empty($bc->label) && !empty($bc->quantity) && !empty($bc->price)) {
                        $bc_stmt = $this->conn->prepare("INSERT INTO product_box_configs (id, company_id, product_id, label, quantity, price) VALUES (:id, :company_id, :pid, :lbl, :qty, :prc)");
                        $bc_stmt->execute([
                            ":id" => generateUUID(),
                            ":company_id" => $this->company_id,
                            ":pid" => $id,
                            ":lbl" => $bc->label,
                            ":qty" => $bc->quantity,
                            ":prc" => $bc->price
                        ]);
                    }
                }
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Produto cadastrado", "id" => $id], 201);
        } catch (\Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao salvar: " . $e->getMessage()], 500);
        }
    }

    public function update() {
        require_once __DIR__ . '/../utils.php'; // Keep this for generateUUID if needed elsewhere
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->id) || empty($data->name) || empty($data->sale_price)) {
            $this->jsonResponse(["message" => "ID, nome e preço de venda são obrigatórios"], 400);
        }

        try {
            $this->conn->beginTransaction();
            $categoryId = getOrCreateCategory($this->conn, $data->category ?? "", $this->company_id);
            $cst = isset($data->cst) ? $data->cst : '00';
            $csosn = isset($data->csosn) ? $data->csosn : '102';
            $pis_cst_entrada = isset($data->pis_cst_entrada) ? $data->pis_cst_entrada : '07';
            $pis_cst_saida = isset($data->pis_cst_saida) ? $data->pis_cst_saida : '07';
            $pis_aliquota = isset($data->pis_aliquota) ? $data->pis_aliquota : 0.0;
            $cofins_aliquota = isset($data->cofins_aliquota) ? $data->cofins_aliquota : 0.0;
            $ipi_cst = isset($data->ipi_cst) ? $data->ipi_cst : '53';
            $ipi_aliquota = isset($data->ipi_aliquota) ? $data->ipi_aliquota : 0.0;
            $venda_delivery = isset($data->venda_delivery) ? (int)$data->venda_delivery : 0;

            $stmt = $this->conn->prepare("UPDATE products SET
                  name = :name, category_id = :category_id, product_code = :product_code, code = :code,
                  cost_price = :cost_price, sale_price = :sale_price, sale_price2 = :sale_price2,
                  stock_current = :stock_current, stock_min = :stock_min,
                  unit = :unit, photo_url = :photo_url,
                  ncm = :ncm, cest = :cest, cfop_padrao = :cfop_padrao, origem = :origem,
                  cst = :cst, csosn = :csosn,
                  pis_cst_entrada = :pis_cst_entrada, pis_cst_saida = :pis_cst_saida,
                  pis_aliquota = :pis_aliquota, cofins_aliquota = :cofins_aliquota,
                  ipi_cst = :ipi_cst, ipi_aliquota = :ipi_aliquota,
                  icms_aliquota = :icms_aliquota, gross_weight = :gross_weight,
                  venda_delivery = :venda_delivery,
                  cbs_regime = :cbs_regime, is_incide = :is_incide, is_aliquota = :is_aliquota
                  WHERE id = :id AND company_id = :company_id");

            $stmt->execute([
                ":id"             => $data->id,
                ":company_id"     => $this->company_id,
                ":name"           => $data->name,
                ":category_id"    => $categoryId,
                ":product_code"   => $data->product_code ?? null,
                ":code"           => $data->code ?? null,
                ":cost_price"     => $data->cost_price ?? 0,
                ":sale_price"     => $data->sale_price,
                ":sale_price2"    => isset($data->sale_price2) ? (float)$data->sale_price2 : 0.0,
                ":stock_current"  => $data->stock_current ?? 0,
                ":stock_min"      => $data->stock_min ?? 0,
                ":unit"           => $data->unit ?? 'un',
                ":photo_url"      => $data->photo_url ?? null,
                ":ncm"            => preg_replace('/\D/', '', $data->ncm ?? ''),
                ":cest"           => preg_replace('/\D/', '', $data->cest ?? ''),
                ":cfop_padrao"    => preg_replace('/\D/', '', $data->cfop_padrao ?? '5102'),
                ":origem"         => $data->origem !== null ? (int)$data->origem : 0,
                ":cst"            => $cst,
                ":csosn"          => $csosn,
                ":pis_cst_entrada"=> $pis_cst_entrada,
                ":pis_cst_saida"  => $pis_cst_saida,
                ":pis_aliquota"   => $pis_aliquota,
                ":cofins_aliquota"=> $cofins_aliquota,
                ":ipi_cst"        => $ipi_cst,
                ":ipi_aliquota"   => $ipi_aliquota,
                ":icms_aliquota"  => $data->icms_aliquota ?? 0.0,
                ":gross_weight"   => $data->gross_weight ?? 0.0,
                ":venda_delivery" => $venda_delivery,
                // Reforma Tributária EC 132/2023
                ":cbs_regime"     => $data->cbs_regime  ?? 'padrao',
                ":is_incide"      => !empty($data->is_incide) ? 1 : 0,
                ":is_aliquota"    => isset($data->is_aliquota) ? (float)$data->is_aliquota : 0.0,
            ]);

            // Sincroniza Box Configs (Deleta e insere)
            $this->conn->prepare("DELETE FROM product_box_configs WHERE product_id = :pid")->execute([":pid" => $data->id]);
            if (!empty($data->boxConfigs)) {
                foreach ($data->boxConfigs as $bc) {
                    $bc_stmt = $this->conn->prepare("INSERT INTO product_box_configs (id, company_id, product_id, label, quantity, price) VALUES (:id, :company_id, :pid, :label, :qty, :price)");
                    $bc_stmt->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":pid" => $data->id,
                        ":label" => $bc->label,
                        ":qty" => $bc->quantity,
                        ":price" => $bc->price
                    ]);
                }
            }
            
            $this->conn->commit();
            $this->jsonResponse(["message" => "Produto atualizado"]);
        } catch (\Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao salvar: " . $e->getMessage()], 500);
        }
    }

    public function delete() {
        $this->authenticate();
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $parts = explode('/', trim($uri, '/'));
        $id = end($parts); // Assume ID is at the end of the URL /api/products/delete/{id}

        if (empty($id) || $id === 'products') {
             // Fallback to query param or body if needed
             $data = $this->getPostData();
             $id = $data->id ?? null;
         }

        if (!$id) $this->jsonResponse(["message" => "ID não fornecido"], 400);

        $stmt = $this->conn->prepare("UPDATE products SET active = 0 WHERE id = :id AND company_id = :company_id");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);

        $this->jsonResponse(["message" => "Produto removido (desativado)"]);
    }

    public function adjustStock() {
        require_once __DIR__ . '/../utils.php';
        $payload = $this->authenticate();
        $userId = $payload['id'] ?? null;
        $data = $this->getPostData();

        if (empty($data->product_id) || !isset($data->quantity) || empty($data->type)) {
            $this->jsonResponse(["message" => "ID do produto, quantidade e tipo são obrigatórios"], 400);
        }

        $productId = $data->product_id;
        $quantity = (float)$data->quantity;
        $type = $data->type; // 'entrada' or 'saida'
        $observation = $data->observation ?? '';

        if ($type !== 'entrada' && $type !== 'saida') {
            $this->jsonResponse(["message" => "Tipo de movimentação inválido (deve ser 'entrada' ou 'saida')"], 400);
        }

        if ($quantity <= 0) {
            $this->jsonResponse(["message" => "A quantidade deve ser maior que zero"], 400);
        }

        try {
            $this->conn->beginTransaction();

            // 1. Verifica se o produto pertence à empresa
            $checkStmt = $this->conn->prepare("SELECT id, stock_current FROM products WHERE id = :id AND company_id = :company_id");
            $checkStmt->execute([":id" => $productId, ":company_id" => $this->company_id]);
            $product = $checkStmt->fetch();

            if (!$product) {
                $this->jsonResponse(["message" => "Produto não encontrado"], 404);
            }

            // 2. Calcula novo estoque
            $adjustment = ($type === 'entrada') ? $quantity : -$quantity;

            // 3. Atualiza o estoque na tabela products
            $updateStmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current + :adj WHERE id = :id AND company_id = :company_id");
            $updateStmt->execute([
                ":adj" => $adjustment,
                ":id" => $productId,
                ":company_id" => $this->company_id
            ]);

            // 4. Insere a movimentação de estoque
            $movId = generateUUID();
            $movStmt = $this->conn->prepare("INSERT INTO stock_movements (id, company_id, product_id, quantity, type, observation, created_by, created_at) 
                VALUES (:id, :company_id, :product_id, :quantity, :type, :observation, :created_by, :created_at)");
            
            $movStmt->execute([
                ":id" => $movId,
                ":company_id" => $this->company_id,
                ":product_id" => $productId,
                ":quantity" => $quantity,
                ":type" => $type,
                ":observation" => $observation,
                ":created_by" => $userId,
                ":created_at" => date('Y-m-d H:i:s')
            ]);

            $this->conn->commit();
            $this->jsonResponse(["message" => "Estoque ajustado com sucesso", "new_stock" => (float)$product['stock_current'] + $adjustment]);
        } catch (\Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            $this->jsonResponse(["message" => "Erro ao processar movimentação: " . $e->getMessage()], 500);
        }
    }

    public function getNextCode() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT MAX(product_code) as max_code FROM products WHERE company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $result = $stmt->fetch();
        $next = (int)($result['max_code'] ?? 0) + 1;
        $this->jsonResponse(["nextCode" => $next]);
    }
}

