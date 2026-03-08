<?php
// /api/controllers/ComandasController.php

require_once 'ApiController.php';

class ComandasController extends ApiController {
    
    public function list() {
        $this->authenticate();
        
        $stmt = $this->conn->prepare("
            SELECT c.*, ci.id as item_id, ci.quantity, ci.unit_price, p.name as product_name, s.name as seller_name
            FROM comandas c 
            LEFT JOIN comanda_items ci ON c.id = ci.comanda_id 
            LEFT JOIN products p ON ci.product_id = p.id
            LEFT JOIN sellers s ON c.seller_id = s.id
            WHERE c.company_id = :company_id
            ORDER BY c.created_at DESC
        ");
        $stmt->execute([':company_id' => $this->company_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $comandas = [];
        foreach ($rows as $row) {
            $id = $row['id'];
            if (!isset($comandas[$id])) {
                $comandas[$id] = [
                    'id' => $row['id'],
                    'table_number' => $row['table_number'],
                    'customer_name' => $row['customer_name'],
                    'status' => $row['status'],
                    'created_by' => $row['created_by'],
                    'seller_id' => $row['seller_id'],
                    'seller_name' => $row['seller_name'],
                    'created_at' => $row['created_at'],
                    'closed_at' => $row['closed_at'],
                    'items' => []
                ];
            }
            if ($row['item_id']) {
                $comandas[$id]['items'][] = [
                    'id' => $row['item_id'],
                    'product_name' => $row['product_name'],
                    'quantity' => (int)$row['quantity'],
                    'unit_price' => (float)$row['unit_price']
                ];
            }
        }
        
        $this->jsonResponse(array_values($comandas));
    }

    public function getDetail($id) {
        $this->authenticate();
        
        $stmt = $this->conn->prepare("
            SELECT c.*, ci.id as item_id, ci.product_id, ci.quantity, ci.unit_price, p.name as product_name, s.name as seller_name
            FROM comandas c 
            LEFT JOIN comanda_items ci ON c.id = ci.comanda_id 
            LEFT JOIN products p ON ci.product_id = p.id
            LEFT JOIN sellers s ON c.seller_id = s.id
            WHERE c.id = :id AND c.company_id = :company_id
        ");
        $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!$rows) {
            $this->jsonResponse(["message" => "Comanda não encontrada"], 404);
        }
        
        $comanda = [
            'id' => $rows[0]['id'],
            'table_number' => $rows[0]['table_number'],
            'customer_name' => $rows[0]['customer_name'],
            'status' => $rows[0]['status'],
            'created_by' => $rows[0]['created_by'],
            'created_at' => $rows[0]['created_at'],
            'closed_at' => $rows[0]['closed_at'],
            'items' => []
        ];
        
        foreach ($rows as $row) {
            if ($row['item_id']) {
                $comanda['items'][] = [
                    'id' => $row['item_id'],
                    'product_id' => $row['product_id'],
                    'product_name' => $row['product_name'],
                    'quantity' => (int)$row['quantity'],
                    'unit_price' => (float)$row['unit_price']
                ];
            }
        }
        
        $this->jsonResponse($comanda);
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        $id = generateUUID();
        $stmt = $this->conn->prepare("INSERT INTO comandas (id, company_id, table_number, customer_name, seller_id, status, created_by) VALUES (:id, :company_id, :table, :customer, :seller_id, 'open', :uid)");
        $stmt->execute([
            ":id" => $id,
            ":company_id" => $this->company_id,
            ":table" => $data->table_number ?? null,
            ":customer" => $data->customer_name ?? null,
            ":seller_id" => $data->seller_id ?? null,
            ":uid" => $auth['id']
        ]);

        $this->jsonResponse(["message" => "Comanda aberta com sucesso", "id" => $id], 201);
    }

    public function update($id) {
        $this->authenticate();
        $data = $this->getPostData();

        $stmt = $this->conn->prepare("UPDATE comandas SET table_number = :table, customer_name = :customer, seller_id = :seller_id WHERE id = :id AND company_id = :company_id");
        $stmt->execute([
            ":id" => $id,
            ":company_id" => $this->company_id,
            ":table" => $data->table_number ?? null,
            ":customer" => $data->customer_name ?? null,
            ":seller_id" => $data->seller_id ?? null
        ]);

        $this->jsonResponse(["message" => "Comanda atualizada"]);
    }

    public function addItem($id) {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->product_id) || empty($data->quantity) || empty($data->unit_price)) {
            $this->jsonResponse(["message" => "Dados incompletos"], 400);
        }

        $rawProductId = $data->product_id;
        $productId = substr($rawProductId, 0, 36);
        
        $multiplier = 1;
        $bc_stmt = $this->conn->prepare("SELECT quantity, label FROM product_box_configs WHERE product_id = :pid AND company_id = :company_id");
        $bc_stmt->execute([':pid' => $productId, ':company_id' => $this->company_id]);
        $box_configs = $bc_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($box_configs as $bc) {
            if (strpos($rawProductId, "-" . $bc['label']) !== false) {
                $multiplier = (int)$bc['quantity'];
                break;
            }
        }

        // Search for existing item with SAME product AND SAME multiplier
        $stmt = $this->conn->prepare("SELECT ci.id, ci.quantity FROM comanda_items ci JOIN comandas c ON ci.comanda_id = c.id WHERE ci.comanda_id = :cid AND ci.product_id = :pid AND ci.multiplier = :mult AND c.company_id = :company_id");
        $stmt->execute([
            ":cid" => $id, 
            ":pid" => $productId, 
            ":mult" => $multiplier,
            ":company_id" => $this->company_id
        ]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $stmt = $this->conn->prepare("UPDATE comanda_items SET quantity = quantity + :qty WHERE id = :id");
            $stmt->execute([":qty" => $data->quantity, ":id" => $existing['id']]);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO comanda_items (id, company_id, comanda_id, product_id, quantity, unit_price, multiplier) VALUES (:id, :company_id, :cid, :pid, :qty, :price, :mult)");
            $stmt->execute([
                ":id" => generateUUID(),
                ":company_id" => $this->company_id,
                ":cid" => $id,
                ":pid" => $productId,
                ":qty" => $data->quantity,
                ":price" => $data->unit_price,
                ":mult" => $multiplier
            ]);
        }

        $this->jsonResponse(["message" => "Item adicionado"]);
    }

    public function addItems($id) {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->items) || !is_array($data->items)) {
            $this->jsonResponse(["message" => "Nenhum item enviado"], 400);
        }

