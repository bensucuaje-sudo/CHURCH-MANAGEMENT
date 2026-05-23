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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="sabbath-report-view">
      {/* Dynamic CSS styles injected specifically for standard A4 desktop printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 12mm 15mm 12mm;
          }
          body {
            content-visibility: auto;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          /* Hide all standard elements in the outer DOM shell */
          #sidebar, #app-header, #app-footer, #read-only-banner, #analytics-section > div:first-child, #analytics-section > div:nth-child(2), #sidebar-install-widget, #tithe-tracker-section > *:not(#sabbath-report-modal) {
            display: none !important;
          }
          #sabbath-report-modal {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
          }
          #sabbath-report-modal-content {
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          /* Eliminate scroll layouts and paddings of workspace wrapper */
          #workspace-canvas {
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            background: white !important;
          }
          /* Fill report completely */
          #sabbath-report-view {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .non-printable {
            display: none !important;
          }
          .printable-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: white !important;
            border-radius: 4px !important;
            padding: 12px !important;
          }
          .printable-header {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 12px !important;
            margin-bottom: 20px !important;
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
            font-size: 10px !important;
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
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Sabbath Weekend Report</h3>
            <p className="text-[11px] text-slate-500 font-medium">Consolidated weekly audit worksheet & systematic allocations ledger.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                    <DollarSign size={18} />
                  </div>
                  <p className="text-[9px] text-slate-450 font-black uppercase tracking-wider">Gross Collections</p>
                  <p className="text-base font-black text-slate-900 font-mono mt-1">
                    {preferences.currency} {stats.totalSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-slate-450 mt-0.5 inline-block font-sans font-medium">All envelopes consolidated</span>
                </div>

                {/* Tithes */}
                <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl relative overflow-hidden printable-card">
                  <div className="text-blue-500 absolute right-3 top-3">
                    <ShieldCheck size={18} />
                  </div>
                  <p className="text-[9px] text-blue-900/60 font-black uppercase tracking-wider">Tithe Devotion (10%)</p>
                  <p className="text-base font-black text-blue-900 font-mono mt-1">
                    {preferences.currency} {stats.titheSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-blue-500 mt-0.5 inline-block font-sans font-medium">Systematic Worldwide Plan</span>
                </div>

                {/* Combined Offerings */}
                <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl relative overflow-hidden printable-card">
                  <div className="text-emerald-500 absolute right-3 top-3">
                    <BookmarkCheck size={18} />
                  </div>
                  <p className="text-[9px] text-emerald-900/60 font-black uppercase tracking-wider">Combined Offerings</p>
                  <p className="text-base font-black text-emerald-900 font-mono mt-1">
                    {preferences.currency} {stats.combinedOfferingSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-emerald-500 mt-0.5 inline-block font-sans font-medium">Subject to local division ratios</span>
                </div>

                {/* Other Funds */}
                <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl relative overflow-hidden printable-card">
                  <div className="text-amber-600 absolute right-3 top-3">
                    <Building size={18} />
                  </div>
                  <p className="text-[9px] text-amber-900/60 font-black uppercase tracking-wider">Restricted Local Funds</p>
                  <p className="text-base font-black text-amber-900 font-mono mt-1">
                    {preferences.currency} {(stats.buildingFundSum + stats.missionsSum + stats.youthSum + stats.othersSum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-amber-650 mt-0.5 inline-block font-sans font-medium">Building, Youth, Missions</span>
                </div>
              </div>
            </div>

            {/* SYSTEMATIC ALLOCATIONS BREAKDOWN - DETAILED SHARES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Tithe systematic distribution */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3 shadow-3xs printable-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-blue-600" />
                    Tithe Allocation Shares
                  </h4>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    Total: {preferences.currency} {stats.titheSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {titheAllocations.map(alloc => (
                    <div key={alloc.id} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-800 font-sans leading-tight">
                          {alloc.name}
                        </span>
                        <span className="font-mono text-slate-705 font-bold leading-none">
                          {preferences.currency} {alloc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({alloc.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${alloc.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-450 leading-normal">
                    * Systematic Tithes are remitted directly in whole to the Local Mission/Conference headquarters in accordance with Seventh-day Adventist General Conference guidelines.
                  </p>
                </div>
              </div>

              {/* Combined offering plan allocations */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3 shadow-3xs printable-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                    <Share2 size={13} className="text-emerald-600" />
                    Combined Offering Plan Splits
                  </h4>
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Total: {preferences.currency} {stats.combinedOfferingSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {offeringAllocations.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No allocation splits defined in configurations settings.</p>
                  ) : (
                    offeringAllocations.map(alloc => (
                      <div key={alloc.id} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-800 font-sans leading-tight">
                            {alloc.name}
                          </span>
                          <span className="font-mono text-slate-705 font-bold leading-none">
                            {preferences.currency} {alloc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({alloc.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full" style={{ width: `${alloc.percentage}%` }}></div>
                        </div>
                      </div>
                    ))
                  )}
                  <p className="text-[9px] text-slate-450 leading-normal">
                    * Combined Offering splits are allocated to various missionary sub-tiers and congregational ministries according to the predefined ratio guidelines.
                  </p>
                </div>
              </div>

            </div>

            {/* RESTRICTED AND PAYMENT INSTRUMENT AUDITS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Specialized / Restricted funds registers */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3 shadow-3xs printable-card">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                    <Building size={13} className="text-amber-600" />
                    Restricted Fund Allocations registers
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-50 py-1 font-medium text-slate-650">
                    <span className="font-bold">🏰 Building & Development Fund</span>
                    <span className="font-mono text-slate-800">{preferences.currency} {stats.buildingFundSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 py-1 font-medium text-slate-650">
                    <span className="font-bold">🌍 Global Missions & Ingatherings</span>
                    <span className="font-mono text-slate-800">{preferences.currency} {stats.missionsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 py-1 font-medium text-slate-650">
                    <span className="font-bold">🎈 Youth Ministries & Campouts</span>
                    <span className="font-mono text-slate-800">{preferences.currency} {stats.youthSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 py-1 font-medium text-slate-650">
                    <span className="font-bold">📦 Local Church Others / Specified</span>
                    <span className="font-mono text-slate-800">{preferences.currency} {stats.othersSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 font-bold text-slate-900 border-t border-slate-205">
                    <span>Aggregate Restricted Funds</span>
                    <span className="font-mono">{preferences.currency} {(stats.buildingFundSum + stats.missionsSum + stats.youthSum + stats.othersSum).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown / Denominations preparation */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3 shadow-3xs printable-card">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                    <Wallet size={13} className="text-sky-600" />
                    Vault Deposit Settlement Summary
                  </h4>
                </div>

                <div className="space-y-2 divide-y divide-slate-50 text-xs">
                  {(Object.entries(stats.paymentMethods) as Array<[string, { amount: number; count: number }]>).map(([method, data]) => (
                    <div key={method} className="flex justify-between py-1 font-medium text-slate-650 first:pt-0">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          method === 'Cash' ? 'bg-emerald-500' :
                          method === 'Check' ? 'bg-indigo-500' :
                          method === 'Bank Transfer' ? 'bg-sky-500' :
                          method === 'Mobile Payment' ? 'bg-rose-500' : 'bg-slate-400'
                        }`} />
                        {method} <span className="text-[10px] text-slate-400 font-normal">({data.count} receipts)</span>
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {preferences.currency} {data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* CHECKS SETTLEMENT LIST IF APPLICABLE */}
            {stats.checksList.length > 0 && (
              <div className="border border-slate-100 rounded-xl p-4 space-y-2 printable-card">
                <h4 className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                  🔑 Checks Audits Registers
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse printable-table">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-1 px-2 font-bold text-slate-700">Receipt No</th>
                        <th className="py-1 px-2 font-bold text-slate-700">Member</th>
                        <th className="py-1 px-2 font-bold text-slate-700">Check Reference / Memo Detail</th>
                        <th className="py-1 px-2 font-bold text-slate-700 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.checksList.map((check, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2 font-mono text-slate-500 font-bold">{check.receiptNo}</td>
                          <td className="py-1.5 px-2 font-bold text-slate-700">{check.member}</td>
                          <td className="py-1.5 px-2 text-slate-500 italic">{check.details}</td>
                          <td className="py-1.5 px-2 font-mono font-bold text-indigo-900 text-right">{preferences.currency} {check.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PRIMARY ENVELOPES CHRONOLOGICAL LEDGER */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-1.5">
                <FileSpreadsheet size={11} className="text-blue-500" />
                Ledger breakdown (Chronological Envelopes Register)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 printable-table" id="sabbath-ledger-table">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-250 text-[10px] font-extrabold uppercase text-slate-700 select-none">
                      <th className="py-2 px-3 font-semibold text-center w-14">Rec. No</th>
                      <th className="py-2 px-3 font-semibold">Steward / Contributor</th>
                      <th className="py-2 px-3 font-semibold text-right">Tithe (10%)</th>
                      <th className="py-2 px-3 font-semibold text-right">COP Share</th>
                      <th className="py-2 px-3 font-semibold text-right">Local Funds</th>
                      <th className="py-2 px-3 font-semibold text-right w-24">Receipt Gross</th>
                      <th className="py-2 px-3 font-semibold text-center w-16">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {sortedLedger.map((c) => {
                      const localFundsAmt = (c.buildingFund || 0) + (c.missions || 0) + (c.youth || 0) + (c.others || 0);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-3 font-mono font-bold text-center text-slate-500">{c.receiptNo}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {c.memberName}
                            {c.notes && (
                              <p className="text-[9px] text-slate-400 font-normal italic mt-0.5 compact-text">
                                Memo: {c.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-right text-slate-650">
                            {c.tithe > 0 ? c.tithe.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-right text-slate-650">
                            {c.combinedOffering > 0 ? c.combinedOffering.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-right text-slate-650">
                            {localFundsAmt > 0 ? localFundsAmt.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-right text-slate-900 bg-slate-50/40">
                            {preferences.currency} {c.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-center text-[10px] font-bold text-slate-500">{c.paymentMethod}</td>
                        </tr>
                      );
                    })}
                    {/* Sum line */}
                    <tr className="bg-slate-50 border-t-2 border-slate-250 font-black text-slate-900 border-b border-slate-300">
                      <td colSpan={2} className="py-2.5 px-3 text-left uppercase tracking-wide">TOTAL CONSOLIDATION ALL ENTRIES</td>
                      <td className="py-2.5 px-3 font-mono text-right text-blue-700 bg-blue-50/20">{preferences.currency} {stats.titheSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-emerald-700 bg-emerald-50/20">{preferences.currency} {stats.combinedOfferingSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-amber-700 bg-amber-50/10">{preferences.currency} {(stats.buildingFundSum + stats.missionsSum + stats.youthSum + stats.othersSum).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 font-mono text-right bg-slate-100 font-black">{preferences.currency} {stats.totalSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* OFFICIAL AUTHORIZED AUDIT SIGNATURE LINES BLOCK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-dashed border-slate-300 mt-12" id="signatures-block">
              {/* Prepared by Treasurer */}
              <div className="space-y-6 text-center">
                <div className="border-b border-slate-400 mx-auto max-w-[200px] h-10"></div>
                <div>
                  <p className="text-xs font-black text-slate-850 uppercase leading-none">PREPARED BY:</p>
                  <p className="text-[10px] text-slate-500 mt-1">Church Treasurer / Steward Accountant</p>
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
                  <p className="text-[10px] text-slate-500 mt-1">S Santo Tomas District Pastor</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
