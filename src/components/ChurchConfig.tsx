/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ChurchPreferences, CombinedOfferingAllocation } from '../types';
import { Settings, ShieldCheck, HeartCrack, Plus, Trash2, HelpCircle } from 'lucide-react';

interface ChurchConfigProps {
  preferences: ChurchPreferences;
  onUpdatePreferences: (preferences: ChurchPreferences) => void;
  onClearAllData: () => void;
  isAdmin?: boolean;
}

export default function ChurchConfig({ preferences, onUpdatePreferences, onClearAllData, isAdmin = true }: ChurchConfigProps) {
  // Config state
  const [churchName, setChurchName] = useState(preferences.churchName);
  const [churchAddress, setChurchAddress] = useState(preferences.churchAddress);
  const [churchEmail, setChurchEmail] = useState(preferences.churchEmail);
  const [currency, setCurrency] = useState(preferences.currency);
  
  // Allocations list copy
  const [allocations, setAllocations] = useState<CombinedOfferingAllocation[]>([...preferences.combinedOfferingAllocations]);

  // Validate the total percentages sum to exactly 100
  const percentageSum = useMemo(() => {
    return allocations.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
  }, [allocations]);

  const isValidAllocation = percentageSum === 100;

  // Save changes handler
  const handleSave = () => {
    if (percentageSum !== 100) {
      alert(`The combined offering plan allocation percentages currently sum to ${percentageSum}%. They must sum to exactly 100% to file correctly!`);
      return;
    }
    
    // Save
    onUpdatePreferences({
      churchName,
      churchAddress,
      churchEmail,
      currency,
      combinedOfferingAllocations: allocations,
      titheAllocations: [
        { id: 't1', name: 'Conference/Mission Funds (Tithe Devotion)', percentage: 100 }
      ]
    });
    alert("Configuration preferences updated and stored successfully!");
  };

  // Add a new allocation branch row
  const handleAddRow = () => {
    const nextPercentage = Math.max(0, 100 - percentageSum);
    setAllocations([
      ...allocations,
      {
        id: String(Date.now()),
        name: 'New Allocation Branch',
        percentage: nextPercentage
      }
    ]);
  };

  // Update a specific allocation row value
  const handleUpdateRow = (id: string, updatedFields: Partial<CombinedOfferingAllocation>) => {
    setAllocations(allocations.map(al => {
      if (al.id === id) {
        return {
          ...al,
          ...updatedFields
        };
      }
      return al;
    }));
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    if (allocations.length <= 1) {
      alert("At least one allocation category must be maintained for the division algorithm to function.");
      return;
    }
    setAllocations(allocations.filter(al => al.id !== id));
  };


  return (
    <div className="space-y-6" id="configurations-section">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Settings Information */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Settings size={16} className="text-slate-400" />
                General Church Information
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure default settings printed on headers and receipts, as well as preferred ledger currency formats.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Corporate Church Name</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    className={`w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 ${!isAdmin ? 'bg-slate-50 cursor-not-allowed opacity-80' : ''}`}
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Receipt Printing Header Address</label>
                  <textarea
                    rows={2}
                    disabled={!isAdmin}
                    className={`w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 ${!isAdmin ? 'bg-slate-50 cursor-not-allowed opacity-80' : ''}`}
                    value={churchAddress}
                    onChange={(e) => setChurchAddress(e.target.value)}
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Stewardship Office Email</label>
                  <input
                    type="email"
                    disabled={!isAdmin}
                    className={`w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 ${!isAdmin ? 'bg-slate-50 cursor-not-allowed opacity-80' : ''}`}
                    value={churchEmail}
                    onChange={(e) => setChurchEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Primary Ledger Currency</label>
                  <select
                    disabled={!isAdmin}
                    className={`w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD ($) US Dollar</option>
                    <option value="EUR">EUR (€) Euro</option>
                    <option value="GBP">GBP (£) British Pound</option>
                    <option value="CAD">CAD ($) Canadian Dollar</option>
                    <option value="AUD">AUD ($) Australian Dollar</option>
                    <option value="PHP">PHP (₱) Philippine Peso</option>
                    <option value="ZAR">ZAR (R) South African Rand</option>
                    <option value="NGN">NGN (₦) Nigerian Naira</option>
                    <option value="KES">KES (KSh) Kenyan Shilling</option>
                  </select>
                </div>
              </div>
              
              {isAdmin && (
                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-100 transition cursor-pointer"
                  >
                    Save Configuration Settings
                  </button>
                </div>
              )}
            </div>

            {/* Data Management Section */}
            {/* Removed as requested */}
        </div>

        {/* Right column stacking all configs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Combined Offering Plan System Config */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Combined Offering Plan Distribution
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set how the centralized "Combined Offering" fund is distributed among various ministries.
                  </p>
                </div>
                
                {/* Dynamic status badge */}
                <div className={`text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 self-start sm:self-auto ${
                  isValidAllocation 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {isValidAllocation ? (
                    <>
                      <ShieldCheck size={14} /> Total Sums: 100% (Valid)
                    </>
                  ) : (
                    <>
                      <HeartCrack size={14} className="animate-pulse" /> Sums: {percentageSum}% (Needs to be exactly 100%)
                    </>
                  )}
                </div>
              </div>

              {/* Instruction tooltip note */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-250 flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed">
                <HelpCircle size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <b>Understanding the Model:</b> The Combined Offering Plan eliminates multiple offering lines. When members give, standard tithe acts as devotion (100% to Tithe), and arbitrary collections are placed in Combined Offering, which is immediately split into operating budgets, world evangelism, Christian Sabbath education, and outreach programs according to the proportions configured below.
                </div>
              </div>

              {/* Interactive allocation table keys and percentages */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {allocations.map(al => (
                  <div key={al.id} className="bg-slate-55 border border-slate-200/60 p-3 rounded-lg flex items-center justify-between gap-4 hover:border-slate-300 transition">
                    <div className="flex-1">
                      <input
                        type="text"
                        disabled={!isAdmin}
                        className={`w-full bg-white border border-slate-250 rounded px-2 py-1 text-xs font-semibold text-slate-700 ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                        value={al.name}
                        onChange={(e) => handleUpdateRow(al.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="w-24 flex items-center gap-1 bg-white border border-slate-250 rounded px-2 py-1 text-xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!isAdmin}
                        className={`w-full text-right outline-none font-mono font-bold text-slate-800 ${!isAdmin ? 'bg-slate-55 cursor-not-allowed' : ''}`}
                        value={al.percentage || ''}
                        onChange={(e) => handleUpdateRow(al.id, { percentage: Number(e.target.value) || 0 })}
                      />
                      <span className="text-slate-400 font-semibold">%</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveRow(al.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                        title="Delete Allocation Segment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center gap-4 animate-fade-in">
                <button
                  onClick={handleAddRow}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition border border-blue-100 cursor-pointer"
                >
                  + Add Sub-Allocation Area
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isValidAllocation}
                  className={`px-5 py-2 text-white font-semibold rounded-lg text-xs shadow-sm transition cursor-pointer ${
                    isValidAllocation ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-slate-300 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  Apply Systematic Plan Fractions
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
