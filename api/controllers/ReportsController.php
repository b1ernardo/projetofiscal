<?php
// /api/controllers/ReportsController.php

require_once 'ApiController.php';

class ReportsController extends ApiController {
    
    public function getFinancial() {
        $this->authenticate();
        $year = $_GET['year'] ?? date('Y');
        
        // Receitas (Vendas completadas + Contas a Receber pagas)
        $stmt = $this->conn->prepare("
            SELECT month, SUM(total) as total FROM (
                SELECT MONTH(created_at) as month, SUM(total_amount) as total 
                FROM sales 
                WHERE status = 'completed' AND YEAR(created_at) = :year 
                GROUP BY MONTH(created_at)
                
                UNION ALL
                
                SELECT MONTH(payment_date) as month, SUM(amount) as total 
                FROM accounts_receivable 
                WHERE status = 'paid' AND YEAR(payment_date) = :year 
                GROUP BY MONTH(payment_date)
            ) as combined_receitas 
            GROUP BY month
        ");
        $stmt->execute([':year' => $year]);
        $receitasRaw = $stmt->fetchAll();
        
        // Despesas (Compras + Contas a Pagar pagas)
        $stmt = $this->conn->prepare("
            SELECT month, SUM(total) as total FROM (
                SELECT MONTH(created_at) as month, SUM(total_amount) as total 
                FROM purchases 
                WHERE YEAR(created_at) = :year 
                GROUP BY MONTH(created_at)
                
                UNION ALL
                
                SELECT MONTH(payment_date) as month, SUM(amount) as total 
                FROM accounts_payable 
                WHERE status = 'paid' AND YEAR(payment_date) = :year 
                GROUP BY MONTH(payment_date)
            ) as combined_despesas 
            GROUP BY month
        ");
        $stmt->execute([':year' => $year]);
        $despesasRaw = $stmt->fetchAll();
        
        $months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        $data = [];
        
        for ($i = 1; $i <= 12; $i++) {
            $receita = 0;
            foreach ($receitasRaw as $r) {
                if ((int)$r['month'] === $i) $receita = (float)$r['total'];
            }
            
            $despesa = 0;
            foreach ($despesasRaw as $d) {
                if ((int)$d['month'] === $i) $despesa = (float)$d['total'];
            }
            
            $data[] = [
                "month" => $months[$i-1],
                "receita" => $receita,
                "despesa" => $despesa
            ];
        }
        
        $this->jsonResponse($data);
    }

    public function getSales() {
        $this->authenticate();
        $limit = $_GET['limit'] ?? 100;
        
        $stmt = $this->conn->prepare("
            SELECT s.*, c.name as customer_name,
                   (SELECT COUNT(id) FROM fiscal_notes fn WHERE fn.sale_id = s.id AND fn.status = 'generated') > 0 as has_fiscal_note,
                   (SELECT status FROM fiscal_notes fn WHERE fn.sale_id = s.id ORDER BY created_at DESC LIMIT 1) as fiscal_note_status,
                   (SELECT id FROM fiscal_notes fn WHERE fn.sale_id = s.id AND status = 'generated' ORDER BY created_at DESC LIMIT 1) as fiscal_note_id
            FROM sales s 
            LEFT JOIN customers c ON s.customer_id = c.id 
            ORDER BY s.created_at DESC 
            LIMIT :limit
        ");
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getTopProducts() {
        $this->authenticate();
        
        $stmt = $this->conn->prepare("
            SELECT p.name, c.name as category, SUM(si.quantity) as total_qty, SUM(si.quantity * si.unit_price) as total_amount
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE s.status = 'completed'
            GROUP BY p.id
            ORDER BY total_qty DESC
            LIMIT 10
        ");
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getSalesByPeriod() {
        $this->authenticate();
        $start = $_GET['start'] ?? date('Y-m-d', strtotime('-7 days'));
        $end = $_GET['end'] ?? date('Y-m-d');
        
        $stmt = $this->conn->prepare("
            SELECT DATE(created_at) as date, SUM(total_amount) as total, COUNT(*) as count 
            FROM sales 
            WHERE status = 'completed' AND created_at BETWEEN :start AND :end
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        ");
        $stmt->execute([
            ':start' => $start . ' 00:00:00',
            ':end' => $end . ' 23:59:59'
        ]);
        
        $rows = $stmt->fetchAll();
        $data = [];
        foreach ($rows as $row) {
            $data[] = [
                "date" => date('d/m', strtotime($row['date'])),
                "total" => (float)$row['total'],
                "count" => (int)$row['count']
            ];
        }
        $this->jsonResponse($data);
    }

    public function getStockReport() {
        $this->authenticate();
        
        $stmt = $this->conn->prepare("
            SELECT p.id, p.name, p.stock_current as stock, p.stock_min as min, c.name as category,
                   (SELECT IFNULL(SUM(si.quantity), 0) FROM sale_items si WHERE si.product_id = p.id) as sold
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.active = 1
            ORDER BY sold DESC
        ");
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getDashboardStats() {
        $this->authenticate();
        $today = date('Y-m-d');
        
        // Vendas hoje
        $stmt = $this->conn->prepare("SELECT SUM(total_amount) as total FROM sales WHERE status = 'completed' AND DATE(created_at) = :today");
        $stmt->execute([':today' => $today]);
        $todaySales = (float)($stmt->fetch()['total'] ?? 0);
        
        // Total Despesas (Compras)
        $stmt = $this->conn->prepare("SELECT SUM(total_amount) as total FROM purchases");
        $stmt->execute();
        $totalDespesas = (float)($stmt->fetch()['total'] ?? 0);
        
        // Contagem de Produtos
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM products WHERE active = 1");
        $stmt->execute();
        $productCount = (int)($stmt->fetch()['count'] ?? 0);
        
        // Comandas abertas
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM comandas WHERE status = 'open'");
        $stmt->execute();
        $openComandas = (int)($stmt->fetch()['count'] ?? 0);
        
        $this->jsonResponse([
            "todaySales" => $todaySales,
            "totalDespesas" => $totalDespesas,
            "productCount" => $productCount,
            "openComandas" => $openComandas
        ]);
    }
}
