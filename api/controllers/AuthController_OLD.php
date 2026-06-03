<?php
require_once __DIR__ . '/../db.php';

class AuthController {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function login() {
        header('Content-Type: application/json');
        try {
            $json = file_get_contents("php://input");
            $data = json_decode($json);

            if (!empty($data->email) && !empty($data->password)) {
                $query = "SELECT id, email, password_hash, company_id FROM users WHERE email = :email LIMIT 1";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([':email' => $data->email]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($user) {
                    $passMatch = password_verify($data->password, $user['password_hash']) || ($data->password === $user['password_hash']);
                    
                    if ($passMatch) {
                        $token = base64_encode(json_encode([
                            "id" => $user['id'],
                            "email" => $user['email'],
                            "company_id" => $user['company_id'],
                            "exp" => time() + 86400
                        ]));
                        
                        echo json_encode([
                            "message" => "Login successful",
                            "token" => $token,
                            "user" => [
                                "id" => $user['id'],
                                "email" => $user['email'],
                                "company_id" => $user['company_id'],
                                "roles" => ["super_admin"],
                                "permissions" => [],
                                "company_modules" => ["pdv", "vendas", "produtos", "dashboard", "configuracoes", "fiscal", "delivery"]
                            ]
                        ]);
                        return;
                    }
                }
            }
            http_response_code(401);
            echo json_encode(["message" => "Email ou senha incorretos"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Internal Error", "error" => $e->getMessage()]);
        }
    }

    public function me() {
        header('Content-Type: application/json');
        echo json_encode(["user" => null, "message" => "Use login to obtain session"]);
    }
}
