<?php
require_once 'config.php';
require_once 'db.php';

// Check CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Identify company by slug or fallback
    $slug = $_GET['slug'] ?? null;
    $company_id = null;

    if ($slug) {
        $stmt = $conn->prepare("SELECT c.id, c.active FROM companies c JOIN delivery_settings ds ON c.id = ds.company_id WHERE ds.slug = ? LIMIT 1");
        $stmt->execute([$slug]);
        $company = $stmt->fetch();
        if ($company) {
            $company_id = $company['id'];
            if (!$company['active']) {
                http_response_code(403);
                echo json_encode(["message" => "Esta loja está temporariamente desativada."]);
                exit;
            }
        }
    }

    if (!$company_id) {
        // Fallback or default
        $stmt = $conn->prepare("SELECT id, active FROM companies LIMIT 1");
        $stmt->execute();
        $company = $stmt->fetch();
        if ($company) {
            $company_id = $company['id'];
            if (!$company['active']) {
                http_response_code(403);
                echo json_encode(["message" => "Esta loja está temporariamente desativada."]);
                exit;
            }
        }
    }
    
    if (!$company_id) {
        http_response_code(404);
        echo json_encode(["message" => "Nenhuma empresa encontrada"]);
        exit;
    }

    // Get settings
    $settingsStmt = $conn->prepare("SELECT company_id, slug, logo_url, banner_url, primary_color, greeting_text, store_status, whatsapp_number, min_order_value, delivery_fee FROM delivery_settings WHERE company_id = ?");
    $settingsStmt->execute([$company_id]);
    $settings = $settingsStmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        // Mock default settings just in case
        $settings = [
            'slug' => 'cantinho-burguer',
            'logo_url' => 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&h=100&fit=crop',
            'banner_url' => '',
            'primary_color' => '#facc15',
            'greeting_text' => 'Boa noite, cliente!',
            'store_status' => 'open',
            'whatsapp_number' => '',
            'min_order_value' => 0,
            'delivery_fee' => 0
        ];
    }
    
    // Busca logo global do Fiscal caso exista
    $fiscalStmt = $conn->prepare("SELECT logo_base64 FROM config_fiscal WHERE company_id = ? LIMIT 1");
    $fiscalStmt->execute([$company_id]);
    $fiscalCfg = $fiscalStmt->fetch(PDO::FETCH_ASSOC);

    if ($fiscalCfg && !empty($fiscalCfg['logo_base64'])) {
        // Se a empresa configurou um logo no FiscalConfig (Emitente), ele tem prioridade ou serve de fallback confiável
        $settings['logo_url'] = $fiscalCfg['logo_base64'];
    }

    $query = "SELECT p.id, p.name, '' as description, p.sale_price as price, p.photo_url as image, c.name as category 
              FROM products p 
              LEFT JOIN categories c ON p.category_id = c.id 
              WHERE p.active = 1 AND p.venda_delivery = 1 AND p.company_id = :company_id
              ORDER BY c.name ASC, p.name ASC";
              
    $stmt = $conn->prepare($query);
    $stmt->execute([':company_id' => $company_id]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format products for the frontend
    $formattedProducts = [];
    foreach ($products as $p) {
        $formattedProducts[] = [
            'id' => $p['id'],
            'category' => $p['category'] ?? 'Outros',
            'name' => $p['name'],
            'description' => $p['description'] ?? 'Sem descrição',
            'price' => (float)$p['price'],
            'points' => 0,
            'image' => $p['image'] ?? 'https://via.placeholder.com/200'
        ];
    }

    // Get neighborhoods
    $nbStmt = $conn->prepare("SELECT id, name, fee FROM delivery_neighborhoods WHERE company_id = ? ORDER BY name ASC");
    $nbStmt->execute([$company_id]);
    $neighborhoods = $nbStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get payment methods
    $pmStmt = $conn->prepare("SELECT id, name FROM payment_methods WHERE company_id = ? AND active = 1 AND show_in_delivery = 1 ORDER BY name ASC");
    $pmStmt->execute([$company_id]);
    $paymentMethods = $pmStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'settings' => $settings,
        'products' => $formattedProducts,
        'neighborhoods' => $neighborhoods,
        'payment_methods' => $paymentMethods
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
