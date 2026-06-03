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
            
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Força o fuso horário do banco de dados para o Brasil
            $this->conn->exec("SET time_zone = '-03:00'");
            
        } catch(PDOException $exception) {
            if (ob_get_length()) ob_clean();
            header("Content-Type: application/json");
            echo json_encode(["error" => "Connection error: " . $exception->getMessage()]);
            exit;
        }

        return $this->conn;
    }
}
