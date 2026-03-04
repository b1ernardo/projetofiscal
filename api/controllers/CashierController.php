<?php
// /api/controllers/CashierController.php

require_once 'ApiController.php';

class CashierController extends ApiController {

    public function getCurrent() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT * FROM cash_registers WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1");
        $stmt->execute();
        $register = $stmt->fetch();
        $this->jsonResponse($register ?: null);
    }

    public function open() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        // Verifica se já existe um aberto
        $stmt = $this->conn->prepare("SELECT id FROM cash_registers WHERE closed_at IS NULL LIMIT 1");
        $stmt->execute();
        if ($stmt->fetch()) {
            $this->jsonResponse(["message" => "Já existe um caixa aberto"], 400);
        }

        $id = generateUUID();
        $stmt = $this->conn->prepare("INSERT INTO cash_registers (id, opened_at, opening_balance, opened_by) VALUES (:id, NOW(), :balance, :uid)");
        $stmt->execute([
            ":id" => $id,
            ":balance" => $data->initial_balance ?? 0,
            ":uid" => $auth['id']
        ]);

        $this->jsonResponse(["message" => "Caixa aberto com sucesso", "id" => $id], 201);
    }

    public function close() {
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->id)) {
            $this->jsonResponse(["message" => "ID do caixa é obrigatório"], 400);
        }

        $final_balance = $data->final_balance ?? $data->closing_balance ?? 0;

        $stmt = $this->conn->prepare("UPDATE cash_registers SET closed_at = NOW(), closing_balance = :balance, closed_by = :uid WHERE id = :id");
        $stmt->execute([
            ":id" => $data->id,
            ":balance" => $final_balance,
            ":uid" => $auth['id']
        ]);

        $this->jsonResponse(["message" => "Caixa fechado com sucesso"]);
    }

    public function getSummary() {
        $this->authenticate();
        $id = $_GET['id'] ?? null;
        if (!$id) $this->jsonResponse(["message" => "ID do caixa é obrigatório"], 400);

        // 1. Dados do Carrinho (Register info)
        $stmt = $this->conn->prepare("SELECT * FROM cash_registers WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $register = $stmt->fetch();
        if (!$register) $this->jsonResponse(["message" => "Caixa não encontrado"], 404);

        // 2. Vendas e Pagamentos
        $query = "SELECT sp.method_name, SUM(sp.amount) as total, COUNT(DISTINCT s.id) as count
                  FROM sales s
                  JOIN sale_payments sp ON s.id = sp.sale_id
                  WHERE s.status = 'completed' AND s.created_at >= :opened_at
                  GROUP BY sp.method_name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':opened_at' => $register['opened_at']]);
        $salesByMethod = $stmt->fetchAll();

        // 3. Totais gerais de vendas
        $stmt = $this->conn->prepare("SELECT SUM(total_amount) as total, COUNT(id) as count FROM sales WHERE status = 'completed' AND created_at >= :opened_at");
        $stmt->execute([':opened_at' => $register['opened_at']]);
        $salesTotal = $stmt->fetch();

        // 3.1 Total em Dinheiro (para o saldo físico)
        $stmt = $this->conn->prepare("SELECT SUM(sp.amount) as total 
                                      FROM sale_payments sp 
                                      JOIN sales s ON s.id = sp.sale_id 
                                      WHERE s.status = 'completed' AND s.created_at >= :opened_at AND sp.method_name = 'Dinheiro'");
        $stmt->execute([':opened_at' => $register['opened_at']]);
        $cashSalesTotal = (float)($stmt->fetch()['total'] ?? 0);

        // 4. Sangrias e Suprimentos
        $stmt = $this->conn->prepare("SELECT type, SUM(amount) as total FROM cash_movements WHERE cash_register_id = :id GROUP BY type");
        $stmt->execute([':id' => $id]);
        $movements = $stmt->fetchAll();

        $totalSangrias = 0;
        $totalSuprimentos = 0;
        foreach ($movements as $m) {
            if ($m['type'] === 'sangria') $totalSangrias = (float)$m['total'];
            if ($m['type'] === 'suprimento') $totalSuprimentos = (float)$m['total'];
        }

        $this->jsonResponse([
            "openingBalance" => (float)$register['opening_balance'],
            "openedAt" => $register['opened_at'],
            "salesByMethod" => array_map(function($m) {
                return ["method" => $m['method_name'], "total" => (float)$m['total'], "count" => (int)$m['count']];
            }, $salesByMethod),
            "totalSales" => (float)($salesTotal['total'] ?? 0),
            "totalCashSales" => $cashSalesTotal,
            "totalSalesCount" => (int)($salesTotal['count'] ?? 0),
            "totalSangrias" => $totalSangrias,
            "totalSuprimentos" => $totalSuprimentos,
            "closingBalance" => (float)$register['opening_balance'] + $cashSalesTotal + $totalSuprimentos - $totalSangrias
        ]);
    }

    public function getMovements() {
        $this->authenticate();
        $registerId = $_GET['register_id'] ?? null;
        if (!$registerId) $this->jsonResponse(["message" => "ID do caixa é obrigatário"], 400);

        $stmt = $this->conn->prepare("SELECT * FROM cash_movements WHERE cash_register_id = :rid ORDER BY created_at DESC");
        $stmt->execute([":rid" => $registerId]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function addMovement() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->cash_register_id) || empty($data->type) || !isset($data->amount)) {
            $this->jsonResponse(["message" => "Dados incompletos"], 400);
        }

        try {
            $id = generateUUID();
            $stmt = $this->conn->prepare("INSERT INTO cash_movements (id, cash_register_id, type, amount, observation, created_by) VALUES (:id, :rid, :type, :amount, :obs, :uid)");
            $stmt->execute([
                ":id" => $id,
                ":rid" => $data->cash_register_id,
                ":type" => $data->type,
                ":amount" => $data->amount,
                ":obs" => $data->description ?? "", // The field in JSON is description, in DB is observation
                ":uid" => $auth['id']
            ]);

            $this->jsonResponse(["message" => "Movimentação registrada", "id" => $id], 201);
        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Erro ao registrar: " . $e->getMessage()], 500);
        }
    }

    public function updateMovement($id) {
        $this->authenticate();
        $data = $this->getPostData();
        
        try {
            $stmt = $this->conn->prepare("UPDATE cash_movements SET amount = :amount, observation = :obs WHERE id = :id");
            $stmt->execute([
                ":amount" => $data->amount,
                ":obs" => $data->description ?? "",
                ":id" => $id
            ]);
            $this->jsonResponse(["message" => "Movimentação atualizada"]);
        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Erro ao atualizar: " . $e->getMessage()], 500);
        }
    }

    public function deleteMovement($id) {
        $this->authenticate();
        $stmt = $this->conn->prepare("DELETE FROM cash_movements WHERE id = :id");
        $stmt->execute([":id" => $id]);
        $this->jsonResponse(["message" => "Movimentação removida"]);
    }

    public function getHistory() {
        $this->authenticate();
        $stmt = $this->conn->prepare("SELECT * FROM cash_registers ORDER BY opened_at DESC LIMIT 50");
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll());
    }

    public function deleteHistory($id) {
        $this->authenticate();
        if (!$id) $this->jsonResponse(["message" => "ID do caixa é obrigatório"], 400);

        // Verifica se o caixa está aberto
        $stmt = $this->conn->prepare("SELECT closed_at FROM cash_registers WHERE id = :id");
        $stmt->execute([":id" => $id]);
        $register = $stmt->fetch();

        if (!$register) {
            $this->jsonResponse(["message" => "Caixa não encontrado"], 404);
        }

        if ($register['closed_at'] === null) {
            $this->jsonResponse(["message" => "Não é possível excluir um caixa que ainda está aberto"], 400);
        }

        $stmt = $this->conn->prepare("DELETE FROM cash_registers WHERE id = :id");
        $stmt->execute([":id" => $id]);
        $this->jsonResponse(["message" => "Registro de caixa removido com sucesso"]);
    }
}
