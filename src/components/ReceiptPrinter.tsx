/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Contribution, ChurchPreferences } from '../types';
import { Printer, X, ShieldAlert, CheckCircle2, BookmarkCheck, Landmark, Download as DownloadIcon, Loader2 } from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';
import html2canvas from 'html2canvas';

/**
 * Converts a numeric contribution amount into standard word format.
 */
function amountToWords(amount: number, currencyCode: string = 'PHP'): string {
  if (amount === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (num: number): string => {
    if (num === 0) return '';
    let str = '';
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += ones[num] + ' ';
    }
    return str.trim();
  };

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  let words = '';
  let temp = intPart;

  if (temp >= 1000000) {
    words += convertLessThanOneThousand(Math.floor(temp / 1000000)) + ' Million ';
    temp %= 1000000;
  }
  if (temp >= 1000) {
    words += convertLessThanOneThousand(Math.floor(temp / 1000)) + ' Thousand ';
    temp %= 1000;
  }
  if (temp > 0) {
    words += convertLessThanOneThousand(temp);
  }

  words = words.trim();
  if (words === '') words = 'Zero';

  // Currency labeling based on settings config
  let currencyLabel = 'Pesos';
  let subunitLabel = 'Centavos';

  const curr = currencyCode.toUpperCase().trim();
  if (curr === '$' || curr === 'USD') {
    currencyLabel = 'Dollars';
    subunitLabel = 'Cents';
  } else if (curr === '€' || curr === 'EUR') {
    currencyLabel = 'Euros';
    subunitLabel = 'Cents';
  } else if (curr === '£' || curr === 'GBP') {
    currencyLabel = 'Pounds';
    subunitLabel = 'Pence';
  }

  words = `${words} ${currencyLabel}`;

  if (decPart > 0) {
    words += ` and ${convertLessThanOneThousand(decPart)} ${subunitLabel}`;
  } else {
    words += ' Only';
  }

  return words;
}

// Global Parser & Converter for oklch / oklab Safari and Chrome colors
function parsePercentOrFloat(val: string): number {
  if (val.endsWith('%')) {
    return parseFloat(val) / 100;
  }
  return parseFloat(val);
}

function oklchToRgbaString(L: number, C: number, H: number, alpha: number): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = Math.pow(Math.max(0, l_), 3);
  const m = Math.pow(Math.max(0, m_), 3);
  const s = Math.pow(Math.max(0, s_), 3);

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bVal = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const gamma = (cVal: number): number => {
    return cVal > 0.0031308
      ? 1.055 * Math.pow(cVal, 1 / 2.4) - 0.055
      : 12.92 * cVal;
  };

  const rS = Math.min(255, Math.max(0, Math.round(gamma(r) * 255)));
  const gS = Math.min(255, Math.max(0, Math.round(gamma(g) * 255)));
  const bS = Math.min(255, Math.max(0, Math.round(gamma(bVal) * 255)));

  return `rgba(${rS}, ${gS}, ${bS}, ${alpha})`;
}

function oklabToRgbaString(L: number, a: number, b: number, alpha: number): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = Math.pow(Math.max(0, l_), 3);
  const m = Math.pow(Math.max(0, m_), 3);
  const s = Math.pow(Math.max(0, s_), 3);

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bVal = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const gamma = (cVal: number): number => {
    return cVal > 0.0031308
      ? 1.055 * Math.pow(cVal, 1 / 2.4) - 0.055
      : 12.92 * cVal;
  };

  const rS = Math.min(255, Math.max(0, Math.round(gamma(r) * 255)));
  const gS = Math.min(255, Math.max(0, Math.round(gamma(g) * 255)));
  const bS = Math.min(255, Math.max(0, Math.round(gamma(bVal) * 255)));

  return `rgba(${rS}, ${gS}, ${bS}, ${alpha})`;
}

