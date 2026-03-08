<?php
require_once 'ApiController.php';

class DeliveryNeighborhoodsController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT * FROM delivery_neighborhoods WHERE company_id = :company_id ORDER BY name ASC");
        $stmt->execute([':company_id' => $this->company_id]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function create() {
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->name)) {
            $this->jsonResponse(["message" => "Nome do bairro é obrigatório"], 400);
        }

        require_once __DIR__ . '/../utils.php';

        if (isset($data->id) && !empty($data->id)) {
            // Update
            $stmt = $this->conn->prepare("UPDATE delivery_neighborhoods SET name = :name, fee = :fee WHERE id = :id AND company_id = :company_id");
            $stmt->execute([
                ':name' => $data->name,
                ':fee' => (float)$data->fee,
                ':id' => $data->id,
                ':company_id' => $this->company_id
            ]);
            $this->jsonResponse(["message" => "Bairro atualizado"]);
        } else {
            // Create
            $stmt = $this->conn->prepare("INSERT INTO delivery_neighborhoods (id, company_id, name, fee) VALUES (:id, :company_id, :name, :fee)");
            $stmt->execute([
                ':id' => generateUUID(),
                ':company_id' => $this->company_id,
                ':name' => $data->name,
                ':fee' => (float)$data->fee
            ]);
            $this->jsonResponse(["message" => "Bairro cadastrado"], 201);
        }
    }

    public function delete($id) {
        $this->authenticate();
        $stmt = $this->conn->prepare("DELETE FROM delivery_neighborhoods WHERE id = :id AND company_id = :company_id");
        $stmt->execute([
            ':id' => $id,
            ':company_id' => $this->company_id
        ]);
        $this->jsonResponse(["message" => "Bairro excluído"]);
    }
}
