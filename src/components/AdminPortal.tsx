import React, { useState, useEffect } from 'react';
import { Cloud, Download, Upload, Trash2, LogIn, LogOut, CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { googleSignIn, logout, initAuth } from '../lib/firebase';
import { uploadBackup, listBackupFiles, downloadBackup, deleteBackup, DriveFile } from '../lib/drive';
import { Member, Contribution, ChurchPreferences } from '../types';
import { User } from 'firebase/auth';

interface AdminPortalProps {
  members: Member[];
  contributions: Contribution[];
  preferences: ChurchPreferences;
  onImportData: (data: { members: Member[]; contributions: Contribution[]; preferences: ChurchPreferences }) => void;
  isAdmin: boolean;
}

export default function AdminPortal({ members, contributions, preferences, onImportData, isAdmin }: AdminPortalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        fetchBackups(t);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchBackups = async (accessToken: string) => {
    try {
      setIsLoading(true);
      const files = await listBackupFiles(accessToken);
      setBackups(files);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        fetchBackups(result.accessToken);
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Authentication failed.' });
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setBackups([]);
  };

  const handleExport = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `sda_treasury_backup_${timestamp}.json`;
      const data = {
        version: '1.1.2',
        timestamp: new Date().toISOString(),
        members,
        contributions,
        preferences
      };
      await uploadBackup(token, fileName, data);
      setStatusMsg({ type: 'success', text: 'Data exported to Google Drive successfully.' });
      fetchBackups(token);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to export data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (fileId: string) => {
    if (!token) return;
    if (!confirm('This will OVERWRITE all local data with the selected backup. Are you sure?')) return;
    
    try {
      setIsLoading(true);
      const data = await downloadBackup(token, fileId);
      if (data.members && data.contributions && data.preferences) {
        onImportData(data);
        setStatusMsg({ type: 'success', text: 'Data imported successfully.' });
      } else {
        throw new Error('Invalid backup file format.');
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to import data: ' + (err as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this backup from Google Drive?')) return;

    try {
      setIsLoading(true);
      await deleteBackup(token, fileId);
      setStatusMsg({ type: 'success', text: 'Backup deleted.' });
      fetchBackups(token);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to delete backup.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">Admin Privileges Required</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          The Data Management portal is restricted to authorized administrators. 
          Please switch to Admin Mode to access Google Drive backups.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="text-blue-600" size={24} />
            Data Management Portal
          </h2>
          <p className="text-slate-500 text-sm">Securely backup and restore your church financial records to Google Drive.</p>
        </div>

        {user ? (
          <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full border border-slate-200 shadow-sm">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-900 truncate leading-none">{user.displayName}</p>
              <p className="text-[9px] text-slate-500 truncate leading-none mt-1">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
          >
            <LogIn size={16} />
            Connect Google Drive
          </button>
        )}
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-start gap-3 animate-fade-in ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider">{statusMsg.type === 'success' ? 'Success' : 'Error'}</p>
            <p className="text-sm opacity-90">{statusMsg.text}</p>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <Database size={14} />
          </button>
        </div>
      )}

      {!user ? (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <Cloud size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Cloud Sync & Security</h3>
            <p className="text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">
              Connect your Google account to unlock cloud backups. This ensures your church data is stored securely 
              off-site and can be restored in case of local device failure or accidental deletion.
            </p>
          </div>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <LogIn size={18} />
            Get Started with Google Drive
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw size={12} />
                Live Actions
              </h3>
              
              <button
                disabled={isLoading}
                onClick={handleExport}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group cursor-pointer"
              >
                <div className="text-left">
                  <p className="text-sm font-black text-slate-850 group-hover:text-blue-600">Export All Entries</p>
                  <p className="text-[10px] text-slate-500">Securely push local data to Drive</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 shadow-3xs flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                  <Upload size={20} />
                </div>
              </button>

              <button
                disabled={isLoading || backups.length === 0}
                onClick={() => backups[0] && handleImport(backups[0].id)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-left">
                  <p className="text-sm font-black text-slate-850 group-hover:text-emerald-600">Restore Latest</p>
                  <p className="text-[10px] text-slate-500">Pick up where you left off</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 shadow-3xs flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all">
                  <Download size={20} />
                </div>
              </button>
            </div>

            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/10 relative overflow-hidden">
               <Database className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
               <h4 className="text-xs font-black uppercase tracking-widest mb-1">State Snapshot</h4>
               <div className="space-y-3 mt-4">
                 <div className="flex justify-between items-end">
                   <span className="text-[10px] uppercase font-bold text-blue-200">Total Members</span>
                   <span className="text-xl font-mono font-black">{members.length}</span>
                 </div>
                 <div className="flex justify-between items-end border-t border-blue-500/30 pt-2">
                   <span className="text-[10px] uppercase font-bold text-blue-200">Total Records</span>
                   <span className="text-xl font-mono font-black">{contributions.length}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Cloud Backup History</h3>
                <p className="text-[10px] text-slate-500 font-medium">Manage and restore previous database snapshots</p>
              </div>
              <button 
                onClick={() => fetchBackups(token!)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && backups.length === 0 ? (
                <div className="p-20 text-center space-y-3">
                  <RefreshCw className="mx-auto text-blue-600 animate-spin" size={24} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scanning Drive Files...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="p-20 text-center space-y-3">
                  <Cloud className="mx-auto text-slate-200" size={48} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Backups Found</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Click "Export All Entries" to create your first cloud backup.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Backup Name</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Modified Date</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {backups.map(file => (
                      <tr key={file.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center border border-blue-100">
                              <Database size={14} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {new Date(file.modifiedTime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleImport(file.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download size={12} />
                              Restore
                            </button>
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded border border-transparent hover:border-rose-100 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
