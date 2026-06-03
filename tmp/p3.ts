
export const printComandaItem = (comandaId: string, itemName: string, quantity: number, observation?: string) => {
  const date = new Date().toLocaleString('pt-BR');

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Pedido Comanda #\${comandaId}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0; padding: 10px; width: 100%; max-width: 300px; color: #000; }
        @media print { @page { margin: 0; } body { margin: 0; padding: 10px; width: 100%; } }
        .text-center { text-align: center; } .bold { font-weight: bold; } .divider { border-top: 1px dashed #000; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="text-center"><strong style="font-size: 16px;">NOVO PEDIDO</strong></div>
      <div class="divider"></div>
      <div><strong>Comanda:</strong> \${comandaId}<br/><strong>Data/Hora:</strong> \${date}</div>
      <div class="divider"></div>
      <div style="font-size: 16px;"><strong>\${quantity}x \${itemName}</strong></div>
      \${observation ? \`<div style="margin-top: 5px;"><strong>Obs:</strong> \${observation}</div>\` : ''}
      <div class="divider"></div>
      <div class="text-center">-- Cozinha/Bar --</div>
    </body>
    </html>
  \`;

  executeSilentPrint(html);
};

export const printComandaBatch = (comandaId: string, items: any[], mesa?: string) => {
  const date = new Date().toLocaleString('pt-BR');

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Pedido Comanda/Mesa \${mesa || comandaId}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0; padding: 10px; width: 100%; max-width: 300px; color: #000; }
        @media print { @page { margin: 0; } body { margin: 0; padding: 10px; width: 100%; } }
        .text-center { text-align: center; } .bold { font-weight: bold; } .divider { border-top: 1px dashed #000; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="text-center"><strong style="font-size: 16px;">NOVO PEDIDO</strong></div>
      <div class="divider"></div>
      <div><strong>Local:</strong> \${mesa || comandaId}<br/><strong>Data/Hora:</strong> \${date}</div>
      <div class="divider"></div>
      <div style="font-size: 15px;">
        \${items.map(item => \`<div style="margin-bottom: 5px;"><strong>\${item.quantity}x \${item.name}</strong>\${item.observation ? \`<br/><small>Obs: \${item.observation}</small>\` : ''}</div>\`).join('')}
      </div>
      <div class="divider"></div>
      <div class="text-center">-- Cozinha/Bar --</div>
    </body>
    </html>
  \`;

  executeSilentPrint(html);
};

export const printDelivery = async (data: DeliveryData) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) { console.error("Popup blocked"); return; }
  printWindow.document.write('Gerando roteiro de entrega...');

  const { companyName, companyAddress, companyCnpjIe, logoSrc } = await resolveCompanyVariables();
  const { orderNumber, customerName, customerPhone, address, type, paymentMethod, items, subtotal, deliveryFee, total, changeFor, date } = data;

  const html = \`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Pedido de Delivery #\${orderNumber}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 0; width: 100%; max-width: 300px; color: #000; }
        @media print { @page { margin: 0; } body { margin: 0; padding: 0; width: 100%; } .no-print { display: none !important; } }
        .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 5px 0; }
        th, td { padding: 2px 0; vertical-align: top; }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f4f4f5; border-bottom: 2px solid #e4e4e7;">
        <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #16a34a; color: white; border: none; border-radius: 4px; font-weight: bold;">🖨️ Imprimir</button>
      </div>
      <div style="display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-bottom: 10px;">
        <img src="\${logoSrc}" style="width: 60px; height: 60px; object-fit: contain;" />
        <div style="text-align: left; line-height: 1.2;">
          <strong style="font-size: 13px; color: #003366;">\${companyName}</strong><br />
          <span style="font-size: 10px; color: #003366;">\${companyAddress}<br />\${companyCnpjIe}</span>
        </div>
      </div>
      <div class="text-center">
        <strong style="font-size: 14px;">COMPROVANTE DE \${type === 'retirada' ? 'RETIRADA' : 'ENTREGA'}</strong><br />
        Pedido #\${orderNumber}
      </div>
      <div class="divider"></div>
      <div style="font-size: 11px;">
        <strong>Data:</strong> \${new Date(date).toLocaleString('pt-BR')}<br />
        <strong>Cliente:</strong> \${customerName}<br />
        <strong>Telefone:</strong> \${customerPhone}<br />
        \${type === 'entrega' ? \`<strong>Endereço:</strong> \${address}<br />\` : ''}
      </div>
      <div class="divider"></div>
      <table>
        <thead><tr style="border-bottom: 1px dashed #000;"><th class="text-left">Qtd</th><th class="text-left">Produto</th><th class="text-right">Total</th></tr></thead>
        <tbody>
          \${items.map(i => \`<tr><td class="text-left">\${i.quantity}</td><td class="text-left">\${(i.product_name || i.name || 'Produto').substring(0,20)}</td><td class="text-right">\${formatCurrency(Number(i.unit_price) * Number(i.quantity))}</td></tr>\`).join('')}
        </tbody>
      </table>
      <div class="divider"></div>
      <div class="text-right" style="font-size: 11px;">
        Subtotal: \${formatCurrency(subtotal)}<br />
        \${type === 'entrega' ? \`Taxa de Entrega: \${formatCurrency(deliveryFee)}<br />\` : ''}
        <strong style="font-size: 14px;">TOTAL: \${formatCurrency(total)}</strong><br />
      </div>
      <div class="divider"></div>
      <div style="font-size: 11px;">
        <strong>Pagamento:</strong> \${paymentMethod}<br />
        \${changeFor ? \`<strong>Troco para:</strong> \${formatCurrency(changeFor)}<br /><strong>Troco a levar:</strong> \${formatCurrency(changeFor - total)}\` : ''}
      </div>
      <div class="divider"></div>
      <div class="text-center" style="margin-top: 10px; font-size: 10px;">Documento sem valor fiscal</div>
    </body>
    </html>
  \`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
