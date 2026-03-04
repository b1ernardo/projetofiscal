<?php
// /api/controllers/FinancesController.php

require_once __DIR__ . '/ApiController.php';

class FinancesController extends ApiController {
    
    // --- Accounts Payable (Contas a Pagar) ---
    
    public function listPayable() {
        $this->authenticate();
        $query = "SELECT ap.*, s.name as supplier_name 
                  FROM accounts_payable ap 
                  LEFT JOIN suppliers s ON ap.supplier_id = s.id 
                  ORDER BY ap.due_date ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function createPayable() {
        $user = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->description) || empty($data->amount) || empty($data->due_date)) {
            $this->jsonResponse(["message" => "Missing required fields"], 400);
        }

        $id = bin2hex(random_bytes(18));
        $query = "INSERT INTO accounts_payable (id, description, supplier_id, amount, due_date, status, payment_date, category, payment_method) 
                  VALUES (:id, :description, :supplier_id, :amount, :due_date, :status, :payment_date, :category, :payment_method)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ':id' => $id,
            ':description' => $data->description,
            ':supplier_id' => $data->supplier_id ?? null,
            ':amount' => $data->amount,
            ':due_date' => $data->due_date,
            ':status' => $data->status ?? 'pending',
            ':payment_date' => $data->payment_date ?? null,
            ':category' => $data->category ?? 'Geral',
            ':payment_method' => $data->payment_method ?? null
        ]);

        $this->jsonResponse(["message" => "Account payable created", "id" => $id], 201);
    }

    public function updatePayable($id) {
        $user = $this->authenticate();
        $data = $this->getPostData();

        // Check if status is changing to 'paid'
        $stmt = $this->conn->prepare("SELECT status FROM accounts_payable WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $oldStatus = $stmt->fetchColumn();

        $query = "UPDATE accounts_payable SET 
                  description = :description,
                  supplier_id = :supplier_id,
                  amount = :amount,
                  due_date = :due_date,
                  status = :status,
                  payment_date = :payment_date,
                  category = :category,
                  payment_method = :payment_method
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        try {
            $stmt->execute([
                ':id' => $id,
                ':description' => $data->description,
                ':supplier_id' => $data->supplier_id ?? null,
                ':amount' => $data->amount,
                ':due_date' => $data->due_date,
                ':status' => $data->status,
                ':payment_date' => $data->payment_date ?? null,
                ':category' => $data->category ?? 'Geral',
                ':payment_method' => $data->payment_method ?? null
            ]);

            // If it was pending and is now paid, create cash movement (negative)
            if ($oldStatus !== 'paid' && $data->status === 'paid') {
                $stmtReg = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1");
                $stmtReg->execute();
                $register = $stmtReg->fetch();

                if ($register) {
                    require_once __DIR__ . '/../utils.php';
                    $stmtMove = $this->conn->prepare("INSERT INTO cash_movements (id, cash_register_id, amount, type, observation, created_by) 
                                                      VALUES (:move_id, :reg_id, :amount, 'saida', :obs, :uid)");
                    $stmtMove->execute([
                        ":move_id" => generateUUID(),
                        ":reg_id" => $register['id'],
                        ":amount" => -$data->amount,
                        ":obs" => "Pagamento: {$data->description}" . ($data->payment_method ? " ({$data->payment_method})" : ""),
                        ":uid" => $user['id']
                    ]);
                }
            }
        } catch (PDOException $e) {
            // Column might not exist yet, try without it if it fails initially
            // But we should try to add it first.
            $this->jsonResponse(["message" => "Erro ao atualizar: " . $e->getMessage()], 500);
            return;
        }

        $this->jsonResponse(["message" => "Account payable updated"]);
    }

    public function deletePayable($id) {
        $this->authenticate();
        $query = "DELETE FROM accounts_payable WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':id' => $id]);
        $this->jsonResponse(["message" => "Account payable deleted"]);
    }

    // --- Accounts Receivable (Contas a Receber) ---

    public function listReceivable() {
        $this->authenticate();
        $query = "SELECT ar.*, c.name as customer_name 
                  FROM accounts_receivable ar 
                  LEFT JOIN customers c ON ar.customer_id = c.id 
                  ORDER BY ar.due_date ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function createReceivable() {
        $user = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->description) || empty($data->amount) || empty($data->due_date)) {
            $this->jsonResponse(["message" => "Missing required fields"], 400);
        }

        $id = bin2hex(random_bytes(18));
        $query = "INSERT INTO accounts_receivable (id, description, customer_id, amount, due_date, status, payment_date, category, payment_method) 
                  VALUES (:id, :description, :customer_id, :amount, :due_date, :status, :payment_date, :category, :payment_method)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ':id' => $id,
            ':description' => $data->description,
            ':customer_id' => $data->customer_id ?? null,
            ':amount' => $data->amount,
            ':due_date' => $data->due_date,
            ':status' => $data->status ?? 'pending',
            ':payment_date' => $data->payment_date ?? null,
            ':category' => $data->category ?? 'Geral',
            ':payment_method' => $data->payment_method ?? null
        ]);

        $this->jsonResponse(["message" => "Account receivable created", "id" => $id], 201);
    }

    public function updateReceivable($id) {
        $user = $this->authenticate();
        $data = $this->getPostData();

        // Check if status is changing to 'paid'
        $stmt = $this->conn->prepare("SELECT status FROM accounts_receivable WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $oldStatus = $stmt->fetchColumn();

        $query = "UPDATE accounts_receivable SET 
                  description = :description,
                  customer_id = :customer_id,
                  amount = :amount,
                  due_date = :due_date,
                  status = :status,
                  payment_date = :payment_date,
                  category = :category,
                  payment_method = :payment_method
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ':id' => $id,
            ':description' => $data->description,
            ':customer_id' => $data->customer_id ?? null,
            ':amount' => $data->amount,
            ':due_date' => $data->due_date,
            ':status' => $data->status,
            ':payment_date' => $data->payment_date ?? null,
            ':category' => $data->category ?? 'Geral',
            ':payment_method' => $data->payment_method ?? null
        ]);

        // If it was pending/overdue and is now paid, create cash movement (positive)
        if ($oldStatus !== 'paid' && $data->status === 'paid') {
            $stmtReg = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1");
            $stmtReg->execute();
            $register = $stmtReg->fetch();

            if ($register) {
                require_once __DIR__ . '/../utils.php';
                $stmtMove = $this->conn->prepare("INSERT INTO cash_movements (id, cash_register_id, amount, type, observation, created_by) 
                                                  VALUES (:move_id, :reg_id, :amount, 'entrada', :obs, :uid)");
                $stmtMove->execute([
                    ":move_id" => generateUUID(),
                    ":reg_id" => $register['id'],
                    ":amount" => $data->amount,
                    ":obs" => "Recebimento: {$data->description}" . ($data->payment_method ? " ({$data->payment_method})" : ""),
                    ":uid" => $user['id']
                ]);
            }
        }

        $this->jsonResponse(["message" => "Account receivable updated"]);
    }

    public function deleteReceivable($id) {
        $this->authenticate();
        $query = "DELETE FROM accounts_receivable WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':id' => $id]);
        $this->jsonResponse(["message" => "Account receivable deleted"]);
    }
}