        try {
            $this->conn->beginTransaction();
            foreach ($data->items as $item) {
                $rawProductId = $item->id;
                $productId = substr($rawProductId, 0, 36);
                
                $multiplier = 1;
                $bc_stmt = $this->conn->prepare("SELECT quantity, label FROM product_box_configs WHERE product_id = :pid AND company_id = :company_id");
                $bc_stmt->execute([':pid' => $productId, ':company_id' => $this->company_id]);
                $box_configs = $bc_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($box_configs as $bc) {
                    if (strpos($rawProductId, "-" . $bc['label']) !== false) {
                        $multiplier = (int)$bc['quantity'];
                        break;
                    }
                }
                
                $stmt = $this->conn->prepare("SELECT ci.id FROM comanda_items ci JOIN comandas c ON ci.comanda_id = c.id WHERE ci.comanda_id = :cid AND ci.product_id = :pid AND ci.multiplier = :mult AND c.company_id = :company_id");
                $stmt->execute([
                    ":cid" => $id, 
                    ":pid" => $productId, 
                    ":mult" => $multiplier,
                    ":company_id" => $this->company_id
                ]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    $stmt = $this->conn->prepare("UPDATE comanda_items SET quantity = quantity + :qty WHERE id = :id");
                    $stmt->execute([":qty" => $item->quantity, ":id" => $existing['id']]);
                } else {
                    $stmt = $this->conn->prepare("INSERT INTO comanda_items (id, company_id, comanda_id, product_id, quantity, unit_price, multiplier) VALUES (:id, :company_id, :cid, :pid, :qty, :price, :mult)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":cid" => $id,
                        ":pid" => $productId,
                        ":qty" => $item->quantity,
                        ":price" => $item->price,
                        ":mult" => $multiplier
                    ]);
                }
            }
            $this->conn->commit();
            $this->jsonResponse(["message" => "Itens adicionados com sucesso"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao adicionar itens: " . $e->getMessage()], 500);
        }
    }

