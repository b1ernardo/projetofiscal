<?php
/**
 * Script para recriar as tabelas do módulo de Ordem de Serviço.
 */

require_once 'config.php';
require_once 'db.php';

try {
    $db = (new Database())->getConnection();
    $sql = file_get_contents('service_orders.sql');
    
    // O PDO não executa múltiplos comandos de uma vez via exec() em alguns drivers, 
    // então vamos separar por ponto e vírgula se necessário, ou usar o exec direto se a string for amigável.
    // Como o arquivo tem múltiplos CREATE TABLE, vamos tentar executar tudo.
    
    $db->exec($sql);
    
    echo json_encode(["message" => "Tabelas de Ordem de Serviço recriadas com sucesso!"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Erro ao recriar tabelas: " . $e->getMessage()]);
}
