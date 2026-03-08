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
            WHERE p.company_id = :company_id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([':company_id' => $this->company_id]);
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
            $stmt = $this->conn->prepare("INSERT INTO purchases (id, company_id, supplier_id, total_amount, created_by) VALUES (:id, :company_id, :supplier, :total, :uid)");
            $stmt->execute([
                ":id" => $id,
                ":company_id" => $this->company_id,
                ":supplier" => $data->supplier_id ?? null,
                ":total" => $data->total_amount,
                ":uid" => $auth['id']
            ]);

            foreach ($data->items as $item) {
                $itemId = generateUUID();
                $stmt = $this->conn->prepare("INSERT INTO purchase_items (id, company_id, purchase_id, product_id, quantity, unit_price) VALUES (:id, :company_id, :pid, :prod_id, :qty, :price)");
                $stmt->execute([
                    ":id" => $itemId,
                    ":company_id" => $this->company_id,
                    ":pid" => $id,
                    ":prod_id" => $item->product_id,
                    ":qty" => $item->quantity,
                    ":price" => $item->unit_price
                ]);

                // Atualiza estoque
                $stmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :prod_id AND company_id = :company_id");
                $stmt->execute([
                    ":qty" => $item->quantity,
                    ":prod_id" => $item->product_id,
                    ":company_id" => $this->company_id
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
