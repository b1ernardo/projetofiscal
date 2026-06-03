<?php
// /api/controllers/QuotesController.php

require_once 'ApiController.php';

class QuotesController extends ApiController {

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->cart) || empty($data->total)) {
            $this->jsonResponse(["message" => "Orçamento vazio ou sem valor total"], 400);
        }

        try {
            $this->conn->beginTransaction();

            $quoteId = generateUUID();

            // 1. Inserir o orçamento
            $stmt = $this->conn->prepare("INSERT INTO quotes (id, company_id, customer_id, seller_id, total_amount, observations, created_by, status, discount, validity_days, created_at) 
                                          VALUES (:id, :company_id, :customer_id, :seller_id, :total, :obs, :uid, 'pending', :discount, :validity, :created_at)");
            $stmt->execute([
                ":id" => $quoteId,
                ":company_id" => $this->company_id,
                ":customer_id" => $data->customerId ?? null,
                ":seller_id" => $data->sellerId ?? null,
                ":total" => $data->total,
                ":obs" => $data->observations ?? null,
                ":uid" => $auth['id'],
                ":discount" => $data->discount ?? 0,
                ":validity" => $data->validityDays ?? 7,
                ":created_at" => date('Y-m-d H:i:s')
            ]);

            // Pegar o número sequencial do orçamento
            $stmt = $this->conn->prepare("SELECT quote_number FROM quotes WHERE id = :id AND company_id = :company_id");
            $stmt->execute([':id' => $quoteId, ':company_id' => $this->company_id]);
            $quoteNumber = $stmt->fetchColumn();

            // 2. Inserir Itens
            foreach ($data->cart as $item) {
                // Remove SKU suffix if present (UUID-Label-DisplayName)
                $productId = substr($item->id, 0, 36);

                // Detect multiplier from box configs
                $multiplier = 1;
                $bc_stmt = $this->conn->prepare("SELECT quantity, label FROM product_box_configs WHERE product_id = :pid");
                $bc_stmt->execute([':pid' => $productId]);
                $box_configs = $bc_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($box_configs as $bc) {
                    if (mb_stripos($item->id, "-" . $bc['label']) !== false) {
                        $multiplier = (int)$bc['quantity'];
                        break;
                    }
                }

                $stmt = $this->conn->prepare("INSERT INTO quote_items (id, company_id, quote_id, product_id, quantity, unit_price, multiplier) VALUES (:id, :company_id, :quote_id, :product_id, :quantity, :price, :mult)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":company_id" => $this->company_id,
                    ":quote_id" => $quoteId,
                    ":product_id" => $productId,
                    ":quantity" => $item->quantity,
                    ":price" => $item->price,
                    ":mult" => $multiplier
                ]);
            }

            $this->conn->commit();
            
            if (ob_get_length()) ob_clean();
            $this->jsonResponse([
                "message" => "Orçamento salvo com sucesso",
                "id" => $quoteId
            ], 201);

        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            if (ob_get_length()) ob_clean();
            $this->jsonResponse(["message" => "Erro ao salvar orçamento: " . $e->getMessage()], 500);
        }
    }

    public function list() {
        try {
            $this->authenticate();
            $query = "SELECT q.*, c.name as customer_name, c.cpf_cnpj as customer_document, s.name as seller_name 
                      FROM quotes q 
                      LEFT JOIN customers c ON q.customer_id = c.id 
                      LEFT JOIN sellers s ON q.seller_id = s.id 
                      WHERE q.company_id = :company_id 
                      ORDER BY q.created_at DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':company_id' => $this->company_id]);
            if (ob_get_length()) ob_clean();
            $this->jsonResponse($stmt->fetchAll());
        } catch (Exception $e) {
            if (ob_get_length()) ob_clean();
            $this->jsonResponse([
                "message" => "Erro ao listar orçamentos",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    public function get($id) {
        $this->authenticate();
        
        $stmt = $this->conn->prepare("SELECT q.*, c.name as customer_name, c.cpf_cnpj as customer_document, s.name as seller_name 
                                      FROM quotes q 
                                      LEFT JOIN customers c ON q.customer_id = c.id 
                                      LEFT JOIN sellers s ON q.seller_id = s.id 
                                      WHERE q.id = :id AND q.company_id = :company_id");
        $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
        $quote = $stmt->fetch();

        if (!$quote) {
            $this->jsonResponse(["message" => "Orçamento não encontrado"], 404);
        }

        $stmt = $this->conn->prepare("SELECT qi.*, p.name as product_name, p.unit as product_unit 
                                      FROM quote_items qi 
                                      JOIN products p ON qi.product_id = p.id 
                                      WHERE qi.quote_id = :quote_id AND qi.company_id = :company_id");
        $stmt->execute([':quote_id' => $id, ':company_id' => $this->company_id]);
        $quote['items'] = $stmt->fetchAll();

        $this->jsonResponse($quote);
    }

    public function update($id) {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->cart) || empty($data->total)) {
            $this->jsonResponse(["message" => "Orçamento vazio ou sem valor total"], 400);
        }

        try {
            $this->conn->beginTransaction();

            $stmt = $this->conn->prepare("UPDATE quotes 
                                          SET customer_id = :customer_id, 
                                              seller_id = :seller_id, 
                                              total_amount = :total, 
                                              observations = :obs, 
                                              discount = :discount, 
                                              validity_days = :validity,
                                              status = :status
                                          WHERE id = :id AND company_id = :company_id");
            $stmt->execute([
                ":id" => $id,
                ":company_id" => $this->company_id,
                ":customer_id" => $data->customerId ?? null,
                ":seller_id" => $data->sellerId ?? null,
                ":total" => $data->total,
                ":obs" => $data->observations ?? null,
                ":discount" => $data->discount ?? 0,
                ":validity" => $data->validityDays ?? 7,
                ":status" => $data->status ?? 'pending'
            ]);

            $stmt = $this->conn->prepare("DELETE FROM quote_items WHERE quote_id = :id AND company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);

            foreach ($data->cart as $item) {
                // Remove SKU suffix if present
                $productId = substr($item->id, 0, 36);

                $multiplier = 1;
                $bc_stmt = $this->conn->prepare("SELECT quantity, label FROM product_box_configs WHERE product_id = :pid");
                $bc_stmt->execute([':pid' => $productId]);
                $box_configs = $bc_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($box_configs as $bc) {
                    if (mb_stripos($item->id, "-" . $bc['label']) !== false) {
                        $multiplier = (int)$bc['quantity'];
                        break;
                    }
                }

                $stmt = $this->conn->prepare("INSERT INTO quote_items (id, company_id, quote_id, product_id, quantity, unit_price, multiplier) VALUES (:id, :company_id, :quote_id, :product_id, :quantity, :price, :mult)");
                $stmt->execute([
                    ":id" => generateUUID(),
                    ":company_id" => $this->company_id,
                    ":quote_id" => $id,
                    ":product_id" => $productId,
                    ":quantity" => $item->quantity,
                    ":price" => $item->price,
                    ":mult" => $multiplier
                ]);
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Orçamento atualizado com sucesso"]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            $this->jsonResponse(["message" => "Erro ao atualizar orçamento: " . $e->getMessage()], 500);
        }
    }
}
