/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, Contribution, ChurchPreferences } from '../types';
import { TrendingUp, BarChart3, PieChart as PieIcon, User, Calendar, CreditCard } from 'lucide-react';

interface ChurchChartsProps {
  contributions: Contribution[];
  members: Member[];
  preferences: ChurchPreferences;
}

export default function ChurchCharts({ contributions, members, preferences }: ChurchChartsProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | '6months' | '3months'>('all');
  const [chartTab, setChartTab] = useState<'trends' | 'categories' | 'member'>('trends');
  const [chartFrequency, setChartFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  // Filter contributions based on selected member and timeframe
  const filteredContributions = useMemo(() => {
    let result = [...contributions];
    
    if (selectedMemberId !== 'all') {
      result = result.filter(c => c.memberId === selectedMemberId);
    }
    
    // Sort chronologically
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (timeRange === '6months') {
      const cutDate = new Date();
      cutDate.setMonth(cutDate.getMonth() - 6);
      result = result.filter(c => new Date(c.date) >= cutDate);
    } else if (timeRange === '3months') {
      const cutDate = new Date();
      cutDate.setMonth(cutDate.getMonth() - 3);
      result = result.filter(c => new Date(c.date) >= cutDate);
    }
    
    return result;
  }, [contributions, selectedMemberId, timeRange]);

  // Helper to calculate week grouping label
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  };

  // Aggregate giving based on Weekly, Monthly, or Yearly tracking
  const trendData = useMemo(() => {
    const groups: { [key: string]: { label: string; tithe: number; offering: number; special: number; total: number; orderKey: string | number } } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    filteredContributions.forEach(c => {
      const date = new Date(c.date);
      let label = '';
      let orderKey: string | number = '';
      
      if (chartFrequency === 'weekly') {
        const [yr, mo, dy] = c.date.split('-').map(Number);
        const itemDate = new Date(yr, mo - 1, dy);
        const dayOfWeek = itemDate.getDay(); // 0 = Sunday, 6 = Saturday
        const saturdayOffset = 6 - dayOfWeek;
        const saturdayDate = new Date(itemDate);
        saturdayDate.setDate(itemDate.getDate() + saturdayOffset);

        const satY = saturdayDate.getFullYear();
        const satM = String(saturdayDate.getMonth() + 1).padStart(2, '0');
        const satD = String(saturdayDate.getDate()).padStart(2, '0');
        orderKey = `${satY}-${satM}-${satD}`;

        const dayOfMonth = saturdayDate.getDate();
        let prefix = '1st';
        if (dayOfMonth <= 7) prefix = '1st';
        else if (dayOfMonth <= 14) prefix = '2nd';
        else if (dayOfMonth <= 21) prefix = '3rd';
        else if (dayOfMonth <= 28) prefix = '4th';
        else prefix = '5th';

        const monthStr = monthNames[saturdayDate.getMonth()];
        const yearStr = String(satY).slice(2);
        label = `${prefix} Sab, ${monthStr} '${yearStr}`;
      } else if (chartFrequency === 'monthly') {
        label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        orderKey = date.getFullYear() * 12 + date.getMonth();
      } else {
        label = `${date.getFullYear()}`;
        orderKey = date.getFullYear();
      }
      
      if (!groups[label]) {
        groups[label] = {
          label,
          tithe: 0,
          offering: 0,
          special: 0,
          total: 0,
          orderKey
        };
      }
      
      groups[label].tithe += c.tithe;
      groups[label].offering += c.combinedOffering;
      groups[label].special += (c.buildingFund + c.missions + c.youth + c.others);
      groups[label].total += c.total;
    });
    
    const output = Object.values(groups);
    return output.sort((a, b) => {
      if (typeof a.orderKey === 'number' && typeof b.orderKey === 'number') {
        return a.orderKey - b.orderKey;
      }
      return String(a.orderKey).localeCompare(String(b.orderKey));
    });
  }, [filteredContributions, chartFrequency]);

  // Fund Breakdown for Doughnut Chart
  const categoryTotals = useMemo(() => {
    let tithe = 0;
    let combinedOffering = 0;
    let buildingFund = 0;
    let missions = 0;
    let youth = 0;
    let others = 0;
    
    filteredContributions.forEach(c => {
      tithe += c.tithe;
      combinedOffering += c.combinedOffering;
      buildingFund += c.buildingFund;
      missions += c.missions;
      youth += c.youth;
      others += c.others;
    });
    
    const total = tithe + combinedOffering + buildingFund + missions + youth + others;
    const othersCombined = buildingFund + missions + youth + others;
    
    return [
      { name: 'Tithes', value: tithe, pct: total ? (tithe / total) * 100 : 0, color: '#2563eb' }, // blue-600
      { name: 'Combined Offering', value: combinedOffering, pct: total ? (combinedOffering / total) * 100 : 0, color: '#059669' }, // emerald-600
      { name: 'Others/Local Funds', value: othersCombined, pct: total ? (othersCombined / total) * 100 : 0, color: '#7c3aed' }, // violet-600
    ].filter(item => item.value > 0);
  }, [filteredContributions]);

  // Combined Offering Plan details (nested allocations of the aggregated combinedOffering)
  const offeringPlanBreakdown = useMemo(() => {
    const totalOffering = filteredContributions.reduce((sum, c) => sum + c.combinedOffering, 0);
    return preferences.combinedOfferingAllocations.map(plan => {
      const share = totalOffering * (plan.percentage / 100);
      return {
        ...plan,
        amount: share
      };
    });
  }, [filteredContributions, preferences]);

  // Total Tithe systematic allocation details
  const tithePlanBreakdown = useMemo(() => {
    const totalTithe = filteredContributions.reduce((sum, c) => sum + c.tithe, 0);
    const allotments = preferences.titheAllocations || [
      { id: 't1', name: 'Conference Share (Worldwide Ministry)', percentage: 70 },
      { id: 't2', name: 'Local Church Pastoral Support', percentage: 15 },
      { id: 't3', name: 'Evangelism & Literature Ministry', percentage: 10 },
      { id: 't4', name: 'Conference Education Subsidy', percentage: 5 },
    ];
    return allotments.map(plan => {
      const share = totalTithe * (plan.percentage / 100);
      return {
        ...plan,
        amount: share
      };
    });
  }, [filteredContributions, preferences]);

  // Global variables to scale SVG charts
  const trendMax = useMemo(() => {
    const maxVal = Math.max(...trendData.map(d => d.total), 100);
    return Math.ceil(maxVal / 500) * 500; // Round to nearest 500
  }, [trendData]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden" id="analytics-section">
      {/* Chart Control Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/55 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-sky-500" />
            Church Treasurer's Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize giving history, tithe devotionals, and offering plan distributions.
          </p>
        </div>
        
        {/* Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Members dropdown filter -> allows direct tracking */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <User size={14} className="text-slate-400" />
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-transparent border-none outline-none cursor-pointer focus:ring-0 max-w-[160px]"
            >
              <option value="all">🌐 Congregation View</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>👤 {m.name}</option>
              ))}
            </select>
          </div>

          {/* Time range tracker */}
          <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1 rounded-md transition ${timeRange === 'all' ? 'bg-white text-slate-900 shadow-3xs' : 'hover:text-slate-800'}`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeRange('6months')}
              className={`px-3 py-1 rounded-md transition ${timeRange === '6months' ? 'bg-white text-slate-900 shadow-3xs' : 'hover:text-slate-800'}`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeRange('3months')}
              className={`px-3 py-1 rounded-md transition ${timeRange === '3months' ? 'bg-white text-slate-900 shadow-3xs' : 'hover:text-slate-800'}`}
            >
              3 Months
            </button>
          </div>

          {/* Group Tracking Frequency */}
          <div className="flex bg-blue-105/10 bg-slate-200/60 p-0.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200/40">
            <button
              onClick={() => setChartFrequency('weekly')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${chartFrequency === 'weekly' ? 'bg-[#2563eb] text-white shadow-3xs' : 'hover:text-slate-850'}`}
              title="Track collections by ISO week periods"
            >
              Weekly
            </button>
            <button
              onClick={() => setChartFrequency('monthly')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${chartFrequency === 'monthly' ? 'bg-[#2563eb] text-white shadow-3xs' : 'hover:text-slate-850'}`}
              title="Track collections by monthly calendar cycles"
            >
              Monthly
            </button>
            <button
              onClick={() => setChartFrequency('yearly')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${chartFrequency === 'yearly' ? 'bg-[#2563eb] text-white shadow-3xs' : 'hover:text-slate-850'}`}
              title="Track collections by annual budgets"
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white">
        <button
          onClick={() => setChartTab('trends')}
          className={`flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 transition cursor-pointer ${
            chartTab === 'trends'
              ? 'border-blue-600 text-blue-600 bg-slate-50/30'
              : 'border-transparent text-slate-550 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
          id="tab-trends"
        >
          <BarChart3 size={14} className="text-blue-600" />
          Church Giving Graph
        </button>
        <button
          onClick={() => setChartTab('categories')}
          className={`flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 transition cursor-pointer ${
            chartTab === 'categories'
              ? 'border-emerald-600 text-emerald-600 bg-slate-50/30'
              : 'border-transparent text-slate-550 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
          id="tab-categories"
        >
          <PieIcon size={14} className="text-emerald-600" />
          Funds Allocation Breakdown
        </button>
        <button
          onClick={() => setChartTab('member')}
          className={`flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 transition cursor-pointer ${
            chartTab === 'member'
              ? 'border-indigo-600 text-indigo-600 bg-slate-50/30'
              : 'border-transparent text-slate-550 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
          id="tab-member-giving"
        >
          <User size={14} className="text-indigo-600" />
          Member Giving Timeline
        </button>
      </div>

      {/* Main Charts Area */}
      <div className="p-6">
        {filteredContributions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
              <Calendar size={24} />
            </div>
            <p className="text-sm font-medium text-slate-600">No transactions recorded for this select timeframe</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">Use the giving form or choose a different subscriber to see graphs populate dynamically.</p>
          </div>
        ) : (
          <>
            {/* TAB 1: weekly/monthly/yearly trends area & bar */}
            {chartTab === 'trends' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-50/50 border border-slate-100 rounded-xl p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
                    <span className="capitalize">{chartFrequency} Stewardship (Tithes vs Offering Plan)</span>
                    <span className="text-slate-500 normal-case font-normal">Max: {preferences.currency} {trendMax.toLocaleString()}</span>
                  </h3>
                  
                  {/* SVG Custom Responsive Chart */}
                  <div className="w-full h-64 overflow-hidden relative">
                    {trendData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading charts...</div>
                    ) : (
                      <svg viewBox="0 0 600 240" className="w-full h-full text-slate-700">
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
                          <g key={idx}>
                            <line 
                              x1="40" 
                              y1={20 + p * 160} 
                              x2="580" 
                              y2={20 + p * 160} 
                              stroke="#e2e8f0" 
                              strokeWidth="0.75" 
                              strokeDasharray="4,4" 
                            />
                            <text 
                              x="5" 
                              y={24 + p * 160} 
                              className="text-[9px] font-mono fill-slate-400"
                            >
                              {(trendMax * (1 - p)).toFixed(0)}
                            </text>
                          </g>
                        ))}
                        
                        {/* Columns */}
                        {trendData.map((d, idx) => {
                          const xStep = 540 / Math.max(trendData.length, 1);
                          const xOffset = 60 + idx * xStep;
                          
                          // heights
                          const tHeight = (d.tithe / trendMax) * 160;
                          const oHeight = (d.offering / trendMax) * 160;
                          const sHeight = (d.special / trendMax) * 160;
                          
                          return (
                            <g key={d.label} className="group cursor-pointer">
                              {/* Background hover highlights */}
                              <rect 
                                x={xOffset - 14} 
                                y="10" 
                                width="34" 
                                height="180" 
                                fill="transparent" 
                                className="hover:fill-slate-100/50 transition-colors"
                              />

                              {/* Stacked bar or grouped bar. Let's do stacked bar representing aggregate funds */}
                              {/* Special funds (building, missions, youth) */}
                              <rect
                                x={xOffset - 6}
                                y={180 - tHeight - oHeight - sHeight}
                                width="12"
                                height={Math.max(0, sHeight)}
                                fill="#7c3aed" // violet-600
                                rx="1.5"
                              />
                              {/* Offering bar */}
                              <rect
                                x={xOffset - 6}
                                y={180 - tHeight - oHeight}
                                width="12"
                                height={Math.max(0, oHeight)}
                                fill="#059669" // emerald-600
                              />
                              {/* Tithe bar */}
                              <rect
                                x={xOffset - 6}
                                y={180 - tHeight}
                                width="12"
                                height={Math.max(0, tHeight)}
                                fill="#2563eb" // blue-600
                                rx="1.5"
                              />

                              {/* Text tooltip trigger showing on top */}
                              <text
                                x={xOffset}
                                y="195"
                                textAnchor="middle"
                                className="text-[10px] font-medium fill-slate-500"
                              >
                                {d.label}
                              </text>
                              
                              {/* Tooltip on bar hover */}
                              <title>{`${d.label}\nTithe: ${preferences.currency} ${d.tithe.toFixed(2)}\nOff: ${preferences.currency} ${d.offering.toFixed(2)}\nOthers: ${preferences.currency} ${d.special.toFixed(2)}\nTotal: ${preferences.currency} ${d.total.toFixed(2)}`}</title>
                            </g>
                          );
                        })}
                        <line x1="40" y1="180" x2="580" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-1 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500 justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-blue-600 rounded-2xs"></span>
                      <span>Tithes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-emerald-600 rounded-2xs"></span>
                      <span>Combined Offering Plan</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-violet-600 rounded-2xs"></span>
                      <span>Other Funds</span>
                    </div>
                  </div>
                </div>

                {/* Giving aggregates panel */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">CONGREGATION TOTAL SUMMARY</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-slate-400">Total Recorded Tithes</div>
                        <div className="text-2xl font-bold text-sky-600">
                          {preferences.currency} {contributions.reduce((s, c) => s + c.tithe, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Total Combined Offering</div>
                        <div className="text-xl font-bold text-emerald-600">
                          {preferences.currency} {contributions.reduce((s, c) => s + c.combinedOffering, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Other Funds</div>
                        <div className="text-lg font-bold text-purple-600">
                          {preferences.currency} {contributions.reduce((s, c) => s + (c.buildingFund + c.missions + c.youth + c.others), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200/60 pt-4 text-xs text-slate-400 leading-relaxed bg-white p-3 rounded-lg border">
                    <span className="font-semibold text-slate-700">Did you know?</span> Combined Offerings are distributed globally and locally according to a systematic ratio percentage model preset by church elders. This simplifies giving!
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Categories breakdown, Combined Offering Plan, & Total Tithe Allotments allocations */}
            {chartTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Visual Category shares */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">TOTAL FUNDS DISTRIBUTION</h4>
                    
                    {/* Inline progress breakdown bars (extremely modern, visually precise, no fragile canvas elements) */}
                    <div className="space-y-4">
                      {categoryTotals.map(cat => (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-700">
                            <span className="font-medium flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                              {cat.name}
                            </span>
                            <span className="font-mono text-slate-900 font-semibold">
                              {preferences.currency} {cat.value.toFixed(2)} ({cat.pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-slate-200/60 text-xs text-slate-400">
                    Calculated percentages represent the proportion of each designated currency item to total gifts.
                  </div>
                </div>

                {/* Combined Offering systematic breakdown */}
                <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800">COMBINED OFFERING PLAN SUB-ALLOCATIONS</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Systematic Ratio</span>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Below is the proportional allotment calculated from the aggregate Combined Offerings of <span className="font-semibold text-emerald-700">{preferences.currency} {filteredContributions.reduce((s, c) => s + c.combinedOffering, 0).toFixed(2)}</span>:
                    </p>

                    <div className="space-y-3">
                      {offeringPlanBreakdown.map(plan => (
                        <div key={plan.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between shadow-xs">
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{plan.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Allocation share ratio: <b className="text-slate-600">{plan.percentage}%</b></div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-600">
                              {preferences.currency} {plan.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-50 text-[10px] text-emerald-800 p-2.5 rounded-lg mt-4 border border-emerald-100 leading-relaxed">
                    <b>Combined Offering Plan Benefit:</b> Instead of managing separate buckets manually, this plan distributes a single offering systematically to support ministries worldwide and locally.
                  </div>
                </div>

                {/* Total Tithe allotments breakdown */}
                <div className="bg-blue-50/20 border border-blue-100/50 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-800">TOTAL TITHES SYSTEMATIC GIVING</h4>
                      <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Systematic Ratio</span>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Below is the systematic allotment calculated from the aggregate returned Tithes of <span className="font-semibold text-blue-700">{preferences.currency} {filteredContributions.reduce((s, c) => s + c.tithe, 0).toFixed(2)}</span>:
                    </p>

                    <div className="space-y-3">
                      {tithePlanBreakdown.map(plan => (
                        <div key={plan.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between shadow-xs">
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{plan.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Allotment share ratio: <b className="text-slate-600">{plan.percentage}%</b></div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-blue-600">
                              {preferences.currency} {plan.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 text-[10px] text-blue-800 p-2.5 rounded-lg mt-4 border border-blue-100 leading-relaxed">
                    <b>Tithe Devotions Allotment:</b> Consistently set apart and distributed to fund central pastoral fields, regional evangelism, and local church ministries systematically in strict adherence to church policies.
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: Member Custom Giving timeline */}
            {chartTab === 'member' && (
              <div className="space-y-6">
                <div className="bg-slate-50/55 border border-slate-100 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {selectedMemberId === 'all' ? 'Congregational Timeline Tracker' : `Giving History Timeline: ${members.find(m => m.id === selectedMemberId)?.name}`}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedMemberId === 'all' 
                          ? 'Select an individual member from the dropdown in the header to view personal timeline' 
                          : 'A chronological view of individual tithes, combined offerings, and total transactions.'}
                      </p>
                    </div>
                    
                    {selectedMemberId !== 'all' && (
                      <button
                        onClick={() => setSelectedMemberId('all')}
                        className="text-xs text-sky-500 hover:text-sky-600 font-medium hover:underline self-start md:self-auto"
                      >
                        ← Clear Selection, View All
                      </button>
                    )}
                  </div>

                  {/* Timeline Graphic SVG */}
                  {filteredContributions.length < 2 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-white border border-dashed border-slate-200 rounded-lg">
                      <div className="text-xs text-slate-400 font-medium">Insufficient sequence points (Need at least 2 logs to draw a timeline line graph)</div>
                      <div className="text-[10px] text-slate-400 mt-1">This user has {filteredContributions.length} contribution(s) recorded. Try picking another subscriber or add giving logs.</div>
                    </div>
                  ) : (
                    <div className="w-full h-56 bg-white border border-slate-100 rounded-lg p-3 relative">
                      <svg viewBox="0 0 600 200" className="w-full h-full text-slate-700">
                        {/* Lines */}
                        {(() => {
                          const pointsTithe: string[] = [];
                          const pointsOffering: string[] = [];
                          const pointsTotal: string[] = [];
                          
                          const lMax = Math.max(...filteredContributions.map(c => c.total), 10);
                          const stepX = 520 / (filteredContributions.length - 1);
                          
                          filteredContributions.forEach((c, idx) => {
                            const x = 40 + idx * stepX;
                            const yT = 160 - (c.tithe / lMax) * 140;
                            const yO = 160 - (c.combinedOffering / lMax) * 140;
                            const yTot = 160 - (c.total / lMax) * 140;
                            
                            pointsTithe.push(`${x},${yT}`);
                            pointsOffering.push(`${x},${yO}`);
                            pointsTotal.push(`${x},${yTot}`);
                          });

                          return (
                            <>
                              {/* Horizontal guidelines */}
                              <line x1="40" y1="20" x2="560" y2="20" stroke="#f1f5f9" strokeWidth="0.75" />
                              <line x1="40" y1="90" x2="560" y2="90" stroke="#f1f5f9" strokeWidth="0.75" />
                              <line x1="40" y1="160" x2="560" y2="160" stroke="#e2e8f0" strokeWidth="1.25" />

                              {/* Paths for timelines */}
                              <path 
                                d={`M ${pointsTotal.join(' L ')}`} 
                                fill="none" 
                                stroke="#4f46e5" // indigo-600
                                strokeWidth="2.5" 
                                strokeLinecap="round"
                              />
                              <path 
                                d={`M ${pointsTithe.join(' L ')}`} 
                                fill="none" 
                                stroke="#0ea5e9" // sky-500
                                strokeWidth="1.5" 
                                strokeDasharray="3,3"
                                strokeLinecap="round"
                              />
                              <path 
                                d={`M ${pointsOffering.join(' L ')}`} 
                                fill="none" 
                                stroke="#10b981" // emerald-500
                                strokeWidth="1.5" 
                                strokeDasharray="3,3"
                                strokeLinecap="round"
                              />

                              {/* Dot markers with Titles */}
                              {filteredContributions.map((c, idx) => {
                                const x = 40 + idx * stepX;
                                const yTot = 160 - (c.total / lMax) * 140;
                                return (
                                  <g key={c.id}>
                                    <circle 
                                      cx={x} 
                                      cy={yTot} 
                                      r="4" 
                                      fill="#4f46e5" 
                                      stroke="#ffffff" 
                                      strokeWidth="1.5" 
                                      className="cursor-pointer transition-transform duration-300 hover:scale-150"
                                      title={`Total: ${preferences.currency} ${c.total.toFixed(2)} (${c.date})`}
                                    />
                                    <text 
                                      x={x} 
                                      y="180" 
                                      textAnchor="middle" 
                                      className="text-[8px] font-mono fill-slate-400"
                                    >
                                      {c.date.slice(5)}
                                    </text>
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                      {/* Interactive Legend details */}
                      <div className="absolute top-3 right-3 flex items-center gap-3 bg-white/90 p-1.5 rounded border border-slate-100 text-[10px] font-medium text-slate-500 shadow-2xs">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-indigo-600 inline-block"></span> Total Paid</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-sky-500 border-dashed inline-block"></span> Tithe</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-emerald-500 border-dashed inline-block"></span> Combined Offering</span>
                      </div>
                    </div>
                  )}

                  {/* Transaction timeline table listing chronological entries of the selected user */}
                  <div className="mt-4 bg-white border border-slate-100 rounded-lg overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <CreditCard size={12} className="text-slate-400" />
                      CHRONOLOGICAL LEDGER DETAILS FOR SELECT CRITERIA
                    </div>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
                      {filteredContributions.slice().reverse().map(c => (
                        <div key={c.id} className="p-2.5 hover:bg-slate-50/70 transition flex items-center justify-between text-slate-600">
                          <div>
                            <div className="font-semibold text-slate-700">{c.memberName} <span className="text-[10px] font-normal text-slate-400 font-mono">({c.receiptNo})</span></div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>Date: <b>{c.date}</b></span>
                              <span>•</span>
                              <span>Method: <b>{c.paymentMethod}</b></span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900">{preferences.currency} {c.total.toFixed(2)}</span>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Tithe: {preferences.currency}{c.tithe.toFixed(0)} | Off: {preferences.currency}{c.combinedOffering.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
