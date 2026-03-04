<?php
// /api/controllers/SuppliersController.php

require_once 'ApiController.php';

class SuppliersController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT * FROM suppliers ORDER BY name ASC");
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
        $query = "INSERT INTO suppliers (id, name, email, phone, cnpj, address) 
                  VALUES (:id, :name, :email, :phone, :cnpj, :address)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ":id" => $id,
            ":name" => $data->name,
            ":email" => $data->email ?? null,
            ":phone" => $data->phone ?? null,
            ":cnpj" => $data->cnpj ?? null,
            ":address" => $data->address ?? null
        ]);

        $this->jsonResponse(["message" => "Fornecedor criado", "id" => $id], 201);
    }
}
