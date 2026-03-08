<?php
// /api/controllers/ChartOfAccountsController.php

require_once 'ApiController.php';

class ChartOfAccountsController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT * FROM chart_of_accounts WHERE active = 1 AND company_id = :company_id ORDER BY type, name ASC");
        $stmt->execute([':company_id' => $this->company_id]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->name) || empty($data->type)) {
            $this->jsonResponse(["message" => "Nome e tipo são obrigatórios"], 400);
        }

        $id = generateUUID();
        $query = "INSERT INTO chart_of_accounts (id, company_id, name, type) VALUES (:id, :company_id, :name, :type)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ":id" => $id,
            ":company_id" => $this->company_id,
            ":name" => $data->name,
            ":type" => $data->type
        ]);

        $this->jsonResponse(["message" => "Item de plano de contas criado", "id" => $id], 201);
    }

    public function delete($id) {
        $this->authenticate();
        if (!$id) {
            $this->jsonResponse(["message" => "ID é obrigatório"], 400);
        }
        
        $stmt = $this->conn->prepare("UPDATE chart_of_accounts SET active = 0 WHERE id = :id AND company_id = :company_id");
        $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
        
        $this->jsonResponse(["message" => "Item de plano de contas removido"]);
    }
}
