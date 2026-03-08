<?php
// /api/controllers/DeliverySettingsController.php

require_once 'ApiController.php';

class DeliverySettingsController extends ApiController {
    
    public function getSettings() {
        $this->authenticate();

        $stmt = $this->conn->prepare("SELECT * FROM delivery_settings WHERE company_id = :company_id");
        $stmt->execute([':company_id' => $this->company_id]);
        $settings = $stmt->fetch();

        if (!$settings) {
            $this->jsonResponse(null);
        } else {
            $this->jsonResponse($settings);
        }
    }

    public function getPublicSettings($slug) {
        $stmt = $this->conn->prepare("SELECT slug, logo_url, banner_url, primary_color, greeting_text, store_status, whatsapp_number, min_order_value, delivery_fee FROM delivery_settings WHERE slug = :slug");
        $stmt->execute([':slug' => $slug]);
        $settings = $stmt->fetch();

        if (!$settings) {
            $this->jsonResponse(["message" => "Store not found"], 404);
        } else {
            $this->jsonResponse($settings);
        }
    }

    public function saveSettings() {
        require_once __DIR__ . '/../utils.php';
        $this->authenticate();

        $data = $this->getPostData();

        if (empty($data->slug)) {
            $this->jsonResponse(["message" => "Slug (domínio) é obrigatório"], 400);
        }

        try {
            // Verifica se o slug já existe para outra empresa
            $stmt = $this->conn->prepare("SELECT id FROM delivery_settings WHERE slug = :slug AND company_id != :company_id");
            $stmt->execute([':slug' => $data->slug, ':company_id' => $this->company_id]);
            if ($stmt->fetch()) {
                 $this->jsonResponse(["message" => "Esse nome de domínio (slug) já está em uso"], 400);
            }

            // Verifica se ja existe configuração
            $stmt = $this->conn->prepare("SELECT id FROM delivery_settings WHERE company_id = :company_id");
            $stmt->execute([':company_id' => $this->company_id]);
            $existing = $stmt->fetch();

            if ($existing) {
                // UPDATE
                $update = $this->conn->prepare("UPDATE delivery_settings SET 
                    slug = :slug,
                    logo_url = :logo_url,
                    banner_url = :banner_url,
                    primary_color = :primary_color,
                    greeting_text = :greeting_text,
                    store_status = :store_status,
                    whatsapp_number = :whatsapp_number,
                    min_order_value = :min_order_value,
                    delivery_fee = :delivery_fee
                    WHERE company_id = :company_id");
                
                $update->execute([
                    ':slug' => $data->slug,
                    ':logo_url' => $data->logo_url ?? null,
                    ':banner_url' => $data->banner_url ?? null,
                    ':primary_color' => $data->primary_color ?? '#facc15',
                    ':greeting_text' => $data->greeting_text ?? '',
                    ':store_status' => $data->store_status ?? 'open',
                    ':whatsapp_number' => preg_replace('/\D/', '', $data->whatsapp_number ?? ''),
                    ':min_order_value' => isset($data->min_order_value) ? (float)$data->min_order_value : 0,
                    ':delivery_fee' => isset($data->delivery_fee) ? (float)$data->delivery_fee : 0,
                    ':company_id' => $this->company_id
                ]);

                $this->jsonResponse(["message" => "Configurações atualizadas"]);
            } else {
                // INSERT
                $id = generateUUID();
                $insert = $this->conn->prepare("INSERT INTO delivery_settings 
                    (id, company_id, slug, logo_url, banner_url, primary_color, greeting_text, store_status, whatsapp_number, min_order_value, delivery_fee) 
                    VALUES (:id, :company_id, :slug, :logo_url, :banner_url, :primary_color, :greeting_text, :store_status, :whatsapp_number, :min_order_value, :delivery_fee)");
                
                $insert->execute([
                    ':id' => $id,
                    ':company_id' => $this->company_id,
                    ':slug' => $data->slug,
                    ':logo_url' => $data->logo_url ?? null,
                    ':banner_url' => $data->banner_url ?? null,
                    ':primary_color' => $data->primary_color ?? '#facc15',
                    ':greeting_text' => $data->greeting_text ?? '',
                    ':store_status' => $data->store_status ?? 'open',
                    ':whatsapp_number' => preg_replace('/\D/', '', $data->whatsapp_number ?? ''),
                    ':min_order_value' => isset($data->min_order_value) ? (float)$data->min_order_value : 0,
                    ':delivery_fee' => isset($data->delivery_fee) ? (float)$data->delivery_fee : 0
                ]);
                
                $this->jsonResponse(["message" => "Configurações criadas"]);
            }
        } catch (\Exception $e) {
            $this->jsonResponse(["message" => "Erro ao salvar configs: " . $e->getMessage()], 500);
        }
    }
}
