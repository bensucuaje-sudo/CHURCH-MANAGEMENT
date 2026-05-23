/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member, Contribution, ChurchPreferences } from './types';
import { INITIAL_MEMBERS, INITIAL_CONTRIBUTIONS, INITIAL_PREFERENCES } from './mockData';
import { LayoutDashboard, Users, CreditCard, Settings, Landmark, FileText, Heart, ShieldAlert, Eye, ShieldCheck, Download } from 'lucide-react';

// Subcomponents
import sdaLogo from './utils/sda logo.png';
import { ChurchLogo } from './components/ChurchLogo';
import ChurchCharts from './components/ChurchCharts';
import MemberManager from './components/MemberManager';
import TitheTracker from './components/TitheTracker';
import ReceiptPrinter from './components/ReceiptPrinter';
import ChurchConfig from './components/ChurchConfig';

export default function App() {
  // 1. Core Persistent States
  const [members, setMembers] = useState<Member[]>(() => {
    const cached = localStorage.getItem('church_members');
    const raw: Member[] = cached ? JSON.parse(cached) : INITIAL_MEMBERS;
    
    // Deduplicate and guarantee completely unique IDs
    const seen = new Set<string>();
    let maxIdNum = 1000;
    raw.forEach(m => {
      const num = parseInt(m.id?.replace('M-', '') || '');
      if (!isNaN(num) && num > maxIdNum) {
        maxIdNum = num;
      }
    });

    const uniqueMembers: Member[] = [];
    raw.forEach(m => {
      if (!m.id || seen.has(m.id)) {
        maxIdNum += 1;
        const newId = `M-${maxIdNum}`;
        seen.add(newId);
        uniqueMembers.push({ ...m, id: newId });
      } else {
        seen.add(m.id);
        uniqueMembers.push(m);
      }
    });
    return uniqueMembers;
  });

  const [contributions, setContributions] = useState<Contribution[]>(() => {
    const cached = localStorage.getItem('church_contributions');
    const raw: Contribution[] = cached ? JSON.parse(cached) : INITIAL_CONTRIBUTIONS;

    // Deduplicate and guarantee completely unique IDs
    const seen = new Set<string>();
    let maxIdNum = 5000;
    raw.forEach(c => {
      const num = parseInt(c.id?.replace('C-', '') || '');
      if (!isNaN(num) && num > maxIdNum) {
        maxIdNum = num;
      }
    });

    const uniqueContribs: Contribution[] = [];
    raw.forEach(c => {
      if (!c.id || seen.has(c.id)) {
        maxIdNum += 1;
        const newId = `C-${maxIdNum}`;
        seen.add(newId);
        uniqueContribs.push({ ...c, id: newId });
      } else {
        seen.add(c.id);
        uniqueContribs.push(c);
      }
    });
    return uniqueContribs;
  });

  const [preferences, setPreferences] = useState<ChurchPreferences>(() => {
    const cached = localStorage.getItem('church_preferences');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (!parsed.titheAllocations) {
        parsed.titheAllocations = INITIAL_PREFERENCES.titheAllocations;
      }
      return parsed;
    }
    return INITIAL_PREFERENCES;
  });

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, so clear it
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // 2. Navigation & Interface States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'collections' | 'config'>('dashboard');
  const [currentReceiptContribution, setCurrentReceiptContribution] = useState<Contribution | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const cached = localStorage.getItem('church_isAdmin');
    return cached ? JSON.parse(cached) : false; // Safe default to false (View-Only Mode)
  });

  // Admin Verification credentials modal state
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Sync to localStorage on any data changes
  useEffect(() => {
    localStorage.setItem('church_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('church_contributions', JSON.stringify(contributions));
  }, [contributions]);

  useEffect(() => {
    localStorage.setItem('church_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem('church_isAdmin', JSON.stringify(isAdmin));
  }, [isAdmin]);

  // 3. Action Handlers
  const handleAddMember = (newMemData: Omit<Member, 'id'>) => {
    const maxId = members.reduce((max, m) => {
      const num = parseInt(m.id.replace('M-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 1000);
    const newMember: Member = {
      ...newMemData,
      id: `M-${maxId + 1}`
    };
    setMembers([newMember, ...members]);
  };

  const handleUpdateMember = (updatedMember: Member) => {
    setMembers(members.map(m => (m.id === updatedMember.id ? updatedMember : m)));
    // Also update cached member name in contributions to keep reporting aligned
    setContributions(contributions.map(c => {
      if (c.memberId === updatedMember.id) {
        return {
          ...c,
          memberName: updatedMember.name
        };
      }
      return c;
    }));
  };

  const handleAddContribution = (newContribData: Omit<Contribution, 'id'>) => {
    const maxId = contributions.reduce((max, c) => {
      const num = parseInt(c.id.replace('C-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 5000);
    const newContrib: Contribution = {
      ...newContribData,
      id: `C-${maxId + 1}`
    };
    setContributions([newContrib, ...contributions]);
  };

  const handleDeleteContribution = (id: string) => {
    setContributions(contributions.filter(c => c.id !== id));
  };

  const handleDeleteMember = (id: string) => {
    alert("Attempting to delete member: " + id);
    setMembers(members.filter(m => m.id !== id));
    setContributions(contributions.filter(c => c.memberId !== id));
  };

  const handleUpdatePreferences = (updatedPref: ChurchPreferences) => {
    setPreferences(updatedPref);
  };

  const handleClearAllData = () => {
    if (confirm("Are you sure you want to delete ALL data (members, contributions)? This action cannot be undone.")) {
      localStorage.removeItem('church_members');
      localStorage.removeItem('church_contributions');
      setMembers([]);
      setContributions([]);
      alert("All data cleared.");
    }
  };

  // 4. On-the-fly Calculations for Metric Banners
  const aggregateTithes = contributions.reduce((sum, c) => sum + c.tithe, 0);
  const aggregateOfferings = contributions.reduce((sum, c) => sum + c.combinedOffering, 0);
  const aggregateTotal = contributions.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden print:overflow-visible print:h-auto" id="church-app-root">
      {/* LEFT SIDEBAR (HIDDEN when browser printing activates) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-850 shadow-xl print:hidden shrink-0" id="sidebar">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <img alt="Church Logo" className="w-8 h-8 rounded object-contain bg-white p-0.5 shadow-xs border border-slate-700/20" referrerPolicy="no-referrer" src={sdaLogo} />
          <div className="min-w-0">
            <span className="text-sm font-bold tracking-tight text-white block uppercase truncate">Seventh-Day Adventist</span>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider block">SANTO TOMAS CENTRAL</span>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto" id="sidebar-nav">
          <div className="px-6 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Main Menu</div>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-white border-l-4 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} className={activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'} />
            Insights Dashboard
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'members'
                ? 'bg-slate-800 text-white border-l-4 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Users size={14} className={activeTab === 'members' ? 'text-blue-500' : 'text-slate-400'} />
            <span>Church Members ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('collections')}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'collections'
                ? 'bg-slate-800 text-white border-l-4 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <CreditCard size={14} className={activeTab === 'collections' ? 'text-blue-500' : 'text-slate-400'} />
            Tithes & Offering Ledger
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'config'
                ? 'bg-slate-800 text-white border-l-4 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Settings size={14} className={activeTab === 'config' ? 'text-blue-500' : 'text-slate-400'} />
            Offering Plan Setup
          </button>

          {isInstallable && (
            <div className="mx-4 mt-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl space-y-2">
              <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Offline Ready</h4>
              <p className="text-[10px] text-slate-400 leading-tight">
                Install as a dedicated desktop app for faster access and offline use.
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow-sm transition cursor-pointer"
              >
                <Download size={12} />
                Install Web App
              </button>
            </div>
          )}
        </nav>

        {/* PROFILE SLOT AT BOTTOM OF SIDEBAR */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-850 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-xs font-bold font-mono">
              AD
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Admin</div>
              <div className="text-[10px] text-slate-500 truncate">{preferences.churchEmail || "admin@church.org"}</div>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('config')}
            className="w-full py-1.5 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-800 transition cursor-pointer text-center"
          >
            System Settings
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 print:overflow-visible print:h-auto font-sans" id="main-content-panel">
        
        {/* COMPACT TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shadow-xs shrink-0 print:hidden" id="app-header">
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-black text-slate-900 tracking-tight truncate">
              {preferences.churchName}
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase font-mono flex items-center gap-1">
              <span>DEVELOPED BY</span>
              <span>•</span>
              <span className="text-blue-600">ADVENTIST MEDIA - SANTO TOMAS</span>
            </p>
          </div>

          {/* Secure Admin Control Panel Toggle */}
          <div className="flex items-center gap-3">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              isAdmin 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isAdmin ? (
                <>
                  <ShieldCheck size={14} className="text-rose-500" />
                  <span className="text text-[10px] font-bold uppercase tracking-wider">ADMIN MODE • Full Access</span>
                </>
              ) : (
                <>
                  <Eye size={14} className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">VIEW ONLY MODE • Locked</span>
                </>
              )}
            </div>

            <button
              onClick={() => {
                if (isAdmin) {
                  setIsAdmin(false);
                } else {
                  setLoginUsername('');
                  setLoginPassword('');
                  setLoginError('');
                  setShowLoginModal(true);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight shadow-3xs cursor-pointer transition-all flex items-center gap-1.5 border ${
                isAdmin 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                  : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
              }`}
              id="role-mode-toggle"
            >
              {isAdmin ? (
                <>
                  <Eye size={13} />
                  <span>Switch to View Mode</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Switch to Admin Mode</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* WORKSPACE AREA (SCROLLABLE CANVAS) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 print:p-0 print:overflow-visible" id="workspace-canvas">
          
          {/* Dashboard specific dynamic welcome header */}
          {activeTab === 'dashboard' && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 rounded-xl p-6 text-white relative overflow-hidden shadow-md print:hidden">
              <div className="absolute right-0 top-0 bottom-0 opacity-[0.03] pointer-events-none text-white select-none">
                <img src={sdaLogo} alt="SDA Logo" className="w-[240px] h-full translate-x-12 translate-y-6 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="max-w-2xl space-y-1.5 relative">
                <span className="font-mono text-[9px] uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full font-bold inline-block text-blue-400">
                  Church Treasurer's Portal
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none mt-1">
                  Santo Tomas Central Church
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  Welcome to the {preferences.churchName} steward workspace. Manage members directory, record weekly devotional tithes, configure ratio-based segment plans, print verified tax-deductible certificates, and export records live to Excel CSV.
                </p>
              </div>
            </div>
          )}

          {/* Global Read-Only Mode Banner Header across sections when viewing locked */}
          {!isAdmin && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 text-amber-900 animate-fade-in" id="read-only-banner">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div className="space-y-1">
                <h4 className="text-xs font-bold">RECIPIENTS WORKSPACE IN READ-ONLY VIEW MODE</h4>
                <p className="text-[11px] text-slate-605 leading-relaxed font-normal">
                  All transactional edits, ledger additions, setting ratios, and registration structures are securely restricted. To add, edit or modify database collections, please toggle <strong>Admin Mode</strong> inside the top toolbar.
                </p>
              </div>
            </div>
          )}

          {/* Tab content routes */}
          {activeTab === 'dashboard' && (
            <ChurchCharts 
              contributions={contributions} 
              members={members} 
              preferences={preferences} 
            />
          )}

          {activeTab === 'members' && (
            <MemberManager 
              members={members} 
              onAddMember={handleAddMember} 
              onUpdateMember={handleUpdateMember} 
              onDeleteMember={handleDeleteMember}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'collections' && (
            <TitheTracker 
              contributions={contributions} 
              members={members} 
              preferences={preferences} 
              onAddContribution={handleAddContribution} 
              onSelectForReceipt={setCurrentReceiptContribution} 
              onDeleteContribution={handleDeleteContribution}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'config' && (
            <ChurchConfig 
              preferences={preferences} 
              onUpdatePreferences={handleUpdatePreferences} 
              onClearAllData={handleClearAllData}
              isAdmin={isAdmin}
            />
          )}

        </div>


        {/* STICKY STATUS FOOTER BAR */}
        <footer className="bg-white border-t border-slate-200 py-3 text-center text-[10px] text-slate-400 font-medium shrink-0 print:hidden" id="app-footer">
          <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <div>
              © {new Date().getFullYear() === 2026 ? '2026' : `2026-${new Date().getFullYear()}`} {preferences.churchName}. All records securely encrypted via local sandbox.
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span>Steward System: v1.1.2</span>
              <span>•</span>
              <span>Local Time: 14:13 UTC</span>
            </div>
          </div>
        </footer>

      </main>

      {/* RECEIPT PRINTING MODAL VIEWPORT */}
      {currentReceiptContribution && (
        <ReceiptPrinter 
          contribution={currentReceiptContribution} 
          preferences={preferences} 
          onClose={() => setCurrentReceiptContribution(null)} 
        />
      )}

      {/* ADMIN PORTAL AUTHENTICATION MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="admin-login-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-4 text-white flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight uppercase">Admin Authentication</h3>
                <p className="text-[10px] text-rose-100/90 font-medium font-sans">Ledger Access Key Required</p>
              </div>
            </div>

            {/* Login Form Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (loginUsername === 'admin' && loginPassword === 'password123') {
                setIsAdmin(true);
                setShowLoginModal(false);
                setLoginUsername('');
                setLoginPassword('');
                setLoginError('');
              } else {
                setLoginError('Invalid Administrator credentials.');
              }
            }} className="p-5 space-y-4">
              
              <p className="text-[11px] text-slate-500 leading-normal">
                Please enter your authorized administrative credentials to activate writing privilege on members, givers, collections, and allotments.
              </p>

              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                  <ShieldAlert size={13} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-center font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-3xs transition hover:cursor-pointer text-center font-sans"
                >
                  Confirm Login
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

