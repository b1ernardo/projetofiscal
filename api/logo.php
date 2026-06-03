<?php
require_once 'config.php';
require_once 'db.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Pegar o logo da tabela config_fiscal
    $cid = $_GET['id'] ?? null;
    if ($cid) {
        $stmt = $conn->prepare("SELECT logo_base64 FROM config_fiscal WHERE company_id = :cid LIMIT 1");
        $stmt->execute([':cid' => $cid]);
    } else {
        $stmt = $conn->prepare("SELECT logo_base64 FROM config_fiscal LIMIT 1");
        $stmt->execute();
    }
    $row = $stmt->fetch();

    if ($row && !empty($row['logo_base64'])) {
        $data = $row['logo_base64'];
        
        // Se já for data-uri, podemos retornar direto ou parsear
        if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
            $data = substr($data, strpos($data, ',') + 1);
            $type = strtolower($type[1]); // jpg, png, gif
            
            if ($type == 'jpeg' || $type == 'jpg') {
                header('Content-Type: image/jpeg');
            } elseif ($type == 'png') {
                header('Content-Type: image/png');
            } elseif ($type == 'gif') {
                header('Content-Type: image/gif');
            } elseif ($type == 'webp') {
                header('Content-Type: image/webp');
            } else {
                header('Content-Type: image/png');
            }
            
            echo base64_decode($data);
            exit;
        }
    }
    
    // Retornar um fallback ou nada
    header("Content-Type: image/png");
    echo base64_decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="); // pixel transparente
    exit;

} catch (Exception $e) {
    header("HTTP/1.1 500 Internal Server Error");
    exit;
}
