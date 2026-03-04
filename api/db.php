<?php
// /api/db.php

require_once 'config.php';

class Database {
    private $host = DB_HOST;
    private $db_name = DB_NAME;
    private $username = DB_USER;
    private $password = DB_PASS;
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            // Data Source Name
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            
            // Instância do PDO
            $this->conn = new PDO($dsn, $this->username, $this->password);
            
            // Configurações de erro do PDO (Exceptions) e formato padrão do retorno
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
        } catch(PDOException $exception) {
            echo json_encode(["error" => "Connection error: " . $exception->getMessage()]);
            exit;
        }

        return $this->conn;
    }
}
