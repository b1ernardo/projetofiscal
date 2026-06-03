<?php
// /api/controllers/UsersController.php

require_once 'ApiController.php';

class UsersController extends ApiController {
    
    public function list() {
        $this->authenticate();
        
        $query = "SELECT u.id, u.email, u.created_at, u.max_discount, p.full_name, p.phone, p.avatar_url 
                  FROM users u 
                  LEFT JOIN profiles p ON u.id = p.user_id 
                  WHERE u.company_id = :cid
                  ORDER BY p.full_name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':cid' => $this->company_id]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Load roles and permissions for each user
        foreach ($users as &$user) {
            $stmt = $this->conn->prepare("SELECT role FROM user_roles WHERE user_id = :uid AND company_id = :cid");
            $stmt->execute([':uid' => $user['id'], ':cid' => $this->company_id]);
            $user['roles'] = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $stmt = $this->conn->prepare("SELECT module_key FROM user_module_permissions WHERE user_id = :uid AND company_id = :cid");
            $stmt->execute([':uid' => $user['id'], ':cid' => $this->company_id]);
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
            $max_discount = isset($data->max_discount) ? (float)$data->max_discount : 100.00;
            $stmt = $this->conn->prepare("INSERT INTO users (id, email, password_hash, company_id, max_discount) VALUES (:id, :email, :password, :cid, :max_discount)");
            $stmt->execute([
                ":id" => $userId,
                ":email" => $data->email,
                ":password" => password_hash($data->password, PASSWORD_DEFAULT),
                ":cid" => $this->company_id,
                ":max_discount" => $max_discount
            ]);

            $profileId = generateUUID();
            $stmt = $this->conn->prepare("INSERT INTO profiles (id, user_id, full_name, phone, company_id) VALUES (:id, :uid, :name, :phone, :cid)");
            $stmt->execute([
                ":id" => $profileId,
                ":uid" => $userId,
                ":name" => $data->full_name,
                ":phone" => $data->phone ?? null,
                ":cid" => $this->company_id
            ]);

            if (!empty($data->roles) && is_array($data->roles)) {
                foreach ($data->roles as $role) {
                    $roleId = generateUUID();
                    $stmt = $this->conn->prepare("INSERT INTO user_roles (id, user_id, role, company_id) VALUES (:id, :uid, :role, :cid)");
                    $stmt->execute([
                        ":id" => $roleId,
                        ":uid" => $userId,
                        ":role" => $role,
                        ":cid" => $this->company_id
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

            if (!empty($data->email)) {
                $stmt = $this->conn->prepare("UPDATE users SET email = :email WHERE id = :id AND company_id = :cid");
                $stmt->execute([":email" => $data->email, ":id" => $id, ":cid" => $this->company_id]);
            }

            // Update max_discount
            if (isset($data->max_discount)) {
                $stmt = $this->conn->prepare("UPDATE users SET max_discount = :max_discount WHERE id = :id AND company_id = :cid");
                $stmt->execute([":max_discount" => (float)$data->max_discount, ":id" => $id, ":cid" => $this->company_id]);
            }

            // Update password if provided
            if (!empty($data->password)) {
                $stmt = $this->conn->prepare("UPDATE users SET password_hash = :password WHERE id = :id AND company_id = :cid");
                $stmt->execute([
                    ":password" => password_hash($data->password, PASSWORD_DEFAULT),
                    ":id" => $id,
                    ":cid" => $this->company_id
                ]);
            }

            // Update profile
            $stmt = $this->conn->prepare("UPDATE profiles SET full_name = :name, phone = :phone WHERE user_id = :uid AND company_id = :cid");
            $stmt->execute([
                ":name" => $data->full_name,
                ":phone" => $data->phone ?? null,
                ":uid" => $id,
                ":cid" => $this->company_id
            ]);

            // Update roles (delete and re-insert)
            if (isset($data->roles) && is_array($data->roles)) {
                require_once __DIR__ . '/../utils.php';
                $stmt = $this->conn->prepare("DELETE FROM user_roles WHERE user_id = :uid AND company_id = :cid");
                $stmt->execute([":uid" => $id, ":cid" => $this->company_id]);

                foreach ($data->roles as $role) {
                    $roleId = generateUUID();
                    $stmt = $this->conn->prepare("INSERT INTO user_roles (id, user_id, role, company_id) VALUES (:id, :uid, :role, :cid)");
                    $stmt->execute([
                        ":id" => $roleId,
                        ":uid" => $id,
                        ":role" => $role,
                        ":cid" => $this->company_id
                    ]);
                }
            }

            // Update module permissions
            if (isset($data->permissions) && is_array($data->permissions)) {
                require_once __DIR__ . '/../utils.php';
                $stmt = $this->conn->prepare("DELETE FROM user_module_permissions WHERE user_id = :uid AND company_id = :cid");
                $stmt->execute([":uid" => $id, ":cid" => $this->company_id]);

                foreach ($data->permissions as $module) {
                    $permId = generateUUID();
                    $stmt = $this->conn->prepare("INSERT INTO user_module_permissions (id, user_id, module_key, company_id) VALUES (:id, :uid, :module, :cid)");
                    $stmt->execute([
                        ":id" => $permId,
                        ":uid" => $id,
                        ":module" => $module,
                        ":cid" => $this->company_id
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

        // Delete user (cascade will handle profiles and roles if FKs are set, but let's be safe)
        $stmt = $this->conn->prepare("DELETE FROM users WHERE id = :id AND company_id = :cid");
        $stmt->execute([":id" => $id, ":cid" => $this->company_id]);
        
        $this->jsonResponse(["message" => "Usuário removido"]);
    }
}
