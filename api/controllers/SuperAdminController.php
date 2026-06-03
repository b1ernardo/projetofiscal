<?php
// /api/controllers/SuperAdminController.php

require_once 'ApiController.php';

class SuperAdminController extends ApiController {
    
    public function __construct($db) {
        parent::__construct($db);
    }

    private function checkSuperAdmin() {
        $payload = $this->authenticate();
        
        $stmt = $this->conn->prepare("SELECT role FROM user_roles WHERE user_id = :user_id AND role = 'super_admin'");
        $stmt->execute([':user_id' => $payload['id']]);
        if ($stmt->rowCount() === 0) {
            $this->jsonResponse(["message" => "Forbidden - Super Admin only"], 403);
        }
        return $payload;
    }

    public function listCompanies() {
        $this->checkSuperAdmin();
        $stmt = $this->conn->prepare("
            SELECT c.*, ds.slug as delivery_slug 
            FROM companies c
            LEFT JOIN delivery_settings ds ON c.id = ds.company_id
            ORDER BY c.name ASC
        ");
        $stmt->execute();
        $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode modules JSON for each company
        foreach ($companies as &$company) {
            $company['modules'] = $company['modules'] ? json_decode($company['modules']) : [];
        }
        
        $this->jsonResponse($companies);
    }

    public function listModules() {
        $this->checkSuperAdmin();
        $stmt = $this->conn->prepare("SELECT * FROM system_modules ORDER BY name ASC");
        $stmt->execute();
        $this->jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function createCompany() {
        require_once __DIR__ . '/../utils.php';
        $this->checkSuperAdmin();
        $data = $this->getPostData();

        if (empty($data->name)) {
            $this->jsonResponse(["message" => "Name is required"], 400);
        }

        $id = generateUUID();
        $modules = isset($data->modules) ? json_encode($data->modules) : null;

        $stmt = $this->conn->prepare("INSERT INTO companies (id, name, cnpj, email, phone, active, modules) VALUES (:id, :name, :cnpj, :email, :phone, 1, :modules)");
        $stmt->execute([
            ':id' => $id,
            ':name' => $data->name,
            ':cnpj' => $data->cnpj ?? null,
            ':email' => $data->email ?? null,
            ':phone' => $data->phone ?? null,
            ':modules' => $modules
        ]);

        // Criar formas de pagamento padrão
        $fixedMethods = ['Dinheiro', 'Conta'];
        foreach ($fixedMethods as $methodName) {
            $mId = generateUUID();
            $mStmt = $this->conn->prepare("INSERT INTO payment_methods (id, company_id, name, active, show_in_delivery) VALUES (:id, :cid, :name, 1, 1)");
            $mStmt->execute([
                ':id' => $mId,
                ':cid' => $id,
                ':name' => $methodName
            ]);
        }

        $this->jsonResponse(["message" => "Company created", "id" => $id]);
    }

    public function updateCompany($id) {
        $this->checkSuperAdmin();
        $data = $this->getPostData();

        $modules = isset($data->modules) ? json_encode($data->modules) : null;

        $stmt = $this->conn->prepare("UPDATE companies SET name = :name, cnpj = :cnpj, email = :email, phone = :phone, active = :active, modules = :modules WHERE id = :id");
        $stmt->execute([
            ':id' => $id,
            ':name' => $data->name,
            ':cnpj' => $data->cnpj ?? null,
            ':email' => $data->email ?? null,
            ':phone' => $data->phone ?? null,
            ':active' => $data->active ?? 1,
            ':modules' => $modules
        ]);

        $this->jsonResponse(["message" => "Company updated"]);
    }

    public function createAccount() {
        $this->checkSuperAdmin();
        $data = $this->getPostData();

        if (empty($data->company_id) || empty($data->email) || empty($data->password)) {
            $this->jsonResponse(["message" => "Missing data"], 400);
        }

        // Create user
        $user_id = bin2hex(random_bytes(16));
        $user_id = substr($user_id, 0, 8) . "-" . substr($user_id, 8, 4) . "-" . substr($user_id, 12, 4) . "-" . substr($user_id, 16, 4) . "-" . substr($user_id, 20, 12);
        
        $password_hash = password_hash($data->password, PASSWORD_DEFAULT);
        $max_discount = isset($data->max_discount) ? (float)$data->max_discount : 100.00;

        $stmt = $this->conn->prepare("INSERT INTO users (id, email, password_hash, company_id, max_discount) VALUES (:id, :email, :password_hash, :company_id, :max_discount)");
        $stmt->execute([
            ':id' => $user_id,
            ':email' => $data->email,
            ':password_hash' => $password_hash,
            ':company_id' => $data->company_id,
            ':max_discount' => $max_discount
        ]);

        // Role as admin of that company
        $stmt = $this->conn->prepare("INSERT INTO user_roles (id, user_id, role, company_id) VALUES (:id, :user_id, 'admin', :company_id)");
        $role_id = bin2hex(random_bytes(16));
        $role_id = substr($role_id, 0, 8) . "-" . substr($role_id, 8, 4) . "-" . substr($role_id, 12, 4) . "-" . substr($role_id, 16, 4) . "-" . substr($role_id, 20, 12);
        
        $stmt->execute([
            ':id' => $role_id,
            ':user_id' => $user_id,
            ':company_id' => $data->company_id
        ]);

        // Profile
        $stmt = $this->conn->prepare("INSERT INTO profiles (id, user_id, full_name, company_id) VALUES (:id, :user_id, :full_name, :company_id)");
        $profile_id = bin2hex(random_bytes(16));
        $profile_id = substr($profile_id, 0, 8) . "-" . substr($profile_id, 8, 4) . "-" . substr($profile_id, 12, 4) . "-" . substr($profile_id, 16, 4) . "-" . substr($profile_id, 20, 12);
        
        $stmt->execute([
            ':id' => $profile_id,
            ':user_id' => $user_id,
            ':full_name' => $data->full_name ?? 'Administrador',
            ':company_id' => $data->company_id
        ]);
        $this->jsonResponse(["message" => "Admin account created", "id" => $user_id]);
    }

    public function listCompanyUsers($company_id) {
        $this->checkSuperAdmin();
        $stmt = $this->conn->prepare("
            SELECT u.id as user_id, u.email, u.max_discount, p.full_name, p.phone, 
            (SELECT GROUP_CONCAT(role SEPARATOR ', ') FROM user_roles WHERE user_id = u.id) as roles
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.company_id = :cid
            ORDER BY u.created_at DESC
        ");
        $stmt->execute([':cid' => $company_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // Rename user_id -> id for frontend compatibility
        foreach ($rows as &$row) {
            $row['id'] = $row['user_id'];
            unset($row['user_id']);
        }
        $this->jsonResponse($rows);
    }

    public function updateUserBySuper($user_id) {
        $this->checkSuperAdmin();
        $data = $this->getPostData();

        // DEBUG - remove after fixing
        error_log("updateUserBySuper called. user_id=[$user_id] data=" . json_encode($data));

        if (!$data || (empty($data->email) && empty($data->full_name))) {
            $this->jsonResponse(["message" => "Dados insuficientes.", "received_id" => $user_id], 400);
        }

        try {
            if (!$this->conn->inTransaction()) {
                $this->conn->beginTransaction();
            }

            // 0. Verificar se o usuário existe
            $stmt = $this->conn->prepare("SELECT id, email, company_id FROM users WHERE id = :uid");
            $stmt->execute([":uid" => $user_id]);
            $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$userRow) {
                if ($this->conn->inTransaction()) $this->conn->rollBack();
                $this->jsonResponse(["message" => "Usuário não encontrado. ID recebido: $user_id"], 404);
            }

            // 1. Atualizar e-mail e/ou senha na tabela users (SE informado)
            $updateFields = [];
            $params = [":uid" => $user_id];
            
            if (!empty($data->email)) {
                $updateFields[] = "email = :email";
                $params[":email"] = $data->email;
            }
            
            if (!empty($data->password)) {
                $updateFields[] = "password_hash = :pass";
                $params[":pass"] = password_hash($data->password, PASSWORD_DEFAULT);
            }

            if (isset($data->max_discount)) {
                $updateFields[] = "max_discount = :max_discount";
                $params[":max_discount"] = (float)$data->max_discount;
            }
            
            if (!empty($updateFields)) {
                $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = :uid";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute($params);
            }

            // 2. Verificar/Atualizar perfil
            $stmt = $this->conn->prepare("SELECT id FROM profiles WHERE user_id = :uid");
            $stmt->execute([":uid" => $user_id]);
            $profileExist = $stmt->fetch();

            $p_name = !empty($data->full_name) ? $data->full_name : "Usuário";
            $p_phone = !empty($data->phone) ? $data->phone : null;

            if ($profileExist) {
                $stmt = $this->conn->prepare("UPDATE profiles SET full_name = :name, phone = :phone WHERE user_id = :uid");
                $stmt->execute([":name" => $p_name, ":phone" => $p_phone, ":uid" => $user_id]);
            } else {
                require_once __DIR__ . '/../utils.php';
                $pId = generateUUID();
                $stmt = $this->conn->prepare("INSERT INTO profiles (id, user_id, full_name, phone, company_id) VALUES (:id, :uid, :name, :phone, :cid)");
                $stmt->execute([
                    ":id" => $pId, 
                    ":uid" => $user_id, 
                    ":name" => $p_name, 
                    ":phone" => $p_phone, 
                    ":cid" => $userRow['company_id']
                ]);
            }

            $this->conn->commit();
            $this->jsonResponse(["message" => "Salvo com sucesso!"]);

        } catch (\PDOException $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro DB: " . $e->getMessage()], 500);
        } catch (\Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro: " . $e->getMessage()], 500);
        } catch (\Throwable $t) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro Crítico!"], 500);
        }
    }

    public function deleteAccountBySuper($user_id) {
        $this->checkSuperAdmin();
        // Delete user (cascade will handle others if set, but let's be explicit)
        $this->conn->prepare("DELETE FROM user_roles WHERE user_id = :uid")->execute([':uid' => $user_id]);
        $this->conn->prepare("DELETE FROM profiles WHERE user_id = :uid")->execute([':uid' => $user_id]);
        $this->conn->prepare("DELETE FROM user_module_permissions WHERE user_id = :uid")->execute([':uid' => $user_id]);
        $stmt = $this->conn->prepare("DELETE FROM users WHERE id = :uid");
        $stmt->execute([':uid' => $user_id]);
        $this->jsonResponse(["message" => "Usuário removido"]);
    }

    public function deleteCompany($company_id) {
        $this->checkSuperAdmin();
        
        if ($company_id === '1') {
            $this->jsonResponse(["message" => "A empresa padrão não pode ser excluída."], 400);
        }

        try {
            // Se já houver uma transação, não inicia outra
            if (!$this->conn->inTransaction()) {
                $this->conn->beginTransaction();
            }

            // Lista corrigida com base nas tabelas reais do banco
            $tables = [
                'users', 'products', 'sales', 'cash_registers', 'cash_movements', 
                'customers', 'suppliers', 'sellers', 'comandas', 'purchases', 
                'accounts_payable', 'accounts_receivable', 'chart_of_accounts', 
                'config_fiscal', 'fiscal_notes', 'delivery_settings', 'delivery_neighborhoods',
                'user_roles', 'user_module_permissions', 'profiles', 'nfe_rascunhos',
                'naturezas_operacao', 'categories', 'payment_methods', 'delivery_orders'
            ];

            foreach ($tables as $table) {
                try {
                    $stmt = $this->conn->prepare("DELETE FROM $table WHERE company_id = :cid");
                    $stmt->execute([':cid' => $company_id]);
                } catch (\PDOException $e) {
                    // Se a tabela não tiver a coluna company_id ou não existir, apenas pula
                    // Log opcional para debug: error_log("Erro ao limpar tabela $table: " . $e->getMessage());
                    continue;
                }
            }

            // Finalmente exclui a empresa
            $stmt = $this->conn->prepare("DELETE FROM companies WHERE id = :cid");
            $stmt->execute([':cid' => $company_id]);

            $this->conn->commit();
            $this->jsonResponse(["message" => "Empresa e todos os seus dados foram excluídos com sucesso."]);
        } catch (\Throwable $t) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->jsonResponse(["message" => "Erro ao excluir empresa: " . $t->getMessage()], 500);
        }
    }
}
