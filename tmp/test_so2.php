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

// 2. Test GET service-orders (should work)
$ch = curl_init('http://localhost/projetofiscal/api/service-orders');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type:application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "=== GET service-orders ===\n";
echo "HTTP: $http_code\n";
echo "First 300: " . substr($result, 0, 300) . "\n\n";

// 3. Get a valid customer_id
$ch = curl_init('http://localhost/projetofiscal/api/customers');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type:application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$custResult = curl_exec($ch);
curl_close($ch);
$customers = json_decode($custResult, true);
$customerId = $customers[0]['id'] ?? null;
echo "Customer ID: " . ($customerId ?: "NONE FOUND") . "\n\n";

if (!$customerId) die("No customer found, cannot test POST\n");

// 4. Test POST service-orders
$so_data = json_encode([
    'customer_id' => $customerId,
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
echo "=== POST service-orders ===\n";
echo "HTTP: $http_code\n";
echo "RESPONSE: $result\n";
