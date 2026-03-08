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
                WHERE status = 'completed' AND YEAR(created_at) = :year AND company_id = :company_id
                GROUP BY MONTH(created_at)
                
                UNION ALL
                
                SELECT MONTH(payment_date) as month, SUM(amount) as total 
                FROM accounts_receivable 
                WHERE status = 'paid' AND YEAR(payment_date) = :year AND company_id = :company_id
                GROUP BY MONTH(payment_date)
            ) as combined_receitas 
            GROUP BY month
        ");
        $stmt->execute([':year' => $year, ':company_id' => $this->company_id]);
        $receitasRaw = $stmt->fetchAll();
        
        // Despesas (Compras + Contas a Pagar pagas)
        $stmt = $this->conn->prepare("
            SELECT month, SUM(total) as total FROM (
                SELECT MONTH(created_at) as month, SUM(total_amount) as total 
                FROM purchases 
                WHERE YEAR(created_at) = :year AND company_id = :company_id
                GROUP BY MONTH(created_at)
                
                UNION ALL
                
                SELECT MONTH(payment_date) as month, SUM(amount) as total 
                FROM accounts_payable 
                WHERE status = 'paid' AND YEAR(payment_date) = :year AND company_id = :company_id
                GROUP BY MONTH(payment_date)
            ) as combined_despesas 
            GROUP BY month
        ");
        $stmt->execute([':year' => $year, ':company_id' => $this->company_id]);
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
            WHERE s.company_id = :company_id
            ORDER BY s.created_at DESC 
            LIMIT :limit
        ");
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':company_id', $this->company_id, PDO::PARAM_STR);
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
            WHERE s.status = 'completed' AND s.company_id = :company_id
            GROUP BY p.id
            ORDER BY total_qty DESC
            LIMIT 10
        ");
        $stmt->execute([':company_id' => $this->company_id]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getSalesByPeriod() {
        $this->authenticate();
        $start = $_GET['start'] ?? date('Y-m-d', strtotime('-7 days'));
        $end = $_GET['end'] ?? date('Y-m-d');
        
        $stmt = $this->conn->prepare("
            SELECT DATE(created_at) as date, SUM(total_amount) as total, COUNT(*) as count 
            FROM sales 
            WHERE status = 'completed' AND created_at BETWEEN :start AND :end AND company_id = :company_id
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        ");
        $stmt->execute([
            ':start' => $start . ' 00:00:00',
            ':end' => $end . ' 23:59:59',
            ':company_id' => $this->company_id
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
            WHERE p.active = 1 AND p.company_id = :company_id
            ORDER BY sold DESC
        ");
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getDashboardStats() {
        $this->authenticate();
        $today = date('Y-m-d');
        
        // Vendas hoje
        $stmt = $this->conn->prepare("SELECT SUM(total_amount) as total FROM sales WHERE status = 'completed' AND DATE(created_at) = :today AND company_id = :company_id");
        $stmt->execute([':today' => $today, ':company_id' => $this->company_id]);
        $todaySales = (float)($stmt->fetch()['total'] ?? 0);
        
        // Total Despesas (Compras)
        $stmt = $this->conn->prepare("SELECT SUM(total_amount) as total FROM purchases WHERE company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $totalDespesas = (float)($stmt->fetch()['total'] ?? 0);
        
        // Contagem de Produtos
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM products WHERE active = 1 AND company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $productCount = (int)($stmt->fetch()['count'] ?? 0);
        
        // Comandas abertas
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM comandas WHERE status = 'open' AND company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $openComandas = (int)($stmt->fetch()['count'] ?? 0);
        
        $this->jsonResponse([
            "todaySales" => $todaySales,
            "totalDespesas" => $totalDespesas,
            "productCount" => $productCount,
            "openComandas" => $openComandas
        ]);
    }

    public function getSalesByProduct() {
        $this->authenticate();
        $start = $_GET['start'] ?? date('Y-m-d', strtotime('-30 days'));
        $end = $_GET['end'] ?? date('Y-m-d');

        $stmt = $this->conn->prepare("
            SELECT p.code, p.name, c.name as category, 
                   SUM(si.quantity) as total_qty, 
                   SUM(si.quantity * si.unit_price) as total_amount,
                   COUNT(DISTINCT s.id) as total_orders
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE s.status = 'completed' AND s.company_id = :company_id
              AND s.created_at BETWEEN :start AND :end
            GROUP BY p.id
            ORDER BY total_amount DESC
        ");
        $stmt->execute([
            ':start' => $start . ' 00:00:00',
            ':end' => $end . ' 23:59:59',
            ':company_id' => $this->company_id
        ]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getSalesByCustomer() {
        $this->authenticate();
        $start = $_GET['start'] ?? date('Y-m-d', strtotime('-30 days'));
        $end = $_GET['end'] ?? date('Y-m-d');

        $stmt = $this->conn->prepare("
            SELECT c.id, c.name, c.document, 
                   COUNT(s.id) as total_orders, 
                   SUM(s.total_amount) as total_amount,
                   MAX(s.created_at) as last_purchase
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            WHERE s.status = 'completed' AND s.company_id = :company_id
              AND s.created_at BETWEEN :start AND :end
            GROUP BY c.id
            ORDER BY total_amount DESC
        ");
        $stmt->execute([
            ':start' => $start . ' 00:00:00',
            ':end' => $end . ' 23:59:59',
            ':company_id' => $this->company_id
        ]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getProfitability() {
        $this->authenticate();
        $start = $_GET['start'] ?? date('Y-m-d', strtotime('-30 days'));
        $end = $_GET['end'] ?? date('Y-m-d');

        $stmt = $this->conn->prepare("
            SELECT p.id, p.code, p.name, c.name as category, 
                   SUM(si.quantity) as total_qty, 
                   SUM(si.quantity * si.unit_price) as total_revenue,
                   SUM(si.quantity * COALESCE(p.cost_price, 0)) as total_cost,
                   SUM((si.quantity * si.unit_price) - (si.quantity * COALESCE(p.cost_price, 0))) as total_profit
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE s.status = 'completed' AND s.company_id = :company_id
              AND s.created_at BETWEEN :start AND :end
            GROUP BY p.id
            ORDER BY total_profit DESC
        ");
        $stmt->execute([
            ':start' => $start . ' 00:00:00',
            ':end' => $end . ' 23:59:59',
            ':company_id' => $this->company_id
        ]);
        $this->jsonResponse($stmt->fetchAll());
    }

    public function getSellersReport() {
        $this->authenticate();
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;
        
        $sql = "
            SELECT 
                s.id, 
                s.name as seller_name, 
                COALESCE(SUM(sa.total_amount), 0) as total_sold,
                COUNT(sa.id) as sales_count
            FROM sellers s
            LEFT JOIN sales sa ON (s.id = sa.seller_id AND sa.status = 'completed' ";
        
        $params = [':company_id' => $this->company_id];
        
        if ($startDate && $endDate) {
            $sql .= " AND sa.created_at BETWEEN :start AND :end ";
            $params[':start'] = $startDate . ' 00:00:00';
            $params[':end'] = $endDate . ' 23:59:59';
        }
        
        $sql .= " ) WHERE s.company_id = :company_id GROUP BY s.id, s.name ORDER BY total_sold DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $this->jsonResponse($stmt->fetchAll());
    }
    public function getSellersCommission() {
        $this->authenticate();
        $start = $_GET['start'] ?? date('Y-m-d', strtotime('-30 days'));
        $end = $_GET['end'] ?? date('Y-m-d');

        $stmt = $this->conn->prepare("
            SELECT 
                sel.name as seller_name, 
                COALESCE(sel.commission_percentage, 0) as commission_percentage,
                COUNT(s.id) as total_sales,
                SUM(s.total_amount) as total_revenue,
                SUM(s.total_amount * (COALESCE(sel.commission_percentage, 0) / 100)) as total_commission
            FROM sellers sel
            LEFT JOIN sales s ON (s.seller_id = sel.id AND s.status = 'completed' AND s.created_at BETWEEN :start AND :end)
            WHERE sel.company_id = :company_id
            GROUP BY sel.id
            ORDER BY total_commission DESC
        ");
        
        $stmt->execute([
            ':start' => $start . ' 00:00:00',
            ':end' => $end . ' 23:59:59',
            ':company_id' => $this->company_id
        ]);
        
        $this->jsonResponse($stmt->fetchAll());
    }
}