    public function removeItem($itemId) {
        $this->authenticate();
        $stmt = $this->conn->prepare("DELETE ci FROM comanda_items ci JOIN comandas c ON ci.comanda_id = c.id WHERE ci.id = :id AND c.company_id = :company_id");
        $stmt->execute([":id" => $itemId, ":company_id" => $this->company_id]);
        $this->jsonResponse(["message" => "Item removido"]);
    }

    public function close($id) {
        $auth = $this->authenticate();
        $data = $this->getPostData();

        try {
            $this->conn->beginTransaction();

            // 0. Get Comanda Header to get seller_id
            $stmt = $this->conn->prepare("SELECT seller_id, customer_id FROM comandas WHERE id = :id AND company_id = :company_id");
            $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
            $comandaData = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$comandaData) {
                throw new Exception("Comanda não encontrada");
            }

            // 1. Get comanda items (include multiplier)
            $stmt = $this->conn->prepare("SELECT ci.*, p.name FROM comanda_items ci JOIN products p ON ci.product_id = p.id JOIN comandas c ON ci.comanda_id = c.id WHERE ci.comanda_id = :id AND c.company_id = :company_id");
            $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!$items) {
                throw new Exception("Comanda sem itens");
            }

            require_once __DIR__ . '/../utils.php';
            $saleId = generateUUID();
            
            // Payment labels for the sale record
            $paymentLabel = "";
            if (!empty($data->payments)) {
                $labels = array_map(function($p) { return $p->methodName; }, $data->payments);
                $paymentLabel = implode(" / ", $labels);
            }

