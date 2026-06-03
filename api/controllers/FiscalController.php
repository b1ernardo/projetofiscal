<?php

require_once 'ApiController.php';
require_once __DIR__ . '/../utils.php';

class FiscalController extends ApiController {
    private $db;


    public function __construct($db) {
        parent::__construct($db);
        $this->db = $db;
    }

    public function getConfig() {
        $this->authenticate();
        try {
            $stmt = $this->db->prepare("SELECT * FROM config_fiscal WHERE company_id = :company_id LIMIT 1");
            $stmt->execute([':company_id' => $this->company_id]);
            $config = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($config) {
                // Não retornar a senha do certificado por segurança
                unset($config['certificado_senha']);
                echo json_encode($config);
            } else {
                echo json_encode(null);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao buscar configuração: " . $e->getMessage()]);
        }
    }

    public function saveConfig() {
        $this->authenticate();
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(["message" => "Dados inválidos"]);
            return;
        }

        try {
            // Verificar se já existe config
            $stmt = $this->db->prepare("SELECT id FROM config_fiscal WHERE company_id = :company_id LIMIT 1");
            $stmt->execute([':company_id' => $this->company_id]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            $fields = [
                'cnpj', 'ie', 'razao_social', 'nome_fantasia', 'logradouro', 'numero',
                'bairro', 'municipio', 'cod_municipio', 'uf', 'cep', 'fone',
                'ambiente', 'ultimo_numero_nfe', 'serie_nfe', 'ultimo_numero_nfce',
                'serie_nfce', 'csc_id', 'csc_token', 'percentual_tributos', 'logo_base64'
            ];

            if (isset($data['certificado_senha']) && !empty($data['certificado_senha'])) {
                $fields[] = 'certificado_senha';
            }
            if (isset($data['certificado_pfx']) && !empty($data['certificado_pfx'])) {
                // Remove the 'data:application/x-pkcs12;base64,' part if it exists
                $base64_string = $data['certificado_pfx'];
                if (strpos($base64_string, ',') !== false) {
                    $base64_string = explode(',', $base64_string)[1];
                }
                $data['certificado_pfx'] = $base64_string;
                $fields[] = 'certificado_pfx';
            }

            $sets = array_map(fn($f) => "`$f` = :$f", $fields);
            $sql = $existing 
                ? "UPDATE config_fiscal SET " . implode(", ", $sets) . " WHERE id = :id AND company_id = :company_id"
                : "INSERT INTO config_fiscal SET company_id = :company_id, " . implode(", ", $sets);

            $stmt = $this->db->prepare($sql);
            
            foreach ($fields as $field) {
                $stmt->bindValue(":$field", $data[$field] ?? null);
            }

            if ($existing) {
                $stmt->bindValue(":id", $existing['id']);
                $stmt->bindValue(":company_id", $this->company_id);
            } else {
                $stmt->bindValue(":company_id", $this->company_id);
            }

            $stmt->execute();
            echo json_encode(["message" => "Configuração salva com sucesso"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao salvar configuração: " . $e->getMessage()]);
        }
    }

    public function emitirAvulsa() {
        ob_start(); // buffer any PHP warnings so they don't break JSON
        header('Content-Type: application/json; charset=utf-8');

        // Captura erros fatais do PHP e retorna JSON
        register_shutdown_function(function() {
            $err = error_get_last();
            if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
                ob_clean();
                http_response_code(500);
                echo json_encode(["message" => "Erro Fatal PHP: " . $err['message'] . " em " . basename($err['file']) . " linha " . $err['line']]);
            }
        });

        $auth = $this->authenticate();
        require_once __DIR__ . '/../src/Services/FiscalService.php';
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['customer']) || empty($data['items'])) {
            ob_clean();
            http_response_code(400);
            echo json_encode(["message" => "Dados insuficientes (cliente ou itens)."]);
            return;
        }

        try {
            $this->db->beginTransaction();

            $isExistingSale = !empty($data['saleId']);
            $saleId = $isExistingSale ? $data['saleId'] : generateUUID();
            $totalAmount = $data['total_amount'] ?? 0;
            $discount = $data['discount'] ?? 0;
            $paymentMethod = $data['payments'][0]['methodName'] ?? 'DINHEIRO';

            if ($isExistingSale) {
                // Update Sale - only update fields that exist in the schema
                $stmt = $this->db->prepare("UPDATE sales SET total_amount = :total, payment_method = :method, discount = :discount WHERE id = :id AND company_id = :company_id");
                $stmt->execute([
                    ":id" => $saleId,
                    ":company_id" => $this->company_id,
                    ":total" => $totalAmount,
                    ":method" => $paymentMethod,
                    ":discount" => $discount,
                ]);
            } else {
                // 1. Criar Venda
                // Calcular próximo número da venda POR EMPRESA
                $stmtNum = $this->db->prepare("SELECT COALESCE(MAX(sale_number), 0) + 1 FROM sales WHERE company_id = :company_id FOR UPDATE");
                $stmtNum->execute([':company_id' => $this->company_id]);
                $saleNumber = (int)$stmtNum->fetchColumn();

                $stmt = $this->db->prepare("INSERT INTO sales (id, company_id, sale_number, total_amount, payment_method, created_by, status, discount) 
                                            VALUES (:id, :company_id, :sale_number, :total, :method, :uid, 'completed', :discount)");
                $stmt->execute([
                    ":id" => $saleId,
                    ":company_id" => $this->company_id,
                    ":sale_number" => $saleNumber,
                    ":total" => $totalAmount,
                    ":method" => $paymentMethod,
                    ":uid" => $auth['id'] ?? null,
                    ":discount" => $discount,
                ]);

                // 2. Inserir Itens
                foreach ($data['items'] as $item) {
                    $stmt = $this->db->prepare("INSERT INTO sale_items (id, company_id, sale_id, product_id, quantity, unit_price) 
                                                VALUES (:id, :company_id, :sale_id, NULL, :qty, :price)");
                    try {
                        $stmt->execute([
                            ":id" => bin2hex(random_bytes(16)),
                            ":company_id" => $this->company_id,
                            ":sale_id" => $saleId,
                            ":qty" => $item['quantity'],
                            ":price" => $item['unit_price'],
                        ]);
                    } catch (\PDOException $e) {
                        // Ignore (e.g. NULL product_id constraint)
                    }
                }
            }

            // Preparar a Venda para o FiscalService
            $saleMock = [
                'id' => $saleId,
                'customer_id' => 'avulso', // bypassing
                'customer_doc' => $data['customer']['documento'] ?? '',
                'customer_name' => $data['customer']['nome'] ?? 'Consumidor Avulso',
                'customer_email' => $data['customer']['email'] ?? '',
                'total_amount' => $totalAmount,
                'discount' => $discount,
                'payment_method' => $paymentMethod
                // A FiscalService pega endereço direto no caso de NFCe/NFe?
                // Na implementação, ela não pegava end do cliente, só doc/nome. Precisamos ajustar a Service se for NFe 55 que exige end.
            ];

            // Ajustar array de itens
            $itemsMock = [];
            foreach ($data['items'] as $item) {
                $itemsMock[] = [
                    'product_id' => '0001', // Genérico 
                    'name' => $item['name'],
                    'ncm' => $item['ncm'],
                    'cest' => $item['cest'] ?? '',
                    'cfop_padrao' => $item['cfop_padrao'],
                    'unit' => $item['unit'],
                    'quantity' => (float)$item['quantity'],
                    'unit_price' => (float)$item['unit_price'],
                    'cst' => $item['cst'] ?? '00',
                    'csosn' => $item['csosn'] ?? '102',
                    'origem' => $item['origem'] ?? '0',
                    'pICMS' => $item['pICMS'] ?? 0,
                    'pPIS' => $item['pPIS'] ?? 0,
                    'pCOFINS' => $item['pCOFINS'] ?? 0
                ];
            }

            $service = new \App\Services\FiscalService($this->db, $this->company_id);
            $model = '55'; // NF-e Avulsa é sempre 55
            
            // Passo 1: Geração XML e Assinatura
            $res = $service->generateNFe($saleMock, $itemsMock, $model, $data['customer'] ?? null, $data['ide'] ?? null); // Passando cliente e ide extra
            
            // Passo 2: Transmissão para a Base de Dados da SEFAZ
            $transmissao = $service->transmit($res['xml'], $model);
            $xmlFinal = $transmissao['xml'];
            
            // Passo 3: Salvar histórico
            $stmt = $this->db->prepare("INSERT INTO fiscal_notes (id, company_id, sale_id, tipo, numero, serie, status, xml_path, customer_name, data_emissao, v_cbs, v_ibs, v_is)
                                        VALUES (:id, :company_id, :sale_id, :tipo, :numero, :serie, 'generated', :xml, :customer_name, :data_emissao, :v_cbs, :v_ibs, :v_is)");
            $noteId = generateUUID();

            $stmt->execute([
                ":id"            => $noteId,
                ":company_id"    => $this->company_id,
                ":sale_id"       => $saleId,
                ":tipo"          => 'NFE',
                ":numero"        => $res['nNF'],
                ":serie"         => $res['serie'],
                ":xml"           => $xmlFinal,
                ":customer_name" => $data['customer']['nome'] ?? null,
                ":data_emissao"  => isset($res['dhEmi']) ? date('Y-m-d H:i:s', strtotime($res['dhEmi'])) : date('Y-m-d H:i:s'),
                ":v_cbs"         => $res['vCBS'] ?? 0,
                ":v_ibs"         => $res['vIBS'] ?? 0,
                ":v_is"          => $res['vIS']  ?? 0,
            ]);

            // Atualizar config
            $this->db->prepare("UPDATE config_fiscal SET ultimo_numero_nfe = :num WHERE company_id = :company_id")->execute([":num" => $res['nNF'], ":company_id" => $this->company_id]);

            $this->db->commit();

            ob_clean();
            echo json_encode([
                "message" => "Nota Avulsa autorizada com sucesso na Sefaz!",
                "noteId" => $noteId,
                "nNF" => $res['nNF'],
                "protocol" => $transmissao['protocol']
            ]);

        } catch (\Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            $phpOutput = trim(ob_get_clean());
            http_response_code(500);
            $msg = $e->getMessage();
            if ($phpOutput) $msg .= ' | PHP: ' . strip_tags($phpOutput);
            echo json_encode(["message" => "Erro na emissão: " . $msg]);
            return;
        }
        ob_end_flush();
    }

    // ─── Rascunhos de NF-e ────────────────────────────────────────────────────────
    private function ensureRascunhosTable() {
        $this->db->exec("CREATE TABLE IF NOT EXISTS `nfe_rascunhos` (
            `id` CHAR(36) PRIMARY KEY,
            `tipo` VARCHAR(5) NOT NULL DEFAULT 'NFE',
            `titulo` VARCHAR(255) DEFAULT NULL,
            `dados_json` LONGTEXT NOT NULL,
            `contingencia` TINYINT(1) NOT NULL DEFAULT 0,
            `created_by` CHAR(36) DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        // Adicionar coluna se ja existir a tabela sem ela
        try { $this->db->exec("ALTER TABLE nfe_rascunhos ADD COLUMN IF NOT EXISTS contingencia TINYINT(1) NOT NULL DEFAULT 0"); } catch(\Exception $e){}
    }

    public function salvarRascunho() {
        $auth = $this->authenticate();
        $this->ensureRascunhosTable();
        $data = json_decode(file_get_contents("php://input"), true);

        $dados   = $data['dados']      ?? [];
        $tipo    = $data['tipo']       ?? 'NFE';
        $rascId  = $data['rascunhoId'] ?? null;
        $contingencia = !empty($data['contingencia']) ? 1 : 0;

        $dadosJson = json_encode($dados, JSON_UNESCAPED_UNICODE);

        // Gerar título a partir do destinatário — prefixo [CONTINGÊNCIA] se necessário
        $nome    = $dados['customer']['nome'] ?? 'Sem destinatário';
        $prefix  = $contingencia ? '[CONTINGÊNCIA] ' : '';
        $titulo  = substr($prefix . $tipo . ' - ' . $nome, 0, 255);

        if ($rascId) {
            $stmt = $this->db->prepare("UPDATE nfe_rascunhos SET dados_json=:dados, titulo=:titulo, contingencia=:cont WHERE id=:id AND created_by=:uid");
            $stmt->execute([':dados' => $dadosJson, ':titulo' => $titulo, ':cont' => $contingencia, ':id' => $rascId, ':uid' => $auth['id']]);
            echo json_encode(['success' => true, 'id' => $rascId, 'message' => 'Rascunho atualizado.']);
        } else {
            require_once __DIR__ . '/../utils.php';
            $id = generateUUID();
            $stmt = $this->db->prepare("INSERT INTO nfe_rascunhos (id, tipo, titulo, dados_json, contingencia, created_by) VALUES (:id,:tipo,:titulo,:dados,:cont,:uid)");
            $stmt->execute([':id' => $id, ':tipo' => $tipo, ':titulo' => $titulo, ':dados' => $dadosJson, ':cont' => $contingencia, ':uid' => $auth['id']]);
            echo json_encode(['success' => true, 'id' => $id, 'message' => 'Rascunho salvo.']);
        }
    }

    public function getRascunho($id) {
        $auth = $this->authenticate();
        $this->ensureRascunhosTable();
        $stmt = $this->db->prepare("SELECT * FROM nfe_rascunhos WHERE id=:id AND created_by=:uid");
        $stmt->execute([':id' => $id, ':uid' => $auth['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) { http_response_code(404); echo json_encode(['message' => 'Rascunho não encontrado']); return; }
        $row['dados'] = json_decode($row['dados_json'], true);
        unset($row['dados_json']);
        echo json_encode($row);
    }

    public function deletarRascunho($id) {
        $auth = $this->authenticate();
        $this->ensureRascunhosTable();
        $stmt = $this->db->prepare("DELETE FROM nfe_rascunhos WHERE id=:id AND created_by=:uid");
        $stmt->execute([':id' => $id, ':uid' => $auth['id']]);
        echo json_encode(['success' => true]);
    }

    public function listarRascunhos() {
        $auth = $this->authenticate();
        $this->ensureRascunhosTable();
        $tipo = strtoupper($_GET['tipo'] ?? 'NFE');
        $stmt = $this->db->prepare("SELECT id, tipo, titulo, contingencia, created_at, updated_at FROM nfe_rascunhos WHERE created_by=:uid AND tipo=:tipo ORDER BY contingencia DESC, updated_at DESC");
        $stmt->execute([':uid' => $auth['id'], ':tipo' => $tipo]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['contingencia'] = (bool)(int)$r['contingencia']; }
        echo json_encode($rows);
    }

    public function listNotas() {
        $this->authenticate();
        $tipo   = strtoupper($_GET['tipo']   ?? 'NFE'); // NFE | NFCE
        $search = trim($_GET['search'] ?? '');
        $startDate = $_GET['startDate'] ?? '';
        $endDate   = $_GET['endDate']   ?? '';

        $where  = "fn.tipo = :tipo AND (s.company_id = :company_id OR s.company_id IS NULL)";
        $params = [':tipo' => $tipo, ':company_id' => $this->company_id];

        if ($search) {
            $where .= " AND (fn.numero LIKE :search OR fn.chave LIKE :search OR c.name LIKE :search)";
            $params[':search'] = "%$search%";
        }

        if ($startDate) {
            $where .= " AND DATE(COALESCE(fn.data_emissao, fn.created_at)) >= :startDate";
            $params[':startDate'] = $startDate;
        }
        if ($endDate) {
            $where .= " AND DATE(COALESCE(fn.data_emissao, fn.created_at)) <= :endDate";
            $params[':endDate'] = $endDate;
        }

        $sql = "SELECT 
                    fn.id, fn.sale_id, fn.tipo, fn.numero, fn.serie, fn.chave,
                    fn.status, fn.protocolo, fn.motivo_rejeicao, fn.created_at, fn.data_emissao,
                    s.sale_number, s.total_amount,
                    COALESCE(fn.customer_name, c.name, 'Consumidor Final') as customer_name
                FROM fiscal_notes fn
                LEFT JOIN sales s    ON fn.sale_id  = s.id
                LEFT JOIN customers c ON s.customer_id = c.id
                WHERE $where
                ORDER BY COALESCE(fn.data_emissao, fn.created_at) DESC
                LIMIT 500";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) {
                $r['numero']       = (int)$r['numero'];
                $r['serie']        = (int)$r['serie'];
                $r['total_amount'] = $r['total_amount'] !== null ? (float)$r['total_amount'] : null;
                $r['sale_number']  = $r['sale_number']  !== null ? (int)$r['sale_number']   : null;
            }
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($rows);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao listar notas: " . $e->getMessage()]);
        }
    }

    public function emitirNFe() {
        // index.php já faz ob_start(); não empilhar um segundo nível
        $this->authenticate();
        require_once __DIR__ . '/../src/Services/FiscalService.php';
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['saleId'])) {
            $this->jsonResponse(["message" => "saleId obrigatório"], 400);
        }

        try {
            $service = new \App\Services\FiscalService($this->db, $this->company_id);
            $model = $data['model'] ?? '55'; // 55 = NFe, 65 = NFCe
            
            // Busca a Venda no banco
            $stmt = $this->db->prepare("SELECT s.*, c.cpf_cnpj as c_doc, c.name as c_name, c.email as c_email, c.address as c_address FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = :id AND s.company_id = :company_id");
            $stmt->execute([':id' => $data['saleId'], ':company_id' => $this->company_id]);
            $sale = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sale) {
                http_response_code(404);
                echo json_encode(["message" => "Venda não encontrada"]);
                return;
            }

            // Normaliza as chaves da venda para o FiscalService
            $saleData = [
                'id' => $sale['id'],
                'customer_id' => $sale['customer_id'],
                'customer_doc' => $sale['customer_doc'] ?? $sale['c_doc'],
                'customer_name' => $sale['customer_name'] ?? $sale['c_name'],
                'customer_email' => $sale['c_email'],
                'total_amount' => $sale['total_amount'],
                'discount' => $sale['discount'],
                'payment_method' => $sale['payment_method']
            ];

            // Busca os Itens da Venda (inclui alíquotas fiscais e campos da reforma)
            $stmtItems = $this->db->prepare("
                SELECT si.*,
                       p.name, p.code, p.ncm, p.cest, p.cfop_padrao, p.unit,
                       p.cst, p.csosn, p.origem,
                       p.icms_aliquota  AS pICMS,
                       p.pis_aliquota   AS pPIS,
                       p.cofins_aliquota AS pCOFINS,
                       COALESCE(p.cbs_regime, 'padrao') AS cbs_regime,
                       COALESCE(p.is_incide, 0)         AS is_incide,
                       COALESCE(p.is_aliquota, 0)       AS is_aliquota
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                JOIN sales s    ON si.sale_id = s.id
                WHERE si.sale_id = :id AND s.company_id = :company_id
            ");
            $stmtItems->execute([':id' => $data['saleId'], ':company_id' => $this->company_id]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            if (!$items) {
                http_response_code(400);
                echo json_encode(["message" => "Esta venda não possui itens válidos para emissão."]);
                return;
            }
            
            // Passo 1: Geração XML e Assinatura (enviando $saleData, $items e $model)
            $res = $service->generateNFe($saleData, $items, $model);
            
            // Passo 2: Transmissão para a Base de Dados da SEFAZ
            $transmissao = $service->transmit($res['xml'], $model);
            $xmlFinal = $transmissao['xml'];
            
            // Passo 3: Salvar histórico da nota protocolada no banco
            $stmt = $this->db->prepare("INSERT INTO fiscal_notes (id, company_id, sale_id, tipo, numero, serie, status, xml_path, customer_name, data_emissao, v_cbs, v_ibs, v_is)
                                        VALUES (:id, :company_id, :sale_id, :tipo, :numero, :serie, 'generated', :xml, :customer_name, :data_emissao, :v_cbs, :v_ibs, :v_is)");
            $noteId = generateUUID();

            $stmt->execute([
                ":id"            => $noteId,
                ":company_id"    => $this->company_id,
                ":sale_id"       => $data['saleId'],
                ":tipo"          => ($model == '55') ? 'NFE' : 'NFCE',
                ":numero"        => $res['nNF'],
                ":serie"         => $res['serie'],
                ":xml"           => $xmlFinal,
                ":customer_name" => $sale['customer_name'] ?? $sale['c_name'],
                ":data_emissao"  => isset($res['dhEmi']) ? date('Y-m-d H:i:s', strtotime($res['dhEmi'])) : date('Y-m-d H:i:s'),
                ":v_cbs"         => $res['vCBS'] ?? 0,
                ":v_ibs"         => $res['vIBS'] ?? 0,
                ":v_is"          => $res['vIS']  ?? 0,
            ]);

            // Atualizar controle de última numeração emitida
            $field = ($model == '55') ? 'ultimo_numero_nfe' : 'ultimo_numero_nfce';
            $this->db->prepare("UPDATE config_fiscal SET $field = :num WHERE company_id = :company_id")->execute([":num" => $res['nNF'], ":company_id" => $this->company_id]);

            $chave = '';
            $qrCode = '';
            $urlConsulta = '';
            try {
                $xml = @simplexml_load_string($xmlFinal);
                if ($xml) {
                    $xml->registerXPathNamespace('ns', 'http://www.portalfiscal.inf.br/nfe');
                    
                    $chaveArr = $xml->xpath('//ns:protNFe/ns:infProt/ns:chNFe');
                    $chave = $chaveArr ? (string)$chaveArr[0] : '';
                    
                    $qrCodeArr = $xml->xpath('//ns:infNFeSupl/ns:qrCode');
                    $qrCode = $qrCodeArr ? (string)$qrCodeArr[0] : '';
                    
                    $urlArr = $xml->xpath('//ns:infNFeSupl/ns:urlChave');
                    $urlConsulta = $urlArr ? (string)$urlArr[0] : '';
                }
            } catch (\Throwable $e) {
                // Silently fail, we already saved the XML
            }

            $this->jsonResponse([
                "message" => "Nota autorizada com sucesso na Sefaz!",
                "noteId" => $noteId,
                "nNF" => $res['nNF'],
                "serie" => $res['serie'],
                "protocol" => $transmissao['protocol'],
                "chave" => $chave,
                "qrCode" => $qrCode,
                "urlConsulta" => $urlConsulta
            ]);

        } catch (\Throwable $e) {
            ob_clean();
            $this->jsonResponse(["message" => "Erro na emissão: " . $e->getMessage()], 500);
        }
    }

    public function cancelarNFe() {
        $this->authenticate();
        $data = json_decode(file_get_contents("php://input"), true);

        require_once __DIR__ . '/../src/Services/FiscalService.php';

        if (empty($data['saleId']) || empty($data['justificativa'])) {
            http_response_code(400);
            echo json_encode(["message" => "ID da venda e justificativa são obrigatórios para cancelamento."]);
            return;
        }

        if (strlen(trim($data['justificativa'])) < 15) {
            http_response_code(400);
            echo json_encode(["message" => "A Sefaz exige que a justificativa de cancelamento tenha no mínimo 15 caracteres."]);
            return;
        }

        try {
            $stmt = $this->db->prepare("SELECT fn.id, fn.xml_path, fn.tipo FROM fiscal_notes fn JOIN sales s ON fn.sale_id = s.id WHERE fn.sale_id = :sale_id AND fn.status = 'generated' AND s.company_id = :company_id ORDER BY fn.created_at DESC LIMIT 1");
            $stmt->execute([":sale_id" => $data['saleId'], ":company_id" => $this->company_id]);
            $note = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$note) {
                http_response_code(404);
                echo json_encode(["message" => "Nota autorizada não encontrada para este pedido."]);
                return;
            }

            $service = new \App\Services\FiscalService($this->db, $this->company_id);
            $modelCode = ($note['tipo'] === 'NFE') ? '55' : '65';
            
            $cancelamento = $service->cancelarNFe($note['xml_path'], $data['justificativa'], $modelCode);

            if ($cancelamento['success']) {
                $stmt = $this->db->prepare("UPDATE fiscal_notes SET status = 'cancelled' WHERE id = :id");
                $stmt->execute([":id" => $note['id']]);

                // 1. Atualizar status da venda
                $stmt = $this->db->prepare("UPDATE sales SET status = 'cancelada' WHERE id = :sale_id AND company_id = :company_id");
                $stmt->execute([":sale_id" => $data['saleId'], ":company_id" => $this->company_id]);

                // 2. Excluir parcelas em contas a receber (conforme solicitado pelo usuário)
                $stmt = $this->db->prepare("DELETE FROM accounts_receivable WHERE sale_id = :sale_id AND company_id = :company_id");
                $stmt->execute([":sale_id" => $data['saleId'], ":company_id" => $this->company_id]);

                // 3. Estornar Estoque
                $stmt = $this->db->prepare("SELECT product_id, quantity, multiplier FROM sale_items WHERE sale_id = :sale_id AND company_id = :company_id");
                $stmt->execute([":sale_id" => $data['saleId'], ":company_id" => $this->company_id]);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($items as $item) {
                    $totalQty = $item['quantity'] * ($item['multiplier'] ?? 1);
                    $this->db->prepare("UPDATE products SET stock_current = stock_current + :qty WHERE id = :pid AND company_id = :company_id")
                               ->execute([":qty" => $totalQty, ":pid" => $item['product_id'], ":company_id" => $this->company_id]);
                }

                echo json_encode([
                    "message" => "Nota cancelada com sucesso na Sefaz!",
                    "status" => $cancelamento['status'], // 135
                    "motivo" => $cancelamento['motivo']
                ]);
            }

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro no cancelamento: " . $e->getMessage()]);
        }
    }

    public function gerarDanfe($id) {
        $this->authenticate(); // ← NECESSÁRIO para popular $this->company_id
        require_once __DIR__ . '/../src/Services/FiscalService.php';
        try {
            // Busca a nota filtrando também por company_id (via JOIN com sales)
            $stmt = $this->db->prepare(
                "SELECT fn.xml_path, fn.tipo 
                 FROM fiscal_notes fn
                 LEFT JOIN sales s ON fn.sale_id = s.id
                 WHERE fn.id = :id 
                   AND (s.company_id = :company_id OR fn.company_id = :company_id2)"
            );
            $stmt->execute([
                ':id'         => $id,
                ':company_id' => $this->company_id,
                ':company_id2'=> $this->company_id,
            ]);
            $note = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$note) {
                http_response_code(404);
                echo json_encode(["message" => "Nota não encontrada"]);
                return;
            }

            $service = new \App\Services\FiscalService($this->db, $this->company_id);
            // Translate 'tipo' back to model code (NFE=55, NFCE=65)
            $modelCode = ($note['tipo'] === 'NFE') ? '55' : '65';
            $pdf = $service->generateDanfe($note['xml_path'], $modelCode);

            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="danfe.pdf"');
            echo $pdf;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao gerar DANFE: " . $e->getMessage()]);
        }
    }

    public function searchNcm() {
        $query = $_GET['query'] ?? '';
        if (strlen($query) < 3) {
            echo json_encode([]);
            return;
        }

        try {
            // Busca por descrição, limitando a 10 resultados, de forma insensível a caixa
            $stmt = $this->db->prepare("SELECT codigo, descricao FROM ibpt_codes WHERE LOWER(descricao) LIKE LOWER(:query) LIMIT 10");
            $stmt->execute([':query' => "%$query%"]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao buscar NCM: " . $e->getMessage()]);
        }
    }

    public function getNcm($code) {
        try {
            $stmt = $this->db->prepare("SELECT codigo, descricao FROM ibpt_codes WHERE codigo = :code LIMIT 1");
            $stmt->execute([':code' => $code]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($res ?: null);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao buscar NCM: " . $e->getMessage()]);
        }
    }

    public function downloadXml($noteId) {
        $this->authenticate();
        try {
            $stmt = $this->db->prepare("SELECT fn.numero, fn.xml_path FROM fiscal_notes fn JOIN sales s ON fn.sale_id = s.id WHERE fn.id = :id AND s.company_id = :company_id");
            $stmt->execute([':id' => $noteId, ':company_id' => $this->company_id]);
            $nota = $stmt->fetch();

            if (!$nota || empty($nota['xml_path'])) {
                http_response_code(404);
                echo "Arquivo XML não encontrado para esta nota.";
                return;
            }

            $xmlContent = $nota['xml_path'];
            $numero = $nota['numero'] ?? $noteId;

            // Forçar Download do Arquivo XML
            header('Content-Description: File Transfer');
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="NFe_' . $numero . '.xml"');
            header('Content-Length: ' . strlen($xmlContent));
            header('Pragma: public');
            
            echo $xmlContent;
            exit;

        } catch (\Exception $e) {
            http_response_code(500);
            echo "Erro interno ao processar download do XML: " . $e->getMessage();
        }
    }
}
