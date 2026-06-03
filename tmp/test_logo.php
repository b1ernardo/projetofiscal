<?php
require 'api/vendor/autoload.php';

try {
    $db = new PDO("mysql:host=localhost;dbname=distbebidas_db;charset=utf8", "root", "");
    $stmt = $db->query("SELECT logo_base64 FROM config_fiscal LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $logoBase = $row['logo_base64'] ?? '';
    echo "Logo length: " . strlen($logoBase) . "\n";
    echo "Prefix: " . substr($logoBase, 0, 30) . "\n";
    
    // Simular o comportamento do Service
    $logoData = $logoBase;
    if (preg_match('/^data:image\/(\w+);base64,/', $logoData)) {
        $base64 = substr($logoData, strpos($logoData, ',') + 1);
        $logoData = 'data://text/plain;base64,' . $base64;
    }
    
    echo "Converted Prefix: " . substr($logoData, 0, 30) . "\n";
    
    // Chamar um metodo de DaCommon para ver se dá erro
    // DaCommon é protected, podemos mockar
    class MeuDa extends \NFePHP\DA\Common\DaCommon {
        public function testAdjust($l) {
            return $this->adjustImage($l);
        }
    }
    
    $da = new MeuDa();
    $res = $da->testAdjust($logoData);
    echo "Adjust length: " . strlen($res) . "\n";
    
} catch (\Exception $e) {
    echo "Erro: " . $e->getMessage();
}
