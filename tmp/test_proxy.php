<?php
// Test via Vite proxy (localhost:8080)
$ch = curl_init('http://localhost:8080/api/service-orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type:application/json',
    'Authorization: Bearer dummy'
]);
$result = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

echo "=== Via Vite Proxy (localhost:8080/api/service-orders) ===\n";
echo "HTTP: $http_code\n";
echo "Content-Type: $content_type\n";
echo "First 200: " . substr($result, 0, 200) . "\n\n";

// Test directly (localhost/projetofiscal/api/service-orders) 
$ch = curl_init('http://localhost/projetofiscal/api/service-orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type:application/json',
    'Authorization: Bearer dummy'
]);
$result2 = curl_exec($ch);
$http_code2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type2 = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

echo "=== Direct Apache (localhost/projetofiscal/api/service-orders) ===\n";
echo "HTTP: $http_code2\n";
echo "Content-Type: $content_type2\n";
echo "First 200: " . substr($result2, 0, 200) . "\n";
