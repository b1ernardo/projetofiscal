<?php
// /api/controllers/CustomersController.php

require_once 'ApiController.php';

class CustomersController extends ApiController {
    
    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT * FROM customers ORDER BY name ASC");
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
        $query = "INSERT INTO customers (id, name, cpf_cnpj, email, phone, address, ie, cep, logradouro, numero, bairro, municipio, codigo_municipio, uf) 
                  VALUES (:id, :name, :cpf_cnpj, :email, :phone, :address, :ie, :cep, :logradouro, :numero, :bairro, :municipio, :codigo_municipio, :uf)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ":id" => $id,
            ":name" => $data->name,
            ":cpf_cnpj" => $data->cpf_cnpj ?? null,
            ":email" => $data->email ?? null,
            ":phone" => $data->phone ?? null,
            ":address" => $data->address ?? null,
            ":ie" => $data->ie ?? null,
            ":cep" => $data->cep ?? null,
            ":logradouro" => $data->logradouro ?? null,
            ":numero" => $data->numero ?? null,
            ":bairro" => $data->bairro ?? null,
            ":municipio" => $data->municipio ?? null,
            ":codigo_municipio" => $data->codigo_municipio ?? null,
            ":uf" => $data->uf ?? null
        ]);

        $this->jsonResponse(["message" => "Cliente criado", "id" => $id], 201);
    }

    public function update($id) {
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->name)) {
            $this->jsonResponse(["message" => "Nome é obrigatório"], 400);
        }

        $query = "UPDATE customers SET 
                    name = :name, 
                    cpf_cnpj = :cpf_cnpj, 
                    email = :email, 
                    phone = :phone, 
                    address = :address, 
                    ie = :ie, 
                    cep = :cep, 
                    logradouro = :logradouro, 
                    numero = :numero, 
                    bairro = :bairro, 
                    municipio = :municipio, 
                    codigo_municipio = :codigo_municipio, 
                    uf = :uf,
                    status = :status
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        try {
            $stmt->execute([
                ":id" => $id,
                ":name" => $data->name,
                ":cpf_cnpj" => $data->cpf_cnpj ?? null,
                ":email" => $data->email ?? null,
                ":phone" => $data->phone ?? null,
                ":address" => $data->address ?? null,
                ":ie" => $data->ie ?? null,
                ":cep" => $data->cep ?? null,
                ":logradouro" => $data->logradouro ?? null,
                ":numero" => $data->numero ?? null,
                ":bairro" => $data->bairro ?? null,
                ":municipio" => $data->municipio ?? null,
                ":codigo_municipio" => $data->codigo_municipio ?? null,
                ":uf" => $data->uf ?? null,
                ":status" => $data->status ?? 'active'
            ]);

            if ($stmt->rowCount() > 0 || $stmt->errorCode() == '00000') {
                $this->jsonResponse(["message" => "Cliente atualizado com sucesso"]);
            } else {
                $this->jsonResponse(["message" => "Cliente não encontrado ou nenhuma alteração realizada"], 404);
            }
        } catch (PDOException $e) {
             $this->jsonResponse(["message" => "Erro ao atualizar: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $this->authenticate();
        try {
            // Verifica se o cliente possui contas ou vendas relacionadas
            $stmt = $this->conn->prepare("SELECT COUNT(*) FROM sales WHERE customer_id = :id");
            $stmt->execute([":id" => $id]);
            if ($stmt->fetchColumn() > 0) {
                return $this->jsonResponse(["message" => "Não é possível excluir cliente com vendas vinculadas."], 400);
            }

            $stmt = $this->conn->prepare("SELECT COUNT(*) FROM accounts_receivable WHERE customer_id = :id");
            $stmt->execute([":id" => $id]);
            if ($stmt->fetchColumn() > 0) {
                return $this->jsonResponse(["message" => "Não é possível excluir cliente com contas a receber vinculadas."], 400);
            }

            $stmt = $this->conn->prepare("DELETE FROM customers WHERE id = :id");
            $stmt->execute([":id" => $id]);

            if ($stmt->rowCount() > 0) {
                $this->jsonResponse(["message" => "Cliente removido com sucesso"]);
            } else {
                $this->jsonResponse(["message" => "Cliente não encontrado"], 404);
            }
        } catch (PDOException $e) {
            $this->jsonResponse(["message" => "Erro ao excluir cliente: " . $e->getMessage()], 500);
        }
    }
}