            // 2. Create Sale
            $stmt = $this->conn->prepare("INSERT INTO sales (id, company_id, customer_id, seller_id, total_amount, payment_method, created_by, status) 
                                          VALUES (:id, :company_id, :customer_id, :seller_id, :total, :method, :uid, 'completed')");
            $stmt->execute([
                ":id" => $saleId,
                ":company_id" => $this->company_id,
                ":customer_id" => $data->customerId ?? $comandaData['customer_id'] ?? null,
                ":seller_id" => $data->sellerId ?? $comandaData['seller_id'] ?? null,
                ":total" => $data->total,
                ":method" => $paymentLabel,
                ":uid" => $auth['id']
            ]);

            // Get sequential number
            $stmt = $this->conn->prepare("SELECT sale_number FROM sales WHERE id = :id");
            $stmt->execute([':id' => $saleId]);
            $saleNumber = $stmt->fetchColumn();

            // 3. Sale Items & Stock
            foreach ($items as $item) {
                $multiplier = (int)($item['multiplier'] ?? 1);
                $totalUnits = $item['quantity'] * $multiplier;

                $stmt = $this->conn->prepare("INSERT INTO sale_items (id, company_id, sale_id, product_id, quantity, unit_price, multiplier) VALUES (:id, :company_id, :sid, :pid, :qty, :price, :mult)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":company_id" => $this->company_id,
                    ":sid" => $saleId,
                    ":pid" => $item['product_id'],
                    ":qty" => $item['quantity'],
                    ":price" => $item['unit_price'],
                    ":mult" => $multiplier
                ]);

                // Stock Current
                $stmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current - :units WHERE id = :id AND company_id = :company_id");
                $stmt->execute([":units" => $totalUnits, ":id" => $item['product_id'], ":company_id" => $this->company_id]);

                // Stock Movement
                $obs = "Venda Comanda Mesa #{$saleNumber} - {$item['name']}";
                if ($multiplier > 1) $obs .= " (Formato x{$multiplier})";

                $stmt = $this->conn->prepare("INSERT INTO stock_movements (id, company_id, product_id, quantity, type, observation, created_by) VALUES (:id, :company_id, :pid, :qty, 'saida', :obs, :uid)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":company_id" => $this->company_id,
                    ":pid" => $item['product_id'],
                    ":qty" => $totalUnits,
                    ":obs" => $obs,
                    ":uid" => $auth['id']
                ]);
            }

            // 4. Payments & Cash/Receivable
            if (!empty($data->payments)) {
                foreach ($data->payments as $p) {
                    $stmt = $this->conn->prepare("INSERT INTO sale_payments (id, company_id, sale_id, method_name, amount) VALUES (:id, :company_id, :sid, :method, :amount)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":sid" => $saleId,
                        ":method" => $p->methodName,
                        ":amount" => $p->amount
                    ]);

                    if (strtolower($p->methodName) !== 'conta') {
                        $stmtReg = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL AND company_id = :company_id ORDER BY opened_at DESC LIMIT 1");
                        $stmtReg->execute([':company_id' => $this->company_id]);
                        $register = $stmtReg->fetch();
                        if ($register) {
                            $stmtMove = $this->conn->prepare("INSERT INTO cash_movements (id, company_id, cash_register_id, amount, type, observation, created_by) VALUES (:id, :company_id, :reg_id, :amount, 'venda', :obs, :uid)");
                            $stmtMove->execute([
                                ":id" => generateUUID(),
                                ":company_id" => $this->company_id,
                                ":reg_id" => $register['id'],
                                ":amount" => $p->amount,
                                ":obs" => "Venda Comanda Mesa #{$saleNumber} - " . $p->methodName,
                                ":uid" => $auth['id']
                            ]);
                        }
                    } else {
                        // Accounts Receivable
                        $stmt = $this->conn->prepare("INSERT INTO accounts_receivable (id, company_id, description, customer_id, amount, due_date, status, category) VALUES (:id, :company_id, :desc, :cust, :amount, :due, 'pending', 'Vendas')");
                        $stmt->execute([
                            ":id" => generateUUID(),
                            ":company_id" => $this->company_id,
                            ":desc" => "Venda Comanda Mesa #{$saleNumber} (Prazo)",
                            ":cust" => $data->customerId ?? null,
                            ":amount" => $p->amount,
                            ":due" => date('Y-m-d', strtotime('+30 days'))
                        ]);
                    }
                }
            }

            // 5. Close comanda
            $stmt = $this->conn->prepare("UPDATE comandas SET status = 'closed', closed_at = NOW() WHERE id = :id AND company_id = :company_id");
            $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);

            $this->conn->commit();
            $this->jsonResponse(["message" => "Comanda fechada com sucesso", "sale_id" => $saleId]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao fechar comanda: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $this->authenticate();

        if (empty($id)) {
            $this->jsonResponse(["message" => "ID não fornecido"], 400);
        }

        try {
            $this->conn->beginTransaction();

            // Remove items first (FK constraint)
            $this->conn->prepare("DELETE ci FROM comanda_items ci JOIN comandas c ON ci.comanda_id = c.id WHERE ci.comanda_id = :id AND c.company_id = :company_id")->execute([':id' => $id, ':company_id' => $this->company_id]);

            // Remove the comanda itself
            $stmt = $this->conn->prepare("DELETE FROM comandas WHERE id = :id AND company_id = :company_id");
            $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);

            if ($stmt->rowCount() === 0) {
                $this->conn->rollBack();
                $this->jsonResponse(["message" => "Comanda não encontrada"], 404);
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Comanda excluída com sucesso"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao excluir comanda: " . $e->getMessage()], 500);
        }
    }
}
