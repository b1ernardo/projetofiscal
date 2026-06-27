<?php
// /api/controllers/ApiController.php

class ApiController {
    protected $conn;
    protected $company_id;

    public function __construct($db) {
        $this->conn = $db;
    }

    protected function jsonResponse($data, $code = 200) {
        // Clear anything that might have been accidentally outputted to the buffer (like warnings)
        if (ob_get_length()) {
            ob_clean();
        }
        
        header("Content-Type: application/json; charset=utf-8");
        http_response_code($code);
        
        // Log errors to a file if it's a server error
        if ($code >= 500) {
            error_log("API Error: " . json_encode($data));
        }

        echo json_encode($data);
        exit;
    }

    protected function getPostData() {
        return json_decode(file_get_contents("php://input"));
    }

    // Método para validar se o usuário está autenticado via Bearer Token
    public function authenticate() {
        $token = null;

        // 1. Tenta ler do header Authorization (chamadas de API normais)
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
        }

        // 2. Fallback: token via query string ?token= (usado em window.open para DANFE/XML)
        if (!$token && !empty($_GET['token'])) {
            $token = str_replace(' ', '+', $_GET['token']);
        }

        if ($token) {
            $decodedBase64 = base64_decode($token);
            $payload = json_decode($decodedBase64, true);
            if ($payload && isset($payload['id'])) {
                $this->company_id = $payload['company_id'] ?? null;
                return $payload;
            }
            // Falha na decodificação ou sem ID
            $this->jsonResponse([
                "message" => "Unauthorized - Invalid Token", 
                "debug_token_start" => substr($token, 0, 15),
                "debug_b64" => $decodedBase64 ? 'success' : 'failed',
                "debug_json" => json_last_error_msg()
            ], 401);
        }

        $this->jsonResponse(["message" => "Unauthorized - No Token Provided", "get" => $_GET], 401);
    }
}
