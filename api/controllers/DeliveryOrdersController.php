<?php
require_once 'ApiController.php';

class DeliveryOrdersController extends ApiController {
    
    // Lista os pedidos da empresa autenticada
    public function list() {
        $this->authenticate();
        $status = $_GET['status'] ?? null;
        
        $sql = "SELECT do.* FROM delivery_orders do WHERE do.company_id = :company_id";
        $params = [':company_id' => $this->company_id];
        
        if ($status && $status !== 'todos') {
            $sql .= " AND do.status = :status";
            $params[':status'] = $status;
        }
        
        $sql .= " ORDER BY do.created_at DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        // Para cada pedido, buscar itens
        foreach ($orders as &$order) {
            $stmtItems = $this->conn->prepare("SELECT do_item.* FROM delivery_order_items do_item WHERE do_item.delivery_order_id = :order_id");
            $stmtItems->execute([':order_id' => $order['id']]);
            $order['items'] = $stmtItems->fetchAll();
        }
        if (ob_get_length()) ob_clean();
        $this->jsonResponse($orders);
    }

    // Criação manual (dentro do painel) ou automática (via API Pública)
    public function create() {
        require_once __DIR__ . '/../utils.php';
        
        $isPublic = isset($_GET['public']) && $_GET['public'] === 'true';

        // Autenticação condicional: se for público, precisamos do slug ou ID do restaurante
        $company_id = null;
        if (!$isPublic) {
            $this->authenticate();
            $company_id = $this->company_id;
        } else {
            // Busca o ID da empresa pelo slug enviado no json (ideal), ou apenas usa a primeira no nosso caso
            $stmt = $this->conn->prepare("SELECT id FROM companies LIMIT 1");
            $stmt->execute();
            if ($comp = $stmt->fetch()) {
                $company_id = $comp['id'];
            }
        }

        if (!$company_id) {
            $this->jsonResponse(["message" => "Empresa não informada ou não encontrada"], 400);
        }

        $data = $this->getPostData();

        if (empty($data->customer_name) || empty($data->items)) {
            $this->jsonResponse(["message" => "Nome e Itens são obrigatórios"], 400);
        }

        try {
            $this->conn->beginTransaction();
            $order_id = generateUUID();

            $insert = $this->conn->prepare("INSERT INTO delivery_orders 
                (id, company_id, customer_name, customer_phone, delivery_address, payment_method, change_for, subtotal, delivery_fee, total, status, order_type, source) 
                VALUES (:id, :company_id, :customer_name, :customer_phone, :delivery_address, :payment_method, :change_for, :subtotal, :delivery_fee, :total, :status, :order_type, :source)");
            
            $subtotal = isset($data->subtotal) ? (float)$data->subtotal : 0;
            $fee = isset($data->delivery_fee) ? (float)$data->delivery_fee : 0;
            $total = isset($data->total) ? (float)$data->total : ($subtotal + $fee);
            $source = isset($data->source) ? $data->source : ($isPublic ? 'app' : 'manual');
            $status = isset($data->status) ? $data->status : ($source === 'manual' ? 'preparando' : 'pendente');
            $changeFor = (isset($data->change_for) && $data->change_for !== '') ? (float)str_replace(',', '.', $data->change_for) : null;
            
            $insert->execute([
                ':id' => $order_id,
                ':company_id' => $company_id,
                ':customer_name' => $data->customer_name,
                ':customer_phone' => $data->customer_phone ?? '',
                ':delivery_address' => $data->delivery_address ?? '',
                ':payment_method' => $data->payment_method ?? '',
                ':change_for' => $changeFor,
                ':subtotal' => $subtotal,
                ':delivery_fee' => $fee,
                ':total' => $total,
                ':status' => $status,
                ':order_type' => $data->order_type ?? 'delivery',
                ':source' => $source
            ]);

            $insertItem = $this->conn->prepare("INSERT INTO delivery_order_items 
                (id, delivery_order_id, product_id, product_name, quantity, price, observation) 
                VALUES (:id, :delivery_order_id, :product_id, :product_name, :quantity, :price, :observation)");

            foreach ($data->items as $item) {
                // If the product doesn't have an ID (e.g., custom item or adhoc), we should handle it, but for now we expect a product_id.
                // If there's no product ID but we're making manual sales, we'll try to find an existing dummy or just fail. For now, require product_id.
                
                $insertItem->execute([
                    ':id' => generateUUID(),
                    ':delivery_order_id' => $order_id,
                    ':product_id' => $item->product_id ?? null,
                    ':product_name' => $item->product_name ?? 'Produto',
                    ':quantity' => isset($item->quantity) ? (int)$item->quantity : 1,
                    ':price' => isset($item->price) ? (float)$item->price : 0,
                    ':observation' => $item->observation ?? ''
                ]);
            }

            $this->conn->commit();
            if (ob_get_length()) ob_clean();
            $this->jsonResponse(["message" => "Pedido criado com sucesso", "id" => $order_id], 201);
        } catch (\Exception $e) {
            $this->conn->rollBack();
            if (ob_get_length()) ob_clean();
            $this->jsonResponse(["message" => "Erro ao criar pedido: " . $e->getMessage()], 500);
        }
    }

    public function updateStatus($id) {
        $auth = $this->authenticate();
        require_once __DIR__ . '/../utils.php';
        $data = $this->getPostData();

        if (empty($data->status)) {
            $this->jsonResponse(["message" => "Status é obrigatório"], 400);
        }

        try {
            $this->conn->beginTransaction();

            // Fetch current status and sale_id to check if it's already entregue
            $stmt = $this->conn->prepare("SELECT status, sale_id FROM delivery_orders WHERE id = :id AND company_id = :company_id");
            $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
            $currentOrder = $stmt->fetch();

            if (!$currentOrder) {
                $this->jsonResponse(["message" => "Pedido não encontrado"], 404);
            }

            $sale_id = $currentOrder['sale_id'];

            // If we are marking as entregue and it wasn't already entregue and doesn't have a sale_id
            if ($data->status === 'entregue' && $currentOrder['status'] !== 'entregue' && empty($sale_id)) {
                $sale_id = $this->createSaleFromOrder($id, $auth['id']);
            }

            $update = $this->conn->prepare("UPDATE delivery_orders SET status = :status, sale_id = :sale_id WHERE id = :id AND company_id = :company_id");
            $update->execute([
                ':status' => $data->status,
                ':sale_id' => $sale_id,
                ':id' => $id,
                ':company_id' => $this->company_id
            ]);

            $this->conn->commit();
            if (ob_get_length()) ob_clean();
            $this->jsonResponse(["message" => "Status do pedido atualizado", "sale_id" => $sale_id]);

        } catch (\Exception $e) {
            $this->conn->rollBack();
            if (ob_get_length()) ob_clean();
            $this->jsonResponse(["message" => "Erro ao atualizar status: " . $e->getMessage()], 500);
        }
    }

    private function createSaleFromOrder($orderId, $userId) {
        // Fetch order details
        $stmt = $this->conn->prepare("SELECT * FROM delivery_orders WHERE id = :id AND company_id = :company_id");
        $stmt->execute([':id' => $orderId, ':company_id' => $this->company_id]);
        $order = $stmt->fetch();

        // Fetch items
        $stmt = $this->conn->prepare("SELECT * FROM delivery_order_items WHERE delivery_order_id = :id");
        $stmt->execute([':id' => $orderId]);
        $items = $stmt->fetchAll();

        // Try to find customer by phone
        $customerId = null;
        if (!empty($order['customer_phone'])) {
            $cleanPhone = preg_replace('/\D/', '', $order['customer_phone']);
            $stmtCust = $this->conn->prepare("SELECT id FROM customers WHERE (REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = :phone) AND company_id = :company_id LIMIT 1");
            $stmtCust->execute([':phone' => $cleanPhone, ':company_id' => $this->company_id]);
            $customerId = $stmtCust->fetchColumn() ?: null;
        }

        $saleId = generateUUID();
        $paymentMethod = $order['payment_method'] ?: 'Delivery';
        
        // 1. Inserir a venda
        $stmt = $this->conn->prepare("INSERT INTO sales (id, company_id, customer_id, total_amount, payment_method, created_by, status, discount) 
                                      VALUES (:id, :company_id, :customer_id, :total, :method, :uid, 'completed', 0)");
        $stmt->execute([
            ":id" => $saleId,
            ":company_id" => $this->company_id,
            ":customer_id" => $customerId,
            ":total" => $order['total'],
            ":method" => $paymentMethod,
            ":uid" => $userId
        ]);

        // Pegar o número da venda
        $stmt = $this->conn->prepare("SELECT sale_number FROM sales WHERE id = :id");
        $stmt->execute([':id' => $saleId]);
        $saleNumber = $stmt->fetchColumn();

        // 2. Pagamento
        $stmt = $this->conn->prepare("INSERT INTO sale_payments (id, company_id, sale_id, method_name, amount) VALUES (:id, :company_id, :sale_id, :method, :amount)");
        $stmt->execute([
            ":id" => generateUUID(),
            ":company_id" => $this->company_id,
            ":sale_id" => $saleId,
            ":method" => $paymentMethod,
            ":amount" => $order['total']
        ]);

        // 3. Itens e Estoque
        foreach ($items as $item) {
            $stmt = $this->conn->prepare("INSERT INTO sale_items (id, company_id, sale_id, product_id, quantity, unit_price) VALUES (:id, :company_id, :sale_id, :product_id, :qty, :price)");
            $stmt->execute([
                ":id" => generateUUID(),
                ":company_id" => $this->company_id,
                ":sale_id" => $saleId,
                ":product_id" => $item['product_id'],
                ":qty" => $item['quantity'],
                ":price" => $item['price']
            ]);
            
            if (!empty($item['product_id'])) {
                // Update stock
                $stmtStock = $this->conn->prepare("UPDATE products SET stock_current = stock_current - :qty WHERE id = :pid AND company_id = :company_id");
                $stmtStock->execute([":qty" => $item['quantity'], ":pid" => $item['product_id'], ":company_id" => $this->company_id]);

                // Movement
                $stmtMov = $this->conn->prepare("INSERT INTO stock_movements (id, company_id, product_id, quantity, type, observation, created_by) VALUES (:id, :company_id, :pid, :qty, 'saida', :obs, :uid)");
                $stmtMov->execute([
                    ":id" => generateUUID(),
                    ":company_id" => $this->company_id,
                    ":pid" => $item['product_id'],
                    ":qty" => $item['quantity'],
                    ":obs" => "Pedido Delivery #{$orderId} (Venda #{$saleNumber})",
                    ":uid" => $userId
                ]);
            }
        }

        // Se houver taxa de entrega, registrar como um item genérico (sem product_id para não afetar estoque)
        if ($order['delivery_fee'] > 0) {
            $stmt = $this->conn->prepare("INSERT INTO sale_items (id, company_id, sale_id, product_id, quantity, unit_price) VALUES (:id, :company_id, :sale_id, NULL, 1, :price)");
            $stmt->execute([
                ":id" => generateUUID(),
                ":company_id" => $this->company_id,
                ":sale_id" => $saleId,
                ":price" => $order['delivery_fee']
            ]);
        }

        // 4. Fluxo de Caixa
        $stmtReg = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL AND company_id = :company_id ORDER BY opened_at DESC LIMIT 1");
        $stmtReg->execute([':company_id' => $this->company_id]);
        $register = $stmtReg->fetch();

        if ($register) {
            $stmtCash = $this->conn->prepare("INSERT INTO cash_movements (id, company_id, cash_register_id, amount, type, observation, created_by) VALUES (:id, :company_id, :reg_id, :amount, 'venda', :obs, :uid)");
            $stmtCash->execute([
                ":id" => generateUUID(),
                ":company_id" => $this->company_id,
                ":reg_id" => $register['id'],
                ":amount" => $order['total'],
                ":obs" => "Venda #{$saleNumber} (Delivery) - " . $paymentMethod,
                ":uid" => $userId
            ]);
        }

        return $saleId;
    }
}
