<?php
require_once 'ApiController.php';

class NaturezasController extends ApiController {

    // Garante as colunas extras na tabela
    private function ensureColumns() {
        $columns = $this->conn->query("SHOW COLUMNS FROM naturezas_operacao")->fetchAll(PDO::FETCH_COLUMN);
        
        if (!in_array('cfop', $columns)) {
            try {
                $this->conn->exec("ALTER TABLE naturezas_operacao ADD COLUMN cfop VARCHAR(10) DEFAULT NULL");
            } catch (\Exception $e) {}
        }
        
        if (!in_array('padrao', $columns)) {
            try {
                $this->conn->exec("ALTER TABLE naturezas_operacao ADD COLUMN padrao TINYINT(1) NOT NULL DEFAULT 0");
            } catch (\Exception $e) {}
        }
    }

    public function list() {
        $this->authenticate();
        $this->ensureColumns();
        $search = trim($_GET['search'] ?? '');
        
        $sql = "SELECT n.*, (pe.natureza_id IS NOT NULL) as padrao 
                FROM naturezas_operacao n 
                LEFT JOIN natureza_padrao_empresa pe ON (pe.natureza_id = n.id AND pe.company_id = :company_id)
                WHERE (n.company_id = :company_id OR n.company_id IS NULL) ";
        
        if ($search) {
            $sql .= " AND (n.descricao LIKE :s OR n.cfop LIKE :s) ";
        }
        $sql .= " ORDER BY padrao DESC, n.descricao ASC";
        
        $stmt = $this->conn->prepare($sql);
        $params = [':company_id' => $this->company_id];
        if ($search) {
            $params[':s'] = "%$search%";
        }
        $stmt->execute($params);
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['padrao'] = (bool)(int)$r['padrao']; }
        $this->jsonResponse($rows);
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $this->ensureColumns();
        $data = $this->getPostData();

        if (empty($data->descricao)) {
            $this->jsonResponse(["message" => "Descrição da Natureza de Operação é obrigatória"], 400);
        }

        // Sefaz limita natOp em 60 caracteres
        $descricao = substr(strtoupper(trim($data->descricao)), 0, 60);
        $cfop      = isset($data->cfop) ? preg_replace('/\D/', '', $data->cfop) : null;

        // Verifica duplicação (tanto nas privadas quanto nas globais)
        $stmtCheck = $this->conn->prepare("SELECT id FROM naturezas_operacao WHERE UPPER(descricao) = :descricao AND (company_id = :company_id OR company_id IS NULL) LIMIT 1");
        $stmtCheck->execute([":descricao" => $descricao, ":company_id" => $this->company_id]);
        if ($stmtCheck->fetchColumn()) {
            $this->jsonResponse(["message" => "Esta Natureza da Operação já existe"], 409);
        }

        $id = generateUUID();
        $stmt = $this->conn->prepare("INSERT INTO naturezas_operacao (id, company_id, descricao, cfop) VALUES (:id, :company_id, :descricao, :cfop)");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id, ":descricao" => $descricao, ":cfop" => $cfop ?: null]);

        $this->jsonResponse(["message" => "Natureza de Operação cadastrada", "id" => $id], 201);
    }

    public function setPadrao($id) {
        $this->authenticate();
        try {
            $this->conn->beginTransaction();
            // Remove favorito atual para esta empresa
            $stmtReset = $this->conn->prepare("DELETE FROM natureza_padrao_empresa WHERE company_id = :company_id");
            $stmtReset->execute([':company_id' => $this->company_id]);
            // Define o novo favorito (pode ser global ou customizado)
            $stmt = $this->conn->prepare("INSERT INTO natureza_padrao_empresa (company_id, natureza_id) VALUES (:company_id, :id)");
            $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);
            $this->conn->commit();
            $this->jsonResponse(["message" => "Natureza de operação favorita definida!"]);
        } catch (\Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao definir favorita: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $this->authenticate();

        if (empty($id)) {
            $this->jsonResponse(["message" => "ID não fornecido"], 400);
        }

        $stmt = $this->conn->prepare("DELETE FROM naturezas_operacao WHERE id = :id AND company_id = :company_id");
        $stmt->execute([":id" => $id, ":company_id" => $this->company_id]);

        $this->jsonResponse(["message" => "Natureza excluída com sucesso"]);
    }
}
