<?php
/**
 * Migração 001 — Reforma Tributária EC 132/2023
 * Cria as tabelas e campos necessários para a transição 2026–2033.
 * Execute uma única vez via browser: /api/migrations/001_reforma_tributaria.php
 */

require_once __DIR__ . '/../db.php';

header('Content-Type: text/plain; charset=utf-8');

$database = new Database();
$db = $database->getConnection();

$log = [];

function migrar(PDO $db, string $descricao, string $sql): string {
    try {
        $db->exec($sql);
        return "[OK]    $descricao";
    } catch (PDOException $e) {
        // 1050 = table already exists, 1060 = duplicate column, 1061 = duplicate key
        if (in_array($e->errorInfo[1], [1050, 1060, 1061])) {
            return "[SKIP]  $descricao (já existe)";
        }
        return "[ERRO]  $descricao — " . $e->getMessage();
    }
}

// ─── 1. Tabela de alíquotas de transição por ano fiscal ────────────────────
$log[] = migrar($db, "Criar tabela reforma_aliquotas_transicao", "
    CREATE TABLE IF NOT EXISTS `reforma_aliquotas_transicao` (
        `id`              INT AUTO_INCREMENT PRIMARY KEY,
        `ano_fiscal`      SMALLINT NOT NULL,
        `tributo`         ENUM('CBS','IBS','PIS','COFINS','ICMS_REDUTOR','ISS_REDUTOR') NOT NULL,
        `aliquota`        DECIMAL(8,4) NOT NULL
            COMMENT 'CBS/IBS: alíquota %. ICMS_REDUTOR/ISS_REDUTOR: fator sobre alíquota original (0.90 = 90% ainda vigente)',
        `vigencia_inicio` DATE NOT NULL,
        `vigencia_fim`    DATE NULL,
        `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `uk_ano_tributo` (`ano_fiscal`, `tributo`)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    COMMENT='Calendário de alíquotas da reforma tributária 2026-2033 (EC 132/2023)'
");

// ─── 2. Inserir calendário de alíquotas (valores ilustrativos do guia técnico)
$aliquotas = [
    // ano, tributo, aliquota, inicio, fim
    [2026, 'CBS',          0.9000, '2026-01-01', '2026-12-31'],
    [2026, 'IBS',          0.1000, '2026-01-01', '2026-12-31'],
    [2026, 'PIS',          0.6500, '2026-01-01', '2026-12-31'],
    [2026, 'COFINS',       3.0000, '2026-01-01', '2026-12-31'],
    [2026, 'ICMS_REDUTOR', 0.9000, '2026-01-01', '2026-12-31'],
    [2026, 'ISS_REDUTOR',  0.9000, '2026-01-01', '2026-12-31'],

    [2027, 'CBS',          1.8000, '2027-01-01', '2027-12-31'],
    [2027, 'IBS',          0.2000, '2027-01-01', '2027-12-31'],
    [2027, 'PIS',          0.5200, '2027-01-01', '2027-12-31'],
    [2027, 'COFINS',       2.4000, '2027-01-01', '2027-12-31'],
    [2027, 'ICMS_REDUTOR', 0.8000, '2027-01-01', '2027-12-31'],
    [2027, 'ISS_REDUTOR',  0.8000, '2027-01-01', '2027-12-31'],

    [2028, 'CBS',          2.7000, '2028-01-01', '2028-12-31'],
    [2028, 'IBS',          0.3000, '2028-01-01', '2028-12-31'],
    [2028, 'PIS',          0.3900, '2028-01-01', '2028-12-31'],
    [2028, 'COFINS',       1.8000, '2028-01-01', '2028-12-31'],
    [2028, 'ICMS_REDUTOR', 0.7000, '2028-01-01', '2028-12-31'],
    [2028, 'ISS_REDUTOR',  0.7000, '2028-01-01', '2028-12-31'],

    [2029, 'CBS',          3.6000, '2029-01-01', '2029-12-31'],
    [2029, 'IBS',          0.4000, '2029-01-01', '2029-12-31'],
    [2029, 'PIS',          0.2600, '2029-01-01', '2029-12-31'],
    [2029, 'COFINS',       1.2000, '2029-01-01', '2029-12-31'],
    [2029, 'ICMS_REDUTOR', 0.6000, '2029-01-01', '2029-12-31'],
    [2029, 'ISS_REDUTOR',  0.6000, '2029-01-01', '2029-12-31'],

    [2030, 'CBS',          4.5000, '2030-01-01', '2030-12-31'],
    [2030, 'IBS',          0.5000, '2030-01-01', '2030-12-31'],
    [2030, 'PIS',          0.1300, '2030-01-01', '2030-12-31'],
    [2030, 'COFINS',       0.6000, '2030-01-01', '2030-12-31'],
    [2030, 'ICMS_REDUTOR', 0.5000, '2030-01-01', '2030-12-31'],
    [2030, 'ISS_REDUTOR',  0.5000, '2030-01-01', '2030-12-31'],

    [2031, 'CBS',          5.4000, '2031-01-01', '2031-12-31'],
    [2031, 'IBS',          0.6000, '2031-01-01', '2031-12-31'],
    [2031, 'PIS',          0.0000, '2031-01-01', '2031-12-31'],
    [2031, 'COFINS',       0.0000, '2031-01-01', '2031-12-31'],
    [2031, 'ICMS_REDUTOR', 0.4000, '2031-01-01', '2031-12-31'],
    [2031, 'ISS_REDUTOR',  0.4000, '2031-01-01', '2031-12-31'],

    [2032, 'CBS',          6.3000, '2032-01-01', '2032-12-31'],
    [2032, 'IBS',          0.7000, '2032-01-01', '2032-12-31'],
    [2032, 'PIS',          0.0000, '2032-01-01', '2032-12-31'],
    [2032, 'COFINS',       0.0000, '2032-01-01', '2032-12-31'],
    [2032, 'ICMS_REDUTOR', 0.2000, '2032-01-01', '2032-12-31'],
    [2032, 'ISS_REDUTOR',  0.2000, '2032-01-01', '2032-12-31'],

    [2033, 'CBS',          7.6000, '2033-01-01', null],
    [2033, 'IBS',          9.6000, '2033-01-01', null],
    [2033, 'PIS',          0.0000, '2033-01-01', null],
    [2033, 'COFINS',       0.0000, '2033-01-01', null],
    [2033, 'ICMS_REDUTOR', 0.0000, '2033-01-01', null],
    [2033, 'ISS_REDUTOR',  0.0000, '2033-01-01', null],
];

$stmt = $db->prepare("
    INSERT INTO `reforma_aliquotas_transicao` (ano_fiscal, tributo, aliquota, vigencia_inicio, vigencia_fim)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE aliquota = VALUES(aliquota), vigencia_inicio = VALUES(vigencia_inicio), vigencia_fim = VALUES(vigencia_fim)
");

$inseridos = 0;
foreach ($aliquotas as $row) {
    try {
        $stmt->execute($row);
        $inseridos++;
    } catch (PDOException $e) {
        $log[] = "[ERRO]  Inserir alíquota {$row[0]}/{$row[1]}: " . $e->getMessage();
    }
}
$log[] = "[OK]    Calendário de alíquotas inserido/atualizado ($inseridos registros)";

// ─── 3. Tabela de alíquotas IBS por município de destino ───────────────────
$log[] = migrar($db, "Criar tabela reforma_aliquotas_ibs", "
    CREATE TABLE IF NOT EXISTS `reforma_aliquotas_ibs` (
        `id`                 INT AUTO_INCREMENT PRIMARY KEY,
        `codigo_ibge`        CHAR(7) NOT NULL,
        `municipio`          VARCHAR(100) NOT NULL,
        `uf`                 CHAR(2) NOT NULL,
        `aliquota_estadual`  DECIMAL(8,4) NOT NULL DEFAULT 0.0000
            COMMENT 'Parcela estadual do IBS %',
        `aliquota_municipal` DECIMAL(8,4) NOT NULL DEFAULT 0.0000
            COMMENT 'Parcela municipal do IBS %',
        `vigencia_inicio`    DATE NOT NULL DEFAULT '2027-01-01',
        `vigencia_fim`       DATE NULL,
        `versao`             SMALLINT NOT NULL DEFAULT 1,
        `fonte`              VARCHAR(50) DEFAULT 'manual',
        `created_at`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_ibge`     (`codigo_ibge`),
        INDEX `idx_uf`       (`uf`),
        INDEX `idx_vigencia` (`vigencia_inicio`, `vigencia_fim`)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    COMMENT='Alíquotas IBS por município de destino — Comitê Gestor IBS (a partir de 2027)'
");

// ─── 4. Novos campos na tabela products ────────────────────────────────────
$log[] = migrar($db, "Adicionar products.cbs_regime",
    "ALTER TABLE `products` ADD COLUMN `cbs_regime`
     ENUM('padrao','reduzido_60','zero','isento') NOT NULL DEFAULT 'padrao'
     COMMENT 'Regime CBS/IBS: padrao=alíquota cheia, reduzido_60=redução 60%, zero=alíquota zero, isento'
     AFTER `ipi_aliquota`"
);

$log[] = migrar($db, "Adicionar products.is_incide",
    "ALTER TABLE `products` ADD COLUMN `is_incide`
     TINYINT(1) NOT NULL DEFAULT 0
     COMMENT '1 = Produto sujeito ao Imposto Seletivo (IS)'
     AFTER `cbs_regime`"
);

$log[] = migrar($db, "Adicionar products.is_aliquota",
    "ALTER TABLE `products` ADD COLUMN `is_aliquota`
     DECIMAL(8,4) NOT NULL DEFAULT 0.0000
     COMMENT 'Alíquota do Imposto Seletivo %'
     AFTER `is_incide`"
);

// ─── 5. Flag de transição na config_fiscal ─────────────────────────────────
$log[] = migrar($db, "Adicionar config_fiscal.regime_reforma",
    "ALTER TABLE `config_fiscal` ADD COLUMN `regime_reforma`
     TINYINT(1) NOT NULL DEFAULT 1
     COMMENT '1 = Calcular CBS/IBS/IS e incluir no XML (infAdic) durante transição'"
);

// ─── 6. Colunas CBS/IBS/IS em fiscal_notes para relatórios ────────────────
$log[] = migrar($db, "Adicionar fiscal_notes.v_cbs",
    "ALTER TABLE `fiscal_notes` ADD COLUMN `v_cbs` DECIMAL(15,2) DEFAULT 0.00
     COMMENT 'Total CBS calculado na nota'"
);
$log[] = migrar($db, "Adicionar fiscal_notes.v_ibs",
    "ALTER TABLE `fiscal_notes` ADD COLUMN `v_ibs` DECIMAL(15,2) DEFAULT 0.00
     COMMENT 'Total IBS calculado na nota'"
);
$log[] = migrar($db, "Adicionar fiscal_notes.v_is",
    "ALTER TABLE `fiscal_notes` ADD COLUMN `v_is` DECIMAL(15,2) DEFAULT 0.00
     COMMENT 'Total IS calculado na nota'"
);

// ─── Resultado ──────────────────────────────────────────────────────────────
echo "=== Migração 001 — Reforma Tributária EC 132/2023 ===\n\n";
foreach ($log as $linha) {
    echo $linha . "\n";
}
echo "\n=== Concluído ===\n";
