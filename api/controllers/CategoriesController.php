<?php
// /api/controllers/CategoriesController.php

require_once 'ApiController.php';

class CategoriesController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT id, name FROM categories ORDER BY name ASC");
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
        $stmt = $this->conn->prepare("INSERT INTO categories (id, name) VALUES (:id, :name)");
        $stmt->execute([
            ":id" => $id,
            ":name" => $data->name
        ]);

        $this->jsonResponse(["message" => "Categoria criada com sucesso", "id" => $id], 201);
    }

    public function delete($id) {
        $this->authenticate();
        try {
            $stmt = $this->conn->prepare("DELETE FROM categories WHERE id = :id");
            $stmt->execute([":id" => $id]);
            $this->jsonResponse(["message" => "Categoria removida com sucesso"]);
        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Não foi possível remover. Pode haver produtos vinculados."], 400);
        }
    }
}
