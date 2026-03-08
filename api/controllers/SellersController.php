<?php
// /api/controllers/SellersController.php

require_once 'ApiController.php';

class SellersController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT * FROM sellers WHERE company_id = :company_id ORDER BY name ASC");
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
        $query = "INSERT INTO sellers (id, company_id, name, email, phone, commission_percentage, active) 
                  VALUES (:id, :company_id, :name, :email, :phone, :commission, :active)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ":id" => $id,
            ":company_id" => $this->company_id,
            ":name" => $data->name,
            ":email" => $data->email ?? null,
            ":phone" => $data->phone ?? null,
            ":commission" => isset($data->commission_percentage) ? (float)$data->commission_percentage : 0,
            ":active" => isset($data->active) ? (int)$data->active : 1
        ]);

        $this->jsonResponse(["message" => "Vendedor criado", "id" => $id], 201);
    }

    public function update($id) {
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->name)) {
            $this->jsonResponse(["message" => "Nome é obrigatório"], 400);
        }

        $query = "UPDATE sellers SET 
                    name = :name, 
                    email = :email, 
                    phone = :phone, 
                    commission_percentage = :commission,
                    active = :active
                  WHERE id = :id AND company_id = :company_id";
        
        $stmt = $this->conn->prepare($query);
        try {
            $stmt->execute([
                ":id" => $id,
                ":company_id" => $this->company_id,
                ":name" => $data->name,
                ":email" => $data->email ?? null,
                ":phone" => $data->phone ?? null,
                ":commission" => isset($data->commission_percentage) ? (float)$data->commission_percentage : 0,
                ":active" => isset($data->active) ? (int)$data->active : 1
            ]);

            $this->jsonResponse(["message" => "Vendedor atualizado com sucesso"]);
        } catch (PDOException $e) {
             $this->jsonResponse(["message" => "Erro ao atualizar: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $this->authenticate();
        try {
            // Verifica se o vendedor possui vendas relacionadas
            $stmt = $this->conn->prepare("SELECT COUNT(*) FROM sales WHERE seller_id = :id AND company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
            if ($stmt->fetchColumn() > 0) {
                return $this->jsonResponse(["message" => "Não é possível excluir vendedor com vendas vinculadas."], 400);
            }

            $stmt = $this->conn->prepare("DELETE FROM sellers WHERE id = :id AND company_id = :company_id");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);

            if ($stmt->rowCount() > 0) {
                $this->jsonResponse(["message" => "Vendedor removido com sucesso"]);
            } else {
                $this->jsonResponse(["message" => "Vendedor não encontrado"], 404);
            }
        } catch (PDOException $e) {
            $this->jsonResponse(["message" => "Erro ao excluir vendedor: " . $e->getMessage()], 500);
        }
    }
}
