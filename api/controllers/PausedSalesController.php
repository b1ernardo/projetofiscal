<?php
// /api/controllers/PausedSalesController.php

require_once 'ApiController.php';

class PausedSalesController extends ApiController {

    public function list() {
        $this->authenticate();
        $stmt = $this->conn->prepare("
            SELECT id, label, observation, items_json, total, paused_at
            FROM paused_sales
            WHERE company_id = :company_id
            ORDER BY paused_at DESC
        ");
        $stmt->execute([':company_id' => $this->company_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['items'] = json_decode($r['items_json'], true);
            unset($r['items_json']);
            $r['total'] = (float)$r['total'];
        }
        $this->jsonResponse($rows);
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $auth = $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->items) || empty($data->label)) {
            $this->jsonResponse(["message" => "Dados insuficientes (itens ou label)."], 400);
            return;
        }

        $id = generateUUID();
        $stmt = $this->conn->prepare("
            INSERT INTO paused_sales (id, company_id, label, observation, items_json, total, created_by, paused_at)
            VALUES (:id, :company_id, :label, :observation, :items_json, :total, :created_by, NOW())
        ");
        $stmt->execute([
            ':id'          => $id,
            ':company_id'  => $this->company_id,
            ':label'       => $data->label,
            ':observation' => $data->observation ?? '',
            ':items_json'  => json_encode($data->items),
            ':total'       => $data->total ?? 0,
            ':created_by'  => $auth['id'],
        ]);

        $this->jsonResponse(["message" => "Venda pausada salva.", "id" => $id], 201);
    }

    public function delete($id) {
        $this->authenticate();
        $stmt = $this->conn->prepare("DELETE FROM paused_sales WHERE id = :id AND company_id = :company_id");
        $stmt->execute([':id' => $id, ':company_id' => $this->company_id]);
        $this->jsonResponse(["message" => "Venda pausada removida."]);
    }
}
