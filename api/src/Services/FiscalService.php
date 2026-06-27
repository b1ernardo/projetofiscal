<?php

namespace App\Services;

use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Make;
use NFePHP\NFe\Complements;
use NFePHP\DA\NFe\Danfe;
use NFePHP\DA\NFe\Danfce;
use Exception;
use PDO;

class FiscalService {
    private $db;
    private $config;
    private $company_id;
    private $tools;

    public function __construct(PDO $db, $company_id) {
        $this->db = $db;
        $this->company_id = $company_id;
        $this->loadConfig();
    }

    private function loadConfig() {
        $stmt = $this->db->prepare("SELECT * FROM config_fiscal WHERE company_id = :company_id LIMIT 1");
        $stmt->execute([':company_id' => $this->company_id]);
        $this->config = $stmt->fetch();

        if (!$this->config) {
            throw new Exception("Configuração fiscal não encontrada.");
        }

        if (empty($this->config['certificado_pfx']) || empty($this->config['certificado_senha'])) {
            throw new Exception("Certificado digital ou senha não configurados.");
        }
    }

    private function getTools() {
        if ($this->tools) return $this->tools;

        $pfxContents = base64_decode($this->config['certificado_pfx']);
        $password = $this->config['certificado_senha'];

        $configData = [
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => (int)$this->config['ambiente'],
            "razaosocial" => $this->config['razao_social'],
            "cnpj" => $this->config['cnpj'],
            "siglaUF" => strtoupper($this->config['uf'] ?? ''),
            "schemes" => "PL_009_V4",
            "versao" => "4.00",
            "tokenIBPT" => "",
            "CSC" => $this->config['csc_token'],
            "CSCid" => $this->config['csc_id']
        ];

        $configJson = json_encode($configData);

        // Tenta leitura direta; se falhar (certificado legado RC2-40 + OpenSSL 3.x), converte via CLI
        try {
            $certificate = Certificate::readPfx($pfxContents, $password);
        } catch (\Exception $e) {
            $pfxContents = $this->convertLegacyPfx($pfxContents, $password);
            $certificate = Certificate::readPfx($pfxContents, $password);
        }

        $this->tools = new Tools($configJson, $certificate);
        $this->tools->model('55');

        return $this->tools;
    }

    /**
     * Converte PFX no formato legado (RC2-40/3DES) para AES-256 usando openssl CLI.
     * Necessário quando PHP/OpenSSL 3.x rejeita o certificado A1 antigo.
     */
    private function convertLegacyPfx(string $pfxData, string $password): string {
        $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR;
        $id  = uniqid('pfx_', true);
        $fIn   = $dir . $id . '_in.pfx';
        $fPem  = $dir . $id . '.pem';
        $fOut  = $dir . $id . '_out.pfx';
        $fPass = $dir . $id . '.pass';

        try {
            file_put_contents($fIn,   $pfxData);
            file_put_contents($fPass, $password);

            // Localiza o binário openssl (Windows XAMPP ou Linux)
            $openssl = 'openssl';
            if (PHP_OS_FAMILY === 'Windows') {
                foreach ([
                    'C:\\xampp\\apache\\bin\\openssl.exe',
                    'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
                    'C:\\OpenSSL-Win64\\bin\\openssl.exe',
                ] as $candidate) {
                    if (file_exists($candidate)) { $openssl = $candidate; break; }
                }
            }

            $inArg   = escapeshellarg($fIn);
            $pemArg  = escapeshellarg($fPem);
            $outArg  = escapeshellarg($fOut);
            $passArg = escapeshellarg("file:{$fPass}");

            // Extrai PEM: tenta com -legacy primeiro (OpenSSL 3.x), depois sem
            $converted = false;
            foreach ([' -legacy', ''] as $legacyFlag) {
                $cmd = escapeshellcmd($openssl) . " pkcs12{$legacyFlag} -in {$inArg} -out {$pemArg}"
                     . " -passin {$passArg} -passout {$passArg} 2>&1";
                \exec($cmd, $out, $ret);
                if ($ret === 0) { $converted = true; break; }
            }

            if (!$converted) {
                throw new \Exception(
                    "Não foi possível converter o certificado PFX legado.\n"
                    . "Converta o arquivo .pfx manualmente e faça o upload novamente.\n"
                    . "Erro OpenSSL: " . implode(' ', $out)
                );
            }

            // Reempacota como PFX com criptografia moderna (AES-256)
            $cmd2 = escapeshellcmd($openssl) . " pkcs12 -export -in {$pemArg} -out {$outArg}"
                  . " -passin {$passArg} -passout {$passArg} 2>&1";
            \exec($cmd2, $out2, $ret2);

            if ($ret2 !== 0) {
                throw new \Exception("Falha ao reempacotar certificado: " . implode(' ', $out2));
            }

            return file_get_contents($fOut);

        } finally {
            foreach ([$fIn, $fPem, $fOut, $fPass] as $f) {
                if (file_exists($f)) @unlink($f);
            }
        }
    }

