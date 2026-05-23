/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, MembershipStatus, ChurchRole } from '../types';
import { Search, UserPlus, SlidersHorizontal, Edit3, Mail, Phone, MapPin, Calendar, Heart, Shield, Ban } from 'lucide-react';
import { exportMembersToCSV } from '../utils/exporter';

interface MemberManagerProps {
  members: Member[];
  onAddMember: (member: Omit<Member, 'id'>) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  isAdmin?: boolean;
}

export default function MemberManager({ members, onAddMember, onUpdateMember, onDeleteMember, isAdmin = true }: MemberManagerProps) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | ChurchRole>('all');
  
  // Create / Edit states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<MembershipStatus>('Active');
  const [role, setRole] = useState<ChurchRole>('Member');
  const [notes, setNotes] = useState('');
  const [membershipDate, setMembershipDate] = useState(() => String(new Date().getFullYear()));

  // Open form for adding
  const handleOpenAddForm = () => {
    setEditingMember(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setStatus('Active');
    setRole('Member');
    setNotes('');
    setMembershipDate(String(new Date().getFullYear()));
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleOpenEditForm = (member: Member) => {
    setEditingMember(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone);
    setAddress(member.address);
    setStatus(member.status);
    setRole(member.role);
    setNotes(member.notes || '');
    setMembershipDate(member.membershipDate.includes('-') ? member.membershipDate.split('-')[0] : member.membershipDate);
    setIsFormOpen(true);
  };

  // Handle submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const memberData = {
      name,
      email,
      phone,
      address,
      status,
      role,
      notes: notes.trim(),
      membershipDate
    };

    if (editingMember) {
      onUpdateMember({
        ...memberData,
        id: editingMember.id
      });
    } else {
      onAddMember(memberData);
    }
    
    setIsFormOpen(false);
  };

  // Filter members list based on criteria
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [members, searchTerm, statusFilter, roleFilter]);

  // General counts for header overview
  const activeCount = useMemo(() => members.filter(m => m.status === 'Active').length, [members]);
  const visitorCount = useMemo(() => members.filter(m => m.status === 'Visitor').length, [members]);

  return (
    <div className="space-y-6" id="member-manager-section">
      {/* Quick Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Active Congregation</span>
            <div className="text-2xl font-bold text-slate-800 mt-1">{activeCount} Members</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-emerald-500 font-bold border border-slate-100">
            <Heart size={18} />
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Total Directory</span>
            <div className="text-2xl font-bold text-slate-800 mt-1">{members.length} Registered</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-sky-500 font-bold border border-slate-100">
            <Shield size={18} />
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Visitors & Observers</span>
            <div className="text-2xl font-bold text-slate-800 mt-1">{visitorCount} Expected</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-amber-500 font-bold border border-slate-100">
            <UserPlus size={18} />
          </div>
        </div>
      </div>

      {/* Directory Workstation */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        {/* Workstation Toolbar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/55 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 placeholder-slate-400"
              />
            </div>
            
            {/* Filter Status */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-3xs text-xs font-medium text-slate-600">
              <SlidersHorizontal size={12} className="text-slate-400" />
              <span className="text-slate-400">Status:</span>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent border-none outline-none text-slate-700 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Visitor">Visitor</option>
              </select>
            </div>

            {/* Filter Church Role */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-3xs text-xs font-medium text-slate-600">
              <span className="text-slate-400">Role:</span>
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-transparent border-none outline-none text-slate-700 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="Member">Regular Member</option>
                <option value="Pastor">Pastor</option>
                <option value="Elder">Elder</option>
                <option value="Deacon">Deacon</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Volunteer">Volunteer</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportMembersToCSV(filteredMembers)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg shadow-3xs transition duration-150 flex items-center gap-1.5"
            >
              📊 Export to Excel CSV
            </button>
            {isAdmin && (
              <button
                onClick={handleOpenAddForm}
                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition duration-150 flex items-center gap-1.5 hover:cursor-pointer"
              >
                <UserPlus size={14} /> Add New Member
              </button>
            )}
          </div>
        </div>

        {/* Directory Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Card Detail / ID</th>
                <th className="px-6 py-4">Status & Role</th>
                <th className="px-6 py-4">Contact Channels</th>
                <th className="px-6 py-4">Year Baptized</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <p className="font-medium">No church members match your current filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search terms or add a new profile above.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold font-mono text-sm shadow-3xs">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{member.name}</div>
                          <div className="text-[10px] font-mono font-medium text-slate-400 mt-0.5">{member.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center self-start px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          member.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          member.status === 'Visitor' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-50 text-slate-600 border border-slate-100'
                        }`}>
                          {member.status}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{member.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs leading-relaxed text-slate-500 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400 inline" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400 inline" />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-400 inline" />
                          <span className="truncate max-w-[170px]" title={member.address}>{member.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {member.membershipDate.includes('-') ? member.membershipDate.split('-')[0] : member.membershipDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditForm(member)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 bg-blue-50/50 hover:bg-blue-100 p-1.5 rounded-lg transition duration-150 cursor-pointer animate-fade-in"
                            title="Edit Details"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMember(member.id);
                            }}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 bg-rose-50/50 hover:bg-rose-100 p-1.5 rounded-lg transition duration-150 cursor-pointer animate-fade-in"
                            title="Delete Member"
                          >
                            <Ban size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-tight bg-slate-100 px-2 py-1 rounded">Locked (Viewer)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide Out / Overlay Form drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex justify-end z-50 animate-fade-in" id="form-overlay">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 animate-slide-in overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">{editingMember ? 'Update Member Profile' : 'Add New Member to Directory'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingMember ? 'Review and update contact records.' : 'Establish church directory credentials.'}</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                id="close-drawer-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* ID (Readonly on edit) */}
                {editingMember && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">MEMBER UNIQUE ID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-400 outline-none"
                      value={editingMember.id}
                      disabled
                    />
                  </div>
                )}
                {/* Name */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Full Representative Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ben Ryan M. Sucuaje"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Contact grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Email address</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Street address */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Residential Street Address</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {/* Status & role grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Fellowship Status</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-700 bg-white"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as MembershipStatus)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Visitor">Visitor / Guest</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Board / Church Role</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-700 bg-white"
                      value={role}
                      onChange={(e) => setRole(e.target.value as ChurchRole)}
                    >
                      <option value="Member">Regular Member</option>
                      <option value="Pastor">Pastor</option>
                      <option value="Elder">Elder</option>
                      <option value="Deacon">Deacon</option>
                      <option value="Treasurer">Treasurer</option>
                      <option value="Volunteer">Volunteer Helper</option>
                    </select>
                  </div>
                </div>

                {/* Year Baptized */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Year Baptized *</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    required
                    placeholder="E.g. 2024"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-700 bg-white"
                    value={membershipDate.includes('-') ? membershipDate.split('-')[0] : membershipDate}
                    onChange={(e) => setMembershipDate(e.target.value)}
                  />
                </div>

                {/* Administrative Notes */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Administrative Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Enter any medical, family relation, or ordination details..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              {/* Form submit footer */}
              <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-xs shadow-sm shadow-blue-100 transition hover:cursor-pointer"
                >
                  {editingMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
