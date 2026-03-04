<?php
// /api/controllers/ComandasController.php

require_once 'ApiController.php';

class ComandasController extends ApiController {
    
    public function list() {
        $this->authenticate();
        
        $stmt = $this->conn->prepare("
            SELECT c.*, ci.id as item_id, ci.quantity, ci.unit_price, p.name as product_name
            FROM comandas c 
            LEFT JOIN comanda_items ci ON c.id = ci.comanda_id 
            LEFT JOIN products p ON ci.product_id = p.id
            ORDER BY c.created_at DESC
        ");
        $stmt->execute();
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
            SELECT c.*, ci.id as item_id, ci.product_id, ci.quantity, ci.unit_price, p.name as product_name
            FROM comandas c 
            LEFT JOIN comanda_items ci ON c.id = ci.comanda_id 
            LEFT JOIN products p ON ci.product_id = p.id
            WHERE c.id = :id
        ");
        $stmt->execute([':id' => $id]);
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
        $stmt = $this->conn->prepare("INSERT INTO comandas (id, table_number, customer_name, status, created_by) VALUES (:id, :table, :customer, 'open', :uid)");
        $stmt->execute([
            ":id" => $id,
            ":table" => $data->table_number ?? null,
            ":customer" => $data->customer_name ?? null,
            ":uid" => $auth['id']
        ]);

        $this->jsonResponse(["message" => "Comanda aberta com sucesso", "id" => $id], 201);
    }

    public function update($id) {
        $this->authenticate();
        $data = $this->getPostData();

        $stmt = $this->conn->prepare("UPDATE comandas SET table_number = :table, customer_name = :customer WHERE id = :id");
        $stmt->execute([
            ":id" => $id,
            ":table" => $data->table_number ?? null,
            ":customer" => $data->customer_name ?? null
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

        $stmt = $this->conn->prepare("SELECT id, quantity FROM comanda_items WHERE comanda_id = :cid AND product_id = :pid");
        $stmt->execute([":cid" => $id, ":pid" => $data->product_id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $stmt = $this->conn->prepare("UPDATE comanda_items SET quantity = quantity + :qty WHERE id = :id");
            $stmt->execute([":qty" => $data->quantity, ":id" => $existing['id']]);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO comanda_items (id, comanda_id, product_id, quantity, unit_price) VALUES (:id, :cid, :pid, :qty, :price)");
            $stmt->execute([
                ":id" => generateUUID(),
                ":cid" => $id,
                ":pid" => $data->product_id,
                ":qty" => $data->quantity,
                ":price" => $data->unit_price
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
                // Remove SKU suffix if present (from PDV logic)
                $productId = substr($item->id, 0, 36);
                
                $stmt = $this->conn->prepare("SELECT id FROM comanda_items WHERE comanda_id = :cid AND product_id = :pid");
                $stmt->execute([":cid" => $id, ":pid" => $productId]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    $stmt = $this->conn->prepare("UPDATE comanda_items SET quantity = quantity + :qty WHERE id = :id");
                    $stmt->execute([":qty" => $item->quantity, ":id" => $existing['id']]);
                } else {
                    $stmt = $this->conn->prepare("INSERT INTO comanda_items (id, comanda_id, product_id, quantity, unit_price) VALUES (:id, :cid, :pid, :qty, :price)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":cid" => $id,
                        ":pid" => $productId,
                        ":qty" => $item->quantity,
                        ":price" => $item->price
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
        $stmt = $this->conn->prepare("DELETE FROM comanda_items WHERE id = :id");
        $stmt->execute([":id" => $itemId]);
        $this->jsonResponse(["message" => "Item removido"]);
    }

    public function close($id) {
        $auth = $this->authenticate();
        $data = $this->getPostData();

        try {
            $this->conn->beginTransaction();

            // 1. Get comanda items
            $stmt = $this->conn->prepare("SELECT ci.*, p.name FROM comanda_items ci JOIN products p ON ci.product_id = p.id WHERE ci.comanda_id = :id");
            $stmt->execute([':id' => $id]);
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
            $stmt = $this->conn->prepare("INSERT INTO sales (id, customer_id, total_amount, payment_method, created_by, status) 
                                          VALUES (:id, :customer_id, :total, :method, :uid, 'completed')");
            $stmt->execute([
                ":id" => $saleId,
                ":customer_id" => $data->customerId ?? null,
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
                $stmt = $this->conn->prepare("INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price) VALUES (:id, :sid, :pid, :qty, :price)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":sid" => $saleId,
                    ":pid" => $item['product_id'],
                    ":qty" => $item['quantity'],
                    ":price" => $item['unit_price']
                ]);

                // Stock Current
                $stmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current - :units WHERE id = :id");
                $stmt->execute([":units" => $item['quantity'], ":id" => $item['product_id']]);

                // Stock Movement
                $stmt = $this->conn->prepare("INSERT INTO stock_movements (id, product_id, quantity, type, observation, created_by) VALUES (:id, :pid, :qty, 'saida', :obs, :uid)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":pid" => $item['product_id'],
                    ":qty" => $item['quantity'],
                    ":obs" => "Venda Comanda Mesa #{$saleNumber} - {$item['name']}",
                    ":uid" => $auth['id']
                ]);
            }

            // 4. Payments & Cash/Receivable
            if (!empty($data->payments)) {
                foreach ($data->payments as $p) {
                    $stmt = $this->conn->prepare("INSERT INTO sale_payments (id, sale_id, method_name, amount) VALUES (:id, :sid, :method, :amount)");
                    $stmt->execute([
                        ":id" => generateUUID(),
                        ":sid" => $saleId,
                        ":method" => $p->methodName,
                        ":amount" => $p->amount
                    ]);

                    if (strtolower($p->methodName) !== 'conta') {
                        $stmtReg = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1");
                        $stmtReg->execute();
                        $register = $stmtReg->fetch();
                        if ($register) {
                            $stmtMove = $this->conn->prepare("INSERT INTO cash_movements (id, cash_register_id, amount, type, observation, created_by) VALUES (:id, :reg_id, :amount, 'venda', :obs, :uid)");
                            $stmtMove->execute([
                                ":id" => generateUUID(),
                                ":reg_id" => $register['id'],
                                ":amount" => $p->amount,
                                ":obs" => "Venda Comanda Mesa #{$saleNumber} - " . $p->methodName,
                                ":uid" => $auth['id']
                            ]);
                        }
                    } else {
                        // Accounts Receivable
                        $stmt = $this->conn->prepare("INSERT INTO accounts_receivable (id, description, customer_id, amount, due_date, status, category) VALUES (:id, :desc, :cust, :amount, :due, 'pending', 'Vendas')");
                        $stmt->execute([
                            ":id" => generateUUID(),
                            ":desc" => "Venda Comanda Mesa #{$saleNumber} (Prazo)",
                            ":cust" => $data->customerId ?? null,
                            ":amount" => $p->amount,
                            ":due" => date('Y-m-d', strtotime('+30 days'))
                        ]);
                    }
                }
            }

            // 5. Close comanda
            $stmt = $this->conn->prepare("UPDATE comandas SET status = 'closed', closed_at = NOW() WHERE id = :id");
            $stmt->execute([':id' => $id]);

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
            $this->conn->prepare("DELETE FROM comanda_items WHERE comanda_id = :id")->execute([':id' => $id]);

            // Remove the comanda itself
            $stmt = $this->conn->prepare("DELETE FROM comandas WHERE id = :id");
            $stmt->execute([':id' => $id]);

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
