<?php
// /api/controllers/ServiceOrdersController.php

require_once 'ApiController.php';

class ServiceOrdersController extends ApiController {

    private function updateStock($productId, $quantity, $type = 'saida', $soId = '') {
        if (!$productId) return;
        
        $op = ($type === 'saida') ? '-' : '+';
        $stmt = $this->conn->prepare("UPDATE products SET stock_current = stock_current $op :qty WHERE id = :id AND company_id = :company_id");
        $stmt->execute([
            ":qty" => $quantity,
            ":id" => $productId,
            ":company_id" => $this->company_id
        ]);

        $obs = ($type === 'saida') ? "OS #".substr($soId, 0, 8) : "Estorno OS #".substr($soId, 0, 8);
        $stmt = $this->conn->prepare("INSERT INTO stock_movements (id, company_id, product_id, quantity, type, observation, created_by, created_at) 
                                      VALUES (:id, :company_id, :pid, :qty, :type, :obs, :uid, :created_at)");
        $stmt->execute([
            ":id" => generateUUID(),
            ":company_id" => $this->company_id,
            ":pid" => $productId,
            ":qty" => $quantity,
            ":type" => $type,
            ":obs" => $obs,
            ":uid" => $_SESSION['user_id'] ?? 'system',
            ":created_at" => date('Y-m-d H:i:s')
        ]);
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->customer_id) || empty($data->item_type)) {
            $this->jsonResponse(["message" => "Cliente e tipo de item são obrigatórios"], 400);
        }

