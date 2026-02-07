import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Holding, ASSET_TYPE_CONFIG, ASSET_CLASS_COLORS, AssetClass } from '@/types';
import Colors from '@/constants/colors';

interface PortfolioExportData {
  holdings: Holding[];
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getAssetClassDistribution(holdings: Holding[]): { assetClass: string; value: number; percent: number }[] {
  const byClass: Record<string, number> = {};
  let total = 0;
  holdings.forEach((h) => {
    const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
    total += value;
    byClass[h.assetClass] = (byClass[h.assetClass] || 0) + value;
  });
  return Object.entries(byClass)
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function generateHTML(data: PortfolioExportData): string {
  const { holdings, totalValue, totalInvested, totalGain, totalGainPercent } = data;
  const isGain = totalGain >= 0;
  const allocation = getAssetClassDistribution(holdings);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const holdingsRows = holdings
    .sort((a, b) => {
      const va = a.currentValue || a.quantity * (a.currentPrice || a.purchasePrice);
      const vb = b.currentValue || b.quantity * (b.currentPrice || b.purchasePrice);
      return vb - va;
    })
    .map((h) => {
      const currentValue = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
      const investedValue = h.quantity * h.purchasePrice;
      const gain = currentValue - investedValue;
      const gainPercent = investedValue > 0 ? (gain / investedValue) * 100 : 0;
      const gainColor = gain >= 0 ? '#10B981' : '#EF4444';
      return `
        <tr>
          <td><strong>${h.name}</strong><br><span style="color:#888;font-size:12px;">${h.symbol || h.type}</span></td>
          <td style="text-align:right;">${h.quantity}</td>
          <td style="text-align:right;">${formatCurrency(h.currentPrice || h.purchasePrice)}</td>
          <td style="text-align:right;">${formatCurrency(currentValue)}</td>
          <td style="text-align:right;color:${gainColor};">${gain >= 0 ? '+' : ''}${formatCurrency(gain)}<br><span style="font-size:12px;">${gain >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%</span></td>
        </tr>`;
    })
    .join('');

  const allocationRows = allocation
    .map((a) => {
      const color = ASSET_CLASS_COLORS[a.assetClass as AssetClass] || '#888';
      return `
        <tr>
          <td><span style="display:inline-block;width:12px;height:12px;border-radius:6px;background:${color};margin-right:8px;vertical-align:middle;"></span>${a.assetClass.charAt(0).toUpperCase() + a.assetClass.slice(1).replace('_', ' ')}</td>
          <td style="text-align:right;">${formatCurrency(a.value)}</td>
          <td style="text-align:right;">${a.percent.toFixed(1)}%</td>
        </tr>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; padding: 40px; background: #fff; }
        .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #6C5CE7; padding-bottom: 24px; }
        .header h1 { font-size: 28px; color: #6C5CE7; margin-bottom: 4px; }
        .header p { color: #888; font-size: 14px; }
        .summary { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 16px; }
        .summary-card { flex: 1; background: #f8f9fa; border-radius: 12px; padding: 20px; text-align: center; }
        .summary-card .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .summary-card .value { font-size: 24px; font-weight: 700; }
        .gain-positive { color: #10B981; }
        .gain-negative { color: #EF4444; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #eee; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 12px 8px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #1a1a2e; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #aaa; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PENNY Portfolio Report</h1>
        <p>Generated on ${date}</p>
      </div>

      <div class="summary">
        <div class="summary-card">
          <div class="label">Total Value</div>
          <div class="value">${formatCurrency(totalValue)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Invested</div>
          <div class="value">${formatCurrency(totalInvested)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Gain/Loss</div>
          <div class="value ${isGain ? 'gain-positive' : 'gain-negative'}">${isGain ? '+' : ''}${formatCurrency(totalGain)} (${isGain ? '+' : ''}${totalGainPercent.toFixed(2)}%)</div>
        </div>
      </div>

      <div class="section-title">Asset Allocation</div>
      <table>
        <thead>
          <tr><th>Asset Class</th><th style="text-align:right;">Value</th><th style="text-align:right;">Weight</th></tr>
        </thead>
        <tbody>${allocationRows}</tbody>
      </table>

      <div class="section-title">Holdings (${holdings.length})</div>
      <table>
        <thead>
          <tr><th>Name</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Value</th><th style="text-align:right;">Gain/Loss</th></tr>
        </thead>
        <tbody>${holdingsRows}</tbody>
      </table>

      <div class="footer">
        Generated by PENNY - Portfolio Aggregation & Intelligence Platform<br>
        This report is for informational purposes only. Not financial advice.
      </div>
    </body>
    </html>
  `;
}

export async function exportPortfolioPDF(holdings: Holding[]): Promise<void> {
  const totalValue = holdings.reduce((sum, h) => {
    return sum + (h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice));
  }, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.quantity * h.purchasePrice, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const html = generateHTML({ holdings, totalValue, totalInvested, totalGain, totalGainPercent });

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Portfolio Report',
      UTI: 'com.adobe.pdf',
    });
  }
}
