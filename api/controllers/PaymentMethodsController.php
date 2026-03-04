<?php
// /api/controllers/PaymentMethodsController.php

require_once 'ApiController.php';

class PaymentMethodsController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT id, name, active FROM payment_methods ORDER BY name ASC");
        $stmt->execute();
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
        $stmt = $this->conn->prepare("INSERT INTO payment_methods (id, name, active) VALUES (:id, :name, 1)");
        $stmt->execute([
            ":id" => $id,
            ":name" => $data->name
        ]);

        $this->jsonResponse(["message" => "Forma de pagamento criada com sucesso", "id" => $id], 201);
    }

    public function update($id) {
        $this->authenticate();
        $data = $this->getPostData();

        $sql = "UPDATE payment_methods SET active = :active";
        $params = [
            ":active" => isset($data->active) ? ($data->active ? 1 : 0) : 1,
            ":id" => $id
        ];

        if (!empty($data->name)) {
            $sql .= ", name = :name";
            $params[":name"] = $data->name;
        }

        $sql .= " WHERE id = :id";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $this->jsonResponse(["message" => "Forma de pagamento atualizada"]);
    }

    public function delete($id) {
        $this->authenticate();
        try {
            $stmt = $this->conn->prepare("DELETE FROM payment_methods WHERE id = :id");
            $stmt->execute([":id" => $id]);
            $this->jsonResponse(["message" => "Forma de pagamento removida"]);
        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Não foi possível remover."], 400);
        }
    }
}
