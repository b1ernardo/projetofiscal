<?php
// /api/controllers/PurchasesController.php

require_once 'ApiController.php';

class PurchasesController extends ApiController {
    
    public function list() {
        $this->authenticate();
        
        $stmt = $this->conn->prepare("
            SELECT p.*, s.name as supplier_name, 
                   (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as item_count
            FROM purchases p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            ORDER BY p.created_at DESC
        ");
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll());
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->items)) {
            $this->jsonResponse(["message" => "Itens da compra são obrigatórios"], 400);
        }

        try {
            $this->conn->beginTransaction();

            $id = generateUUID();
            $stmt = $this->conn->prepare("INSERT INTO purchases (id, supplier_id, total_amount, created_by) VALUES (:id, :supplier, :total, :uid)");
            $stmt->execute([
                ":id" => $id,
                ":supplier" => $data->supplier_id ?? null,
                ":total" => $data->total_amount,
                ":uid" => $auth['id']
            ]);

            foreach ($data->items as $item) {
                $itemId = generateUUID();
                $stmt = $this->conn->prepare("INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_price) VALUES (:id, :pid, :prod_id, :qty, :price)");
                $stmt->execute([
                    ":id" => $itemId,
                    ":pid" => $id,
                    ":prod_id" => $item->product_id,
                    ":qty" => $item->quantity,
                    ":price" => $item->unit_price
                ]);

                // Atualiza estoque
                $stmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :prod_id");
                $stmt->execute([
                    ":qty" => $item->quantity,
                    ":prod_id" => $item->product_id
                ]);
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Compra registrada com sucesso", "id" => $id], 201);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao registrar compra: " . $e->getMessage()], 500);
        }
    }
}