function replaceOklchAndOklab(str: string): string {
  if (typeof str !== 'string') return str;
  let result = str;

  const oklchGlobalRegex = /oklch\s*\(\s*([\d.%\-]+)\s+([\d.%\-]+)\s+([\d.%\-]+)(?:\s*\/\s*([\d.%\-]+))?\s*\)/gi;
  result = result.replace(oklchGlobalRegex, (match, p1, p2, p3, p4) => {
    try {
      const l = parsePercentOrFloat(p1);
      const c = parsePercentOrFloat(p2);
      let hStr = p3;
      if (hStr.endsWith('deg')) hStr = hStr.slice(0, -3);
      const h = parseFloat(hStr);
      const alpha = p4 ? parsePercentOrFloat(p4) : 1;
      return oklchToRgbaString(l, c, h, alpha);
    } catch {
      return match;
    }
  });

  const oklchCommaGlobalRegex = /oklch\s*\(\s*([\d.%\-]+)\s*,\s*([\d.%\-]+)\s*,\s*([\d.%\-]+)(?:\s*,\s*([\d.%\-]+))?\s*\)/gi;
  result = result.replace(oklchCommaGlobalRegex, (match, p1, p2, p3, p4) => {
    try {
      const l = parsePercentOrFloat(p1);
      const c = parsePercentOrFloat(p2);
      let hStr = p3;
      if (hStr.endsWith('deg')) hStr = hStr.slice(0, -3);
      const h = parseFloat(hStr);
      const alpha = p4 ? parsePercentOrFloat(p4) : 1;
      return oklchToRgbaString(l, c, h, alpha);
    } catch {
      return match;
    }
  });

  const oklabGlobalRegex = /oklab\s*\(\s*([\d.%\-]+)\s+([\d.%\-]+)\s+([\d.%\-]+)(?:\s*\/\s*([\d.%\-]+))?\s*\)/gi;
  result = result.replace(oklabGlobalRegex, (match, p1, p2, p3, p4) => {
    try {
      const l = parsePercentOrFloat(p1);
      const a = parsePercentOrFloat(p2);
      const b = parsePercentOrFloat(p3);
      const alpha = p4 ? parsePercentOrFloat(p4) : 1;
      return oklabToRgbaString(l, a, b, alpha);
    } catch {
      return match;
    }
  });

  const oklabCommaGlobalRegex = /oklab\s*\(\s*([\d.%\-]+)\s*,\s*([\d.%\-]+)\s*,\s*([\d.%\-]+)(?:\s*,\s*([\d.%\-]+))?\s*\)/gi;
  result = result.replace(oklabCommaGlobalRegex, (match, p1, p2, p3, p4) => {
    try {
      const l = parsePercentOrFloat(p1);
      const a = parsePercentOrFloat(p2);
      const b = parsePercentOrFloat(p3);
      const alpha = p4 ? parsePercentOrFloat(p4) : 1;
      return oklabToRgbaString(l, a, b, alpha);
    } catch {
      return match;
    }
  });

  return result;
}

function createStyleProxy(style: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'getPropertyValue') {
        return (propertyName: string) => {
          const realVal = target.getPropertyValue(propertyName);
          if (typeof realVal === 'string' && (realVal.includes('oklch') || realVal.includes('oklab'))) {
            return replaceOklchAndOklab(realVal);
          }
          return realVal;
        };
      }
      const val = target[prop as any];
      if (typeof val === 'function') {
        return (val as any).bind(target);
      }
      if (typeof val === 'string') {
        if (val.includes('oklch') || val.includes('oklab')) {
          return replaceOklchAndOklab(val);
        }
      }
      return val;
    }
  });
}

interface ReceiptPrinterProps {
  contribution: Contribution | null;
  preferences: ChurchPreferences;
  onClose: () => void;
}

