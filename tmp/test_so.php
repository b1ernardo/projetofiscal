<?php
// 1. Login
$ch = curl_init('http://localhost/projetofiscal/api/login');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => 'teste@teste.com', 'password' => '123456']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$login = json_decode(curl_exec($ch));
curl_close($ch);
if (!isset($login->token)) die("Login failed\n");
$token = $login->token;

// 2. Test service-orders POST
$so_data = json_encode([
    'customer_id' => 'test-customer-123',
    'item_type' => 'Celular',
    'problem_reported' => 'Tela quebrada',
    'status' => 'pendente',
    'priority' => 'media',
    'labor_total' => 0,
    'parts_total' => 0,
    'discount' => 0,
    'total_amount' => 0,
    'items' => [],
    'services' => []
]);

$ch = curl_init('http://localhost/projetofiscal/api/service-orders');
curl_setopt($ch, CURLOPT_POSTFIELDS, $so_data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type:application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP STATUS: " . $http_code . "\n";
echo "RESPONSE (first 500 chars): " . substr($result, 0, 500) . "\n";
echo "IS HTML: " . (str_starts_with(trim($result), '<') ? 'YES' : 'NO') . "\n";
