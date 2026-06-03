<?php
// /api/controllers/AuthController.php

require_once __DIR__ . '/../db.php';

class AuthController {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    private function getUserContext($userRow) {
        $userId = $userRow['id'];
        $companyId = $userRow['company_id'] ?? '1';

        // 1. Fetch Roles
        $roles = ["operador_caixa"]; // Default role
        try {
            $stmtRole = $this->conn->prepare("SELECT role FROM user_roles WHERE user_id = ?");
            $stmtRole->execute([$userId]);
            $fetchedRoles = $stmtRole->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($fetchedRoles)) {
                $roles = $fetchedRoles;
            }
        } catch (Exception $e) { }

        // 2. Fetch Profile Info
        $profileName = explode('@', $userRow['email'])[0];
        try {
            $stmtProfile = $this->conn->prepare("SELECT full_name FROM profiles WHERE user_id = ?");
            $stmtProfile->execute([$userId]);
            if ($p = $stmtProfile->fetch(PDO::FETCH_ASSOC)) {
                if (!empty($p['full_name'])) $profileName = $p['full_name'];
            }
        } catch (Exception $e) { }

        // 3. Fetch Specific Permissions
        $permissions = [];
        try {
            $stmtPerm = $this->conn->prepare("SELECT module_key FROM user_module_permissions WHERE user_id = ?");
            $stmtPerm->execute([$userId]);
            $permissions = $stmtPerm->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) { }

        // 4. Fetch Company Modules
        $companyModules = [];
        try {
            $stmtModules = $this->conn->prepare("SELECT modules FROM companies WHERE id = ?");
            $stmtModules->execute([$companyId]);
            $modulesJson = $stmtModules->fetchColumn();
            if ($modulesJson) {
                $companyModules = json_decode($modulesJson, true) ?: [];
            }
        } catch (Exception $e) { }

        // Fallback safety
        if (empty($companyModules)) {
            $companyModules = ["pdv", "vendas", "produtos", "dashboard", "configuracoes", "fiscal", "delivery"];
        }

        return [
            "id" => $userId,
            "email" => $userRow['email'],
            "company_id" => $companyId,
            "roles" => $roles,
            "permissions" => $permissions,
            "profile" => ["full_name" => $profileName],
            "company_modules" => $companyModules,
            "max_discount" => (float)($userRow['max_discount'] ?? 100.0)
        ];
    }

    public function login() {
        ob_start();
        header('Content-Type: application/json');
        try {
            // Recebe o corpo da requisição
            $json = file_get_contents("php://input");
            $data = json_decode($json);

            if (!empty($data->email) && !empty($data->password)) {
                $email = htmlspecialchars(strip_tags($data->email));
                
                // Busca básica do usuário
                $query = "SELECT id, email, password_hash, company_id, max_discount FROM users WHERE email = :email LIMIT 1";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([':email' => $email]);
                
                if ($stmt->rowCount() > 0) {
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    // Verifica senha (suporta texto puro ou hash para facilitar migração)
                    $password_matched = password_verify($data->password, $row['password_hash']) || ($data->password === $row['password_hash']);

                    if ($password_matched) {
                        // Gera um token simples base64 (substituir por JWT em produção se necessário)
                        $token = base64_encode(json_encode([
                            "id" => $row['id'],
                            "email" => $row['email'],
                            "company_id" => $row['company_id'] ?? '1',
                            "exp" => time() + (86400 * 7)
                        ]));

                        $userContext = $this->getUserContext($row);

                        ob_clean();
                        echo json_encode([
                            "message" => "Login successful",
                            "token" => $token,
                            "user" => $userContext
                        ]);
                        return;
                    }
                }
                
                http_response_code(401);
                echo json_encode(["message" => "Email ou senha incorretos"]);
            } else {
                http_response_code(400);
                echo json_encode(["message" => "Dados incompletos"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro Interno no Servidor", "error" => $e->getMessage()]);
        }
    }

    public function me() {
        ob_start();
        header('Content-Type: application/json');
        try {
            // Pega o token do cabeçalho
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            
            // Fallback for apache_request_headers
            if (!$authHeader && function_exists('apache_request_headers')) {
                $headers = apache_request_headers();
                $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            }
            
            $token = str_replace('Bearer ', '', $authHeader);

            if ($token) {
                $payload = json_decode(base64_decode($token), true);
                
                if ($payload && isset($payload['id'])) {
                    // Revalidate against DB to get fresh roles
                    $stmt = $this->conn->prepare("SELECT id, email, company_id, max_discount FROM users WHERE id = ?");
                    $stmt->execute([$payload['id']]);
                    if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userContext = $this->getUserContext($row);
                        ob_clean();
                        echo json_encode(["user" => $userContext]);
                        return;
                    }
                }
            }
            
            ob_clean();
            http_response_code(401);
            echo json_encode(["user" => null, "message" => "Sessão inválida"]);
        } catch (Exception $e) {
            ob_clean();
            http_response_code(500);
            echo json_encode(["message" => "Erro ao processar sessão", "error" => $e->getMessage()]);
        }
    }
    public function verifyAdmin() {
        ob_start();
        header('Content-Type: application/json');
        try {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);
            if (!$token) {
                http_response_code(401);
                echo json_encode(["message" => "Unauthorized"]);
                return;
            }
            $payload = json_decode(base64_decode($token), true);
            $companyId = $payload['company_id'] ?? '1';

            $json = file_get_contents("php://input");
            $data = json_decode($json);

            if (empty($data->password)) {
                http_response_code(400);
                echo json_encode(["message" => "Senha obrigatória"]);
                return;
            }

            $query = "
                SELECT u.password_hash 
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                WHERE u.company_id = :company_id 
                  AND (ur.role = 'admin' OR ur.role = 'super_admin')
            ";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':company_id' => $companyId]);
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($admins as $admin) {
                if (password_verify($data->password, $admin['password_hash']) || ($data->password === $admin['password_hash'])) {
                    ob_clean();
                    echo json_encode(["message" => "Admin verified"]);
                    return;
                }
            }

            http_response_code(401);
            echo json_encode(["message" => "Senha de administrador incorreta"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro Interno", "error" => $e->getMessage()]);
        }
    }
}
