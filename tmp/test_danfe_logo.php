<?php
require 'api/vendor/autoload.php';

try {
    $db = new PDO("mysql:host=localhost;dbname=distbebidas_db;charset=utf8", "root", "");
    $stmt = $db->query("SELECT logo_base64 FROM config_fiscal LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $logoData = $row['logo_base64'] ?? '';
    
    $stmt2 = $db->query("SELECT * FROM fiscal_notes WHERE status='generated' AND xml_path IS NOT NULL LIMIT 1");
    $note = $stmt2->fetch(PDO::FETCH_ASSOC);
    if(!$note) {
        die("Sem nota autorizada para testar");
    }
    $xml = file_get_contents('api/' . $note['xml_path']);
    
    $logo = null;
    if (!empty($logoData)) {
        if (preg_match('/^data:image\/(\w+);base64,/', $logoData)) {
            $base64 = substr($logoData, strpos($logoData, ',') + 1);
            $logo = 'data://text/plain;base64,' . $base64;
        } else {
            $logo = $logoData;
        }
    }

    echo "Logo is: " . (!empty($logo) ? "Present" : "Empty") . "\n";

    $danfe = new \NFePHP\DA\NFe\Danfe($xml, 'P', 'A4', $logo);
    //$danfe->logoParameters($logo, 'C', false);
    $pdf = $danfe->render($logo);
    
    file_put_contents('tmp/teste_danfe.pdf', $pdf);
    echo "Gerado tmp/teste_danfe.pdf com logo!\n";
    
} catch (\Exception $e) {
    echo "Erro: " . $e->getMessage();
}
