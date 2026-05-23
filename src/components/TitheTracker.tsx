/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, Contribution, ChurchPreferences } from '../types';
import { CreditCard, Plus, IndianRupee, Printer, ArrowRight, Search, FileDown, Calendar, Receipt, Sparkles, Trash2, ShieldAlert, FileText, X } from 'lucide-react';
import { exportContributionsToCSV } from '../utils/exporter';
import SabbathReport from './SabbathReport';

interface TitheTrackerProps {
  contributions: Contribution[];
  members: Member[];
  preferences: ChurchPreferences;
  onAddContribution: (contribution: Omit<Contribution, 'id'>) => void;
  onSelectForReceipt: (contribution: Contribution) => void;
  onDeleteContribution?: (id: string) => void;
  isAdmin?: boolean;
}

export default function TitheTracker({
  contributions,
  members,
  preferences,
  onAddContribution,
  onSelectForReceipt,
  onDeleteContribution,
  isAdmin = true
}: TitheTrackerProps) {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | string>('all');
  
  // Deleting Contribution States
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState<string>('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string>('');
  
  // Date Filtering States
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'custom'>('today');
  const [customDateFilter, setCustomDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [showSabbathReport, setShowSabbathReport] = useState(false);

  // Ledger Entry Fields
  const [memberId, setMemberId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiptNo, setReceiptNo] = useState(() => `REC-${new Date().getFullYear()}-${String(contributions.length + 101).padStart(4, '0')}`);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Bank Transfer' | 'Mobile Payment' | 'Other'>('Cash');
  const [notes, setNotes] = useState('');
  const [amountToInput, setAmountToInput] = useState<number>(0);

  // Fund Fields (numeric states)
  const [tithe, setTithe] = useState<number>(0);
  const [copInput, setCopInput] = useState<number>(0);
  const [harvestIngathering, setHarvestIngathering] = useState<number>(0);
  const [hopeRadio, setHopeRadio] = useState<number>(0);
  const [sulads, setSulads] = useState<number>(0);
  const [specifiedOffering, setSpecifiedOffering] = useState<number>(0);
  const [specifiedOfferingLabel, setSpecifiedOfferingLabel] = useState('Specified Offering');
  const [buildingFund, setBuildingFund] = useState<number>(0);

  // Derived COP parts (50-50 split between Mission and Church)
  const copMission = copInput * 0.5;
  const copChurch = copInput * 0.5;

  // Computed totals for categories
  const totalMissionFunds = useMemo(() => {
    return (tithe || 0) + copMission + (harvestIngathering || 0) + (hopeRadio || 0) + (sulads || 0) + (specifiedOffering || 0);
  }, [tithe, copMission, harvestIngathering, hopeRadio, sulads, specifiedOffering]);

  const totalChurchFunds = useMemo(() => {
    return copChurch + (buildingFund || 0);
  }, [copChurch, buildingFund]);

  // Live total sum calculation
  const totalSum = useMemo(() => {
    return totalMissionFunds + totalChurchFunds;
  }, [totalMissionFunds, totalChurchFunds]);

  // Dynamic capping logic to make sure the live sum doesn't exceed amountToInput
  const getCappedValue = (fieldName: string, value: number): number => {
    if (amountToInput <= 0) return value;
    
    // Calculate what the proposed sum would be without this field's current value
    let otherSum = 0;
    if (fieldName !== 'tithe') otherSum += tithe;
    if (fieldName !== 'cop') otherSum += copMission; // COP counts once toward totalSum
    if (fieldName !== 'harvestIngathering') otherSum += harvestIngathering;
    if (fieldName !== 'hopeRadio') otherSum += hopeRadio;
    if (fieldName !== 'sulads') otherSum += sulads;
    if (fieldName !== 'specifiedOffering') otherSum += specifiedOffering;
    if (fieldName !== 'buildingFund') otherSum += buildingFund;

    const remaining = amountToInput - otherSum;
    if (value > remaining) {
      return Math.max(0, remaining);
    }
    return value;
  };

  // Live offering plan breakdown simulation based on preferences percentage ratios
  const simulatedBreakdown = useMemo(() => {
    const val = copMission || 0;
    if (val <= 0) return [];
    return preferences.combinedOfferingAllocations.map(plan => ({
      ...plan,
      allotted: val * (plan.percentage / 100)
    }));
  }, [copMission, preferences]);

  // Handle open entry form & refresh sequential receipt number
  const handleOpenEntry = () => {
    const sequence = contributions.length + 12 + Math.floor(Math.random() * 5); // ensure incremental numbers
    setReceiptNo(`REC-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`);
    
    // reset logs
    setMemberId(members[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Cash');
    setNotes('');
    setTithe(0);
    setCopInput(0);
    setHarvestIngathering(0);
    setHopeRadio(0);
    setSulads(0);
    setSpecifiedOffering(0);
    setSpecifiedOfferingLabel('Specified Offering');
    setBuildingFund(0);
    setAmountToInput(0);
    setIsLogOpen(true);
  };

  // Submit Logger
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      alert("Please select or register a contributing member first");
      return;
    }
    if (totalSum <= 0) {
      alert("Please log at least one positive currency value for tithe or offering funds");
      return;
    }
    if (amountToInput > 0 && totalSum > amountToInput) {
      alert(`The TOTAL COLLECTED SUM of ${preferences.currency} ${totalSum.toFixed(2)} exceeds the Amount to Input (${preferences.currency} ${amountToInput.toFixed(2)}). Please reduce your fund values or raise the limit.`);
      return;
    }

    const matchedMember = members.find(m => m.id === memberId);
    if (!matchedMember) return;

    onAddContribution({
      memberId,
      memberName: matchedMember.name,
      date,
      receiptNo,
      paymentMethod,
      tithe: Number(tithe) || 0,
      combinedOffering: Number(copMission) || 0,
      buildingFund: Number(buildingFund) || 0,
      missions: Number(harvestIngathering) || 0,
      youth: (Number(hopeRadio) || 0) + (Number(sulads) || 0),
      others: Number(specifiedOffering) || 0,
      total: Number(totalSum) || 0,
      notes: notes.trim(),
      copMission: Number(copMission) || 0,
      harvestIngathering: Number(harvestIngathering) || 0,
      hopeRadio: Number(hopeRadio) || 0,
      sulads: Number(sulads) || 0,
      specifiedOffering: Number(specifiedOffering) || 0,
      copChurch: Number(copChurch) || 0,
      specifiedOfferingName: specifiedOfferingLabel.trim() || 'Specified Offering'
    });

    setIsLogOpen(false);
  };

  // Filter contributions
  const filteredContributions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return contributions.filter(c => {
      const matchSearch = 
        c.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.memberId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchMethod = methodFilter === 'all' || c.paymentMethod === methodFilter;
      
      let matchDate = true;
      if (dateFilterMode === 'today') {
        matchDate = c.date === todayStr;
      } else if (dateFilterMode === 'custom') {
        matchDate = c.date === customDateFilter;
      }
      
      return matchSearch && matchMethod && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Latest first in transaction table
  }, [contributions, searchTerm, methodFilter, dateFilterMode, customDateFilter]);

  // Dynamic stats calculation for filtered/selected date contributions
  const filteredTotals = useMemo(() => {
    return filteredContributions.reduce((acc, c) => {
      acc.tithe += c.tithe;
      acc.combinedOffering += c.combinedOffering;
      acc.total += c.total;
      return acc;
    }, { tithe: 0, combinedOffering: 0, total: 0 });
  }, [filteredContributions]);

  const formatDateReadable = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parsed = new Date(dateStr + 'T00:00:00');
      return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" id="tithe-tracker-section">
      {/* Ledger Workspace */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        {/* Toolbar Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/55 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by receipt or contributor name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 placeholder-slate-400"
              />
            </div>
            
            {/* Method filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-3xs text-xs font-medium text-slate-600 shrink-0">
              <span className="text-slate-400">Payment Channel:</span>
              <select 
                value={methodFilter} 
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-700 cursor-pointer font-semibold"
              >
                <option value="all">All Channels</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Payment">Mobile Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Date filter selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-3xs text-xs font-medium text-slate-600 shrink-0">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-slate-400">Date Filter:</span>
              <select 
                value={dateFilterMode} 
                onChange={(e) => setDateFilterMode(e.target.value as any)}
                className="bg-transparent border-none outline-none text-slate-700 cursor-pointer font-semibold"
              >
                <option value="all">All Calendar Dates</option>
                <option value="today">Today's Collections</option>
                <option value="custom">Specific Date...</option>
              </select>

              {dateFilterMode === 'custom' && (
                <input 
                  type="date"
                  value={customDateFilter}
                  onChange={(e) => setCustomDateFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-mono text-[10px] outline-none focus:ring-1 focus:ring-blue-500 transition ml-1"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportContributionsToCSV(contributions, preferences)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg shadow-3xs transition duration-150 flex items-center gap-1.5 font-sans"
            >
              📊 Export Ledger to Excel
            </button>
            <button
              onClick={() => setShowSabbathReport(true)}
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-4 py-2 rounded-lg shadow-3xs transition duration-150 flex items-center gap-1.5 font-sans cursor-pointer"
              id="btn-view-sabbath-report-ledger"
            >
              <FileText size={14} className="text-sky-600 animate-pulse" />
              <span>📋 Weekly Sabbath Report</span>
            </button>
            {isAdmin && (
              <button
                onClick={handleOpenEntry}
                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition duration-150 flex items-center gap-1.5 hover:cursor-pointer font-sans"
              >
                <Plus size={14} /> Record Giving Record
              </button>
            )}
          </div>
        </div>

        {/* Active Date Filter Summary Bar */}
        {dateFilterMode !== 'all' && (
          <div className="bg-blue-50/40 border-b border-blue-100/50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in" id="date-filter-summary">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  {dateFilterMode === 'today' ? "TODAY'S COLLECTIONS ACTIVE VIEW" : "SPECIFIC DATE LEDGER VIEW"}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {dateFilterMode === 'today' ? formatDateReadable(new Date().toISOString().split('T')[0]) : formatDateReadable(customDateFilter)}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Singled out all stewardship envelopes recorded on this specific day. Compare categorized aggregates below:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2.5">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-150/80 shadow-3xs text-center min-w-[90px]">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none mb-0.5">Total Members Tithes</span>
                  <span className="text-xs font-mono font-bold text-blue-600">{preferences.currency} {filteredTotals.tithe.toFixed(2)}</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-150/80 shadow-3xs text-center min-w-[130px] flex flex-col justify-center">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none mb-0.5">Total Members COP</span>
                  <span className="text-xs font-mono font-bold text-emerald-600 block">{preferences.currency} {filteredTotals.combinedOffering.toFixed(2)}</span>
                  <div className="border-t border-slate-100/80 pt-1 mt-1 space-y-0.5 text-[8px] text-left text-slate-500">
                    {preferences.combinedOfferingAllocations.map(alloc => {
                      const amount = filteredTotals.combinedOffering * (alloc.percentage / 100);
                      return (
                        <div key={alloc.id} className="flex justify-between gap-1.5 font-sans">
                          <span className="truncate max-w-[85px] font-bold text-slate-400 block uppercase" title={alloc.name}>{alloc.name}</span>
                          <span className="font-mono font-bold text-slate-700 whitespace-nowrap">{preferences.currency}{amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-150/80 shadow-3xs text-center min-w-[90px]">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none mb-0.5">Total Amount</span>
                  <span className="text-sm font-mono font-black text-slate-850">{preferences.currency} {filteredTotals.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDateFilterMode('all')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100 border border-blue-200/50 px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer text-center"
              >
                Clear Date Filter
              </button>
            </div>
          </div>
        )}

        {/* Ledger Transaction History List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Receipt & Date</th>
                <th className="px-6 py-4">Giver Profile</th>
                <th className="px-6 py-4">Tithe</th>
                <th className="px-6 py-4">COP</th>
                <th className="px-6 py-4">Other Funds</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4 text-center">Receipts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredContributions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <p className="font-medium">No church giving ledger records found.</p>
                    <p className="text-xs text-slate-400 mt-1">Try broadening search parameters or log a new envelope above.</p>
                  </td>
                </tr>
              ) : (
                filteredContributions.map(contrib => {
                  const restSum = contrib.buildingFund + contrib.missions + contrib.youth + contrib.others;
                  
                  return (
                    <tr key={contrib.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 font-mono text-xs">{contrib.receiptNo}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={10} />
                            {contrib.date}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{contrib.memberName}</span>
                          <span className="text-[10px] font-medium text-slate-400 font-mono mt-0.5">{contrib.memberId} ({contrib.paymentMethod})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-mono font-medium">
                        {contrib.tithe > 0 ? (
                          <span className="text-blue-600 font-bold">{preferences.currency} {contrib.tithe.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-mono font-medium">
                        {contrib.combinedOffering > 0 ? (
                          <div className="flex flex-col space-y-1">
                            <span className="text-emerald-600 font-bold">{preferences.currency} {contrib.combinedOffering.toFixed(2)}</span>
                            <div className="pt-1 border-t border-slate-100/50 space-y-0.5">
                              {preferences.combinedOfferingAllocations.map(alloc => (
                                <div key={alloc.id} className="flex justify-between items-center gap-2 text-[8px] leading-tight text-slate-400 font-sans">
                                  <span className="truncate max-w-[80px]" title={alloc.name}>{alloc.name}</span>
                                  <span className="font-mono whitespace-nowrap">{preferences.currency}{(contrib.combinedOffering * (alloc.percentage / 100)).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {contrib.copMission !== undefined ? (
                          <div className="space-y-0.5" title="Detailed funds breakdowns">
                            {contrib.harvestIngathering && contrib.harvestIngathering > 0 ? <div className="text-[9px]">🌾 Ingathering: {preferences.currency}{contrib.harvestIngathering}</div> : null}
                            {contrib.hopeRadio && contrib.hopeRadio > 0 ? <div className="text-[9px]">📡 Hope Radio: {preferences.currency}{contrib.hopeRadio}</div> : null}
                            {contrib.sulads && contrib.sulads > 0 ? <div className="text-[9px]">🏕️ SULADS: {preferences.currency}{contrib.sulads}</div> : null}
                            {contrib.specifiedOffering && contrib.specifiedOffering > 0 ? <div className="text-[9px]">🕯️ Specified: {preferences.currency}{contrib.specifiedOffering}</div> : null}
                            {contrib.buildingFund > 0 && <div className="text-[9px]">🏛️ Building: {preferences.currency}{contrib.buildingFund}</div>}
                          </div>
                        ) : restSum > 0 ? (
                          <div className="space-y-0.5" title="Detailed funds breakdowns">
                            {contrib.buildingFund > 0 && <div className="text-[9px]">🏛️ Building: {preferences.currency}{contrib.buildingFund}</div>}
                            {contrib.missions > 0 && <div className="text-[9px]">🌐 Missions: {preferences.currency}{contrib.missions}</div>}
                            {contrib.youth > 0 && <div className="text-[9px]">🎒 Youth: {preferences.currency}{contrib.youth}</div>}
                            {contrib.others > 0 && <div className="text-[9px]">🕯️ Other: {preferences.currency}{contrib.others}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {preferences.currency} {contrib.total.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onSelectForReceipt(contrib)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                          >
                            <Printer size={13} />
                            <span>Receipt</span>
                          </button>
                          {isAdmin && onDeleteContribution && (
                            <button
                              onClick={() => {
                                setDeleteTargetId(contrib.id);
                                setDeletePasswordInput('');
                                setDeleteErrorMsg('');
                              }}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Entry Slide Out Drawer */}
      {isLogOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex justify-end z-50 animate-fade-in" id="contributions-overlay">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col p-6 animate-slide-in overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt size={18} className="text-sky-500" />
                  Log Tithe & Combined Offering
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Record giving envelopes or online deposits. Combined Offerings are auto-distributed.</p>
              </div>
              <button
                onClick={() => setIsLogOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                id="close-contributions-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                
                {/* Check if church members exist, if not throw alert */}
                {members.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-4 rounded-lg">
                    ⚠️ <b>Attention:</b> You must register at least one Church Member in the "Members" tab before record entries can be filed under theirs profiles.
                  </div>
                ) : null}

                {/* Core descriptors row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Select Contributor *</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-700 bg-white focus:ring-1 focus:ring-sky-500"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      required
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>👤 {m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Receipt Number (Generated)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-500 outline-none"
                      value={receiptNo}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Contribution Date *</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-700 bg-white"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Payment Channel</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-700 bg-white"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                    >
                      <option value="Cash">Cash Envelope</option>
                      <option value="Check">Bank Check</option>
                      <option value="Bank Transfer">Wire Direct Bank Transfer</option>
                      <option value="Mobile Payment">E-payment / Mobile App</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* FUNDS SECTION BLOCK */}
                <div className="space-y-4">
                  {/* AMOUNT TO INPUT BLOCK */}
                  <div className="bg-slate-50/75 border border-slate-200/70 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-205 pb-1.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Amount to Input ({preferences.currency})
                      </h4>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white focus:ring-1 focus:ring-sky-500"
                        value={amountToInput || ''}
                        onChange={(e) => setAmountToInput(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* MISSION FUNDS BLOCK */}
                  <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                      <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                        Mission Funds ({preferences.currency})
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full">
                        Total Mission: {preferences.currency}{totalMissionFunds.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Tithe */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Tithe</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white"
                          value={tithe || ''}
                          onChange={(e) => setTithe(parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* COP */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">COP</label>
                          <span className="text-[8px] text-emerald-600 font-bold flex items-center gap-0.5"><Sparkles size={8} /> Auto Plan</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white"
                          value={copInput || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCopInput(val);
                          }}
                        />
                      </div>

                      {/* COP (50%) - Mission Share */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">COP (50%)</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-150 rounded-md text-xs font-mono text-slate-400 bg-slate-50/80 cursor-not-allowed"
                          value={copMission > 0 ? copMission.toFixed(2) : '0.00'}
                        />
                      </div>

                      {/* Harvest Ingathering */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Harvest Ingathering</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white"
                          value={harvestIngathering || ''}
                          onChange={(e) => setHarvestIngathering(parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Hope Radio/TV */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Hope Radio/TV</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white"
                          value={hopeRadio || ''}
                          onChange={(e) => setHopeRadio(parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Sulads */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Sulads</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white"
                          value={sulads || ''}
                          onChange={(e) => setSulads(parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Specified Offering */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <input
                            type="text"
                            value={specifiedOfferingLabel}
                            onChange={(e) => setSpecifiedOfferingLabel(e.target.value)}
                            className="block w-full text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-transparent border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-sky-500 focus:outline-none focus:ring-0 py-0 px-0.5"
                            placeholder="Specified Offering"
                          />
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white"
                          value={specifiedOffering || ''}
                          onChange={(e) => setSpecifiedOffering(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CHURCH FUNDS BLOCK */}
                  <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-100/80 pb-1.5">
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Church Funds ({preferences.currency})
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                        Total Church: {preferences.currency}{totalChurchFunds.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* COP (50%) - Church Share */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">COP (50%)</label>
                        </div>
                        <input
                          type="text"
                          readOnly
                          disabled
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-150 rounded-md text-xs font-mono text-slate-400 bg-slate-50/80 cursor-not-allowed"
                          value={copChurch > 0 ? copChurch.toFixed(2) : '0.00'}
                        />
                      </div>

                      {/* Church Building */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Church Building</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs font-mono text-slate-700 bg-white"
                          value={buildingFund || ''}
                          onChange={(e) => setBuildingFund(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Combined offering plan LIVE allocation preview section */}
                {((copMission || 0) + (copChurch || 0)) > 0 && (
                  <div className="bg-emerald-50/40 border border-emerald-200 text-xs p-3.5 rounded-xl space-y-2 animate-fade-in">
                    <div className="font-bold text-emerald-800 flex items-center justify-between text-[11px]">
                      <span>COMBINED OFFERING SYSTEMATIC SPLIT BREAKDOWN</span>
                      <span className="text-emerald-600 font-mono">Plan Total: {preferences.currency} {((copMission || 0) + (copChurch || 0)).toFixed(2)}</span>
                    </div>
                    <div className="divide-y divide-emerald-100/60 text-[11px] text-emerald-700">
                      {simulatedBreakdown.map(b => (
                        <div key={b.id} className="py-1.5 flex items-center justify-between">
                           <span className="font-medium">{b.name} <b className="font-normal opacity-70">({b.percentage}%)</b></span>
                          <span className="font-mono font-bold">{preferences.currency} {b.allotted.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Memo */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="E.g. In gratitude for annual celebrations..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-700"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Total display & submit buttons */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200/50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">TOTAL COLLECTED SUM</span>
                  <span className="text-xl font-mono font-extrabold text-slate-800">
                    {preferences.currency} {totalSum.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsLogOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={members.length === 0 || (amountToInput > 0 && Math.abs(totalSum - amountToInput) > 0.01)}
                    className={`px-4 py-2 text-white font-semibold rounded-md text-xs shadow-sm shadow-blue-100 transition flex items-center gap-1.5 ${
                      (members.length === 0 || (amountToInput > 0 && Math.abs(totalSum - amountToInput) > 0.01)) ? 'bg-slate-300 pointer-events-none' : 'bg-blue-600 hover:bg-blue-700 hover:cursor-pointer'
                    }`}
                  >
                    🚀 File Contribution & Seal Receipt
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TRANSACTION SECURE PASSWORD CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="delete-verification-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-4 text-white flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ShieldAlert size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight uppercase text-white">Security Action</h3>
                <p className="text-[10px] text-rose-100/90 font-medium font-sans">Delete Contribution Record</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (deletePasswordInput === 'password123') {
                if (onDeleteContribution) {
                  onDeleteContribution(deleteTargetId);
                }
                setDeleteTargetId(null);
                setDeletePasswordInput('');
                setDeleteErrorMsg('');
              } else {
                setDeleteErrorMsg('Invalid Administrator password.');
              }
            }} className="p-5 space-y-4">
              <p className="text-[11px] text-slate-500 leading-normal">
                You are trying to delete giving record <strong>{deleteTargetId}</strong>. To verify code authority and prevent unauthorized edits, please enter the administrator password.
              </p>

              {deleteErrorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                  <ShieldAlert size={13} className="shrink-0" />
                  <span>{deleteErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Admin Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={deletePasswordInput}
                  onChange={(e) => setDeletePasswordInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTargetId(null);
                    setDeletePasswordInput('');
                    setDeleteErrorMsg('');
                  }}
                  className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-center font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-3xs transition hover:cursor-pointer text-center font-sans"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSabbathReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-4 md:p-6 print:p-0 print:bg-white print:absolute print:inset-0" id="sabbath-report-modal" onClick={() => setShowSabbathReport(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 flex flex-col my-auto max-h-[90vh] print:max-h-full print:shadow-none print:border-none print:w-full print:my-0" id="sabbath-report-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header inside non-printable area */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 print:hidden rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-sky-50 text-sky-600 p-2 rounded-lg">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black tracking-tight uppercase text-slate-800">Printable Sabbath Report Workspace</h3>
                  <p className="text-[10px] text-slate-500 font-medium font-sans">Preview, customize allocations, and print Seventh-Day Adventist weekly stewardship logs.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSabbathReport(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Document area */}
            <div className="p-6 overflow-y-auto flex-1 print:overflow-visible print:p-0 bg-slate-50/30 print:bg-white text-left">
              <SabbathReport 
                contributions={contributions}
                members={members}
                preferences={preferences}
              />
            </div>

            {/* Modal Footer inside non-printable area */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0 print:hidden rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowSabbathReport(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer font-sans"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
