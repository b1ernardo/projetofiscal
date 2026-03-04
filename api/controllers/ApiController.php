<?php
// /api/controllers/ApiController.php

class ApiController {
    protected $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    protected function jsonResponse($data, $code = 200) {
        header("Content-Type: application/json; charset=utf-8");
        http_response_code($code);
        echo json_encode($data);
        exit;
    }

    protected function getPostData() {
        return json_decode(file_get_contents("php://input"));
    }

    // Método para validar se o usuário está autenticado via Bearer Token
    protected function authenticate() {
        $headers = [];
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
        } else {
            foreach ($_SERVER as $key => $value) {
                if (substr($key, 0, 5) == 'HTTP_') {
                    $headers[str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))))] = $value;
                }
            }
        }
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
            $payload = json_decode(base64_decode($token), true);
            if ($payload && isset($payload['id'])) {
                return $payload;
            }
        }

        $this->jsonResponse(["message" => "Unauthorized"], 401);
    }
}
