<?php
$db = new PDO('mysql:host=localhost;dbname=distbebidas_db', 'root', '');

// 1. Encontrar o último caixa fechado que está com saldo zerado
$stmt = $db->query("SELECT * FROM cash_registers WHERE closed_at IS NOT NULL AND (closing_balance = 0 OR closing_balance IS NULL) ORDER BY closed_at DESC LIMIT 1");
$register = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$register) {
    echo "Nenhum caixa fechado com saldo zerado encontrado.\n";
    exit;
}

$id = $register['id'];
$openedAt = $register['opened_at'];
$openingBalance = (float)$register['opening_balance'];

echo "Corrigindo caixa: $id (Aberto em: $openedAt)\n";

// 2. Calcular Vendas em Dinheiro
$stmt = $db->prepare("SELECT SUM(sp.amount) as total 
                      FROM sale_payments sp 
                      JOIN sales s ON s.id = sp.sale_id 
                      WHERE s.status = 'completed' AND s.created_at >= :opened_at AND sp.method_name = 'Dinheiro'");
$stmt->execute([':opened_at' => $openedAt]);
$cashSales = (float)($stmt->fetch()['total'] ?? 0);

// 3. Calcular Suprimentos e Sangrias
$stmt = $db->prepare("SELECT type, SUM(amount) as total FROM cash_movements WHERE cash_register_id = :id GROUP BY type");
$stmt->execute([':id' => $id]);
$movements = $stmt->fetchAll();

$totalSangrias = 0;
$totalSuprimentos = 0;
foreach ($movements as $m) {
    if ($m['type'] === 'sangria') $totalSangrias = (float)$m['total'];
    if ($m['type'] === 'suprimento') $totalSuprimentos = (float)$m['total'];
}

$finalBalance = $openingBalance + $cashSales + $totalSuprimentos - $totalSangrias;

echo "Cálculo: $openingBalance (Base) + $cashSales (Dinheiro) + $totalSuprimentos (Sup) - $totalSangrias (Sang) = $finalBalance\n";

// 4. Atualizar o registro
$stmt = $db->prepare("UPDATE cash_registers SET closing_balance = :balance WHERE id = :id");
$stmt->execute([':balance' => $finalBalance, ':id' => $id]);

echo "Sucesso! Saldo atualizado para " . number_format($finalBalance, 2, ',', '.') . "\n";
