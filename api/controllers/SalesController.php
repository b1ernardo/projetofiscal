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
            $stmt = $this->conn->prepare("INSERT INTO sales (id, company_id, customer_id, seller_id, total_amount, payment_method, created_by, status, discount, created_at) 
                                          VALUES (:id, :company_id, :customer_id, :seller_id, :total, :method, :uid, 'completed', :discount, :created_at)");
            $stmt->execute([
                ":id" => $saleId,
                ":company_id" => $this->company_id,
                ":customer_id" => $data->customerId ?? null,
                ":seller_id" => $data->sellerId ?? null,
                ":total" => $data->total,
                ":method" => $paymentLabel,
                ":uid" => $auth['id'],
                ":discount" => $data->discount ?? 0,
                ":created_at" => date('Y-m-d H:i:s')
            ]);

            // Pegar o número sequencial da venda
            $stmt = $this->conn->prepare("SELECT sale_number FROM sales WHERE id = :id AND company_id = :company_id");
            $stmt->execute([':id' => $saleId, ':company_id' => $this->company_id]);
            $saleNumber = $stmt->fetchColumn();

            // 2. Inserir pagamentos
            if (!empty($data->payments)) {
                foreach ($data->payments as $p) {
                    $stmt = $this->conn->prepare("INSERT INTO sale_payments (id, company_id, sale_id, method_name, amount) VALUES (:id, :company_id, :sale_id, :method, :amount)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":sale_id" => $saleId,
                        ":method" => $p->methodName,
                        ":amount" => $p->amount
                    ]);
                }
            }

            // 3. Processar Itens e Estoque
            foreach ($data->cart as $item) {
                // Remove SKU suffix if present (UUID-Label-DisplayName)
                $productId = substr($item->id, 0, 36);

                // Detect multiplier from box configs
                $multiplier = 1;
                $matched_label = null;
                $bc_stmt = $this->conn->prepare("SELECT quantity, label FROM product_box_configs WHERE product_id = :pid");
                $bc_stmt->execute([':pid' => $productId]);
                $box_configs = $bc_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($box_configs as $bc) {
                    // Try exact match or suffix match in the Cart ID
                    if (mb_stripos($item->id, "-" . $bc['label']) !== false) {
                        $multiplier = (int)$bc['quantity'];
                        $matched_label = $bc['label'];
                        break;
                    }
                }

                $stmt = $this->conn->prepare("INSERT INTO sale_items (id, company_id, sale_id, product_id, quantity, unit_price, multiplier) VALUES (:id, :company_id, :sale_id, :product_id, :qty, :price, :mult)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":company_id" => $this->company_id,
                    ":sale_id" => $saleId,
                    ":product_id" => $productId,
                    ":qty" => $item->quantity,
                    ":price" => $item->price,
                    ":mult" => $multiplier
                ]);

                $totalUnits = $item->quantity * $multiplier;

                // Update stock with the total units (e.g. 1 box of 24 = 24 units)
                $stmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current - :units WHERE id = :id AND company_id = :company_id");
                $stmt->execute([":units" => $totalUnits, ":id" => $productId, ":company_id" => $this->company_id]);

                $obs = "Venda #" . $saleNumber;
                if ($matched_label) {
                    $obs .= " ({$item->quantity}x {$matched_label})";
                } else if ($multiplier > 1) {
                    $obs .= " (Formato x{$multiplier})";
                }
                
                $stmt = $this->conn->prepare("INSERT INTO stock_movements (id, company_id, product_id, quantity, type, observation, created_by, created_at) VALUES (:id, :company_id, :pid, :qty, 'saida', :obs, :uid, :created_at)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":company_id" => $this->company_id,
                    ":pid" => $productId,
                    ":qty" => $totalUnits,
                    ":obs" => $obs,
                    ":uid" => $auth['id'],
                    ":created_at" => date('Y-m-d H:i:s')
                ]);
            }

            // 4. Fluxo de Caixa
            $stmt = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL AND company_id = :company_id ORDER BY opened_at DESC LIMIT 1");
            $stmt->execute([':company_id' => $this->company_id]);
            $register = $stmt->fetch();

            if ($register && !empty($data->payments)) {
                foreach ($data->payments as $p) {
                    // Se for "Conta", não entra no caixa (vai para contas a receber)
                    if (strtolower($p->methodName) === 'conta') {
                        if (!empty($p->installments) && is_array($p->installments)) {
                            $totalInst = count($p->installments);
                            foreach ($p->installments as $idx => $inst) {
                                $stmt = $this->conn->prepare("INSERT INTO accounts_receivable (id, company_id, sale_id, description, customer_id, amount, due_date, status, category) 
                                                              VALUES (:id, :company_id, :sale_id, :desc, :customer_id, :amount, :due, 'pending', 'Vendas')");
                                $stmt->execute([
                                    ":id" => generateUUID(),
                                    ":company_id" => $this->company_id,
                                    ":sale_id" => $saleId,
                                    ":desc" => "Venda #" . $saleNumber . " (" . ($idx + 1) . "/" . $totalInst . ")",
                                    ":customer_id" => $data->customerId ?? null,
                                    ":amount" => $inst->amount,
                                    ":due" => $inst->dueDate
                                ]);
                            }
                        } else {
                            $stmt = $this->conn->prepare("INSERT INTO accounts_receivable (id, company_id, sale_id, description, customer_id, amount, due_date, status, category) 
                                                          VALUES (:id, :company_id, :sale_id, :desc, :customer_id, :amount, :due, 'pending', 'Vendas')");
                            $stmt->execute([
                                ":id" => generateUUID(),
                                ":company_id" => $this->company_id,
                                ":sale_id" => $saleId,
                                ":desc" => "Venda #" . $saleNumber . " (Prazo)",
                                ":customer_id" => $data->customerId ?? null,
                                ":amount" => $p->amount,
                                ":due" => date('Y-m-d', strtotime('+30 days')) // Default 30 days
                            ]);
                        }
                        continue;
                    }

                    $stmt = $this->conn->prepare("INSERT INTO cash_movements (id, company_id, cash_register_id, amount, type, observation, created_by, created_at) VALUES (:id, :company_id, :reg_id, :amount, 'venda', :obs, :uid, :created_at)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":reg_id" => $register['id'],
                        ":amount" => $p->amount,
                        ":obs" => "Venda #{$saleNumber} - " . $p->methodName,
                        ":uid" => $auth['id'],
                        ":created_at" => date('Y-m-d H:i:s')
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
        
        $stmt = $this->conn->prepare("SELECT * FROM sales WHERE id = :id AND company_id = :company_id");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
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
            WHERE si.sale_id = :id AND si.company_id = :company_id
        ");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
        $sale['items'] = $stmt->fetchAll();
        
        // Cast numeric fields
        $sale['total_amount'] = (float)$sale['total_amount'];
        $sale['discount'] = (float)($sale['discount'] ?? 0);
        $sale['sale_number'] = (int)$sale['sale_number'];

        $stmt = $this->conn->prepare("SELECT * FROM sale_payments WHERE sale_id = :id AND company_id = :company_id");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
        $sale['payments'] = $stmt->fetchAll();

        // Carregar dados do cliente se existir customer_id
        if (!empty($sale['customer_id'])) {
            $stmt = $this->conn->prepare("SELECT id, name, cpf_cnpj, email, phone, address, ie, cep, logradouro, numero, bairro, municipio, codigo_municipio, uf FROM customers WHERE id = :id AND company_id = :company_id");
            $stmt->execute([":id" => $sale['customer_id'], ":company_id" => $this->company_id]);
            $sale['customer'] = $stmt->fetch() ?: null;
        } else {
            $sale['customer'] = null;
        }

        // Carregar dados fiscais se existirem
        $stmt = $this->conn->prepare("
            SELECT id, tipo, numero, serie, chave, protocolo, status, created_at as fiscal_date, xml_path 
            FROM fiscal_notes 
            WHERE sale_id = :id AND company_id = :company_id 
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
        $fiscal = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fiscal) {
            $fiscal['qrCode'] = null;
            if (!empty($fiscal['xml_path'])) {
                try {
                    $xml = @simplexml_load_string($fiscal['xml_path']);
                    if ($xml) {
                        $xml->registerXPathNamespace('ns', 'http://www.portalfiscal.inf.br/nfe');
                        $qrCodeArr = $xml->xpath('//ns:infNFeSupl/ns:qrCode');
                        $fiscal['qrCode'] = $qrCodeArr ? (string)$qrCodeArr[0] : null;
                        
                        $urlArr = $xml->xpath('//ns:infNFeSupl/ns:urlChave');
                        $fiscal['urlConsulta'] = $urlArr ? (string)$urlArr[0] : null;
                    }
                } catch (\Throwable $e) {}
            }
            unset($fiscal['xml_path']); // Não enviar o XML inteiro
            $sale['fiscal'] = $fiscal;
        } else {
            $sale['fiscal'] = null;
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
            $stmt = $this->conn->prepare("SELECT si.product_id, si.quantity, si.multiplier FROM sale_items si WHERE si.sale_id = :id AND si.company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
            $oldItems = $stmt->fetchAll();
            foreach ($oldItems as $oi) {
                $qtyToRestore = $oi['quantity'] * ($oi['multiplier'] ?? 1);
                $this->conn->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :pid AND company_id = :company_id")
                           ->execute([":qty" => $qtyToRestore, ":pid" => $oi['product_id'], ":company_id" => $this->company_id]);
            }

            // 2. Clear old items, payments and receivables
            $this->conn->prepare("DELETE FROM sale_items WHERE sale_id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);
            $this->conn->prepare("DELETE FROM sale_payments WHERE sale_id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);
            $this->conn->prepare("DELETE FROM accounts_receivable WHERE sale_id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);

            // 3. Insert fresh items and adjust stock
            foreach ($data->items as $item) {
                $rawProductId = $item->id;
                $productId = substr($rawProductId, 0, 36);
                
                $multiplier = 1;
                $bc_stmt = $this->conn->prepare("SELECT quantity, label FROM product_box_configs WHERE product_id = :pid");
                $bc_stmt->execute([':pid' => $productId]);
                $box_configs = $bc_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($box_configs as $bc) {
                    if (strpos($rawProductId, "-" . $bc['label']) !== false) {
                        $multiplier = (int)$bc['quantity'];
                        break;
                    }
                }

                $this->conn->prepare("INSERT INTO sale_items (id, company_id, sale_id, product_id, quantity, unit_price, multiplier) VALUES (:id, :company_id, :sale_id, :product_id, :qty, :price, :mult)")
                           ->execute([
                               ":id" => generateUUID(),
                               ":company_id" => $this->company_id,
                               ":sale_id" => $id,
                               ":product_id" => $productId,
                               ":qty" => $item->quantity,
                               ":price" => $item->price ?? ($item->unit_price ?? 0),
                               ":mult" => $multiplier
                           ]);
                
                $totalUnits = $item->quantity * $multiplier;
                $this->conn->prepare("UPDATE products SET stock_current = stock_current - :qty WHERE id = :pid AND company_id = :company_id")
                           ->execute([":qty" => $totalUnits, ":pid" => $productId, ":company_id" => $this->company_id]);
            }

            // 4. Insert fresh payments and receivables
            $labels = [];
            foreach ($data->payments as $p) {
                $labels[] = $p->methodName;
                $this->conn->prepare("INSERT INTO sale_payments (id, company_id, sale_id, method_name, amount) VALUES (:id, :company_id, :sale_id, :method, :amount)")
                           ->execute([
                               ":id" => generateUUID(),
                               ":company_id" => $this->company_id,
                               ":sale_id" => $id,
                               ":method" => $p->methodName,
                               ":amount" => $p->amount
                           ]);

                if (strtolower($p->methodName) === 'conta') {
                    // Re-fetch sale number for description
                    $s_stmt = $this->conn->prepare("SELECT sale_number FROM sales WHERE id = :id");
                    $s_stmt->execute([':id' => $id]);
                    $saleInfo = $s_stmt->fetch();

                    // Use customerId from data if provided, otherwise fallback to existing
                    $finalCustomerId = property_exists($data, 'customerId') ? $data->customerId : null;
                    if (!$finalCustomerId) {
                        $s_stmt2 = $this->conn->prepare("SELECT customer_id FROM sales WHERE id = :id");
                        $s_stmt2->execute([':id' => $id]);
                        $finalCustomerId = $s_stmt2->fetchColumn();
                    }

                    $this->conn->prepare("INSERT INTO accounts_receivable (id, company_id, sale_id, description, customer_id, amount, due_date, status, category) 
                                          VALUES (:id, :company_id, :sale_id, :desc, :customer_id, :amount, :due, 'pending', 'Vendas')")
                               ->execute([
                                   ":id" => generateUUID(),
                                   ":company_id" => $this->company_id,
                                   ":sale_id" => $id,
                                   ":desc" => "Venda #" . ($saleInfo['sale_number'] ?? 'Alt') . " (Reajustada)",
                                   ":customer_id" => $finalCustomerId,
                                   ":amount" => $p->amount,
                                   ":due" => date('Y-m-d', strtotime('+30 days'))
                               ]);
                }
            }

            // 5. Update Sale table
            $paymentLabel = implode(" / ", $labels);
            $updateSql = "UPDATE sales SET total_amount = :total, discount = :discount, payment_method = :method, status = :status";
            $updateParams = [
                ":total" => $data->total,
                ":discount" => $data->discount ?? 0,
                ":method" => $paymentLabel,
                ":status" => $data->status ?? 'completed',
                ":id" => $id,
                ":company_id" => $this->company_id
            ];

            if (property_exists($data, 'customerId')) {
                $updateSql .= ", customer_id = :customer_id";
                $updateParams[":customer_id"] = $data->customerId;
            }

            $updateSql .= " WHERE id = :id AND company_id = :company_id";
            
            $this->conn->prepare($updateSql)->execute($updateParams);

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
                LEFT JOIN fiscal_notes fn ON (fn.sale_id = s.id AND fn.id = (
                    SELECT f.id FROM fiscal_notes f 
                    WHERE f.sale_id = s.id 
                    ORDER BY f.created_at DESC LIMIT 1
                ))
                WHERE s.company_id = :company_id";
        
        $params = [':company_id' => $this->company_id];

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

            $stmt = $this->conn->prepare("SELECT si.product_id, si.quantity, si.multiplier FROM sale_items si WHERE si.sale_id = :id AND si.company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
            $items = $stmt->fetchAll();

            foreach ($items as $item) {
                $multiplier = (int)($item['multiplier'] ?? 1);
                $totalQty = $item['quantity'] * $multiplier;
                $this->conn->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :pid AND company_id = :company_id")
                           ->execute([":qty" => $totalQty, ":pid" => $item['product_id'], ":company_id" => $this->company_id]);
            }

            $this->conn->prepare("DELETE FROM sale_items WHERE sale_id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);
            $this->conn->prepare("DELETE FROM sale_payments WHERE sale_id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);
            $this->conn->prepare("DELETE FROM cash_movements WHERE observation LIKE CONCAT('%', :id) AND company_id = :company_id")->execute([":id" => substr($id, 0, 8), ":company_id" => $this->company_id]);
            $this->conn->prepare("DELETE FROM accounts_receivable WHERE sale_id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);
            $this->conn->prepare("DELETE FROM sales WHERE id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);

            $this->conn->commit();
            $this->jsonResponse(["message" => "Venda removida com sucesso"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao remover: " . $e->getMessage()], 500);
        }
    }

    public function cancel($id) {
        $auth = $this->authenticate();
        require_once __DIR__ . '/../utils.php';
        try {
            $this->conn->beginTransaction();

            $stmt = $this->conn->prepare("UPDATE sales SET status = 'cancelada' WHERE id = :id AND company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);

            $stmt = $this->conn->prepare("SELECT product_id, quantity, multiplier FROM sale_items WHERE sale_id = :id AND company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
            $items = $stmt->fetchAll();

            foreach ($items as $item) {
                $totalQty = $item['quantity'] * ($item['multiplier'] ?? 1);
                $this->conn->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :pid AND company_id = :company_id")
                           ->execute([":qty" => $totalQty, ":pid" => $item['product_id'], ":company_id" => $this->company_id]);
            }

            $this->conn->prepare("DELETE FROM accounts_receivable WHERE sale_id = :id AND company_id = :company_id")->execute([":id" => $id, ":company_id" => $this->company_id]);

            $this->conn->commit();
            $this->jsonResponse(["message" => "Venda cancelada com sucesso"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao cancelar: " . $e->getMessage()], 500);
        }
    }
}
