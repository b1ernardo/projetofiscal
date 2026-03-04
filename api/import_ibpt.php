<?php
require_once __DIR__ . '/db.php';
set_time_limit(0);

$csvFile = __DIR__ . '/../TabelaIBPTaxMA25.2.G.csv';

if (!file_exists($csvFile)) {
    die("Arquivo CSV não encontrado em: $csvFile" . PHP_EOL);
}

try {
    $db = (new Database())->getConnection();
    $db->beginTransaction();

    // Limpar tabela antes de importar
    $db->exec("TRUNCATE TABLE ibpt_codes");

    $handle = fopen($csvFile, "r");
    $header = fgetcsv($handle, 0, ";"); // Pular cabeçalho

    $stmt = $db->prepare("INSERT INTO ibpt_codes (codigo, ex, descricao, nacionalfederal, importadosfederal, estadual, municipal) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)");

    $count = 0;
    while (($data = fgetcsv($handle, 0, ";")) !== FALSE) {
        if (count($data) < 8) continue;

        $codigo = $data[0];
        $ex = (int)$data[1];
        $descricao = $data[3]; // Coluna 4 (índice 3) é a descrição
        $nacionalfederal = (float)str_replace(',', '.', $data[4]);
        $importadosfederal = (float)str_replace(',', '.', $data[5]);
        $estadual = (float)str_replace(',', '.', $data[6]);
        $municipal = (float)str_replace(',', '.', $data[7]);

        $stmt->execute([$codigo, $ex, $descricao, $nacionalfederal, $importadosfederal, $estadual, $municipal]);
        $count++;

        if ($count % 500 == 0) {
            echo "Processados $count registros..." . PHP_EOL;
        }
    }

    fclose($handle);
    $db->commit();
    echo "Importação concluída! Total de registros: $count" . PHP_EOL;

} catch (Exception $e) {
    if (isset($db)) $db->rollBack();
    echo "Erro: " . $e->getMessage() . PHP_EOL;
}