export default function ReceiptPrinter({ contribution, preferences, onClose }: ReceiptPrinterProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Safe exit if null
  if (!contribution) return null;

  // Execute browser printing securely
  const triggerBrowserPrint = () => {
    window.print();
  };

  const downloadAsImage = async () => {
    if (!receiptRef.current) return;
    
    setIsCapturing(true);

    const originalGetComputedStyle = window.getComputedStyle;
    const helperGetComputedStyle = function(this: any, elt: Element, pseudoElt?: string) {
      const context = this || (elt && elt.ownerDocument ? elt.ownerDocument.defaultView : null) || window;
      const style = originalGetComputedStyle.call(context as any, elt, pseudoElt);
      return createStyleProxy(style);
    };

    // Override local computed style read
    window.getComputedStyle = helperGetComputedStyle as any;
    if (window.document.defaultView) {
      window.document.defaultView.getComputedStyle = helperGetComputedStyle as any;
    }

    try {
      // Small delay to ensure any fonts/images are rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Wrap computing queries inside the cloned document context
          if (clonedDoc.defaultView) {
            clonedDoc.defaultView.getComputedStyle = helperGetComputedStyle as any;
          }

          // Append fallback styles for Tailwind CSS v4 oklab/oklch variables and utility classes
          const styleEl = clonedDoc.createElement('style');
          styleEl.textContent = `
            :root {
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-slate-950: #020617 !important;
              --color-blue-50: #eff6ff !important;
              --color-blue-100: #dbeafe !important;
              --color-blue-600: #2563eb !important;
              --color-blue-800: #1e40af !important;
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;
              --color-emerald-600: #059669 !important;
              --color-emerald-800: #065f46 !important;
            }
            .bg-white { background-color: #ffffff !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-blue-50\\/30 { background-color: rgba(239, 246, 255, 0.3) !important; }
            .bg-emerald-50\\/20 { background-color: rgba(236, 253, 245, 0.2) !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-950 { color: #020617 !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .text-blue-800 { color: #1e40af !important; }
            .text-emerald-800 { color: #065f46 !important; }
            .border-slate-100 { border-color: #f1f5f9 !important; }
            .border-slate-200 { border-color: #cbd5e1 !important; }
            .border-slate-300 { border-color: #cbd5e1 !important; }
            .border-slate-200\\/80 { border-color: rgba(203, 213, 225, 0.8) !important; }
            #print-receipt-area { border: 2px solid #cbd5e1 !important; }
          `;
          clonedDoc.head.appendChild(styleEl);

          // Proactively parse and replace inline oklab/oklch values on any cloned elements
          const allEl = clonedDoc.querySelectorAll('*');
          allEl.forEach((node) => {
            if (node instanceof HTMLElement) {
              const styles = window.getComputedStyle(node);
              const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
              
              colorProps.forEach(prop => {
                const val = styles[prop as any];
                if (val && (val.includes('oklab') || val.includes('oklch'))) {
                  if (prop === 'backgroundColor') {
                    node.style.backgroundColor = '#ffffff';
                  } else if (prop === 'color') {
                    node.style.color = '#1e293b';
                  } else if (prop.startsWith('border')) {
                    node.style.setProperty(prop, '#cbd5e1', 'important');
                  }
                }
              });
            }
          });
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `receipt-${contribution.receiptNo}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error('Error capturing receipt as image:', error);
      alert('Failed to generate image. Please try the print option instead.');
    } finally {
      // Safely restore global getComputedStyle overrides
      window.getComputedStyle = originalGetComputedStyle;
      if (window.document.defaultView) {
        window.document.defaultView.getComputedStyle = originalGetComputedStyle;
      }
      setIsCapturing(false);
    }
  };

  const hasTithe = contribution.tithe > 0;
  const hasCombined = contribution.combinedOffering > 0;
  const otherFundsTotal = contribution.buildingFund + contribution.missions + contribution.youth + contribution.others;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4 overflow-y-auto" id="receipt-modal">
      <style>{`
        @media print {
          @page {
            size: A6 portrait;
            margin: 0 !important;
          }
          
          html, body {
            width: 105mm !important;
            height: 148mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Critical: Ensure root container doesn't hide everything */
          #root, #church-app-root, #main-content-panel, #workspace-canvas {
            display: block !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Hide everything except the modal */
          .print\\:hidden, aside, header, footer, #sidebar, #app-header, #app-footer, .bg-slate-50 {
            display: none !important;
          }

          /* Force modal to fill screen for print */
          #receipt-modal {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 105mm !important;
            height: 148mm !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            z-index: 9999 !important;
          }

          #receipt-modal-inner {
            width: 105mm !important;
            height: 148mm !important;
            max-height: 148mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            display: flex !important;
            flex-direction: column !important;
          }

          #print-receipt-area {
            width: 105mm !important;
            height: 148mm !important;
            max-height: 148mm !important;
            margin: 0 !important;
            padding: 4mm 5mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
            border: none !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          .a6-receipt-card {
            border: none !important;
            font-size: 10.5px !important;
            line-height: 1.25 !important;
          }

          .a6-receipt-card h1 {
            font-size: 14px !important;
            margin-top: 1mm !important;
          }

          .a6-receipt-card h2 {
            font-size: 11px !important;
          }

          .a6-receipt-card .text-base,
          .a6-receipt-card .text-lg {
            font-size: 13px !important;
          }

          .a6-receipt-icon {
            width: 12mm !important;
            height: 14mm !important;
            border-radius: 2mm !important;
            margin-bottom: 2mm !important;
          }

          .a6-receipt-signature-line {
            border-bottom-width: 0.5pt !important;
            min-height: 6mm !important;
          }
        }
      `}</style>
      <div id="receipt-modal-inner" className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in print:fixed print:inset-0 print:m-0 print:max-h-full print:rounded-none print:shadow-none print:w-full">
        
        {/* Modal Action Header (HIDDEN when printing) */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <BookmarkCheck size={18} className="text-emerald-600" />
            <span className="text-sm font-bold text-slate-800">Print Preview Center</span>
          </div>
          <div className="flex items-center gap-2">
             <button
              onClick={downloadAsImage}
              disabled={isCapturing}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 hover:cursor-pointer disabled:opacity-50"
            >
              {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <DownloadIcon size={14} />}
              <span>{isCapturing ? 'Generating...' : 'Save as Image'}</span>
            </button>
            <button
              onClick={triggerBrowserPrint}
              className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 hover:cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
              title="Close Panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINT CONTENT SCROLL WRAPPER */}
        <div className="p-6 md:p-10 overflow-y-auto flex-1 bg-slate-50/20 print:bg-white print:p-0 print:overflow-visible">
          
          {/* RECEIPT CONTAINER CARD PORTION */}
          <div ref={receiptRef} id="print-receipt-area" className="w-full max-w-2xl mx-auto bg-white border-2 border-slate-200/80 rounded-2xl p-6 md:p-8 relative shadow-sm print:border-none print:shadow-none print:m-0 print:p-0 a6-receipt-card">
            
            {/* Internal layout border */}
            <div className="border border-slate-100 rounded-xl p-5 md:p-7 print:border-none">
              
              {/* Church Letterhead */}
              <div className="text-center space-y-1 pb-6 border-b border-dashed border-slate-200">
                <ChurchLogo size="receipt" className="a6-receipt-icon mx-auto" />
                <h1 className="text-[23px] font-bold text-slate-900 tracking-tight mt-3">{preferences.churchName}</h1>
                <p className="text-[13px] text-slate-500 font-medium">{preferences.churchAddress}</p>
                <p className="text-[12px] text-slate-400 font-mono">Contact: {preferences.churchEmail} • Stewardship Office</p>
              </div>

              {/* Document Identity metadata */}
              <div className="py-6 flex flex-col sm:flex-row justify-between gap-4 text-[15px] a6-receipt-grid">
                <div className="space-y-1">
                  <div className="text-[13px] uppercase font-bold text-slate-400 tracking-wider">OFFICIAL RECEIPT RECEIVED FROM:</div>
                  <div className="text-[19px] font-bold text-slate-800">{contribution.memberName}</div>
                  <div className="text-slate-500">Member Reference Code: <b className="font-mono text-slate-700">{contribution.memberId}</b></div>
                </div>
                <div className="sm:text-right space-y-1 font-mono text-slate-600">
                  <div>RECEIPT NO: <b className="font-bold text-slate-900">{contribution.receiptNo}</b></div>
                  <div>DATE GENERATED: <span>{new Date().toISOString().split('T')[0]}</span></div>
                  <div>CHANNEL: <span>{contribution.paymentMethod}</span></div>
                </div>
              </div>

              {/* Title Header */}
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-center mb-6 print:bg-slate-100">
                <h2 className="text-[15px] font-extrabold uppercase tracking-widest text-slate-700 print:hidden">CHURCH TREASURER'S RECEIPT</h2>
                <h2 className="hidden print:block text-[15px] font-extrabold uppercase tracking-widest text-slate-700">CHURCH TREASURER'S RECEIPT</h2>
              </div>

              {/* FINANCIAL ITEMS ITEMIZED LIST */}
              <div className="space-y-5">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[12px]">
                      <th className="pb-2 text-left">Fund Description</th>
                      <th className="pb-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contribution.copMission !== undefined ? (
                      <>
                        <tr className="bg-blue-50/30 print:bg-slate-100/30">
                          <td colSpan={2} className="py-1 px-2.5 text-[12px] uppercase font-extrabold text-blue-800 tracking-wider">
                            Mission Funds
                          </td>
                        </tr>
                        {contribution.tithe > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-800">Tithe</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.tithe.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {contribution.copMission > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-800">COP (Combined Offering)</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.copMission.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {(contribution.harvestIngathering ?? 0) > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">Harvest Ingathering</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.harvestIngathering.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {(contribution.hopeRadio ?? 0) > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">Hope Radio/TV</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.hopeRadio.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {(contribution.sulads ?? 0) > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">Sulads</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.sulads.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {(contribution.specifiedOffering ?? 0) > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">{contribution.specifiedOfferingName || "Specified Offering"}</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.specifiedOffering.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        <tr className="bg-emerald-50/20 print:bg-slate-100/30">
                          <td colSpan={2} className="py-1 px-2.5 text-[12px] uppercase font-extrabold text-emerald-800 tracking-wider">
                            Church Funds
                          </td>
                        </tr>
                        {(contribution.copChurch ?? 0) > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-800">COP</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.copChurch.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {contribution.buildingFund > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">Church Building</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.buildingFund.toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <>
                        {hasTithe && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-3">
                              <div className="font-bold text-slate-800">Spiritual Tithes (10% General Devotional)</div>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.tithe.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {hasCombined && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-3">
                              <div className="font-bold text-emerald-800">Combined Offering Plan (Unified Systematic Offering)</div>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-emerald-700">
                              {preferences.currency} {contribution.combinedOffering.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.buildingFund > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">Sanctuary & Building Capital Fund</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.buildingFund.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.missions > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">Global Missionary Outreach Initiative</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.missions.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.youth > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">Youth Ministries & Youth Camps</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.youth.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.others > 0 && (
                          <tr className="text-slate-700 text-[15px]">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">Restricted Specific / Local Needs Allocation</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.others.toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
                {/* GRAND TOTAL ROW */}
                <div className="border-t-2 border-slate-300 pt-4 flex items-center justify-between">
                  <span className="text-[15px] uppercase font-extrabold text-slate-800 tracking-widest">TOTAL AMOUNT RECEIVED:</span>
                  <span className="text-[19px] sm:text-[21px] font-mono font-black text-slate-950 border-b-2 border-double border-slate-900 pb-0.5">
                    {preferences.currency} {contribution.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* WORD VERSION OF TOTAL AMOUNT */}
                <div className="text-right text-[13px] text-slate-500 font-medium italic mt-1 pb-1 uppercase tracking-wide">
                  Amount in words: {amountToWords(contribution.total, preferences.currency)}
                </div>

                {/* SIGNATURE AREA FOR VERACITY */}
                <div className="pt-12 grid grid-cols-2 gap-8 text-center text-[13px] text-slate-500 a6-receipt-signature-area">
                  <div className="space-y-4">
                    <div className="border-b border-slate-300 pb-2 mx-auto max-w-[200px] a6-receipt-signature-line"></div>
                    <p className="font-semibold uppercase text-slate-700">CHURCH TREASURER SIGNATURE</p>
                    <p className="text-[12px] text-slate-400">Authorized Clerk, {preferences.churchName}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-slate-300 pb-2 mx-auto max-w-[200px] a6-receipt-signature-line"></div>
                    <p className="font-semibold uppercase text-slate-700">CHURCH BOARD REPRESENTATIVE</p>
                    <p className="text-[12px] text-slate-400">Head Pastor / Presiding Board Elder</p>
                  </div>
                </div>

                {/* Appreciation Footer note */}
                <div className="text-center pt-8 text-[13px] text-slate-400 italic">
                  "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver." - 2 Corinthians 9:7
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Modal Bottom control panel (HIDDEN when printing) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3.5 print:hidden">
          <div className="text-xs text-slate-400 italic">
            Formatted specifically for A6 pocket paper size printing (105mm x 148mm).
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
}
