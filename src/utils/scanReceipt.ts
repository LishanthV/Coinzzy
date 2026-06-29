import { createWorker } from 'tesseract.js';

export interface ScannedReceiptResult {
  merchant: string | null;
  amount: number | null;
  items: { name: string; price: number; quantity: number }[];
  rawText: string;
}

export async function scanReceiptImage(imageUri: string): Promise<ScannedReceiptResult> {
  const worker = await createWorker('eng');

  try {
    const { data: { text } } = await worker.recognize(imageUri);
    return parseReceiptText(text);
  } finally {
    await worker.terminate();
  }
}

function parseReceiptText(text: string): ScannedReceiptResult {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract merchant — first non-empty line
  const merchant = lines[0] || null;

  // Extract total amount — look for lines with TOTAL/AMOUNT keywords
  let amount: number | null = null;
  const totalPatterns = [/total[:\s]+[\$₹£€]?([\d,]+\.?\d*)/i, /amount[:\s]+[\$₹£€]?([\d,]+\.?\d*)/i, /grand total[:\s]+[\$₹£€]?([\d,]+\.?\d*)/i];
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(',', ''));
        break;
      }
    }
    if (amount !== null) break;
  }

  // Extract line items — lines with a price pattern like "Item Name  12.99"
  const items: { name: string; price: number; quantity: number }[] = [];
  const itemPattern = /^(.+?)\s{2,}[\$₹£€]?([\d,]+\.[\d]{2})$/;
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      const name = match[1].trim();
      const price = parseFloat(match[2].replace(',', ''));
      // Skip lines that look like totals
      if (/total|tax|subtotal|change|cash|amount/i.test(name)) continue;
      if (name && price > 0) {
        items.push({ name, price, quantity: 1 });
      }
    }
  }

  return { merchant, amount, items, rawText: text };
}
