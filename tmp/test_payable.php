<?php
$login_url = 'http://localhost/projetofiscal/api/login';
$login_data = json_encode(['email' => 'teste@teste.com', 'password' => '123456']);

$ch = curl_init($login_url);
curl_setopt($ch, CURLOPT_POSTFIELDS, $login_data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$login_result = curl_exec($ch);
curl_close($ch);

$login_json = json_decode($login_result);
if (!isset($login_json->token)) {
    die("Login failed: " . $login_result);
}

$token = $login_json->token;
$payable_url = 'http://localhost/projetofiscal/api/accounts-payable';
$payable_data = json_encode([
    'description' => 'Teste Lançamento',
    'amount' => 100.50,
    'due_date' => date('Y-m-d'),
    'status' => 'pending',
    'category' => 'Geral'
]);

$ch = curl_init($payable_url);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payable_data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type:application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP STATUS: " . $http_code . "\n";
echo "RESPONSE: " . $result . "\n";
