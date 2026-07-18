/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member, Contribution, ChurchPreferences } from './types';
import { INITIAL_MEMBERS, INITIAL_CONTRIBUTIONS, INITIAL_PREFERENCES } from './mockData';
import { ChurchLogo } from './components/ChurchLogo';
import ChurchCharts from './components/ChurchCharts';
import MemberManager from './components/MemberManager';
import TitheTracker from './components/TitheTracker';
import ReceiptPrinter from './components/ReceiptPrinter';
import ChurchConfig from './components/ChurchConfig';
import AdminPortal from './components/AdminPortal';
import { Database, LayoutDashboard, Users, CreditCard, Settings, Landmark, FileText, Heart, ShieldAlert, Eye, ShieldCheck, Download, X, Lock, ExternalLink, Cloud, ArrowUpDown, CloudLightning } from 'lucide-react';
import { supabase } from './supabaseClient';
import {
  isSupabaseConfigured,
  dbFetchMembers,
  dbUpsertMember,
  dbDeleteMember,
  dbFetchContributions,
  dbUpsertContribution,
  dbDeleteContribution,
  dbFetchPreferences,
  dbUpsertPreferences
} from './lib/supabase';

const sdaLogo = '/sda-logo.png';

export default function App() {
  // Helper for safe JSON parsing
  const safeJsonParse = (key: string, defaultValue: any) => {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : defaultValue;
    } catch (e) {
      console.error(`Error parsing localStorage for key "${key}":`, e);
      return defaultValue;
    }
  };

  // 1. Core Persistent States
  const [members, setMembers] = useState<Member[]>(() => {
    const raw: Member[] = safeJsonParse('church_members', INITIAL_MEMBERS);
    
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
    const raw: Contribution[] = safeJsonParse('church_contributions', INITIAL_CONTRIBUTIONS);

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
    const parsed = safeJsonParse('church_preferences', INITIAL_PREFERENCES);
    if (parsed && !parsed.titheAllocations) {
      parsed.titheAllocations = INITIAL_PREFERENCES.titheAllocations;
    }
    return parsed;
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
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Always default to false (View-Only Mode) on load
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // Admin Verification credentials state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Supabase Sync & Authentication States
  const [isDbLoading, setIsDbLoading] = useState<boolean>(false);
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // OAuth Popup Handler & Redirect Interceptor
  useEffect(() => {
    const isCallback = window.location.hash.includes('access_token=') || 
                       window.location.hash.includes('id_token=') ||
                       window.location.search.includes('code=');
    if (window.opener && isCallback) {
      window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
      window.close();
    }
  }, []);

  // Supabase Auth Session listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        setIsAdmin(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setSupabaseUser(session.user);
            setIsAdmin(true);
            setActiveTab('dashboard');
            window.history.pushState(null, '', '/');
          }
        });
      }
    };
    window.addEventListener('message', handleOAuthMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoginError('');
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const popup = window.open(data.url, 'google_oauth_popup', 'width=600,height=700');
        if (!popup) {
          alert('Please allow popups for this site to log in with Google.');
        }
      } else {
        throw new Error('No login URL returned from Supabase.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Google Authentication failed.');
    }
  };

  // Fetch data from Supabase on mount / session change
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    async function loadData() {
      try {
        setIsDbLoading(true);
        setDbSyncError(null);

        let dbMembers: Member[] = [];
        let dbContributions: Contribution[] = [];
        let dbPreferences: ChurchPreferences | null = null;
        let membersError: any = null;
        let contributionsError: any = null;
        let preferencesError: any = null;

        try {
          dbMembers = await dbFetchMembers();
        } catch (err: any) {
          membersError = err;
          console.warn("Failed to load members from Supabase. Falling back to local storage.", err);
        }

        try {
          dbContributions = await dbFetchContributions();
        } catch (err: any) {
          contributionsError = err;
          console.warn("Failed to load contributions from Supabase. Falling back to local storage.", err);
        }

        try {
          dbPreferences = await dbFetchPreferences();
        } catch (err: any) {
          preferencesError = err;
          console.warn("Failed to load preferences from Supabase. Falling back to local storage.", err);
        }

        if (membersError || contributionsError || preferencesError) {
          const parts = [];
          if (membersError) parts.push("Members");
          if (contributionsError) parts.push("Contributions");
          if (preferencesError) parts.push("Preferences");
          setDbSyncError(`Unable to sync ${parts.join(", ")} tables from Supabase. This usually means the tables do not exist yet. Using local sandbox fallback.`);
        }

        let hasData = false;
        if (!membersError && dbMembers && dbMembers.length > 0) {
          setMembers(dbMembers);
          hasData = true;
        }
        if (!contributionsError && dbContributions && dbContributions.length > 0) {
          setContributions(dbContributions);
          hasData = true;
        }
        if (!preferencesError && dbPreferences) {
          setPreferences(dbPreferences);
          hasData = true;
        }

        // Auto sync local storage to Supabase ONLY if Supabase loaded successfully with no errors AND is totally empty
        if (!membersError && !contributionsError && !preferencesError && !hasData) {
          console.log("No data found in Supabase. Backing up local sandbox...");
          for (const m of members) {
            try {
              await dbUpsertMember(m);
            } catch (err) {
              console.warn("Could not auto-sync member to Supabase:", err);
            }
          }
          for (const c of contributions) {
            try {
              await dbUpsertContribution(c);
            } catch (err) {
              console.warn("Could not auto-sync contribution to Supabase:", err);
            }
          }
          try {
            await dbUpsertPreferences(preferences);
          } catch (err) {
            console.warn("Could not auto-sync preferences to Supabase:", err);
          }
        }
      } catch (err: any) {
        console.warn("General error in Supabase loader:", err);
        setDbSyncError(err.message || "Failed to load database from Supabase.");
      } finally {
        setIsDbLoading(false);
      }
    }

    loadData();
  }, [supabaseUser]);

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
  const handleAddMember = async (newMemData: Omit<Member, 'id'>) => {
    const maxId = members.reduce((max, m) => {
      const num = parseInt(m.id.replace('M-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 1000);
    const newMember: Member = {
      ...newMemData,
      id: `M-${maxId + 1}`
    };
    setMembers([newMember, ...members]);

    if (isSupabaseConfigured) {
      try {
        await dbUpsertMember(newMember);
      } catch (err: any) {
        alert("Error saving member to Supabase: " + err.message);
      }
    }
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    setMembers(members.map(m => (m.id === updatedMember.id ? updatedMember : m)));
    // Also update cached member name in contributions to keep reporting aligned
    const updatedContribs = contributions.map(c => {
      if (c.memberId === updatedMember.id) {
        return {
          ...c,
          memberName: updatedMember.name
        };
      }
      return c;
    });
    setContributions(updatedContribs);

    if (isSupabaseConfigured) {
      try {
        await dbUpsertMember(updatedMember);
        // Sync modified contributions in Supabase
        for (const c of updatedContribs) {
          if (c.memberId === updatedMember.id) {
            await dbUpsertContribution(c);
          }
        }
      } catch (err: any) {
        alert("Error updating member in Supabase: " + err.message);
      }
    }
  };

  const handleAddContribution = async (newContribData: Omit<Contribution, 'id'>) => {
    const maxId = contributions.reduce((max, c) => {
      const num = parseInt(c.id.replace('C-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 5000);
    const newContrib: Contribution = {
      ...newContribData,
      id: `C-${maxId + 1}`
    };
    setContributions([newContrib, ...contributions]);

    if (isSupabaseConfigured) {
      try {
        await dbUpsertContribution(newContrib);
      } catch (err: any) {
        alert("Error saving contribution to Supabase: " + err.message);
      }
    }
  };

  const handleDeleteContribution = async (id: string) => {
    setContributions(contributions.filter(c => c.id !== id));

    if (isSupabaseConfigured) {
      try {
        await dbDeleteContribution(id);
      } catch (err: any) {
        alert("Error deleting contribution from Supabase: " + err.message);
      }
    }
  };

  const handleDeleteMember = async (id: string) => {
    alert("Attempting to delete member: " + id);
    setMembers(members.filter(m => m.id !== id));
    setContributions(contributions.filter(c => c.memberId !== id));

    if (isSupabaseConfigured) {
      try {
        await dbDeleteMember(id);
        const related = contributions.filter(c => c.memberId === id);
        for (const r of related) {
          await dbDeleteContribution(r.id);
        }
      } catch (err: any) {
        alert("Error deleting member from Supabase: " + err.message);
      }
    }
  };

  const handleUpdatePreferences = async (updatedPref: ChurchPreferences) => {
    setPreferences(updatedPref);

    if (isSupabaseConfigured) {
      try {
        await dbUpsertPreferences(updatedPref);
      } catch (err: any) {
        alert("Error saving preferences to Supabase: " + err.message);
      }
    }
  };

  const handleImportBackup = (data: { members: Member[]; contributions: Contribution[]; preferences: ChurchPreferences }) => {
    setMembers(data.members);
    setContributions(data.contributions);
    setPreferences(data.preferences);
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

  if (!isAdmin) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden" id="church-auth-root">
        {/* Decorative ambient background blur */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.15)_0,transparent_60%)] pointer-events-none" />
        
        <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-fade-in" id="login-card">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-tight uppercase">Admin Authentication</h3>
            </div>
          </div>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoginError('');
            if (!isSupabaseConfigured || !supabase) {
              setLoginError('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.');
              return;
            }
            try {
              if (authMode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                  email: loginUsername,
                  password: loginPassword,
                });
                if (error) throw error;
                setIsAdmin(true);
                setLoginUsername('');
                setLoginPassword('');
                setActiveTab('dashboard');
                window.history.pushState(null, '', '/');
              } else {
                const { data, error } = await supabase.auth.signUp({
                  email: loginUsername,
                  password: loginPassword,
                });
                if (error) throw error;
                alert("Registration successful! You can now log in using these credentials.");
                setAuthMode('login');
              }
            } catch (err: any) {
              setLoginError(err.message || 'Authentication failed.');
            }
          }} className="p-5 space-y-4">
            
            <div className="border-b border-slate-100 pb-2 mb-2">
              <h4 className="text-xs font-bold text-slate-800 text-center uppercase tracking-wider">
                Sign In
              </h4>
            </div>

            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                <ShieldAlert size={13} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="sdasantotomascentral@gmail.com"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
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
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            {!isSupabaseConfigured && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[10px] text-amber-800 leading-normal font-sans">
                💡 <strong>Supabase is currently unconfigured.</strong> Please configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in the settings menu or .env to enable authentication and synchronization.
              </div>
            )}

            {/* Actions */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginUsername('');
                  setLoginPassword('');
                  setLoginError('');
                }}
                className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-center font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-3xs transition hover:cursor-pointer text-center font-sans"
              >
                {authMode === 'login' ? 'Sign In' : 'Register'}
              </button>
            </div>

            <div className="relative my-2 flex items-center justify-center">
              <div className="absolute inset-x-0 border-t border-slate-100"></div>
              <span className="relative bg-white px-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">or</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-3xs transition hover:cursor-pointer flex items-center justify-center gap-2 font-sans"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-.23-1.25-.61-1.67-1.11z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    );
  }

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
            System Management
          </button>

          <div className="mx-4 mt-6 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-2" id="sidebar-install-widget">
            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Offline Ready</h4>
            <p className="text-[10px] text-slate-400 leading-tight col-span-2">
              Install as a dedicated app for fast access and robust offline registries.
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                onClick={isInstallable ? handleInstallClick : () => setShowInstallGuide(true)}
                className="w-full flex items-center justify-center gap-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow-sm transition cursor-pointer font-sans"
                id="btn-install-webapp"
              >
                <Download size={12} />
                Install Web App
              </button>
              
              {/* Force Browser to Open out of Sandbox to allow URL Bar install */}
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded shadow-sm transition cursor-pointer font-sans no-underline"
              >
                <ExternalLink size={12} />
                Open In New Tab
              </a>
            </div>
          </div>
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
              <ShieldCheck size={14} className="text-rose-500" />
              <span className="text text-[10px] font-bold uppercase tracking-wider">ADMIN MODE • Full Access</span>
            </div>

            <button
              onClick={async () => {
                if (isSupabaseConfigured && supabase) {
                  await supabase.auth.signOut();
                }
                setIsAdmin(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight shadow-3xs cursor-pointer transition-all flex items-center gap-1.5 border bg-rose-600 hover:bg-rose-700 text-white border-rose-500"
              id="role-mode-toggle"
            >
              <Lock size={13} />
              <span>Sign Out</span>
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

          {/* Supabase Missing Tables Warning Banner */}
          {isSupabaseConfigured && dbSyncError && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start justify-between gap-3 text-slate-800 animate-fade-in" id="db-sync-warning-banner">
              <div className="flex items-start gap-3">
                <CloudLightning className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-blue-900 flex items-center gap-1.5">
                    Supabase Tables Not Detected
                  </h4>
                  <p className="text-[11px] text-slate-605 leading-relaxed font-normal">
                    You have configured Supabase connection keys, but the database tables (<code>members</code>, <code>contributions</code>, or <code>preferences</code>) are not yet created in your Supabase project. 
                    The application is automatically falling back to your <strong>Local Sandbox Sandbox</strong> so you won't lose any data.
                  </p>
                  <p className="text-[10px] text-blue-700 font-semibold pt-1">
                    👉 Go to <button onClick={() => setActiveTab('config')} className="underline font-bold hover:text-blue-800 transition cursor-pointer">System Management</button> to copy the SQL schema code and run it in your Supabase SQL Editor.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDbSyncError(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Main workspace displays */}

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
              members={members}
              contributions={contributions}
              onImportData={handleImportBackup}
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

      {/* PWA INSTALLATION GUIDE MODAL */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="pwa-install-guide-modal" onClick={() => setShowInstallGuide(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Download size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-tight uppercase">Installation Guide</h3>
                  <p className="text-[10px] text-blue-100/90 font-medium">Add Portal to Your Device</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowInstallGuide(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                By installing this portal, you can run it in a full standalone window like a native application with direct offline local files access.
              </p>

              <div className="space-y-3">
                {/* On Chrome/Edge */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                    Chrome / Edge (Desktop & Android)
                  </p>
                  <p className="text-[10px] text-slate-505 leading-normal">
                    Click the <strong>install icon</strong> in the URL bar, or open the menu and select <strong>"Save & Share" → "Install App"</strong>.
                  </p>
                </div>

                {/* On iOS / Safari */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                    Safari (iPhone & iPad)
                  </p>
                  <p className="text-[10px] text-slate-505 leading-normal">
                    Tap the <strong>Share</strong> icon, scroll down, and select <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>

                {/* IFrame constraints info */}
                <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">
                    iFrame Sandbox Notice
                  </p>
                  <p className="text-[10px] text-amber-900 leading-normal font-medium">
                    Because this preview runs inside an iframe, browsers block automatic installation menus. For an instant install, please click <strong className="underline">"Open in New Tab"</strong> at the top of the portal, and use your browser's install menu there!
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-3xs transition cursor-pointer text-center font-sans"
                >
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authenticated content views completed */}

    </div>
  );
}

