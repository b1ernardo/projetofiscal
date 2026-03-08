<?php
// /api/controllers/AuthController.php

require_once __DIR__ . '/../db.php';

class AuthController {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function login() {
        try {
            // Recebe o corpo da requisição (JSON vindo do React)
            $data = json_decode(file_get_contents("php://input"));

            if (!empty($data->email) && !empty($data->password)) {
                $email = htmlspecialchars(strip_tags($data->email));
                $password = $data->password; 
                
                // Busca o usuário pelo email
                $query = "SELECT id, email, password_hash, company_id FROM users WHERE email = :email LIMIT 1";
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(":email", $email);
                $stmt->execute();
                
                if ($stmt->rowCount() > 0) {
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    $password_matched = password_verify($password, $row['password_hash']) || $row['password_hash'] === $password;

                    if ($password_matched) {
                        // Busca Papéis e Permissões de Módulo
                        $role_query = "SELECT role FROM user_roles WHERE user_id = :id AND company_id = :cid";
                        $role_stmt = $this->conn->prepare($role_query);
                        $role_stmt->bindParam(":id", $row['id']);
                        $role_stmt->bindParam(":cid", $row['company_id']);
                        $role_stmt->execute();
                        $roles = $role_stmt->fetchAll(PDO::FETCH_COLUMN);

                        $perm_query = "SELECT module_key FROM user_module_permissions WHERE user_id = :id AND company_id = :cid";
                        $perm_stmt = $this->conn->prepare($perm_query);
                        $perm_stmt->bindParam(":id", $row['id']);
                        $perm_stmt->bindParam(":cid", $row['company_id']);
                        $perm_stmt->execute();
                        $permissions = $perm_stmt->fetchAll(PDO::FETCH_COLUMN);
                        
                        // Busca Perfil
                        $profile_query = "SELECT full_name, phone, avatar_url FROM profiles WHERE user_id = :id AND company_id = :cid LIMIT 1";
                        $profile_stmt = $this->conn->prepare($profile_query);
                        $profile_stmt->bindParam(":id", $row['id']);
                        $profile_stmt->bindParam(":cid", $row['company_id']);
                        $profile_stmt->execute();
                        $profile = $profile_stmt->fetch(PDO::FETCH_ASSOC);

                        // Busca Módulos da Empresa
                        $modules_query = "SELECT modules FROM companies WHERE id = :cid LIMIT 1";
                        $modules_stmt = $this->conn->prepare($modules_query);
                        $modules_stmt->bindParam(":cid", $row['company_id']);
                        $modules_stmt->execute();
                        $company_modules_raw = $modules_stmt->fetchColumn();
                        $company_modules = $company_modules_raw ? json_decode($company_modules_raw) : [];

                        $token = base64_encode(json_encode([
                            "id" => $row['id'],
                            "email" => $row['email'],
                            "company_id" => $row['company_id'],
                            "exp" => time() + (86400 * 7)
                        ]));

                        http_response_code(200);
                        echo json_encode([
                            "message" => "Login successful",
                            "token" => $token,
                            "user" => [
                                "id" => $row['id'],
                                "email" => $row['email'],
                                "company_id" => $row['company_id'],
                                "roles" => $roles,
                                "permissions" => $permissions,
                                "profile" => $profile,
                                "company_modules" => $company_modules
                            ]
                        ]);
                    } else {
                        http_response_code(401);
                        echo json_encode(["message" => "Invalid credentials", "error" => "invalid_password"]);
                    }
                } else {
                    http_response_code(404);
                    echo json_encode(["message" => "User not found", "error" => "user_not_found"]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["message" => "Incomplete data", "error" => "missing_fields"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Internal Error", "error" => $e->getMessage()]);
        }
    }

    public function me() {
        try {
            // Usa o cabeçalho normalizado no index.php
            $token = $_SERVER['HTTP_AUTHORIZATION'] ?? null;

            if ($token) {
                $tokenParts = explode(" ", $token);
                if (count($tokenParts) == 2 && $tokenParts[0] == "Bearer") {
                    $payload = json_decode(base64_decode($tokenParts[1]), true);
                    if ($payload && isset($payload['id'])) {
                        
                        // Busca dados
                        $query = "SELECT id, email, company_id FROM users WHERE id = :id";
                        $stmt = $this->conn->prepare($query);
                        $stmt->bindParam(":id", $payload['id']);
                        $stmt->execute();
                        
                        if ($stmt->rowCount() > 0) {
                            $user = $stmt->fetch(PDO::FETCH_ASSOC);
                            
                            // Busca papéis (roles) e permissões
                            $role_query = "SELECT role FROM user_roles WHERE user_id = :id AND company_id = :cid";
                            $role_stmt = $this->conn->prepare($role_query);
                            $role_stmt->bindParam(":id", $user['id']);
                            $role_stmt->bindParam(":cid", $user['company_id']);
                            $role_stmt->execute();
                            $roles = $role_stmt->fetchAll(PDO::FETCH_COLUMN);

                            $perm_query = "SELECT module_key FROM user_module_permissions WHERE user_id = :id AND company_id = :cid";
                            $perm_stmt = $this->conn->prepare($perm_query);
                            $perm_stmt->bindParam(":id", $user['id']);
                            $perm_stmt->bindParam(":cid", $user['company_id']);
                            $perm_stmt->execute();
                            $permissions = $perm_stmt->fetchAll(PDO::FETCH_COLUMN);
                            
                            // Busca Perfil
                            $profile_query = "SELECT full_name, phone, avatar_url FROM profiles WHERE user_id = :id AND company_id = :cid LIMIT 1";
                            $profile_stmt = $this->conn->prepare($profile_query);
                            $profile_stmt->bindParam(":id", $user['id']);
                            $profile_stmt->bindParam(":cid", $user['company_id']);
                            $profile_stmt->execute();
                            $profile = $profile_stmt->fetch(PDO::FETCH_ASSOC);

                            // Busca Módulos da Empresa
                            $modules_query = "SELECT modules FROM companies WHERE id = :cid LIMIT 1";
                            $modules_stmt = $this->conn->prepare($modules_query);
                            $modules_stmt->bindParam(":cid", $user['company_id']);
                            $modules_stmt->execute();
                            $company_modules_raw = $modules_stmt->fetchColumn();
                            $company_modules = $company_modules_raw ? json_decode($company_modules_raw) : [];

                            $user['roles'] = $roles;
                            $user['permissions'] = $permissions;
                            $user['profile'] = $profile;
                            $user['company_modules'] = $company_modules;

                            http_response_code(200);
                            echo json_encode(["user" => $user]);
                            return;
                        }
                    }
                }
            }
            
            http_response_code(401);
            echo json_encode(["user" => null, "message" => "Unauthorized"]);
            return;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Internal Error", "error" => $e->getMessage()]);
        }
    }
}
