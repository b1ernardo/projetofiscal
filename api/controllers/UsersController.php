<?php
// /api/controllers/UsersController.php

require_once 'ApiController.php';

class UsersController extends ApiController {
    
    public function list() {
        $this->authenticate();
        
        $query = "SELECT u.id, u.email, u.created_at, p.full_name, p.phone, p.avatar_url 
                  FROM users u 
                  LEFT JOIN profiles p ON u.id = p.user_id 
                  ORDER BY p.full_name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Load roles and permissions for each user
        foreach ($users as &$user) {
            $stmt = $this->conn->prepare("SELECT role FROM user_roles WHERE user_id = :uid");
            $stmt->execute([':uid' => $user['id']]);
            $user['roles'] = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $stmt = $this->conn->prepare("SELECT module_key FROM user_module_permissions WHERE user_id = :uid");
            $stmt->execute([':uid' => $user['id']]);
            $user['permissions'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        
        $this->jsonResponse($users);
    }

    public function create() {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();
        $data = $this->getPostData();

        if (empty($data->email) || empty($data->password) || empty($data->full_name)) {
            $this->jsonResponse(["message" => "Dados incompletos"], 400);
        }

        try {
            $this->conn->beginTransaction();

            $userId = generateUUID();
            $stmt = $this->conn->prepare("INSERT INTO users (id, email, password_hash) VALUES (:id, :email, :password)");
            $stmt->execute([
                ":id" => $userId,
                ":email" => $data->email,
                ":password" => password_hash($data->password, PASSWORD_DEFAULT)
            ]);

            $profileId = generateUUID();
            $stmt = $this->conn->prepare("INSERT INTO profiles (id, user_id, full_name, phone) VALUES (:id, :uid, :name, :phone)");
            $stmt->execute([
                ":id" => $profileId,
                ":uid" => $userId,
                ":name" => $data->full_name,
                ":phone" => $data->phone ?? null
            ]);

            if (!empty($data->roles) && is_array($data->roles)) {
                foreach ($data->roles as $role) {
                    $roleId = generateUUID();
                    $stmt = $this->conn->prepare("INSERT INTO user_roles (id, user_id, role) VALUES (:id, :uid, :role)");
                    $stmt->execute([
                        ":id" => $roleId,
                        ":uid" => $userId,
                        ":role" => $role
                    ]);
                }
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Usuário criado", "id" => $userId], 201);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao criar: " . $e->getMessage()], 500);
        }
    }

    public function update($id) {
        $this->authenticate();
        $data = $this->getPostData();

        if (!$id) $this->jsonResponse(["message" => "ID é obrigatório"], 400);

        try {
            $this->conn->beginTransaction();

            // Update user email
            if (!empty($data->email)) {
                $stmt = $this->conn->prepare("UPDATE users SET email = :email WHERE id = :id");
                $stmt->execute([":email" => $data->email, ":id" => $id]);
            }

            // Update password if provided
            if (!empty($data->password)) {
                $stmt = $this->conn->prepare("UPDATE users SET password_hash = :password WHERE id = :id");
                $stmt->execute([
                    ":password" => password_hash($data->password, PASSWORD_DEFAULT),
                    ":id" => $id
                ]);
            }

            // Update profile
            $stmt = $this->conn->prepare("UPDATE profiles SET full_name = :name, phone = :phone WHERE user_id = :uid");
            $stmt->execute([
                ":name" => $data->full_name,
                ":phone" => $data->phone ?? null,
                ":uid" => $id
            ]);

            // Update roles (delete and re-insert)
            if (isset($data->roles) && is_array($data->roles)) {
                require_once __DIR__ . '/../utils.php';
                $stmt = $this->conn->prepare("DELETE FROM user_roles WHERE user_id = :uid");
                $stmt->execute([":uid" => $id]);

                foreach ($data->roles as $role) {
                    $roleId = generateUUID();
                    $stmt = $this->conn->prepare("INSERT INTO user_roles (id, user_id, role) VALUES (:id, :uid, :role)");
                    $stmt->execute([
                        ":id" => $roleId,
                        ":uid" => $id,
                        ":role" => $role
                    ]);
                }
            }

            // Update module permissions
            if (isset($data->permissions) && is_array($data->permissions)) {
                require_once __DIR__ . '/../utils.php';
                $stmt = $this->conn->prepare("DELETE FROM user_module_permissions WHERE user_id = :uid");
                $stmt->execute([":uid" => $id]);

                foreach ($data->permissions as $module) {
                    $permId = generateUUID();
                    $stmt = $this->conn->prepare("INSERT INTO user_module_permissions (id, user_id, module_key) VALUES (:id, :uid, :module)");
                    $stmt->execute([
                        ":id" => $permId,
                        ":uid" => $id,
                        ":module" => $module
                    ]);
                }
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Usuário atualizado"]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao atualizar: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        $this->authenticate();
        if (!$id) $this->jsonResponse(["message" => "ID é obrigatório"], 400);

        // Delete user (cascade will handle profiles and roles)
        $stmt = $this->conn->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([":id" => $id]);
        
        $this->jsonResponse(["message" => "Usuário removido"]);
    }
}
