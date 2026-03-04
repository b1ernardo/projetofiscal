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
        if ($search) {
            $stmt = $this->conn->prepare(
                "SELECT * FROM naturezas_operacao WHERE descricao LIKE :s OR cfop LIKE :s ORDER BY padrao DESC, descricao ASC"
            );
            $stmt->execute([':s' => "%$search%"]);
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM naturezas_operacao ORDER BY padrao DESC, descricao ASC");
            $stmt->execute();
        }
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

        // Verifica duplicação
        $stmtCheck = $this->conn->prepare("SELECT id FROM naturezas_operacao WHERE UPPER(descricao) = :descricao LIMIT 1");
        $stmtCheck->execute([":descricao" => $descricao]);
        if ($stmtCheck->fetchColumn()) {
            $this->jsonResponse(["message" => "Esta Natureza da Operação já existe"], 409);
        }

        $id = generateUUID();
        $stmt = $this->conn->prepare("INSERT INTO naturezas_operacao (id, descricao, cfop) VALUES (:id, :descricao, :cfop)");
        $stmt->execute([":id" => $id, ":descricao" => $descricao, ":cfop" => $cfop ?: null]);

        $this->jsonResponse(["message" => "Natureza de Operação cadastrada", "id" => $id], 201);
    }

    public function setPadrao($id) {
        $this->authenticate();
        $this->ensureColumns();
        try {
            $this->conn->beginTransaction();
            // Remove padrão de todos
            $this->conn->exec("UPDATE naturezas_operacao SET padrao = 0");
            // Define no selecionado
            $stmt = $this->conn->prepare("UPDATE naturezas_operacao SET padrao = 1 WHERE id = :id");
            $stmt->execute([":id" => $id]);
            $this->conn->commit();
            $this->jsonResponse(["message" => "Natureza padrão definida com sucesso"]);
        } catch (\Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao definir padrão: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $this->authenticate();

        if (empty($id)) {
            $this->jsonResponse(["message" => "ID não fornecido"], 400);
        }

        $stmt = $this->conn->prepare("DELETE FROM naturezas_operacao WHERE id = :id");
        $stmt->execute([":id" => $id]);

        $this->jsonResponse(["message" => "Natureza excluída com sucesso"]);
    }
}
