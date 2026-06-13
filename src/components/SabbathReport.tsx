/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, Contribution, ChurchPreferences } from '../types';
import { 
  Printer, 
  Calendar, 
  DollarSign, 
  FileText, 
  Users, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  BookmarkCheck, 
  Info, 
  Building, 
  Share2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Coins 
} from 'lucide-react';

interface SabbathReportProps {
  contributions: Contribution[];
  members: Member[];
  preferences: ChurchPreferences;
}

// Custom Philippine Peso (₱) Icon matching Lucide style
const PesoSign = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 21V3h6a5 5 0 0 1 0 10H6M3 7h10M3 10h10" />
  </svg>
);

// Helper to determine the Saturday (Sabbath) date of any YYYY-MM-DD input
const getSabbathDate = (dateStr: string): string => {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const yr = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10);
  const dy = parseInt(parts[2], 10);
  const date = new Date(yr, mo - 1, dy);
  
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = 6 - day; // Days until upcoming Saturday
  const sabbathDate = new Date(date);
  sabbathDate.setDate(date.getDate() + diff);
  
  const y = sabbathDate.getFullYear();
  const m = String(sabbathDate.getMonth() + 1).padStart(2, '0');
  const d = String(sabbathDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function SabbathReport({ contributions, members, preferences }: SabbathReportProps) {
  // 1. Get the list of all distinctive Sabbath dates represented in contributions
  const sabbathDates = useMemo(() => {
    const datesSet = new Set<string>();
    contributions.forEach(c => {
      if (c.date) {
        datesSet.add(getSabbathDate(c.date));
      }
    });
    
    // Sort reverse-chronologically
    const sorted = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    
    // If empty list, add the current week's Sabbath as default
    if (sorted.length === 0) {
      const today = new Date();
      const sDateStr = getSabbathDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      sorted.push(sDateStr);
    }
    
    return sorted;
  }, [contributions]);

  // Selected Sabbath state (defaults to the latest Sabbath date)
  const [selectedSabbath, setSelectedSabbath] = useState<string>(sabbathDates[0]);

  // Handle auto-switching if the list changes
  React.useEffect(() => {
    if (sabbathDates.length > 0 && !sabbathDates.includes(selectedSabbath)) {
      setSelectedSabbath(sabbathDates[0]);
    }
  }, [sabbathDates, selectedSabbath]);

  // 2. Filter contributions corresponding to the week ending at the selected Sabbath Saturday
  const sabbathContributions = useMemo(() => {
    return contributions.filter(c => getSabbathDate(c.date) === selectedSabbath);
  }, [contributions, selectedSabbath]);

  // 3. Compute Summary Aggregates
  const stats = useMemo(() => {
    let titheSum = 0;
    let combinedOfferingSum = 0;
    let buildingFundSum = 0;
    let missionsSum = 0;
    let youthSum = 0;
    let othersSum = 0;
    let totalSum = 0;
    let copChurchSum = 0;
    let copMissionSum = 0;
    let harvestIngatheringSum = 0;
    let hopeRadioSum = 0;
    let suladsSum = 0;
    let specifiedOfferingSum = 0;
    
    const donors = new Set<string>();
    const paymentMethods: { [key: string]: { amount: number; count: number } } = {
      'Cash': { amount: 0, count: 0 },
      'Check': { amount: 0, count: 0 },
      'Bank Transfer': { amount: 0, count: 0 },
      'Mobile Payment': { amount: 0, count: 0 },
      'Other': { amount: 0, count: 0 },
    };

    const checksList: Array<{ member: string; details: string; amount: number; receiptNo: string }> = [];

    sabbathContributions.forEach(c => {
      titheSum += c.tithe || 0;
      combinedOfferingSum += c.combinedOffering || 0;
      buildingFundSum += c.buildingFund || 0;
      missionsSum += c.missions || 0;
      youthSum += c.youth || 0;
      othersSum += c.others || 0;
      totalSum += c.total || 0;
      
      const copVal = c.combinedOffering || 0;
      copChurchSum += c.copChurch !== undefined ? c.copChurch : (copVal * 0.5);
      copMissionSum += c.copMission !== undefined ? c.copMission : (copVal * 0.5);
      harvestIngatheringSum += c.harvestIngathering || 0;
      hopeRadioSum += c.hopeRadio || 0;
      suladsSum += c.sulads || 0;
      specifiedOfferingSum += c.specifiedOffering || 0;

      if (c.memberId) donors.add(c.memberId);

      const method = c.paymentMethod || 'Cash';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { amount: 0, count: 0 };
      }
      paymentMethods[method].amount += c.total || 0;
      paymentMethods[method].count += 1;

      if (method === 'Check') {
        checksList.push({
          member: c.memberName || 'Anonymous Partner',
          details: c.notes || 'No Check No. written',
          amount: c.total,
          receiptNo: c.receiptNo
        });
      }
    });

    return {
      titheSum,
      combinedOfferingSum,
      buildingFundSum,
      missionsSum,
      youthSum,
      othersSum,
      totalSum,
      copChurchSum,
      copMissionSum,
      harvestIngatheringSum,
      hopeRadioSum,
      suladsSum,
      specifiedOfferingSum,
      uniqueDonorsCount: donors.size,
      receiptCount: sabbathContributions.length,
      paymentMethods,
      checksList,
    };
  }, [sabbathContributions]);

  // Calculate allocations based on church preferences
  const offeringAllocations = useMemo(() => {
    const allocations = preferences.combinedOfferingAllocations || [];
    return allocations.map(alloc => {
      const share = stats.combinedOfferingSum * (alloc.percentage / 100);
      return {
        ...alloc,
        amount: share
      };
    });
  }, [stats.combinedOfferingSum, preferences.combinedOfferingAllocations]);

  const titheAllocations = useMemo(() => {
    const allocations = preferences.titheAllocations || [
      { id: 't1', name: 'Conference/Mission Funds (Tithe Devotion)', percentage: 100 }
    ];
    return allocations.map(alloc => {
      const share = stats.titheSum * (alloc.percentage / 100);
      return {
        ...alloc,
        amount: share
      };
    });
  }, [stats.titheSum, preferences.titheAllocations]);

  const formattedDateHeadline = useMemo(() => {
    if (!selectedSabbath) return '';
    const parts = selectedSabbath.split('-');
    if (parts.length !== 3) return selectedSabbath;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [selectedSabbath]);

  // Format envelope list for tabular presentation
  const sortedLedger = useMemo(() => {
    return [...sabbathContributions].sort((a, b) => a.receiptNo.localeCompare(b.receiptNo));
  }, [sabbathContributions]);

  const [printError, setPrintError] = useState<string | null>(null);

  const handlePrint = () => {
    try {
      setPrintError(null);
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      setPrintError(
        "Browser sandbox restricted direct printing inside the review frame. Please click the 'Open in New Tab' button at the top-right of your screen to print this report directly."
      );
    }
  };

  return (
    <div className="space-y-6" id="sabbath-report-view">
      {printError && (
        <div className="bg-amber-50 border border-amber-205 text-amber-900 text-xs px-4 py-3 rounded-xl flex items-start gap-2.5 justify-between max-w-2xl mx-auto non-printable animate-fade-in shadow-xs">
          <div className="flex gap-2 text-left">
            <span className="text-sm leading-none pt-0.5">⚠️</span>
            <div>
              <p className="font-bold">Printing within Sandbox Restricted</p>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">{printError}</p>
            </div>
          </div>
          <button 
            onClick={() => setPrintError(null)} 
            className="text-amber-500 hover:text-amber-700 font-bold self-start cursor-pointer text-[10px] uppercase font-mono px-1.5 py-0.5 hover:bg-amber-100/50 rounded shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dynamic CSS styles injected specifically for standard A4 desktop printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm !important;
          }
          html, body {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Ensure all parent containers of the printable modal are visible as block and overflow normally */
          #root, #church-app-root, #main-content-panel, #workspace-canvas, #tithe-tracker-section {
            display: block !important;
            visibility: visible !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          
          /* Hide non-printable global areas securely using display: none */
          aside, header, footer, #sidebar, #app-header, #app-footer, #read-only-banner, .non-printable, .print\\:hidden, [class*="print:hidden"] {
            display: none !important;
            visibility: hidden !important;
          }

          /* Hide other parallel workspace panels and tabs, so only the report card is printed */
          #workspace-canvas > :not(#tithe-tracker-section),
          #tithe-tracker-section > :not(#sabbath-report-modal) {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Position the report modal to overlay exactly over the print canvas */
          #sabbath-report-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            z-index: 9999999 !important;
            visibility: visible !important;
          }
          
          #sabbath-report-modal-content {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            overflow: visible !important;
            background: white !important;
            visibility: visible !important;
          }
          
          /* Fill report completely */
          #sabbath-report-view {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
            width: 100% !important;
          }
          
          /* COMPRESSION OVERRIDES FOR SINGLE PAGE A4 PRINT */
          #sabbath-overall-canvas {
            padding: 8px 12px !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          .printable-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            background: white !important;
            border-radius: 6px !important;
            padding: 6px 10px !important;
            margin: 0 !important;
          }
          
          .printable-header {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 6px !important;
            margin-bottom: 15px !important;
          }
          
          /* Override spacing of elements */
          .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 10px !important;
          }
          .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 8px !important;
          }
          .space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 6px !important;
          }
          .space-y-2.5 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 5px !important;
          }
          .divide-y > :not([hidden]) ~ :not([hidden]) {
            border-top-width: 1px !important;
          }
          
          /* Specific layouts scaling and padding */
          .grid {
            gap: 10px !important;
          }
          .p-4 {
            padding: 8px 12px !important;
          }
          .p-6, .p-8 {
            padding: 10px 14px !important;
          }
          .pt-8 {
            padding-top: 12px !important;
          }
          .pb-6 {
            padding-bottom: 8px !important;
          }
          .mt-12 {
            margin-top: 15px !important;
          }
          .mt-1 {
            margin-top: 3px !important;
          }
          .mb-3 {
            margin-bottom: 6px !important;
          }
          
          /* General typography compression */
          h1, .text-base {
            font-size: 19px !important;
            line-height: normal !important;
          }
          h2, .text-sm {
            font-size: 17.5px !important;
            line-height: normal !important;
          }
          h3, h4, .text-xs, .text-\[11px\], .text-\[10px\], .text-\[9px\] {
            font-size: 16px !important;
            line-height: normal !important;
          }
          span, p, td, th {
            font-size: 16px !important;
            line-height: normal !important;
          }
          .text-lg {
            font-size: 19px !important;
            line-height: normal !important;
          }
          /* Stat card value display metric sizes */
          .text-base.font-black,
          .text-base.font-mono,
          td .text-emerald-600,
          span .text-emerald-600 {
            font-size: 18px !important;
            font-weight: 900 !important;
          }
          
          /* Signatures block compression */
          #signatures-block {
            margin-top: 15px !important;
            padding-top: 12px !important;
            gap: 15px !important;
            border-top-width: 1px !important;
          }
          #signatures-block > .space-y-6 {
            margin-top: 0 !important;
          }
          #signatures-block .h-10 {
            height: 24px !important;
          }
          #signatures-block .text-xs {
            font-size: 16px !important;
            font-weight: 800 !important;
          }
          #signatures-block .text-\[10px\] {
            font-size: 15.5px !important;
            margin-top: 2px !important;
          }
          
          .printable-table th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: bold !important;
            border-bottom: 2px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .printable-table td {
            border-bottom: 1px solid #e2e8f0 !important;
          }
          
          .compact-text {
            font-size: 18px !important;
            color: black !important;
          }
        }
      `}</style>

      {/* NON-PRINTABLE SELECTOR TOP CONTROL BANNER */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-4 non-printable">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Sabbath Weekly Report</h3>
            <p className="text-[11px] text-slate-500 font-medium">Consolidated weekly audit worksheet & systematic allocations ledger.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sabbath selection dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Select Sabbath:</span>
            <select
              value={selectedSabbath}
              onChange={(e) => setSelectedSabbath(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            >
              {sabbathDates.map((date) => (
                <option key={date} value={date}>
                  🇸🇬 Sabbath - {date}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handlePrint}
              disabled={sabbathContributions.length === 0}
              className={`flex items-center gap-2 px-4 py-2 text-white bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold transition shadow-3xs cursor-pointer ${
                sabbathContributions.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Printer size={13} />
              <span>Print Report (PDF)</span>
            </button>
            <span className="text-[9px] text-slate-400 font-medium text-right max-w-[200px] leading-tight block">
              ⚠️ If print doesn't launch, click <b>Open in New Tab</b> (↗) at top-right to print natively.
            </span>
          </div>
        </div>
      </div>

      {sabbathContributions.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center space-y-4 printable-card">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto">
            <Info size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850">No Stewardship Activity recorded for Sabbath {selectedSabbath}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We couldn't detect any logs in the system matching this week. To generate analytical report files, switch to the <b className="font-bold underline text-blue-600">Receipt Ledger Tracker</b> and record church offerings first.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* COMPREHENSIVE FINANCIAL HEADER SECTION */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 space-y-6 printable-card" id="sabbath-overall-canvas">
            
            {/* Church Branding Banner Block */}
            <div className="border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-6 printable-header">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Coins className="text-blue-600 self-center shrink-0 hidden md:block" size={28} />
                  <div>
                    <h1 className="text-base font-black text-slate-900 uppercase tracking-tight font-sans">
                      {preferences.churchName}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wide uppercase">
                      Official Seventh-Day Adventist Weekly Financial Worksheet
                    </p>
                  </div>
                </div>
                
                <div className="text-[11px] text-slate-505 leading-relaxed font-sans space-y-0.5">
                  <p>🏛️ <b>Address:</b> {preferences.churchAddress}</p>
                  <p>📧 <b>Email:</b> {preferences.churchEmail}</p>
                </div>
              </div>

              {/* Selected Sabbath Date Metadata */}
              <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl text-right shrink-0 md:max-w-xs space-y-1.5 printable-card">
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none">REPORTING SABBATH DATE</p>
                <p className="text-xs font-black text-slate-900 tracking-tight leading-none pt-0.5 text-blue-700">
                  {formattedDateHeadline}
                </p>
                <div className="border-t border-slate-200 my-1 pt-1 font-mono text-[9px] text-slate-450 leading-relaxed text-right">
                  <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} UTC</p>
                  <p>Security Signature: <strong className="font-bold">SYSTEM-OK</strong></p>
                </div>
              </div>
            </div>

            {/* HIGH LEVEL STATISTICS (TIGHT BENTO METRICS) */}
            <div>
              <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
                <TrendingUp size={11} className="text-sky-500" />
                Sabbath Receipt Aggregates
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Collections */}
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl relative overflow-hidden printable-card">
                  <div className="text-slate-400 absolute right-3 top-3">
                    <PesoSign size={18} />
                  </div>
                  <p className="text-[9px] text-slate-450 font-black uppercase tracking-wider">Gross Collections</p>
                  <p className="text-base font-black text-slate-900 font-mono mt-1">
                    {preferences.currency} {stats.totalSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-slate-450 mt-0.5 inline-block font-sans font-medium">All envelopes consolidated</span>
                </div>

                {/* Tithes */}
                <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl relative overflow-hidden printable-card">
                  <p className="text-[9px] text-blue-900/60 font-black uppercase tracking-wider">TOTAL TITHES</p>
                  <p className="text-base font-black text-blue-900 font-mono mt-1">
                    {preferences.currency} {stats.titheSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Combined Offerings */}
                <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl relative overflow-hidden printable-card">
                  <p className="text-[9px] text-emerald-900/60 font-black uppercase tracking-wider">TOTAL COP</p>
                  <p className="text-base font-black text-emerald-900 font-mono mt-1">
                    {preferences.currency} {stats.combinedOfferingSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Other Funds */}
                <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl relative overflow-hidden printable-card">
                  <p className="text-[9px] text-amber-900/60 font-black uppercase tracking-wider">OTHER FUNDS</p>
                  <p className="text-base font-black text-amber-900 font-mono mt-1">
                    {preferences.currency} {(stats.buildingFundSum + stats.missionsSum + stats.youthSum + stats.othersSum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* SYSTEMATIC ALLOCATIONS BREAKDOWN - DETAILED SHARES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Mission systematic distribution */}
              {(() => {
                const totalMissionSum = stats.titheSum + stats.copMissionSum + stats.harvestIngatheringSum + stats.hopeRadioSum + stats.suladsSum + stats.specifiedOfferingSum;
                const tithePercent = totalMissionSum > 0 ? Math.round((stats.titheSum / totalMissionSum) * 100) : 0;
                const copMissionPercent = totalMissionSum > 0 ? Math.round((stats.copMissionSum / totalMissionSum) * 100) : 0;
                const harvestPercent = totalMissionSum > 0 ? Math.round((stats.harvestIngatheringSum / totalMissionSum) * 100) : 0;
                const hopePercent = totalMissionSum > 0 ? Math.round((stats.hopeRadioSum / totalMissionSum) * 100) : 0;
                const suladsPercent = totalMissionSum > 0 ? Math.round((stats.suladsSum / totalMissionSum) * 100) : 0;
                const specifiedPercent = totalMissionSum > 0 ? Math.round((stats.specifiedOfferingSum / totalMissionSum) * 100) : 0;

                return (
                  <div className="border border-slate-100 rounded-xl p-4 space-y-3 shadow-3xs printable-card">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                        MISSION FUNDS
                      </h4>
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        Total: {preferences.currency} {totalMissionSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-800 font-sans leading-tight">
                            Tithe Devotion (100%)
                          </span>
                          <span className="font-mono text-slate-705 font-bold leading-none">
                            {preferences.currency} {stats.titheSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({tithePercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full" style={{ width: `${tithePercent}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-800 font-sans leading-tight">
                            COP (50%)
                          </span>
                          <span className="font-mono text-slate-705 font-bold leading-none">
                            {preferences.currency} {stats.copMissionSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({copMissionPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full" style={{ width: `${copMissionPercent}%` }}></div>
                        </div>
                      </div>

                      {stats.harvestIngatheringSum > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-800 font-sans leading-tight">
                              Harvest Ingathering
                            </span>
                            <span className="font-mono text-slate-705 font-bold leading-none">
                              {preferences.currency} {stats.harvestIngatheringSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({harvestPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full" style={{ width: `${harvestPercent}%` }}></div>
                          </div>
                        </div>
                      )}

                      {stats.hopeRadioSum > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-800 font-sans leading-tight">
                              Hope Radio/TV
                            </span>
                            <span className="font-mono text-slate-705 font-bold leading-none">
                              {preferences.currency} {stats.hopeRadioSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({hopePercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full" style={{ width: `${hopePercent}%` }}></div>
                          </div>
                        </div>
                      )}

                      {stats.suladsSum > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-800 font-sans leading-tight">
                              Sulads
                            </span>
                            <span className="font-mono text-slate-705 font-bold leading-none">
                              {preferences.currency} {stats.suladsSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({suladsPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full" style={{ width: `${suladsPercent}%` }}></div>
                          </div>
                        </div>
                      )}

                      {stats.specifiedOfferingSum > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-800 font-sans leading-tight">
                              Specified Offering
                            </span>
                            <span className="font-mono text-slate-705 font-bold leading-none">
                              {preferences.currency} {stats.specifiedOfferingSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({specifiedPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full" style={{ width: `${specifiedPercent}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Combined offering plan allocations */}
              {(() => {
                const totalChurchSum = stats.copChurchSum + stats.buildingFundSum;
                const copChurchPercent = totalChurchSum > 0 ? Math.round((stats.copChurchSum / totalChurchSum) * 100) : 0;
                const buildingPercent = totalChurchSum > 0 ? Math.round((stats.buildingFundSum / totalChurchSum) * 100) : 0;

                return (
                  <div className="border border-slate-100 rounded-xl p-4 space-y-3 shadow-3xs printable-card">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                        CHURCH FUNDS
                      </h4>
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Total: {preferences.currency} {totalChurchSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-800 font-sans leading-tight">
                            COP (50%)
                          </span>
                          <span className="font-mono text-slate-705 font-bold leading-none">
                            {preferences.currency} {stats.copChurchSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({copChurchPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full" style={{ width: `${copChurchPercent}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-800 font-sans leading-tight">
                            Church Building
                          </span>
                          <span className="font-mono text-slate-705 font-bold leading-none">
                            {preferences.currency} {stats.buildingFundSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({buildingPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full" style={{ width: `${buildingPercent}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>



            {/* OFFICIAL AUTHORIZED AUDIT SIGNATURE LINES BLOCK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-dashed border-slate-300 mt-12" id="signatures-block">
              {/* Prepared by Treasurer */}
              <div className="space-y-6 text-center">
                <div className="border-b border-slate-400 mx-auto max-w-[200px] h-10"></div>
                <div>
                  <p className="text-xs font-black text-slate-850 uppercase leading-none">PREPARED BY:</p>
                  <p className="text-[10px] text-slate-500 mt-1">Church Treasurer</p>
                </div>
              </div>

              {/* Verified by Head Elder */}
              <div className="space-y-6 text-center">
                <div className="border-b border-slate-400 mx-auto max-w-[200px] h-10"></div>
                <div>
                  <p className="text-xs font-black text-slate-850 uppercase leading-none">VERIFIED AND AUDITED BY:</p>
                  <p className="text-[10px] text-slate-500 mt-1">Church Head Elder / Auditor Board</p>
                </div>
              </div>

              {/* Approved by Pastor */}
              <div className="space-y-6 text-center">
                <div className="border-b border-slate-400 mx-auto max-w-[200px] h-10"></div>
                <div>
                  <p className="text-xs font-black text-slate-850 uppercase leading-none">APPROVED BY:</p>
                  <p className="text-[10px] text-slate-500 mt-1">Church Pastor - Santo Tomas Central</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