    // ─── Reforma Tributária EC 132/2023 ──────────────────────────────────────

    /**
     * Retorna as alíquotas de transição para o ano fiscal informado.
     * Usa os valores do guia técnico como fallback caso a tabela esteja vazia.
     */
    private function getAliquotasTransicao(int $anoFiscal): array {
        $defaults = [
            'CBS'          => 0.9,  'IBS'          => 0.1,
            'PIS'          => 0.65, 'COFINS'       => 3.0,
            'ICMS_REDUTOR' => 0.9,  'ISS_REDUTOR'  => 0.9,
        ];

        try {
            $stmt = $this->db->prepare(
                "SELECT tributo, aliquota FROM reforma_aliquotas_transicao
                 WHERE ano_fiscal = ? ORDER BY tributo"
            );
            $stmt->execute([$anoFiscal]);
            $rows = $stmt->fetchAll(\PDO::FETCH_KEY_PAIR);
            if ($rows) {
                return array_merge($defaults, array_map('floatval', $rows));
            }
        } catch (\Exception $e) {
            // Tabela ainda não criada — usar defaults
        }

        return $defaults;
    }

    /**
     * Retorna as alíquotas IBS (estadual + municipal) para o município de destino.
     * Enquanto o Comitê Gestor não publicar as alíquotas oficiais, retorna zeros
     * e o cálculo usa a alíquota global de transição como fallback.
     */
    private function getAliquotasIBS(string $codMunDest): array {
        if (empty($codMunDest)) return ['estadual' => 0.0, 'municipal' => 0.0];

        try {
            $stmt = $this->db->prepare(
                "SELECT aliquota_estadual, aliquota_municipal
                 FROM reforma_aliquotas_ibs
                 WHERE codigo_ibge = ?
                   AND vigencia_inicio <= CURDATE()
                   AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())
                 ORDER BY versao DESC LIMIT 1"
            );
            $stmt->execute([$codMunDest]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                return [
                    'estadual'  => (float)$row['aliquota_estadual'],
                    'municipal' => (float)$row['aliquota_municipal'],
                ];
            }
        } catch (\Exception $e) {
            // Tabela ainda não criada
        }

