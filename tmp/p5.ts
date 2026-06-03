
export const getOSWhatsappUrl = async (data: ServiceOrderData) => {
  const { companyName } = await resolveCompanyVariables();
  const { customerName, services, items, laborTotal, partsTotal, discount, totalAmount } = data;

  let whatsappText = \`*O R D E M   D E   S E R V I Ç O*\\n*COMPANY_NAME*\\n\`.replace('COMPANY_NAME', companyName);
  whatsappText += \`OS: #\${data.so_number || data.id.slice(0, 8).toUpperCase()}\\n\`;
  whatsappText += \`Cliente: \${customerName}\\n\`;
  whatsappText += \`Data: \${new Date().toLocaleDateString('pt-BR')}\\n\`;
  whatsappText += \`--------------------------------\\n\`;
  
  whatsappText += \`Status: \${data.status.toUpperCase()}\\n\`;
  whatsappText += \`Objeto: \${data.itemType.toUpperCase()} \${data.itemMake || ''}\\n\`;
  whatsappText += \`Diagnóstico: \${data.problemFound || data.servicePerformed || 'Em análise...'}\\n\`;
  whatsappText += \`--------------------------------\\n\`;

  if (services.length > 0) {
    whatsappText += \`*Serviços:*\\n\`;
    services.forEach(s => {
      whatsappText += \`- \${s.description}: \${formatCurrency(Number(s.price))}\\n\`;
    });
  }

  if (items.length > 0) {
    whatsappText += \`\\n*Peças/Produtos:*\\n\`;
    items.forEach(i => {
      whatsappText += \`- \${i.quantity}x \${i.description}: \${formatCurrency(Number(i.total_price))}\\n\`;
    });
  }

  if (services.length > 0 || items.length > 0) {
    whatsappText += \`--------------------------------\\n\`;
  }

  if (discount > 0) {
    whatsappText += \`Subtotal: \${formatCurrency(laborTotal + partsTotal)}\\n\`;
    whatsappText += \`Desconto: \${formatCurrency(discount)}\\n\`;
  }
  whatsappText += \`*Total a Pagar: \${formatCurrency(totalAmount)}*\\n\\n\`;
  whatsappText += \`Obrigado pela preferência!\`;

  return \`https://wa.me/?text=\${encodeURIComponent(whatsappText)}\`;
};

export const getDeliveryWhatsappUrl = async (data: DeliveryData) => {
  const { companyName } = await resolveCompanyVariables();
  const { orderNumber, customerName, customerPhone, address, type, paymentMethod, items, subtotal, deliveryFee, total, changeFor, date } = data;

  let whatsappText = \`*COMPROVANTE DE \${type === 'retirada' ? 'RETIRADA' : 'ENTREGA'}*\\n*COMPANY_NAME*\\n\`.replace('COMPANY_NAME', companyName);
  whatsappText += \`Pedido #\${orderNumber}\\nData: \${new Date(date).toLocaleString('pt-BR')}\\n\`;
  whatsappText += \`--------------------------------\\n\`;
  whatsappText += \`*Cliente:* \${customerName}\\n\`;
  whatsappText += \`*Telefone:* \${customerPhone}\\n\`;
  if (type === 'entrega') {
    whatsappText += \`*Endereço:* \${address}\\n\`;
  }
  whatsappText += \`--------------------------------\\n\`;
  items.forEach(item => {
    whatsappText += \`${item.quantity}x ${(item.product_name || item.name || 'Produto').substring(0, 20)} - ${formatCurrency(Number(item.unit_price) * Number(item.quantity))}\\n\`;
  });
  whatsappText += \`--------------------------------\\n\`;
  whatsappText += \`Subtotal: \${formatCurrency(subtotal)}\\n\`;
  if (type === 'entrega') {
    whatsappText += \`Taxa de Entrega: \${formatCurrency(deliveryFee)}\\n\`;
  }
  whatsappText += \`*Total: \${formatCurrency(total)}*\\n\\n\`;
  
  whatsappText += \`*Pagamento:* \${paymentMethod}\\n\`;
  if (changeFor) {
    whatsappText += \`Troco para: \${formatCurrency(changeFor)}\\n\`;
    whatsappText += \`*Troco a levar: \${formatCurrency(changeFor - total)}*\\n\`;
  }
  
  whatsappText += \`\\nObrigado pela preferência!\`;

  return \`https://wa.me/?text=\${encodeURIComponent(whatsappText)}\`;
};
