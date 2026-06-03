<?php
// /api/controllers/PaymentMethodsController.php

require_once 'ApiController.php';

class PaymentMethodsController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT id, name, active, show_in_delivery FROM payment_methods WHERE company_id = :company_id ORDER BY name ASC");
        $stmt->execute([':company_id' => $this->company_id]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->name)) {
            $this->jsonResponse(["message" => "Nome é obrigatório"], 400);
        }

        $id = generateUUID();
        $stmt = $this->conn->prepare("INSERT INTO payment_methods (id, company_id, name, active, show_in_delivery) VALUES (:id, :company_id, :name, 1, 1)");
        $stmt->execute([
            ":id" => $id,
            ":company_id" => $this->company_id,
            ":name" => $data->name
        ]);

        $this->jsonResponse(["message" => "Forma de pagamento criada com sucesso", "id" => $id], 201);
    }

    public function update($id) {
        $this->authenticate();
        $data = $this->getPostData();

        $updates = [];
        $params = [":id" => $id, ":company_id" => $this->company_id];

        if (isset($data->active)) {
            $updates[] = "active = :active";
            $params[":active"] = $data->active ? 1 : 0;
        }

        if (isset($data->show_in_delivery)) {
            $updates[] = "show_in_delivery = :show_in_delivery";
            $params[":show_in_delivery"] = $data->show_in_delivery ? 1 : 0;
        }

        if (!empty($data->name)) {
            $updates[] = "name = :name";
            $params[":name"] = $data->name;
        }

        // Prevent renaming if it's a fixed method
        $stmt = $this->conn->prepare("SELECT name FROM payment_methods WHERE id = :id AND company_id = :company_id");
        $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
        $current = $stmt->fetch();
        
        $fixedMethods = ['Dinheiro', 'Conta'];
        $isFixed = in_array($current['name'], $fixedMethods);

        if ($isFixed && !empty($data->name) && $data->name !== $current['name']) {
            $this->jsonResponse(["message" => "O nome de uma forma de pagamento fixa não pode ser alterado."], 403);
            return;
        }

        if (empty($updates)) {
            $this->jsonResponse(["message" => "Nenhum dado para atualizar"], 400);
            return;
        }

        $sql = "UPDATE payment_methods SET " . implode(", ", $updates) . " WHERE id = :id AND company_id = :company_id";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $this->jsonResponse(["message" => "Forma de pagamento atualizada"]);
    }

    public function delete($id) {
        $this->authenticate();
        
        // Prevent deletion of fixed methods
        $stmt = $this->conn->prepare("SELECT name FROM payment_methods WHERE id = :id AND company_id = :company_id");
        $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
        $current = $stmt->fetch();
        
        $fixedMethods = ['Dinheiro', 'Conta'];
        if ($current && in_array($current['name'], $fixedMethods)) {
            $this->jsonResponse(["message" => "Formas de pagamento fixas ('Dinheiro' ou 'Conta') não podem ser removidas."], 403);
            return;
        }

        try {
            $stmt = $this->conn->prepare("DELETE FROM payment_methods WHERE id = :id AND company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
            $this->jsonResponse(["message" => "Forma de pagamento removida"]);
        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Não foi possível remover."], 400);
        }
    }
}
