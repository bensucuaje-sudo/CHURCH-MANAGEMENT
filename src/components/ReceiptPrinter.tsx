/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Contribution, ChurchPreferences } from '../types';
import { Printer, X, ShieldAlert, CheckCircle2, BookmarkCheck, Landmark } from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';

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

interface ReceiptPrinterProps {
  contribution: Contribution | null;
  preferences: ChurchPreferences;
  onClose: () => void;
}

export default function ReceiptPrinter({ contribution, preferences, onClose }: ReceiptPrinterProps) {
  // Safe exit if null
  if (!contribution) return null;

  // Calculates combined offering plan split
  const offeringAllocationsCalculated = preferences.combinedOfferingAllocations.map(plan => {
    const share = contribution.combinedOffering * (plan.percentage / 100);
    return {
      ...plan,
      amount: share
    };
  });

  // Execute browser printing securely
  const triggerBrowserPrint = () => {
    window.print();
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

          /* Hide siblings and center the receipt overlay */
          body > #root > *,
          body > div:not(#receipt-modal) {
            display: none !important;
          }
          
          #receipt-modal {
            position: fixed !important;
            inset: 0 !important;
            width: 105mm !important;
            height: 148mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            z-index: 9999999 !important;
            overflow: hidden !important;
            display: block !important;
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
            font-size: 7.2px !important;
            line-height: 1.15 !important;
          }

          .a6-receipt-card h1 {
            font-size: 10px !important;
            line-height: 1.15 !important;
            margin-top: 1px !important;
          }

          .a6-receipt-card h2 {
            font-size: 7px !important;
            line-height: 1.15 !important;
          }

          .a6-receipt-card h3 {
            font-size: 6px !important;
            line-height: 1.15 !important;
            margin-bottom: 2px !important;
          }

          .a6-receipt-card th {
            font-size: 6px !important;
            padding-bottom: 1px !important;
          }

          .a6-receipt-card td {
            font-size: 7px !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }

          .a6-receipt-card .text-base,
          .a6-receipt-card .text-lg {
            font-size: 9px !important;
          }

          .a6-receipt-card .text-[10px] {
            font-size: 6px !important;
          }

          .a6-receipt-card .text-[9px] {
            font-size: 5.5px !important;
          }

          .a6-receipt-card .pb-6 {
            padding-bottom: 2px !important;
            margin-bottom: 2px !important;
          }

          .a6-receipt-card .py-6 {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }

          .a6-receipt-card .py-3 {
            padding-top: 1px !important;
            padding-bottom: 1px !important;
          }

          .a6-receipt-card .py-2.5 {
            padding-top: 0.8px !important;
            padding-bottom: 0.8px !important;
          }

          .a6-receipt-card .py-1.5 {
            padding-top: 0.5px !important;
            padding-bottom: 0.5px !important;
          }

          .a6-receipt-card .mb-6 {
            margin-bottom: 2px !important;
          }

          .a6-receipt-card .mt-6 {
            margin-top: 2px !important;
          }

          .a6-receipt-card .mt-2 {
            margin-top: 1px !important;
          }

          .a6-receipt-grid {
            padding-top: 1.5px !important;
            padding-bottom: 1.5px !important;
            margin-bottom: 1.5px !important;
          }

          .a6-receipt-card .space-y-5 > * + * {
            margin-top: 2px !important;
          }

          .a6-receipt-card .space-y-4 > * + * {
            margin-top: 1px !important;
          }

          .a6-receipt-signature-area {
            padding-top: 5px !important;
            margin-top: 5px !important;
            gap: 10px !important;
          }

          .a6-receipt-signature-area .space-y-4 > * + * {
            margin-top: 1px !important;
          }

          .a6-receipt-signature-line {
            padding-bottom: 1px !important;
            max-width: 70px !important;
          }

          .a6-receipt-card .pt-8 {
            padding-top: 2px !important;
          }

          .a6-receipt-icon {
            width: 18px !important;
            height: 22px !important;
            border-radius: 3px !important;
            font-size: 8px !important;
            margin-top: 0 !important;
            margin-bottom: 1px !important;
          }

          .a6-receipt-watermark {
            opacity: 0.01 !important;
          }

          .a6-receipt-watermark svg {
            width: 80px !important;
            height: 80px !important;
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
              onClick={triggerBrowserPrint}
              className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 hover:cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Official Receipt</span>
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
          <div id="print-receipt-area" className="w-full max-w-2xl mx-auto bg-white border-2 border-slate-200/80 rounded-2xl p-6 md:p-8 relative shadow-sm print:border-none print:shadow-none print:m-0 print:p-0 a6-receipt-card">
            
            {/* Internal layout border */}
            <div className="border border-slate-100 rounded-xl p-5 md:p-7 print:border-none">
              
              {/* Church Letterhead */}
              <div className="text-center space-y-1 pb-6 border-b border-dashed border-slate-200">
                <ChurchLogo size="receipt" />
                <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-3">{preferences.churchName}</h1>
                <p className="text-[10px] text-slate-500 font-medium">{preferences.churchAddress}</p>
                <p className="text-[9px] text-slate-400 font-mono">Contact: {preferences.churchEmail} • Stewardship Office</p>
              </div>

              {/* Document Identity metadata */}
              <div className="py-6 flex flex-col sm:flex-row justify-between gap-4 text-xs a6-receipt-grid">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">OFFICIAL RECEIPT RECEIVED FROM:</div>
                  <div className="text-base font-bold text-slate-800">{contribution.memberName}</div>
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
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 print:hidden">CHURCH TREASURER'S RECEIPT</h2>
                <h2 className="hidden print:block text-xs font-extrabold uppercase tracking-widest text-slate-700">CHURCH TREASURER'S RECEIPT</h2>
              </div>

              {/* FINANCIAL ITEMS ITEMIZED LIST */}
              <div className="space-y-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                      <th className="pb-2 text-left">Fund Description</th>
                      <th className="pb-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Check if has new categorized fields or legacy fields */}
                    {contribution.copMission !== undefined ? (
                      <>
                        {/* MISSION FUNDS SECTIONS */}
                        <tr className="bg-blue-50/30 print:bg-slate-100/30">
                          <td colSpan={2} className="py-1 px-2.5 text-[9px] uppercase font-extrabold text-blue-800 tracking-wider">
                            Mission Funds
                          </td>
                        </tr>
                        {contribution.tithe > 0 && (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-800">Tithe</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.tithe.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {contribution.copMission > 0 && (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-800">COP (Combined Offering)</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.copMission.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {contribution.harvestIngathering && contribution.harvestIngathering > 0 ? (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">Harvest Ingathering</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.harvestIngathering.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}
                        {contribution.hopeRadio && contribution.hopeRadio > 0 ? (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">Hope Radio/TV</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.hopeRadio.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}
                        {contribution.sulads && contribution.sulads > 0 ? (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">Sulads</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.sulads.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}
                        {contribution.specifiedOffering && contribution.specifiedOffering > 0 ? (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-700">{contribution.specifiedOfferingName || "Specified Offering"}</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.specifiedOffering.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}

                        {/* CHURCH FUNDS SECTIONS */}
                        <tr className="bg-emerald-50/20 print:bg-slate-100/30">
                          <td colSpan={2} className="py-1 px-2.5 text-[9px] uppercase font-extrabold text-emerald-800 tracking-wider">
                            Church Funds
                          </td>
                        </tr>
                        {contribution.copChurch && contribution.copChurch > 0 ? (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2 pl-4">
                              <div className="font-bold text-slate-800">COP</div>
                            </td>
                            <td className="py-2 pr-2 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.copChurch.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}
                        {contribution.buildingFund > 0 && (
                          <tr className="text-slate-700 text-xs">
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
                        {/* Legacy Rendering */}
                        {hasTithe && (
                          <tr className="text-slate-700">
                            <td className="py-3">
                              <div className="font-bold text-slate-800">Spiritual Tithes (10% General Devotional)</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 print:hidden">Assumed covenant pledge devotion</div>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-slate-950">
                              {preferences.currency} {contribution.tithe.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {hasCombined && (
                          <tr className="text-slate-700">
                            <td className="py-3">
                              <div className="font-bold text-emerald-800">Combined Offering Plan (Unified Systematic Offering)</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 print:hidden">Auto-allocated to regional and local missions list</div>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-emerald-700">
                              {preferences.currency} {contribution.combinedOffering.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.buildingFund > 0 && (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">🏛️ Sanctuary & Building Capital Fund</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.buildingFund.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.missions > 0 && (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">🌐 Global Missionary Outreach Initiative</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.missions.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.youth > 0 && (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">🎒 Youth Ministries & Youth Camps</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-800">
                              {preferences.currency} {contribution.youth.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {contribution.others > 0 && (
                          <tr className="text-slate-700 text-xs">
                            <td className="py-2.5">
                              <div className="font-bold text-slate-700">🕯️ Restricted Specific / Local Needs Allocation</div>
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

                {/* COMBINED OFFERING SYSTEMATIC ALLOCATIONS EXPANDED PANEL (Only if combinedOffering listed) */}
                {hasCombined && (
                  <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 mt-2 print:bg-slate-50 print:border hover:border-emerald-200 transition">
                    <h3 className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase mb-2">
                      🎒 DETAILED ALLOCATION CALCULATION BREAKOUT FOR THE COMBINED OFFERING PLAN
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3 leading-relaxed print:hidden">
                      This church utilizes the <b>Combined Offering Plan</b> model. Your unified offering contribution of <b className="text-slate-700">{preferences.currency} {contribution.combinedOffering.toFixed(2)}</b> is systematically divided according to approved percentage distributions:
                    </p>

                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-emerald-100 text-emerald-800 font-bold opacity-80 uppercase tracking-widest text-[8px] pb-1">
                          <th className="pb-1 text-left">Recipient Ministry / Allocation Branch</th>
                          <th className="pb-1 text-center">Approved %</th>
                          <th className="pb-1 text-right">Calculated Allotment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100/40">
                        {offeringAllocationsCalculated.map(p => (
                          <tr key={p.id} className="text-slate-700">
                            <td className="py-1.5 font-medium">{p.name}</td>
                            <td className="py-1.5 text-center font-mono">{p.percentage}%</td>
                            <td className="py-1.5 text-right font-mono font-semibold text-emerald-700">
                              {preferences.currency} {p.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* GRAND TOTAL ROW */}
                <div className="border-t-2 border-slate-300 pt-4 flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-slate-800 tracking-widest">TOTAL AMOUNT RECEIVED:</span>
                  <span className="text-base sm:text-lg font-mono font-black text-slate-950 border-b-2 border-double border-slate-900 pb-0.5">
                    {preferences.currency} {contribution.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* WORD VERSION OF TOTAL AMOUNT */}
                <div className="text-right text-[10px] text-slate-500 font-medium italic mt-1 pb-1 uppercase tracking-wide">
                  Amount in words: {amountToWords(contribution.total, preferences.currency)}
                </div>

                {/* SIGNATURE AREA FOR VERACITY */}
                <div className="pt-12 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500 a6-receipt-signature-area">
                  <div className="space-y-4">
                    <div className="border-b border-slate-300 pb-2 mx-auto max-w-[200px] a6-receipt-signature-line"></div>
                    <p className="font-semibold uppercase text-slate-700">CHURCH TREASURER SIGNATURE</p>
                    <p className="text-[9px] text-slate-400">Authorized Clerk, {preferences.churchName}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-slate-300 pb-2 mx-auto max-w-[200px] a6-receipt-signature-line"></div>
                    <p className="font-semibold uppercase text-slate-700">CHURCH BOARD REPRESENTATIVE</p>
                    <p className="text-[9px] text-slate-400">Head Pastor / Presiding Board Elder</p>
                  </div>
                </div>

                {/* Appreciation Footer note */}
                <div className="text-center pt-8 text-[10px] text-slate-400 italic">
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
