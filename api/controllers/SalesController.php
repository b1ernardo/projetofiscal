<?php
// /api/controllers/SalesController.php

require_once 'ApiController.php';

class SalesController extends ApiController {

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->cart) || empty($data->total)) {
            $this->jsonResponse(["message" => "Venda vazia ou sem valor total"], 400);
        }

        try {
            $this->conn->beginTransaction();

            $saleId = generateUUID();
            $paymentLabel = "";
            if (!empty($data->payments)) {
                $labels = array_map(function($p) { return $p->methodName; }, $data->payments);
                $paymentLabel = implode(" / ", $labels);
            }

            // 1. Inserir a venda
            $stmt = $this->conn->prepare("INSERT INTO sales (id, customer_id, total_amount, payment_method, created_by, status, discount) 
                                          VALUES (:id, :customer_id, :total, :method, :uid, 'completed', :discount)");
            $stmt->execute([
                ":id" => $saleId,
                ":customer_id" => $data->customerId ?? null,
                ":total" => $data->total,
                ":method" => $paymentLabel,
                ":uid" => $auth['id'],
                ":discount" => $data->discount ?? 0
            ]);

            // Pegar o número sequencial da venda
            $stmt = $this->conn->prepare("SELECT sale_number FROM sales WHERE id = :id");
            $stmt->execute([':id' => $saleId]);
            $saleNumber = $stmt->fetchColumn();

            // 2. Inserir pagamentos
            if (!empty($data->payments)) {
                foreach ($data->payments as $p) {
                    $stmt = $this->conn->prepare("INSERT INTO sale_payments (id, sale_id, method_name, amount) VALUES (:id, :sale_id, :method, :amount)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":sale_id" => $saleId,
                        ":method" => $p->methodName,
                        ":amount" => $p->amount
                    ]);
                }
            }

            // 3. Processar Itens e Estoque
            foreach ($data->cart as $item) {
                $productId = substr($item->id, 0, 36);

                $stmt = $this->conn->prepare("INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price) VALUES (:id, :sale_id, :product_id, :qty, :price)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":sale_id" => $saleId,
                    ":product_id" => $productId,
                    ":qty" => $item->quantity,
                    ":price" => $item->price
                ]);

                $multiplier = 1;
                $bc_stmt = $this->conn->prepare("SELECT quantity, label FROM product_box_configs WHERE product_id = :pid");
                $bc_stmt->execute([':pid' => $productId]);
                $box_configs = $bc_stmt->fetchAll();
                
                $matched_label = null;
                foreach ($box_configs as $bc) {
                    if (strpos($item->id, "-" . $bc['label']) !== false) {
                        $multiplier = (int)$bc['quantity'];
                        $matched_label = $bc['label'];
                        break;
                    }
                }

                $totalUnits = $item->quantity * $multiplier;

                $stmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current - :units WHERE id = :id");
                $stmt->execute([":units" => $totalUnits, ":id" => $productId]);

                $obs = "Venda #" . $saleNumber;
                if ($matched_label) $obs .= " ({$item->quantity}x {$matched_label})";
                
                $stmt = $this->conn->prepare("INSERT INTO stock_movements (id, product_id, quantity, type, observation, created_by) VALUES (:id, :pid, :qty, 'saida', :obs, :uid)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":pid" => $productId,
                    ":qty" => $totalUnits,
                    ":obs" => $obs,
                    ":uid" => $auth['id']
                ]);
            }

            // 4. Fluxo de Caixa
            $stmt = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1");
            $stmt->execute();
            $register = $stmt->fetch();

            if ($register && !empty($data->payments)) {
                foreach ($data->payments as $p) {
                    // Se for "Conta", não entra no caixa (vai para contas a receber)
                    if (strtolower($p->methodName) === 'conta') {
                        $stmt = $this->conn->prepare("INSERT INTO accounts_receivable (id, description, customer_id, amount, due_date, status, category) 
                                                      VALUES (:id, :desc, :customer_id, :amount, :due, 'pending', 'Vendas')");
                        $stmt->execute([
                            ":id" => generateUUID(),
                            ":desc" => "Venda #" . $saleNumber . " (Prazo)",
                            ":customer_id" => $data->customerId ?? null,
                            ":amount" => $p->amount,
                            ":due" => date('Y-m-d', strtotime('+30 days')) // Default 30 days
                        ]);
                        continue;
                    }

                    $stmt = $this->conn->prepare("INSERT INTO cash_movements (id, cash_register_id, amount, type, observation, created_by) VALUES (:id, :reg_id, :amount, 'venda', :obs, :uid)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":reg_id" => $register['id'],
                        ":amount" => $p->amount,
                        ":obs" => "Venda #{$saleNumber} - " . $p->methodName,
                        ":uid" => $auth['id']
                    ]);
                }
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Venda realizada com sucesso", "id" => $saleId, "sale_number" => $saleNumber]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao processar venda: " . $e->getMessage()], 500);
        }
    }

    public function getDetail($id) {
        $this->authenticate();
        require_once __DIR__ . '/../utils.php';
        
        $stmt = $this->conn->prepare("SELECT * FROM sales WHERE id = :id");
        $stmt->execute([":id" => $id]);
        $sale = $stmt->fetch();
        if (!$sale) $this->jsonResponse(["message" => "Venda não encontrada"], 404);

        $stmt = $this->conn->prepare("
            SELECT 
                si.id, si.sale_id, si.product_id, si.quantity, si.unit_price,
                p.name as product_name,
                p.code as product_code,
                p.ncm as product_ncm,
                p.cest as product_cest,
                p.cfop_padrao as product_cfop,
                p.unit as product_unit,
                p.cst as product_cst,
                p.csosn as product_csosn,
                p.origem as product_origem
            FROM sale_items si 
            LEFT JOIN products p ON si.product_id = p.id 
            WHERE si.sale_id = :id
        ");
        $stmt->execute([":id" => $id]);
        $sale['items'] = $stmt->fetchAll();
        
        // Cast numeric fields
        $sale['total_amount'] = (float)$sale['total_amount'];
        $sale['discount'] = (float)($sale['discount'] ?? 0);
        $sale['sale_number'] = (int)$sale['sale_number'];

        $stmt = $this->conn->prepare("SELECT * FROM sale_payments WHERE sale_id = :id");
        $stmt->execute([":id" => $id]);
        $sale['payments'] = $stmt->fetchAll();

        // Carregar dados do cliente se existir customer_id
        if (!empty($sale['customer_id'])) {
            $stmt = $this->conn->prepare("SELECT id, name, cpf_cnpj, email, phone, address, ie, cep, logradouro, numero, bairro, municipio, codigo_municipio, uf FROM customers WHERE id = :id");
            $stmt->execute([":id" => $sale['customer_id']]);
            $sale['customer'] = $stmt->fetch() ?: null;
        } else {
            $sale['customer'] = null;
        }

        $this->jsonResponse($sale);
    }

    public function update($id) {
        $auth = $this->authenticate();
        require_once __DIR__ . '/../utils.php';
        $data = $this->getPostData();

        try {
            $this->conn->beginTransaction();

            // 1. Restore Stock (reverse old items)
            $stmt = $this->conn->prepare("SELECT si.product_id, si.quantity FROM sale_items si WHERE si.sale_id = :id");
            $stmt->execute([":id" => $id]);
            $oldItems = $stmt->fetchAll();
            foreach ($oldItems as $oi) {
                $this->conn->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :pid")
                           ->execute([":qty" => $oi['quantity'], ":pid" => $oi['product_id']]);
            }

            // 2. Clear old items and payments
            $this->conn->prepare("DELETE FROM sale_items WHERE sale_id = :id")->execute([":id" => $id]);
            $this->conn->prepare("DELETE FROM sale_payments WHERE sale_id = :id")->execute([":id" => $id]);

            // 3. Insert fresh items and adjust stock
            foreach ($data->items as $item) {
                $this->conn->prepare("INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price) VALUES (:id, :sale_id, :product_id, :qty, :price)")
                           ->execute([
                               ":id" => generateUUID(),
                               ":sale_id" => $id,
                                ":product_id" => substr($item->id, 0, 36),
                               ":qty" => $item->quantity,
                               ":price" => $item->price ?? ($item->unit_price ?? 0)
                           ]);
                
                $productId = substr($item->id, 0, 36);
                $this->conn->prepare("UPDATE products SET stock_current = stock_current - :qty WHERE id = :pid")
                           ->execute([":qty" => $item->quantity, ":pid" => $productId]);
            }

            // 4. Insert fresh payments
            $labels = [];
            foreach ($data->payments as $p) {
                $labels[] = $p->methodName;
                $this->conn->prepare("INSERT INTO sale_payments (id, sale_id, method_name, amount) VALUES (:id, :sale_id, :method, :amount)")
                           ->execute([
                               ":id" => generateUUID(),
                               ":sale_id" => $id,
                               ":method" => $p->methodName,
                               ":amount" => $p->amount
                           ]);
            }

            // 5. Update Sale table
            $paymentLabel = implode(" / ", $labels);
            $this->conn->prepare("UPDATE sales SET total_amount = :total, payment_method = :method WHERE id = :id")
                       ->execute([
                           ":total" => $data->total,
                           ":method" => $paymentLabel,
                           ":id" => $id
                       ]);

            $this->conn->commit();
            $this->jsonResponse(["message" => "Venda atualizada com sucesso"]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao atualizar: " . $e->getMessage()], 500);
        }
    }

    public function list() {
        $this->authenticate();
        
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        $saleNumber = $_GET['sale_number'] ?? null;
        $customerId = $_GET['customer_id'] ?? null;
        $fiscalStatus = $_GET['fiscal_status'] ?? null; // 'emitted', 'not_emitted', 'cancelled'

        $sql = "SELECT s.*, c.name as customer_name, 
                       fn.id as fiscal_id, fn.tipo as fiscal_tipo, fn.numero as fiscal_numero, fn.status as fiscal_status
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN (
                    SELECT id, sale_id, tipo, numero, status
                    FROM fiscal_notes
                    WHERE id IN (SELECT MAX(id) FROM fiscal_notes GROUP BY sale_id)
                ) fn ON s.id = fn.sale_id
                WHERE 1=1";
        
        $params = [];

        if ($startDate) {
            $sql .= " AND s.created_at >= :start";
            $params[':start'] = $startDate . " 00:00:00";
        }
        if ($endDate) {
            $sql .= " AND s.created_at <= :end";
            $params[':end'] = $endDate . " 23:59:59";
        }
        if ($saleNumber) {
            $sql .= " AND s.sale_number = :number";
            $params[':number'] = $saleNumber;
        }
        if ($customerId) {
            $sql .= " AND s.customer_id = :customer_id";
            $params[':customer_id'] = $customerId;
        }

        if ($fiscalStatus) {
            if ($fiscalStatus === 'emitted') {
                $sql .= " AND fn.status = 'generated'";
            } else if ($fiscalStatus === 'cancelled') {
                $sql .= " AND fn.status = 'cancelled'";
            } else if ($fiscalStatus === 'not_emitted') {
                $sql .= " AND fn.sale_id IS NULL";
            }
        }

        $sql .= " ORDER BY s.created_at DESC";

        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Garantir que os tipos numéricos sejam retornados corretamente
            foreach ($sales as &$sale) {
                $sale['total_amount'] = (float)$sale['total_amount'];
                $sale['discount'] = (float)$sale['discount'];
                $sale['sale_number'] = (int)$sale['sale_number'];
            }

            $this->jsonResponse($sales);
        } catch (PDOException $e) {
            $this->jsonResponse(["message" => "Erro ao listar vendas: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $auth = $this->authenticate();
        require_once __DIR__ . '/../utils.php';
        try {
            $this->conn->beginTransaction();

            $stmt = $this->conn->prepare("SELECT si.product_id, si.quantity FROM sale_items si WHERE si.sale_id = :id");
            $stmt->execute([":id" => $id]);
            $items = $stmt->fetchAll();

            foreach ($items as $item) {
                $this->conn->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :pid")
                           ->execute([":qty" => $item['quantity'], ":pid" => $item['product_id']]);
            }

            $this->conn->prepare("DELETE FROM sale_items WHERE sale_id = :id")->execute([":id" => $id]);
            $this->conn->prepare("DELETE FROM sale_payments WHERE sale_id = :id")->execute([":id" => $id]);
            $this->conn->prepare("DELETE FROM cash_movements WHERE observation LIKE CONCAT('%', :id)")->execute([":id" => substr($id, 0, 8)]);
            $this->conn->prepare("DELETE FROM sales WHERE id = :id")->execute([":id" => $id]);

            $this->conn->commit();
            $this->jsonResponse(["message" => "Venda removida com sucesso"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao remover: " . $e->getMessage()], 500);
        }
    }
}
