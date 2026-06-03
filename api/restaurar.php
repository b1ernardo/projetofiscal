<?php
// /api/restaurar.php
require_once 'config.php';

$downloadsDir = "C:/Users/Bernardo/Downloads/";
$files = glob($downloadsDir . "distbebidas_db*.sql");

if (!$files) {
    die("Erro: Nenhum backup encontrado em $downloadsDir\n");
}

// Encontrar o mais recente
usort($files, function($a, $b) {
    return filemtime($b) - filemtime($a);
});
$source = $files[0];
$dest = "C:/xampp/htdocs/projetofiscal/backup_restaurar.sql";

echo "Backup encontrado: $source\n";

// Copiar e preparar SQL
echo "Preparando SQL...\n";
$fh = fopen($source, 'r');
$wh = fopen($dest, 'w');
fwrite($wh, "CREATE DATABASE IF NOT EXISTS `projetofiscal` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n");
fwrite($wh, "USE `projetofiscal`;\n");
fwrite($wh, "SET FOREIGN_KEY_CHECKS=0;\n");
while ($line = fgets($fh)) {
    // Pular definições antigas de nomes de banco
    if (preg_match('/^\s*(CREATE DATABASE|USE)\s+[`"]?distbebidas_db[`"]?\s*;?/i', $line)) {
        continue;
    }
    // Substituir menções ao nome antigo no meio de inserts se houver
    $line = str_replace('`distbebidas_db`', '`projetofiscal`', $line);
    fwrite($wh, $line);
}
fwrite($wh, "\nSET FOREIGN_KEY_CHECKS=1;");
fclose($fh);
fclose($wh);

echo "SQL pronto. Iniciando importação...\n";
$mysqlPath = "c:\\xampp\\mysql\\bin\\mysql.exe";
$cmd = "$mysqlPath -u root < \"$dest\"";
$output = shell_exec($cmd . " 2>&1");
echo $output;

// Atualizar config.php
$configFile = 'config.php';
$content = file_get_contents($configFile);
$newContent = str_replace("'distbebidas_db'", "'projetofiscal'", $content);
file_put_contents($configFile, $newContent);
echo "config.php atualizado para usar banco 'projetofiscal'.\n";

echo "\n--- Restauração Concluída! ---\n";
