<?php
// /api/controllers/SubCategoriesController.php

require_once 'ApiController.php';

class SubCategoriesController extends ApiController {

    public function list() {
        $this->authenticate();
        $category_id = $_GET['category_id'] ?? null;

        if ($category_id) {
            $stmt = $this->conn->prepare("SELECT id, category_id, name FROM sub_categories WHERE company_id = :company_id AND category_id = :category_id ORDER BY name ASC");
            $stmt->execute([':company_id' => $this->company_id, ':category_id' => $category_id]);
        } else {
            $stmt = $this->conn->prepare("SELECT id, category_id, name FROM sub_categories WHERE company_id = :company_id ORDER BY name ASC");
            $stmt->execute([':company_id' => $this->company_id]);
        }

        $this->jsonResponse($stmt->fetchAll());
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->name) || empty($data->category_id)) {
            $this->jsonResponse(["message" => "Nome e categoria são obrigatórios"], 400);
        }

        $id = generateUUID();
        $stmt = $this->conn->prepare("INSERT INTO sub_categories (id, company_id, category_id, name) VALUES (:id, :company_id, :category_id, :name)");
        $stmt->execute([
            ":id"          => $id,
            ":company_id"  => $this->company_id,
            ":category_id" => $data->category_id,
            ":name"        => trim($data->name),
        ]);

        $this->jsonResponse(["message" => "Sub-categoria criada", "id" => $id], 201);
    }

    public function delete($id) {
        $this->authenticate();
        $stmt = $this->conn->prepare("DELETE FROM sub_categories WHERE id = :id AND company_id = :company_id");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
        $this->jsonResponse(["message" => "Sub-categoria removida"]);
    }
}