        return ['estadual' => 0.0, 'municipal' => 0.0];
    }

    /**
     * Calcula CBS, IBS e IS para um item da nota.
     *
     * Regimes CBS/IBS (cbs_regime no produto):
     *   padrao      → alíquota cheia
     *   reduzido_60 → 40% da alíquota (redução de 60%)
     *   zero        → alíquota zero
     *   isento      → isento
     *
     * Quando não há alíquotas IBS municipais cadastradas, distribui a alíquota
     * global de transição (65% estado / 35% município) como estimativa.
     */
    private function calcularReforma(
        float $vItem,
        string $cbsRegime,
        bool $isIncide,
        float $isAliquota,
        array $aliqTransicao,
        array $aliqIBS
    ): array {
        $fator = match($cbsRegime) {
            'reduzido_60' => 0.40,
            'zero', 'isento' => 0.00,
            default => 1.00,
        };

        $pCBS = (float)($aliqTransicao['CBS'] ?? 0.9) * $fator;

        $pEstadual  = (float)$aliqIBS['estadual'];
        $pMunicipal = (float)$aliqIBS['municipal'];

        if ($pEstadual == 0 && $pMunicipal == 0) {
            // Fallback: divide alíquota global IBS (65% estado / 35% município)
            $ibsGlobal  = (float)($aliqTransicao['IBS'] ?? 0.1) * $fator;
            $pEstadual  = round($ibsGlobal * 0.65, 4);
            $pMunicipal = round($ibsGlobal * 0.35, 4);
        } else {
            $pEstadual  *= $fator;
            $pMunicipal *= $fator;
        }

        $vCBS = round($vItem * $pCBS / 100, 2);
        $vIBS = round($vItem * ($pEstadual + $pMunicipal) / 100, 2);
        $vIS  = $isIncide ? round($vItem * $isAliquota / 100, 2) : 0.00;

        return [
            'pCBS'      => round($pCBS, 4),
            'pIBS_Est'  => round($pEstadual, 4),
            'pIBS_Mun'  => round($pMunicipal, 4),
            'vCBS'      => $vCBS,
            'vIBS'      => $vIBS,
            'vIS'       => $vIS,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function getIBPTTax($ncm, $ex = 0, $orig = 0) {
        if (!$ncm) return null;
        $ncm = preg_replace('/[^0-9]/', '', $ncm);
        
        $stmt = $this->db->prepare("SELECT * FROM ibpt_codes WHERE codigo = ? AND ex = ? LIMIT 1");
        $stmt->execute([$ncm, $ex]);
        $ibpt = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if (!$ibpt) return null;
        
        // Se a origem for importada (1, 2, 3, 6, 7), usar importadosfederal, senão usar nacionalfederal
        $isImported = in_array($orig, [1, 2, 3, 6, 7]);
        $federal = $isImported ? (float)$ibpt['importadosfederal'] : (float)$ibpt['nacionalfederal'];
        $estadual = (float)$ibpt['estadual'];
        $municipal = (float)$ibpt['municipal'];
        
        return $federal + $estadual + $municipal;
    }

    public function generateNFe($sale, $items, $model = '55', $customerData = null, $ideData = null) {
        $tools = $this->getTools();
        $tools->model((int)$model);

        $nfe = new Make();

        // Informações da NF-e (infNFe)
        $std = new \stdClass();
        $std->versao = '4.00';
        $nfe->taginfNFe($std);

        // Identificação (ide)
        $ide = new \stdClass();
        $ide->cUF = $this->getCUF($this->config['uf']);
        $ide->cNF = rand(10000000, 99999999);
        $ide->natOp = !empty($ideData['natOp']) ? $ideData['natOp'] : 'VENDA DE MERCADORIA';
        $ide->mod = $model;
        $ide->serie = !empty($ideData['serie']) ? $ideData['serie'] : (($model == '55') ? $this->config['serie_nfe'] : $this->config['serie_nfce']);
        $ide->nNF = !empty($ideData['numero']) ? (int)$ideData['numero'] : (($model == '55') ? $this->config['ultimo_numero_nfe'] + 1 : $this->config['ultimo_numero_nfce'] + 1);

        // Data/hora de emissão: usa o campo enviado pelo frontend, ou a hora atual
        if (!empty($ideData['dhEmit'])) {
            // Converte datetime-local (2026-05-08T22:15) para formato SEFAZ com timezone
            $dtEmit = new \DateTime($ideData['dhEmit'], new \DateTimeZone('America/Sao_Paulo'));
            $ide->dhEmi = $dtEmit->format('Y-m-d\TH:i:sP');
        } else {
            $ide->dhEmi = date('Y-m-d\TH:i:sP');
        }

        // Data/hora de saída/entrada: usa dhSaiEnt se enviado, senão copia dhEmi
        if (!empty($ideData['dhSaiEnt'])) {
            $dtSai = new \DateTime($ideData['dhSaiEnt'], new \DateTimeZone('America/Sao_Paulo'));
            $ide->dhSaiEnt = $dtSai->format('Y-m-d\TH:i:sP');
        } else {
            $ide->dhSaiEnt = $ide->dhEmi; // padrão: igual à emissão
        }

        $ide->tpNF = !empty($ideData['tpNF']) ? (int)$ideData['tpNF'] : 1;
        $ide->idDest = !empty($ideData['idDest']) ? (int)$ideData['idDest'] : 1;
        
        // Verifica se a UF do destinatário difere da UF do emissor
        if (empty($ideData['idDest']) && $customerData && !empty($customerData['uf']) && strtoupper($customerData['uf']) !== strtoupper($this->config['uf'])) {
            $ide->idDest = 2;
        }

        // cMunFG deve ter 7 dígitos (código IBGE)
        $codMun = preg_replace('/[^0-9]/', '', $this->config['cod_municipio'] ?? '');
        $ide->cMunFG = str_pad($codMun, 7, '0', STR_PAD_LEFT);
        $ide->tpImp = ($model == '55') ? 1 : 4; // 1-Retrato (NFe), 4-DANFe NFCe
        $ide->tpEmis = 1; // 1-Normal
        $ide->cDV = 0;
        $ide->tpAmb = (int)$this->config['ambiente'];
        $ide->finNFe = isset($ideData['finNFe']) ? (int)$ideData['finNFe'] : 1; // 1-Normal
        $ide->indFinal = 1; // 1-Consumidor Final
        $ide->indPres = isset($ideData['indPres']) ? (int)$ideData['indPres'] : 1; // 1-Presencial
        $ide->procEmi = 0;
        $ide->verProc = '3.10';
        $nfe->tagide($ide);

        // Chave Referenciada
        if (!empty($ideData['refNFe'])) {
            $ref = new \stdClass();
            $ref->refNFe = preg_replace('/[^0-9]/', '', $ideData['refNFe']);
            $nfe->tagrefNFe($ref);
        }

        // Emitente (emit)
        $emit = new \stdClass();
        $emit->CNPJ = $this->config['cnpj'];
        $emit->xNome = $this->config['razao_social'];
        $emit->xFant = $this->config['nome_fantasia'];
        $emit->IE = $this->config['ie'];
        $emit->CRT = 1; // 1-Simples Nacional
        $nfe->tagemit($emit);

        // Helper: garante cMun com 7 dígitos (padrão IBGE)
        $normalizarCMun = function($cod) {
            $cod = preg_replace('/[^0-9]/', '', $cod ?? '');
            return str_pad($cod, 7, '0', STR_PAD_LEFT);
        };

        // Endereço do Emitente (enderEmit)
        $enderEmit = new \stdClass();
        $enderEmit->xLgr = $this->config['logradouro'];
        $enderEmit->nro = $this->config['numero'];
        $enderEmit->xBairro = $this->config['bairro'];
        $enderEmit->cMun = $normalizarCMun($this->config['cod_municipio']);
        $enderEmit->xMun = $this->config['municipio'];
        $enderEmit->UF = strtoupper($this->config['uf'] ?? '');
        $enderEmit->CEP = $this->config['cep'];
        $enderEmit->cPais = '1058';
        $enderEmit->xPais = 'BRASIL';
        $enderEmit->fone = preg_replace('/[^0-9]/', '', $this->config['fone'] ?? '');
        $nfe->tagenderEmit($enderEmit);

        // Destinatário (dest)
        // Aceitar doc tanto do $sale quanto do $customerData (NF-e avulsa)
        $destDoc = !empty($sale['customer_doc']) ? $sale['customer_doc'] : ($customerData['documento'] ?? '');
        $destNome = !empty($sale['customer_name']) ? $sale['customer_name'] : ($customerData['nome'] ?? 'Consumidor Final');
        
        if (!empty($destDoc)) {
            $doc = preg_replace('/[^0-9]/', '', $destDoc);
            if (!empty($doc)) {
                $dest = new \stdClass();
                if (strlen($doc) > 11) {
                    $dest->CNPJ = $doc;
                } else {
                    $dest->CPF = $doc;
                }
                
                $dest->xNome = $destNome ?: 'Consumidor Final';
                
                // Tratar IE
                if ($customerData && !empty($customerData['ie']) && strtoupper($customerData['ie']) !== 'ISENTO') {
                    $dest->indIEDest = 1; // 1-Contribuinte ICMS
                    $dest->IE = preg_replace('/[^0-9]/', '', $customerData['ie']);
                } else {
                    $dest->indIEDest = 9; // 9-Não Contribuinte
                }
                
                $destEmail = !empty($sale['customer_email']) ? $sale['customer_email'] : ($customerData['email'] ?? '');
                if (!empty($destEmail)) {
                    $dest->email = $destEmail;
                }
                $nfe->tagdest($dest);

                // Endereço do Destinatário: só inclui se tiver código IBGE válido (7 dígitos, não-zero)
                $codMunDest = preg_replace('/[^0-9]/', '', $customerData['codigo_municipio'] ?? '');
                $codMunDestPadded = str_pad($codMunDest, 7, '0', STR_PAD_LEFT);
                $codMunValido = strlen($codMunDest) > 0 && (int)$codMunDestPadded > 0 && $codMunDestPadded !== '9999999';
                
                if ($model == '55' && (empty($customerData['logradouro']) || !$codMunValido)) {
                    throw new \Exception("Endereço do destinatário incompleto. Para NF-e (Mod. 55), o Logradouro e o Cód IBGE do Município são obrigatórios. Por favor, preencha o CEP e clique em 'Buscar CEP'.");
                }

                if ($customerData && !empty($customerData['logradouro']) && $codMunValido) {
                    $enderDest = new \stdClass();
                    $enderDest->xLgr = $customerData['logradouro'];
                    $enderDest->nro = $customerData['numero'] ?: 'SN';
                    $enderDest->xBairro = $customerData['bairro'] ?: 'Centro';
                    $enderDest->cMun = $codMunDestPadded;
                    $enderDest->xMun = $customerData['municipio'];
                    $enderDest->UF = strtoupper($customerData['uf'] ?? '');
                    $enderDest->CEP = preg_replace('/[^0-9]/', '', $customerData['cep']);
                    $enderDest->cPais = '1058';
                    $enderDest->xPais = 'BRASIL';
                    if (!empty($customerData['telefone'])) {
                        $enderDest->fone = preg_replace('/[^0-9]/', '', $customerData['telefone']);
                    }
                    $nfe->tagenderDest($enderDest);
                }
            }
        }

        // Variável para somar o valor total de tributos da nota
        $vTotTribGeral = 0.00;
        $percentualTributos = isset($this->config['percentual_tributos']) ? (float)$this->config['percentual_tributos'] : 0.00;

        // ── Reforma Tributária EC 132/2023 ──────────────────────────────────
        $reformaAtiva   = !empty($this->config['regime_reforma']);
        $aliqTransicao  = [];
        $aliqIBS        = ['estadual' => 0.0, 'municipal' => 0.0];
        $totCBS = 0.0; $totIBS = 0.0; $totIS = 0.0;

        if ($reformaAtiva) {
            $anoFiscal     = (int)date('Y', strtotime($ide->dhEmi));
            $aliqTransicao = $this->getAliquotasTransicao($anoFiscal);
            $codMunDest    = preg_replace('/[^0-9]/', '', $customerData['codigo_municipio'] ?? '');
            if ($codMunDest) {
                $aliqIBS = $this->getAliquotasIBS($codMunDest);
            }
        }
        // ────────────────────────────────────────────────────────────────────

        // Itens (prod)
        $n = 1;
        foreach ($items as $item) {
            $prod = new \stdClass();
            $prod->item = $n;
            $prod->cProd = !empty($item['code']) ? $item['code'] : substr(str_replace('-', '', $item['product_id']), 0, 14);
            $prod->cEAN = 'SEM GTIN';
            $prod->xProd = !empty($item['name']) ? substr($item['name'], 0, 120) : 'PRODUTO SEM NOME';
            $prod->NCM = !empty($item['ncm']) ? preg_replace('/[^0-9]/', '', $item['ncm']) : '00000000';
            $prod->CEST = !empty($item['cest']) ? preg_replace('/[^0-9]/', '', $item['cest']) : null;
            $prod->CFOP = $item['cfop_padrao'];
            $prod->uCom = $item['unit'];
            $prod->qCom = number_format($item['quantity'], 4, '.', '');
            $prod->vUnCom = number_format($item['unit_price'], 10, '.', '');
            $prod->vProd = number_format($item['quantity'] * $item['unit_price'], 2, '.', '');
            $prod->cEANTrib = 'SEM GTIN';
            $prod->uTrib = $item['unit'];
            $prod->qTrib = number_format($item['quantity'], 4, '.', '');
            $prod->vUnTrib = number_format($item['unit_price'], 10, '.', '');
            $prod->indTot = 1;

            // Cálculo do imposto aproximado (Lei da Transparência)
            // Acumulamos em centavos (inteiro) para evitar erros de ponto flutuante
            $vItem = round($item['quantity'] * $item['unit_price'], 2);
            $taxPerc = $this->getIBPTTax($item['ncm'] ?? null, 0, $item['origem'] ?? 0);
            if ($taxPerc === null) {
                $taxPerc = $percentualTributos;
            }
            // Calcular em centavos
            $vTotTribItemCentavos = (int) round(($vItem * $taxPerc), 0); // centavos * 100
            $vTotTribItem = round(($vItem * $taxPerc) / 100, 2);
            $vTotTribGeralCentavos = ($vTotTribGeralCentavos ?? 0) + (int)round($vTotTribItem * 100);

            // Sempre definir vTotTrib no item (0.00 se não houver) - necessário para consistência
            // Mas só inclui se o total geral > 0 para não enviar campo desnecessário
            // Guardamos para usar após o loop
            $itemTributos[] = $vTotTribItem;

            $nfe->tagprod($prod);

            // Impostos por item
            $imposto = new \stdClass();
            $imposto->item = $n;
            $nfe->tagimposto($imposto);

            $pICMS  = isset($item['pICMS'])  ? (float)$item['pICMS']  : 0;
            $pPIS   = isset($item['pPIS'])   ? (float)$item['pPIS']   : 0;
            $pCOFINS = isset($item['pCOFINS']) ? (float)$item['pCOFINS'] : 0;
            $vItem  = round($item['quantity'] * $item['unit_price'], 2);

            // ICMS
            $csosn = $item['csosn'] ?? null;
            $cstIcms = $item['cst'] ?? '00';
            $validCsosn = ['101','102','103','201','202','203','300','400','500','900'];
            if ($csosn && in_array($csosn, $validCsosn)) {
                $icms = new \stdClass();
                $icms->item = $n;
                $icms->orig = $item['origem'] ?? 0;
                $icms->CSOSN = $csosn;
                if ($pICMS > 0 && in_array($csosn, ['101','201'])) {
                    $icms->pCredSN = number_format($pICMS, 2, '.', '');
                    $icms->vCredICMSSN = number_format($vItem * $pICMS / 100, 2, '.', '');
                }
                $nfe->tagICMSSN($icms);
            } else {
                // Lucro Real / Presumido
                $vBC_item = $pICMS > 0 ? $vItem : 0;
                $icms = new \stdClass();
                $icms->item   = $n;
                $icms->orig   = $item['origem'] ?? 0;
                $icms->CST    = str_pad($cstIcms, 2, '0', STR_PAD_LEFT);
                $icms->modBC  = 3;
                $icms->vBC    = number_format($vBC_item, 2, '.', '');
                $icms->pICMS  = number_format($pICMS, 2, '.', '');
                $icms->vICMS  = number_format($vBC_item * $pICMS / 100, 2, '.', '');
                $nfe->tagICMS($icms);
            }

            // PIS
            $pis = new \stdClass();
            $pis->item = $n;
            if ($pPIS > 0) {
                $pis->CST  = '01';
                $pis->vBC  = number_format($vItem, 2, '.', '');
                $pis->pPIS = number_format($pPIS, 2, '.', '');
                $pis->vPIS = number_format($vItem * $pPIS / 100, 2, '.', '');
            } else {
                $pis->CST = '07';
            }
            $nfe->tagPIS($pis);

            // COFINS
            $cofins = new \stdClass();
            $cofins->item = $n;
            if ($pCOFINS > 0) {
                $cofins->CST    = '01';
                $cofins->vBC    = number_format($vItem, 2, '.', '');
                $cofins->pCOFINS = number_format($pCOFINS, 2, '.', '');
                $cofins->vCOFINS = number_format($vItem * $pCOFINS / 100, 2, '.', '');
            } else {
                $cofins->CST = '07';
            }
            $nfe->tagCOFINS($cofins);

            // ── Reforma: calcula CBS/IBS/IS por item ────────────────────────
            if ($reformaAtiva) {
                $reforma = $this->calcularReforma(
                    $vItem,
                    $item['cbs_regime']   ?? 'padrao',
                    !empty($item['is_incide']),
                    (float)($item['is_aliquota'] ?? 0),
                    $aliqTransicao,
                    $aliqIBS
                );
                $totCBS += $reforma['vCBS'];
                $totIBS += $reforma['vIBS'];
                $totIS  += $reforma['vIS'];
            }
            // ────────────────────────────────────────────────────────────────

            $n++;
        }

        // Acumular totais de impostos dos itens
        $totICMS = 0; $totBC = 0; $totPIS = 0; $totCOFINS = 0;
        foreach ($items as $item) {
            $vIt = round(($item['quantity'] ?? 1) * ($item['unit_price'] ?? 0), 2);
            $pI  = (float)($item['pICMS']   ?? 0);
            $pP  = (float)($item['pPIS']    ?? 0);
            $pC  = (float)($item['pCOFINS'] ?? 0);
            if ($pI > 0) { $totBC += $vIt; $totICMS += $vIt * $pI / 100; }
            $totPIS    += $vIt * $pP / 100;
            $totCOFINS += $vIt * $pC / 100;
        }

        // Dados de transporte do formulário
        $transpData = $data['transp'] ?? [];
        $vFrete = round((float)($transpData['vFrete'] ?? 0), 2);
        $vSeg   = round((float)($transpData['vSeg']   ?? 0), 2);
        $vOutro = round((float)($transpData['vOutro'] ?? 0), 2);

        // Totais (ICMSTot)
        $tot = new \stdClass();
        $tot->vBC    = number_format($totBC, 2, '.', '');
        $tot->vICMS  = number_format($totICMS, 2, '.', '');
        $tot->vICMSDeson = 0.00;
        $tot->vFCP   = 0.00;
        $tot->vBCST  = 0.00;
        $tot->vST    = 0.00;
        $tot->vFCPST = 0.00;
        $tot->vFCPSTRet = 0.00;
        $tot->vProd  = number_format($sale['total_amount'] + $sale['discount'], 2, '.', '');
        $tot->vFrete = number_format($vFrete, 2, '.', '');
        $tot->vSeg   = number_format($vSeg, 2, '.', '');
        $tot->vDesc  = number_format($sale['discount'], 2, '.', '');
        $tot->vII    = 0.00;
        $tot->vIPI   = 0.00;
        $tot->vIPIDevol = 0.00;
        $tot->vPIS   = number_format($totPIS, 2, '.', '');
        $tot->vCOFINS = number_format($totCOFINS, 2, '.', '');
        $tot->vOutro = number_format($vOutro, 2, '.', '');
        $tot->vNF    = number_format($sale['total_amount'] + $vFrete + $vSeg + $vOutro, 2, '.', '');

        $nfe->tagICMSTot($tot);

        // Transporte (transp)
        $transp = new \stdClass();
        $transp->modFrete = isset($transpData['modFrete']) ? (int)$transpData['modFrete'] : 9;
        $nfe->tagtransp($transp);

        // Transportadora
        if (!empty($transpData['razaoSocial']) && $transp->modFrete != 9) {
            $trnsp = new \stdClass();
            $trnsp->xNome  = $transpData['razaoSocial'];
            $trnsp->CNPJ   = preg_replace('/\D/', '', $transpData['cnpj'] ?? '');
            $trnsp->IE     = $transpData['ie'] ?? '';
            $trnsp->xEnder = $transpData['logradouro'] ?? '';
            $trnsp->xMun   = $transpData['municipio'] ?? '';
            $trnsp->UF     = strtoupper($transpData['uf'] ?? '');
            $nfe->tagtransportador($trnsp);
        }

        // Veículo
        if (!empty($transpData['placa']) && $transp->modFrete != 9) {
            $veic = new \stdClass();
            $veic->placa = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $transpData['placa'] ?? ''));
            $veic->UF    = strtoupper($transpData['ufVeiculo'] ?? '');
            $nfe->tagveicTransp($veic);
        }

        // Volumes
        $qVol  = (int)($transpData['qVol']  ?? 0);
        $pesoB = (float)($transpData['pesoB'] ?? 0);
        $pesoL = (float)($transpData['pesoL'] ?? 0);
        $esp   = $transpData['esp'] ?? '';
        if ($qVol > 0 || $pesoB > 0 || !empty($esp)) {
            $vol = new \stdClass();
            $vol->item  = 1;
            $vol->qVol  = $qVol > 0 ? $qVol : null;
            $vol->esp   = !empty($esp) ? strtoupper($esp) : null;
            $vol->marca = !empty($transpData['marca']) ? $transpData['marca'] : null;
            $vol->nVol  = !empty($transpData['nVol'])  ? $transpData['nVol']  : null;
            $vol->pesoL = $pesoL > 0 ? number_format($pesoL, 3, '.', '') : null;
            $vol->pesoB = $pesoB > 0 ? number_format($pesoB, 3, '.', '') : null;
            $nfe->tagvol($vol);
        }

        // Pagamento (pag)
        $pag = new \stdClass();
        $pag->vTroco = 0.00;
        $nfe->tagpag($pag);

        $detpag = new \stdClass();
        $detpag->indPag = 0; // 0-À Vista
        
        // Mapear tPag conforme payment_method da venda
        $metodoRecebido = trim(strtolower($sale['payment_method'] ?? 'dinheiro'));
        
        $tPag = '01'; // Default Dinheiro
        
        // Prioridade 1: PIX
        if (strpos($metodoRecebido, 'pix') !== false || strpos($metodoRecebido, 'instant') !== false) {
            $tPag = '17';
        } 
        // Prioridade 2: Cartões
        elseif (strpos($metodoRecebido, 'debito') !== false || strpos($metodoRecebido, 'débito') !== false || strpos($metodoRecebido, 'cartão de d') !== false) {
            $tPag = '04';
        } elseif (strpos($metodoRecebido, 'credito') !== false || strpos($metodoRecebido, 'crédito') !== false || strpos($metodoRecebido, 'cartão de c') !== false || strpos($metodoRecebido, 'cartao') !== false) {
            $tPag = '03';
        } 
        // Outros
        elseif (strpos($metodoRecebido, 'boleto') !== false) {
            $tPag = '15';
        } elseif (strpos($metodoRecebido, 'conta') !== false || strpos($metodoRecebido, 'fiado') !== false || strpos($metodoRecebido, 'outros') !== false) {
            $tPag = '99';
        }

        $detpag->tPag = $tPag;
        $detpag->vPag = number_format($sale['total_amount'], 2, '.', '');
        
        // Se for cartão ou PIX através de terminal não integrado, informar tpIntegra = 2
        // Isso resolve a Rejeição 391 da SEFAZ
        if ($tPag === '03' || $tPag === '04' || $tPag === '17') {
            $detpag->tpIntegra = 2; // 2 - Pagamento não integrado com o sistema (ATM/POS)
        }

        $nfe->tagdetpag($detpag);

        // Informações Adicionais (infAdic)
        $infAdic = new \stdClass();
        $mensagensAdicionais = [];

        // ── Reforma: inclui totais CBS/IBS/IS no infAdic ────────────────────
        if ($reformaAtiva && ($totCBS > 0 || $totIBS > 0 || $totIS > 0)) {
            $anoLabel = isset($anoFiscal) ? $anoFiscal : date('Y');
            $mensagensAdicionais[] = sprintf(
                'REFORMA TRIB. EC132/2023 (%d): CBS R$ %s | IBS R$ %s | IS R$ %s | Total novos tributos R$ %s',
                $anoLabel,
                number_format($totCBS, 2, ',', '.'),
                number_format($totIBS, 2, ',', '.'),
                number_format($totIS,  2, ',', '.'),
                number_format($totCBS + $totIBS + $totIS, 2, ',', '.')
            );
        }
        // ────────────────────────────────────────────────────────────────────

        // Mensagem Simples Nacional
        if ($this->config['ambiente'] == 1 || $this->config['ambiente'] == 2) { // Regra aplica-se indep de ambiente
             $mensagensAdicionais[] = "DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI.";
        }

        // Mensagem Lei da Transparência
        $vTotTribGeral = ($vTotTribGeralCentavos ?? 0) / 100;
        if ($vTotTribGeral > 0) {
            $valorTribFormatado = number_format($vTotTribGeral, 2, ',', '.');
            // Calcula alíquota média real da nota
            $totalVenda = (float)$sale['total_amount'];
            $percMedioReal = ($totalVenda > 0) ? ($vTotTribGeral / $totalVenda) * 100 : 0;
            $percTribFormatado = number_format($percMedioReal, 2, ',', '.');
            $mensagensAdicionais[] = "Val Aprox Tributos R$ {$valorTribFormatado} ({$percTribFormatado}%) Fonte: IBPT";
        }

        if (count($mensagensAdicionais) > 0) {
            $infCplTexto = implode(" ", $mensagensAdicionais);
            $infAdic->infCpl = $infCplTexto . " Venda realizada no sistema.";
            $nfe->taginfAdic($infAdic);
        } else {
            $infAdic->infCpl = 'Venda realizada no sistema.';
            $nfe->taginfAdic($infAdic);
        }

        $xml = $nfe->getXML();
        
        // Assinar
        $xmlAssinado = $tools->signNFe($xml);

        return [
            'xml'  => $xmlAssinado,
            'nNF'  => $ide->nNF,
            'serie'=> $ide->serie,
            'dhEmi'=> $ide->dhEmi,
            'vCBS' => round($totCBS, 2),
            'vIBS' => round($totIBS, 2),
            'vIS'  => round($totIS,  2),
        ];
    }

    public function transmit($xml, $model = '55') {
        $tools = $this->getTools();
        $tools->model($model);
        
        $idLote = str_pad(1, 15, '0', STR_PAD_LEFT);
        
        // Envio síncrono para obter o recibo/protocolo na mesma requisição
        $resp = $tools->sefazEnviaLote([$xml], (int)$idLote, 1);
        
        $st = new \NFePHP\NFe\Common\Standardize();
        $std = $st->toStd($resp);

        // Se processou o lote com protocolo atrelado
        if (isset($std->protNFe)) {
            $protStat = (int) $std->protNFe->infProt->cStat;
            if ($protStat === 100) {
                // 100 - Autorizado o uso da NFe
                $xmlFinal = Complements::toAuthorize($xml, $resp);
                return [
                    'success' => true,
                    'xml' => $xmlFinal,
                    'protocol' => (string) $std->protNFe->infProt->nProt,
                    'status' => $protStat,
                    'motivo' => (string) $std->protNFe->infProt->xMotivo
                ];
            } else {
                throw new Exception("Rejeição SEFAZ: [{$protStat}] " . $std->protNFe->infProt->xMotivo);
            }
        } 
        
        // Se falhou no processamento do lote como um todo
        if (isset($std->cStat) && $std->cStat != 104) {
            throw new Exception("Erro de Lote SEFAZ: [{$std->cStat}] {$std->xMotivo}");
        }

        throw new Exception("Retorno inesperado da SEFAZ na transmissão.");
    }

    public function cancelarNFe($xml, $justificativa, $model = '55') {
        $tools = $this->getTools();
        $tools->model($model);

        // Extrai a chave de acesso e protocolo
        $xmlObj = simplexml_load_string($xml);
        if (!$xmlObj) {
            throw new Exception("Falha ao ler o conteúdo do XML da nota. O arquivo pode estar corrompido ou vazio.");
        }
        $xmlObj->registerXPathNamespace('ns', 'http://www.portalfiscal.inf.br/nfe');
        
        $chNodes = $xmlObj->xpath('//ns:protNFe/ns:infProt/ns:chNFe');
        $protNodes = $xmlObj->xpath('//ns:protNFe/ns:infProt/ns:nProt');
        
        $chNFe = $chNodes ? (string)$chNodes[0] : null;
        $nProt = $protNodes ? (string)$protNodes[0] : null;

        if (empty($chNFe) || empty($nProt)) {
            throw new Exception("XML inválido: Chave de acesso ou Protocolo não encontrados. A nota precisa estar previamente autorizada para ser cancelada.");
        }

        // Tenta realizar o cancelamento
        $resp = $tools->sefazCancela($chNFe, $justificativa, $nProt);

        $st = new \NFePHP\NFe\Common\Standardize();
        $std = $st->toStd($resp);

        if (isset($std->retEvento->infEvento)) {
            $cStat = (int)$std->retEvento->infEvento->cStat;
            // 135: Evento registrado e vinculado, 155: Cancelamento fora do prazo regulamentar (mas homologado)
            if ($cStat === 135 || $cStat === 155) {
                return [
                    'success' => true,
                    'xml' => $resp,
                    'status' => $cStat,
                    'motivo' => (string)$std->retEvento->infEvento->xMotivo
                ];
            } else {
                throw new Exception("Rejeição SEFAZ ao Cancelar: [{$cStat}] " . $std->retEvento->infEvento->xMotivo);
            }
        }
        
        if (isset($std->cStat) && $std->cStat != 128) { // 128 = Lote Evento Processado
            throw new Exception("Erro de Lote SEFAZ (Cancelamento): [{$std->cStat}] {$std->xMotivo}");
        }

        throw new Exception("Retorno inesperado da SEFAZ na tentativa de cancelamento.");
    }

    public function generateDanfe($xml, $model = '55') {
        $logo = null;
        if (!empty($this->config['logo_base64'])) {
            $logoData = $this->config['logo_base64'];
            if (preg_match('/^data:image\/(\w+);base64,/', $logoData)) {
                $base64 = substr($logoData, strpos($logoData, ',') + 1);
                $logo = 'data://text/plain;base64,' . $base64;
            }
        }

        if ($model == '55') {
            $danfe = new Danfe($xml);
            if ($logo) {
                $danfe->logoParameters($logo, 'C', false);
            }
            return $danfe->render();
        } else {
            // Para NFC-e, geralmente usa-se bobina (margens menores)
            $danfe = new Danfce($xml);
            if ($logo) {
                $danfe->logoParameters($logo, 'C', false);
            }
            return $danfe->render();
        }
    }

    private function getCUF($uf) {
        $ufs = [
            'RO' => 11, 'AC' => 12, 'AM' => 13, 'RR' => 14, 'PA' => 15, 'AP' => 16, 'TO' => 17,
            'MA' => 21, 'PI' => 22, 'CE' => 23, 'RN' => 24, 'PB' => 25, 'PE' => 26, 'AL' => 27,
            'SE' => 28, 'BA' => 29, 'MG' => 31, 'ES' => 32, 'RJ' => 33, 'SP' => 35, 'PR' => 41,
            'SC' => 42, 'RS' => 43, 'MS' => 50, 'MT' => 51, 'GO' => 52, 'DF' => 53
        ];
        return $ufs[strtoupper($uf)] ?? 35;
    }
}
