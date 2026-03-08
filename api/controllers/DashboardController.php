<?php
// /api/controllers/DashboardController.php

require_once 'ApiController.php';

class DashboardController extends ApiController {

    public function getStats() {
        $this->authenticate();

        $today = date('Y-m-d');

        // Vendas de hoje
        $stmt = $this->conn->prepare("SELECT SUM(total_amount) as total FROM sales WHERE status = 'completed' AND DATE(created_at) = :today AND company_id = :company_id");
        $stmt->execute([':today' => $today, ':company_id' => $this->company_id]);
        $todaySales = (float)($stmt->fetch()['total'] ?? 0);

        // Total de Despesas (Compras)
        $stmt = $this->conn->prepare("SELECT SUM(total_amount) as total FROM purchases WHERE company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $totalDespesas = (float)($stmt->fetch()['total'] ?? 0);

        // Contagem de Produtos Ativos
        $stmt = $this->conn->prepare("SELECT COUNT(id) as total FROM products WHERE active = 1 AND company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $productCount = (int)($stmt->fetch()['total'] ?? 0);

        // Comandas Abertas
        $stmt = $this->conn->prepare("SELECT COUNT(id) as total FROM comandas WHERE status = 'open' AND company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $openComandas = (int)($stmt->fetch()['total'] ?? 0);

        $this->jsonResponse([
            "todaySales" => $todaySales,
            "totalDespesas" => $totalDespesas,
            "productCount" => $productCount,
            "openComandas" => $openComandas
        ]);
    }

    public function getChartData() {
        $this->authenticate();
        $year = date('Y');
        
        $months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        $byMonth = array_fill(0, 12, 0);

        $query = "SELECT total_amount, created_at FROM sales 
                  WHERE status = 'completed' AND YEAR(created_at) = :year AND company_id = :company_id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':year' => $year, ':company_id' => $this->company_id]);
        $sales = $stmt->fetchAll();

        foreach ($sales as $s) {
            $monthIndex = (int)date('m', strtotime($s['created_at'])) - 1;
            $byMonth[$monthIndex] += (float)$s['total_amount'];
        }

        $result = [];
        foreach ($months as $i => $name) {
            $result[] = ["month" => $name, "vendas" => $byMonth[$i]];
        }

        $this->jsonResponse($result);
    }
}
