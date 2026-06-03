
export const printOS = async (data: ServiceOrderData) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando OS...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const whatsappUrl = await getOSWhatsappUrl(data);
  const { id, so_number, customerName, customerPhone, itemType, itemMake, itemIdentifier, problemReported, problemFound, servicePerformed, services, items, laborTotal, partsTotal, discount, totalAmount, status, priority, entryDate, expectedDelivery } = data;

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ordem de Servico #\${so_number || id.slice(0, 8)}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 11px; margin: 0; padding: 0; width: 100%; max-width: 300px; color: #000; }
        @media print { @page { margin: 0; } body { margin: 0; padding: 0; width: 100%; } .no-print { display: none !important; } }
        .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
        .bold { font-weight: bold; } .divider { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin: 5px 0; } th, td { padding: 2px 0; vertical-align: top; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f4f4f5; border-bottom: 2px solid #e4e4e7; position: sticky; top: 0;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold;">🖨️ Imprimir</button>
        <button onclick="window.open('\${whatsappUrl}', '_blank')" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #25D366; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px;">💬 WhatsApp</button>
      </div>
      <div style="display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-bottom: 5px;">
        <img src="\${logoSrc}" style="width: 50px; height: 50px; object-fit: contain;" />
        <div style="text-align: left; line-height: 1.2;">
          <strong style="font-size: 12px; color: #003366;">\${companyName}</strong><br />
          <span style="font-size: 9px; color: #003366;">\${companyAddress}<br />\${companyCnpjIe}</span>
        </div>
      </div>
      <div class="text-center">
        <div class="divider"></div>
        <strong style="font-size: 13px;">ORDEM DE SERVIÇO</strong><br />
        <strong>NÃO É DOCUMENTO FISCAL</strong>
      </div>
      <div class="divider"></div>
      <div>
        <strong>OS:</strong> \${so_number || id.slice(0, 8).toUpperCase()}<br />
        <strong>Data Entrada:</strong> \${entryDate.toLocaleDateString('pt-BR')}<br />
        <strong>Previsão Entrega:</strong> \${expectedDelivery ? expectedDelivery.toLocaleDateString('pt-BR') : 'N/A'}<br />
        <strong>Status:</strong> \${status.toUpperCase()}<br />
        <strong>Prioridade:</strong> \${priority.toUpperCase()}
      </div>
      <div class="divider"></div>
      <div>
        <strong>Cliente:</strong> \${customerName}<br />
        <strong>Contato:</strong> \${customerPhone}<br />
      </div>
      <div class="divider"></div>
      <div>
        <strong>Equipamento / Objeto:</strong><br />
        \${itemType.toUpperCase()} \${itemMake || ''}<br />
        <strong>ID/Série:</strong> \${itemIdentifier || '---'}<br />
        <strong>Problema Relatado:</strong><br />
        \${problemReported}<br />
        <br />
        <strong>Avaliação / Serviço:</strong><br />
        \${problemFound || servicePerformed || 'Em análise...'}
      </div>
      \${(services.length > 0 || items.length > 0) ? \`
        <div class="divider"></div>
        <table>
          <thead><tr style="border-bottom: 1px dashed #000;"><th class="text-left" style="width: 60%">Descrição</th><th class="text-right">Qtd</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            \${services.map(s => \`<tr><td class="text-left">(S) \${s.description}</td><td class="text-right">1</td><td class="text-right">\${Number(s.price).toFixed(2)}</td></tr>\`).join('')}
            \${items.map(i => \`<tr><td class="text-left">(P) \${i.description}</td><td class="text-right">\${i.quantity}</td><td class="text-right">\${Number(i.total_price).toFixed(2)}</td></tr>\`).join('')}
          </tbody>
        </table>
      \` : ''}
      <div class="divider"></div>
      <div class="text-right">
        Subtotal: \${formatCurrency(laborTotal + partsTotal)}<br />
        Desconto: \${formatCurrency(discount)}<br />
        <strong style="font-size: 13px;">Total a Pagar: \${formatCurrency(totalAmount)}</strong>
      </div>
      <div class="divider"></div>
      <div style="margin-top: 30px; margin-bottom: 10px;">
         <div style="border-top: 1px solid #000; text-align: center; font-size: 10px; margin-bottom: 20px;">Assinatura do Técnico</div>
         <div style="border-top: 1px solid #000; text-align: center; font-size: 10px;">Assinatura do Cliente</div>
      </div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

export const printOSA4 = async (data: ServiceOrderData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando OS A4...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const whatsappUrl = await getOSWhatsappUrl(data);
  const { id, so_number, customerName, customerPhone, itemType, itemMake, itemIdentifier, problemReported, problemFound, servicePerformed, services, items, laborTotal, partsTotal, discount, totalAmount, status, priority, entryDate, expectedDelivery } = data;

  const renderContent = (via: string) => \`
    <div class="via-label">\${via}</div>
    <div class="header">
      <div class="company-info" style="display: flex; align-items: center; gap: 15px;">
        <img src="\${logoSrc}" style="width: 80px; height: 80px; object-fit: contain;" />
        <div>
          <h1 style="color: #003366; margin: 0; font-size: 16pt;">\${companyName}</h1>
          <p style="color: #003366; margin: 5px 0 0 0; font-size: 10pt;">\${companyAddress} | \${companyCnpjIe}</p>
        </div>
      </div>
      <div class="document-info">
        <h2>ORDEM DE SERVIÇO</h2>
        <p><strong>Nº OS:</strong> \${so_number || id.slice(0, 8).toUpperCase()} | <strong>Status:</strong> \${status.toUpperCase()}</p>
      </div>
    </div>
    <div class="section"><div class="section-header">Dados do Cliente e Objeto</div><div class="section-content"><div class="grid">
      <div style="grid-column: span 2;"><span class="label">Cliente</span><span class="value">\${customerName}</span></div>
      <div><span class="label">Telefone</span><span class="value">\${customerPhone || '---'}</span></div>
      <div><span class="label">Objeto</span><span class="value">\${itemType.toUpperCase()} \${itemMake || ''}</span></div>
      <div><span class="label">Identificador</span><span class="value">\${itemIdentifier || '---'}</span></div>
      <div><span class="label">Entrada</span><span class="value">\${entryDate.toLocaleDateString('pt-BR')}</span></div>
    </div></div></div>
    <div class="section"><div class="section-header">Relatórios Técnicos</div><div class="section-content"><div class="grid" style="grid-template-columns: 1fr 1fr;">
      <div><span class="label">Problema Relatado</span><div class="diagnostic-box" style="min-height: 15px;">\${problemReported}</div></div>
      <div><span class="label">Serviço/Diagnóstico</span><div class="diagnostic-box" style="min-height: 15px; background: #f0fdf4;">\${problemFound || servicePerformed || 'Em análise...'}</div></div>
    </div></div></div>
    \${(services.length > 0 || items.length > 0) ? \`<div class="section"><div class="section-header">Produtos e Serviços</div><div class="section-content" style="padding: 0;"><table class="compact-table">
          <thead><tr><th>Descrição</th><th class="text-right">Qtd</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            \${services.map(s => \`<tr><td>(S) \${s.description}</td><td class="text-right">1</td><td class="text-right">R$ \${Number(s.price).toFixed(2)}</td></tr>\`).join('')}
            \${items.map(i => \`<tr><td>(P) \${i.description}</td><td class="text-right">\${i.quantity}</td><td class="text-right">R$ \${Number(i.total_price).toFixed(2)}</td></tr>\`).join('')}
          </tbody>
    </table></div></div>\` : ''}
    <div class="footer-grid">
      <div class="totals-compact">
        <div class="total-row"><span>Subtotal:</span><span>R$ \${(laborTotal + partsTotal).toFixed(2)}</span></div>
        <div class="total-row"><span>Desconto:</span><span>R$ \${discount.toFixed(2)}</span></div>
        <div class="total-row total-final"><span>TOTAL:</span><span>R$ \${totalAmount.toFixed(2)}</span></div>
      </div>
      <div class="signature-box">
        <div><div class="sig-line" style="margin-top: 20px;">Assinatura Técnico</div></div><div><div class="sig-line" style="margin-top: 20px;">Assinatura Cliente</div></div>
      </div>
    </div>
    <div class="print-date">Impresso em \${new Date().toLocaleString('pt-BR')} | <b>Gestão System Web</b></div>
  \`;

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>OS #\${id.slice(0, 8)}</title>
      <style>
        @page { size: A4; margin: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8.5pt; color: #333; line-height: 1.2; margin: 0; padding: 0; }
        .page { width: 210mm; min-height: 297mm; display: flex; flex-direction: column; }
        .copy { height: 148.5mm; padding: 10mm; box-sizing: border-box; overflow: hidden; position: relative; }
        .copy-1 { border-bottom: 2px dashed #999; }
        .via-label { position: absolute; top: 10px; right: 20px; font-size: 7pt; color: #999; font-weight: bold; text-transform: uppercase; }
        .header { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
        .company-info h1 { margin: 0; font-size: 11pt; color: #000; }
        .company-info p { margin: 0; font-size: 7.5pt; }
        .document-info { text-align: right; } .document-info h2 { margin: 0; font-size: 10pt; color: #444; }
        .section { margin-bottom: 6px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
        .section-header { background: #f4f4f5; padding: 2px 8px; font-weight: bold; border-bottom: 1px solid #ddd; text-transform: uppercase; font-size: 7pt; }
        .section-content { padding: 4px 8px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .label { font-size: 6.5pt; color: #666; text-transform: uppercase; font-weight: bold; display: block; } .value { font-size: 8pt; font-weight: 500; }
        .diagnostic-box { border: 1px solid #eee; padding: 3px; margin-top: 1px; font-size: 7.5pt; min-height: 15px; }
        .compact-table { width: 100%; border-collapse: collapse; }
        .compact-table th { background: #f8fafc; text-align: left; padding: 3px 8px; font-size: 7pt; border-bottom: 1px solid #ddd; }
        .compact-table td { padding: 2px 8px; border-bottom: 1px solid #f9f9f9; font-size: 7.5pt; }
        .text-right { text-align: right; }
        .footer-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; margin-top: 8px; align-items: end; }
        .totals-compact { border: 1px solid #ddd; padding: 4px; border-radius: 4px; background: #fff; }
        .total-row { display: flex; justify-content: space-between; padding: 1px 0; font-size: 8pt; }
        .total-final { font-size: 10pt; font-weight: bold; border-top: 1px solid #000; margin-top: 2px; padding-top: 2px; }
        .signature-box { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .sig-line { border-top: 1px solid #000; text-align: center; padding-top: 2px; font-size: 7pt; }
        .print-date { font-size: 6.5pt; color: #999; text-align: center; margin-top: 4px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="position: fixed; top: 0; left: 0; right: 0; background: #000; color: white; padding: 10px; text-align: center; z-index: 100;">
        <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; cursor: pointer; background: #16a34a; color: white; border: none; border-radius: 4px;">🖨️ IMPRIMIR A4 (2 VIAS)</button>
        <button onclick="window.close()" style="padding: 8px 16px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 4px; margin-left: 10px;">FECHAR</button>
      </div>
      <div class="page">
        <div class="copy copy-1">\${renderContent('1ª Via - Empresa')}</div>
        <div class="copy copy-2">\${renderContent('2ª Via - Cliente')}</div>
      </div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
