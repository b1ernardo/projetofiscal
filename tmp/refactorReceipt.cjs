const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/utils/printReceipt.ts');
let content = fs.readFileSync(filePath, 'utf8');

const companyFunction = `
export const getCompanyData = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(\`\${getApiUrl()}/fiscal/config\`, {
      headers: { 'Authorization': \`Bearer \${token}\` }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch company data for receipt", error);
  }
  return null;
};
`;

if (!content.includes('getCompanyData')) {
  content = content.replace('export const getApiUrl', companyFunction + '\nexport const getApiUrl');
}

// Update getWhatsappUrl to be async
if (!content.includes('export const getWhatsappUrl = async')) {
  content = content.replace('export const getWhatsappUrl = (data: ReceiptData) => {', 'export const getWhatsappUrl = async (data: ReceiptData) => {\n  const companyData = await getCompanyData();\n  const companyName = companyData?.razao_social || companyData?.nome_fantasia || \'Emissor de Vendas\';');
  content = content.replace('let whatsappText = `*COMPROVANTE DE VENDA*\\n*M O S PANIFICADORA E COMERCIO LTDA*\\n`;', 'let whatsappText = `*COMPROVANTE DE VENDA*\\n*${companyName}*\\n`;');
}

// Update printReceipt to handle async and company data
if (!content.includes('export const printReceipt = async')) {
  content = content.replace('export const printReceipt = (data: ReceiptData) => {', 'export const printReceipt = async (data: ReceiptData) => {\n  const printWindow = window.open(\'\', \'_blank\', \'width=400,height=600\');\n  if (!printWindow) { console.error("Popup blocked"); return; }\n  printWindow.document.write(\'Gerando comprovante...\');\n\n  const companyData = await getCompanyData();\n  const companyName = companyData?.razao_social || companyData?.nome_fantasia || \'Emissor de Vendas\';\n  const companyAddress = companyData ? `${companyData.logradouro || \'\'}, ${companyData.numero || \'\'} - ${companyData.bairro || \'\'} - ${companyData.municipio || \'\'}-${companyData.uf || \'\'}` : \'\';\n  const companyCnpjIe = companyData ? `CNPJ: ${companyData.cnpj || \'\'} | IE: ${companyData.ie || \'\'}` : \'\';\n  const logoSrc = companyData?.logo_base64 ? (companyData.logo_base64.startsWith(\'data:\') ? companyData.logo_base64 : `data:image/png;base64,${companyData.logo_base64}`) : `${getApiUrl()}/logo.php`;\n');

  // Replace await whatsapp
  content = content.replace('const whatsappUrl = getWhatsappUrl(data);', 'const whatsappUrl = await getWhatsappUrl(data);');
  
  // Replace HTML constants
  content = content.replace('<img src="${getApiUrl()}/logo.php"', '<img src="${logoSrc}"');
  content = content.replace('<strong style="font-size: 13px; color: #003366;">M O S PANIFICADORA E COMERCIO LTDA</strong><br />', '<strong style="font-size: 13px; color: #003366;">${companyName}</strong><br />');
  content = content.replace('<span style="font-size: 10px; color: #003366;">AV IMPERATRIZ, 1445 - centro - João lisboa-MA<br />', '<span style="font-size: 10px; color: #003366;">${companyAddress}<br />');
  content = content.replace('CNPJ: 25.376.685/0001-04 | IE: 125854528</span>', '${companyCnpjIe}</span>');
  
  // Remove window.open from end since it's now at the beginning
  content = content.replace(/const printWindow = window\.open\('', '_blank', 'width=400,height=600'\);\s*if \(printWindow\) {\s*printWindow\.document\.open\(\);\s*printWindow\.document\.write\(html\);\s*printWindow\.document\.close\(\);\s*} else {\s*console\.error\("Popup blocked"\);\s*}/g, 'printWindow.document.open();\n    printWindow.document.write(html);\n    printWindow.document.close();');
}

// getQuoteWhatsappUrl
if (!content.includes('export const getQuoteWhatsappUrl = async')) {
  content = content.replace('export const getQuoteWhatsappUrl = (data: QuoteData) => {', 'export const getQuoteWhatsappUrl = async (data: QuoteData) => {\n  const companyData = await getCompanyData();\n  const companyName = companyData?.razao_social || companyData?.nome_fantasia || \'Emissor de Vendas\';');
  content = content.replace('let whatsappText = `*O R Ç A M E N T O*\\n*M O S PANIFICADORA E COMERCIO LTDA*\\n`;', 'let whatsappText = `*O R Ç A M E N T O*\\n*${companyName}*\\n`;');
}

// printQuote
if (!content.includes('export const printQuote = async')) {
  content = content.replace('export const printQuote = (data: QuoteData) => {', 'export const printQuote = async (data: QuoteData) => {\n  const printWindow = window.open(\'\', \'_blank\', \'width=400,height=600\');\n  if (!printWindow) { console.error("Popup blocked"); return; }\n  printWindow.document.write(\'Gerando orçamento...\');\n\n  const companyData = await getCompanyData();\n  const companyName = companyData?.razao_social || companyData?.nome_fantasia || \'Emissor de Vendas\';\n  const companyAddress = companyData ? `${companyData.logradouro || \'\'}, ${companyData.numero || \'\'} - ${companyData.bairro || \'\'} - ${companyData.municipio || \'\'}-${companyData.uf || \'\'}` : \'\';\n  const companyCnpjIe = companyData ? `CNPJ: ${companyData.cnpj || \'\'} | IE: ${companyData.ie || \'\'}` : \'\';\n  const logoSrc = companyData?.logo_base64 ? (companyData.logo_base64.startsWith(\'data:\') ? companyData.logo_base64 : `data:image/png;base64,${companyData.logo_base64}`) : `${getApiUrl()}/logo.php`;\n');

  content = content.replace('const whatsappUrl = getQuoteWhatsappUrl(data);', 'const whatsappUrl = await getQuoteWhatsappUrl(data);');
  
  content = content.replace('<img src="${getApiUrl()}/logo.php"', '<img src="${logoSrc}"');
  content = content.replace('<strong style="font-size: 13px; color: #003366;">M O S PANIFICADORA E COMERCIO LTDA</strong><br />', '<strong style="font-size: 13px; color: #003366;">${companyName}</strong><br />');
  content = content.replace('<span style="font-size: 10px; color: #003366;">AV IMPERATRIZ, 1445 - centro - João lisboa-MA<br />', '<span style="font-size: 10px; color: #003366;">${companyAddress}<br />');
  content = content.replace('CNPJ: 25.376.685/0001-04 | IE: 125854528</span>', '${companyCnpjIe}</span>');
  
  content = content.replace(/const printWindow = window\.open\('', '_blank', 'width=400,height=600'\);\s*if \(printWindow\) {\s*printWindow\.document\.open\(\);\s*printWindow\.document\.write\(html\);\s*printWindow\.document\.close\(\);\s*} else {\s*console\.error\("Popup blocked"\);\s*}/g, 'printWindow.document.open();\n    printWindow.document.write(html);\n    printWindow.document.close();');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('printReceipt updated');