        try {
            $this->conn->beginTransaction();

            $soId = generateUUID();

            $stmt = $this->conn->prepare("INSERT INTO service_orders 
                (id, company_id, customer_id, user_id, status, priority, item_type, item_make, item_model, item_identifier, item_color, item_condition, accessories, problem_reported, problem_found, service_performed, internal_notes, labor_total, parts_total, discount, total_amount, expected_delivery) 
                VALUES 
                (:id, :company_id, :customer_id, :user_id, :status, :priority, :item_type, :item_make, :item_model, :item_identifier, :item_color, :item_condition, :accessories, :problem_reported, :problem_found, :service_performed, :internal_notes, :labor_total, :parts_total, :discount, :total_amount, :expected_delivery)");
            
            $stmt->execute([
                ":id" => $soId,
                ":company_id" => $this->company_id,
                ":customer_id" => $data->customer_id,
                ":user_id" => $auth['id'],
                ":status" => $data->status ?? 'pendente',
                ":priority" => $data->priority ?? 'media',
                ":item_type" => $data->item_type,
                ":item_make" => $data->item_make ?? null,
                ":item_model" => $data->item_model ?? null,
                ":item_identifier" => $data->item_identifier ?? null,
                ":item_color" => $data->item_color ?? null,
                ":item_condition" => $data->item_condition ?? null,
                ":accessories" => $data->accessories ?? null,
                ":problem_reported" => $data->problem_reported,
                ":problem_found" => $data->problem_found ?? null,
                ":service_performed" => $data->service_performed ?? null,
                ":internal_notes" => $data->internal_notes ?? null,
                ":labor_total" => $data->labor_total ?? 0,
                ":parts_total" => $data->parts_total ?? 0,
                ":discount" => $data->discount ?? 0,
                ":total_amount" => $data->total_amount ?? 0,
                ":expected_delivery" => $data->expected_delivery ?? null
            ]);

            if (!empty($data->items)) {
                foreach ($data->items as $item) {
                    $stmtItem = $this->conn->prepare("INSERT INTO service_order_items 
                        (id, company_id, service_order_id, product_id, description, quantity, unit_price, total_price) 
                        VALUES (:id, :company_id, :so_id, :product_id, :description, :quantity, :unit_price, :total_price)");
                    $stmtItem->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":so_id" => $soId,
                        ":product_id" => $item->product_id ?? null,
                        ":description" => $item->description,
                        ":quantity" => $item->quantity ?? 1,
                        ":unit_price" => $item->unit_price ?? 0,
                        ":total_price" => ($item->quantity ?? 1) * ($item->unit_price ?? 0)
                    ]);

                    if (!empty($item->product_id)) {
                        $this->updateStock($item->product_id, $item->quantity, 'saida', $soId);
                    }
                }
            }

            if (!empty($data->services)) {
                foreach ($data->services as $service) {
                    $stmtService = $this->conn->prepare("INSERT INTO service_order_services 
                        (id, company_id, service_order_id, description, price) 
                        VALUES (:id, :company_id, :so_id, :description, :price)");
                    $stmtService->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":so_id" => $soId,
                        ":description" => $service->description,
                        ":price" => $service->price ?? 0
                    ]);
                }
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Ordem de Serviço criada com sucesso", "id" => $soId], 201);

        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao criar OS: " . $e->getMessage()], 500);
        }
    }

    public function list() {
        $this->authenticate();
        try {
            $stmt = $this->conn->prepare("SELECT so.*, c.name as customer_name, c.phone as customer_phone 
                                          FROM service_orders so 
                                          JOIN customers c ON so.customer_id = c.id 
                                          WHERE so.company_id = :company_id 
                                          ORDER BY so.created_at DESC");
            $stmt->execute([':company_id' => $this->company_id]);
            $this->jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Erro ao listar OS: " . $e->getMessage()], 500);
        }
    }

    public function get($id) {
        $this->authenticate();
        try {
            $stmt = $this->conn->prepare("SELECT so.*, c.name as customer_name, c.phone as customer_phone, c.cpf_cnpj as customer_doc, c.address as customer_address 
                                          FROM service_orders so 
                                          JOIN customers c ON so.customer_id = c.id 
                                          WHERE so.id = :id AND so.company_id = :company_id");
            $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
            $so = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$so) $this->jsonResponse(["message" => "OS não encontrada"], 404);

            $stmtItems = $this->conn->prepare("SELECT * FROM service_order_items WHERE service_order_id = :so_id");
            $stmtItems->execute([':so_id' => $id]);
            $so['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            $stmtServices = $this->conn->prepare("SELECT * FROM service_order_services WHERE service_order_id = :so_id");
            $stmtServices->execute([':so_id' => $id]);
            $so['services'] = $stmtServices->fetchAll(PDO::FETCH_ASSOC);

            $this->jsonResponse($so);
        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Erro ao buscar OS: " . $e->getMessage()], 500);
        }
    }

    public function update($id) {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $data = $this->getPostData();

        try {
            $this->conn->beginTransaction();

            // 1. Revert Old Stock
            $stmtOld = $this->conn->prepare("SELECT product_id, quantity FROM service_order_items WHERE service_order_id = :so_id AND product_id IS NOT NULL");
            $stmtOld->execute([':so_id' => $id]);
            $oldItems = $stmtOld->fetchAll();
            foreach ($oldItems as $oi) {
                $this->updateStock($oi['product_id'], $oi['quantity'], 'entrada', $id);
            }

            // 2. Update OS Header
            $stmt = $this->conn->prepare("UPDATE service_orders SET 
                customer_id = :customer_id, status = :status, priority = :priority, 
                item_type = :item_type, item_make = :item_make, item_model = :item_model, 
                item_identifier = :item_identifier, item_color = :item_color, 
                item_condition = :item_condition, accessories = :accessories, 
                problem_reported = :problem_reported, problem_found = :problem_found, 
                service_performed = :service_performed, internal_notes = :internal_notes, 
                labor_total = :labor_total, parts_total = :parts_total, 
                discount = :discount, total_amount = :total_amount, 
                expected_delivery = :expected_delivery, exit_date = :exit_date 
                WHERE id = :id AND company_id = :company_id");

            $stmt->execute([
                ":id" => $id,
                ":company_id" => $this->company_id,
                ":customer_id" => $data->customer_id,
                ":status" => $data->status,
                ":priority" => $data->priority,
                ":item_type" => $data->item_type,
                ":item_make" => $data->item_make ?? null,
                ":item_model" => $data->item_model ?? null,
                ":item_identifier" => $data->item_identifier ?? null,
                ":item_color" => $data->item_color ?? null,
                ":item_condition" => $data->item_condition ?? null,
                ":accessories" => $data->accessories ?? null,
                ":problem_reported" => $data->problem_reported,
                ":problem_found" => $data->problem_found ?? null,
                ":service_performed" => $data->service_performed ?? null,
                ":internal_notes" => $data->internal_notes ?? null,
                ":labor_total" => $data->labor_total ?? 0,
                ":parts_total" => $data->parts_total ?? 0,
                ":discount" => $data->discount ?? 0,
                ":total_amount" => $data->total_amount ?? 0,
                ":expected_delivery" => $data->expected_delivery ?? null,
                ":exit_date" => $data->exit_date ?? null
            ]);

            // 3. Delete and Re-insert items & services
            $this->conn->prepare("DELETE FROM service_order_items WHERE service_order_id = :id")->execute([':id' => $id]);
            $this->conn->prepare("DELETE FROM service_order_services WHERE service_order_id = :id")->execute([':id' => $id]);

            if (!empty($data->items)) {
                foreach ($data->items as $item) {
                    $this->conn->prepare("INSERT INTO service_order_items 
                        (id, company_id, service_order_id, product_id, description, quantity, unit_price, total_price) 
                        VALUES (:id, :company_id, :so_id, :product_id, :description, :quantity, :unit_price, :total_price)")
                    ->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":so_id" => $id,
                        ":product_id" => $item->product_id ?? null,
                        ":description" => $item->description,
                        ":quantity" => $item->quantity ?? 1,
                        ":unit_price" => $item->unit_price ?? 0,
                        ":total_price" => ($item->quantity ?? 1) * ($item->unit_price ?? 0)
                    ]);
                    if (!empty($item->product_id)) {
                        $this->updateStock($item->product_id, $item->quantity, 'saida', $id);
                    }
                }
            }

            if (!empty($data->services)) {
                foreach ($data->services as $service) {
                    $this->conn->prepare("INSERT INTO service_order_services 
                        (id, company_id, service_order_id, description, price) 
                        VALUES (:id, :company_id, :so_id, :description, :price)")
                    ->execute([
                        ":id" => generateUUID(),
                        ":company_id" => $this->company_id,
                        ":so_id" => $id,
                        ":description" => $service->description,
                        ":price" => $service->price ?? 0
                    ]);
                }
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "OS atualizada com sucesso"]);

        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao atualizar OS: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $this->authenticate();
        try {
            $this->conn->beginTransaction();

            // Revert Stock
            $stmtOld = $this->conn->prepare("SELECT product_id, quantity FROM service_order_items WHERE service_order_id = :so_id AND product_id IS NOT NULL");
            $stmtOld->execute([':so_id' => $id]);
            foreach ($stmtOld->fetchAll() as $oi) {
                $this->updateStock($oi['product_id'], $oi['quantity'], 'entrada', $id);
            }

            $stmt = $this->conn->prepare("DELETE FROM service_orders WHERE id = :id AND company_id = :company_id");
            $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
            
            $this->conn->commit();
            $this->jsonResponse(["message" => "OS excluída com sucesso"]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao excluir OS: " . $e->getMessage()], 500);
        }
    }

    public function updateStatus($id) {
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->status)) $this->jsonResponse(["message" => "Status é obrigatório"], 400);

        try {
            $this->conn->beginTransaction();

            $exitDate = ($data->status === 'entregue' || $data->status === 'pronto') ? date('Y-m-d H:i:s') : null;
            
            $sql = "UPDATE service_orders SET status = :status";
            $params = [':status' => $data->status, ':id' => $id, ':company_id' => $this->company_id];
            if ($exitDate) {
                $sql .= ", exit_date = :exit_date";
                $params[':exit_date'] = $exitDate;
            }
            $sql .= " WHERE id = :id AND company_id = :company_id";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            // Se mudou para ENTREGUE, registra no caixa
            if ($data->status === 'entregue') {
                $stmtSO = $this->conn->prepare("SELECT total_amount FROM service_orders WHERE id = :id");
                $stmtSO->execute([':id' => $id]);
                $total = $stmtSO->fetchColumn();

                if ($total > 0) {
                    $stmtReg = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL AND company_id = :company_id ORDER BY opened_at DESC LIMIT 1");
                    $stmtReg->execute([':company_id' => $this->company_id]);
                    $registerId = $stmtReg->fetchColumn();

                    if ($registerId) {
                        $this->conn->prepare("INSERT INTO cash_movements (id, company_id, cash_register_id, amount, type, observation, created_by, created_at) 
                                              VALUES (:id, :company_id, :reg_id, :amount, 'venda', :obs, :uid, :created_at)")
                        ->execute([
                            ":id" => generateUUID(),
                            ":company_id" => $this->company_id,
                            ":reg_id" => $registerId,
                            ":amount" => $total,
                            ":obs" => "Recebimento OS #".substr($id, 0, 8),
                            ":uid" => $auth['id'],
                            ":created_at" => date('Y-m-d H:i:s')
                        ]);
                    }
                }
            }
            
            $this->conn->commit();
            $this->jsonResponse(["message" => "Status atualizado com sucesso"]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao atualizar status: " . $e->getMessage()], 500);
        }
    }
}
