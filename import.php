<?php
$_SERVER['REQUEST_METHOD'] = 'CLI';
require_once __DIR__ . '/api/db.php';
require_once __DIR__ . '/api/utils.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $file = fopen('naturezas.csv', 'r');
    if (!$file) {
        die("Erro ao abrir naturezas.csv");
    }

    $count = 0;
    $duplicados = 0;

    $stmtCheck = $db->prepare("SELECT id FROM naturezas_operacao WHERE UPPER(descricao) = :descricao LIMIT 1");
    $stmtInsert = $db->prepare("INSERT INTO naturezas_operacao (id, descricao) VALUES (:id, :descricao)");

    while (($row = fgetcsv($file, 2000, ';')) !== FALSE) {
        if (trim($row[0]) === 'CFOP' || empty($row[1])) continue;

        $cfop = trim($row[0]);
        $descricao_bruta = mb_convert_encoding(trim($row[1]), 'UTF-8', 'ISO-8859-1');
        $descricao = substr($cfop . ' - ' . strtoupper($descricao_bruta), 0, 60);

        $stmtCheck->execute([':descricao' => $descricao]);
        if ($stmtCheck->fetchColumn()) {
            $duplicados++;
            continue;
        }

        $stmtInsert->execute([
            ':id' => generateUUID(),
            ':descricao' => $descricao
        ]);
        $count++;
    }

    fclose($file);
    echo "Sucesso! Total inseridas: $count. Duplicadas/Ignoradas: $duplicados.\n";

} catch (Exception $e) {
    echo "Erro: " . $e->getMessage();
}
