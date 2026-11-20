import { Plus, Shield, Trash2, UserCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Club, ClubAdmin, ClubMember, Student } from '../types';
import { Modal } from './Modal';

interface MembersAdminsViewProps {
  members: ClubMember[];
  admins: ClubAdmin[];
  clubs: Club[];
  students: Student[];
  loading: boolean;
  isAdminMode: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export function MembersAdminsView({
  members,
  admins,
  clubs,
  students,
  loading,
  isAdminMode,
  onRefresh,
  onNotify,
}: MembersAdminsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'admins'>('members');
  const [clubFilter, setClubFilter] = useState<string>('all');

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [assignAdminOpen, setAssignAdminOpen] = useState(false);
  const [editMember, setEditMember] = useState<ClubMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [enrollForm, setEnrollForm] = useState({
    student_id: '',
    club_id: '',
    designation: 'General Member',
    wing: 'General',
  });

  const [adminForm, setAdminForm] = useState({
    student_id: '',
    club_id: '',
    admin_role: 'General Secretary',
    can_approve_apps: true,
    can_manage_members: true,
  });

  const [memberEditForm, setMemberEditForm] = useState({
    designation: '',
    wing: '',
    status: 'active',
  });

  const filteredMembers = members.filter((m) => clubFilter === 'all' || String(m.club_id) === clubFilter);
  const filteredAdmins = admins.filter((a) => clubFilter === 'all' || String(a.club_id) === clubFilter);

  async function handleDirectEnroll(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createMember({
        student_id: Number(enrollForm.student_id),
        club_id: Number(enrollForm.club_id),
        designation: enrollForm.designation,
        wing: enrollForm.wing,
      });
      setEnrollOpen(false);
      await onRefresh();
      onNotify('Student enrolled directly into club_members.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to enroll member', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveMemberEdit(e: FormEvent) {
    e.preventDefault();
    if (!editMember) return;
    setSubmitting(true);
    try {
      await api.updateMember(editMember.member_id, memberEditForm);
      setEditMember(null);
      await onRefresh();
      onNotify(`Updated membership record for ${editMember.student_name}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update member', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveMember(member: ClubMember) {
    try {
      await api.deleteMember(member.member_id);
      await onRefresh();
      onNotify(`Removed ${member.student_name} from ${member.club_code}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to remove member', 'error');
    }
  }

  async function handleAssignAdmin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAdmin({
        student_id: Number(adminForm.student_id),
        club_id: Number(adminForm.club_id),
        admin_role: adminForm.admin_role,
        can_approve_apps: adminForm.can_approve_apps,
        can_manage_members: adminForm.can_manage_members,
      });
      setAssignAdminOpen(false);
      await onRefresh();
      onNotify('Club admin assigned and synced with club_members.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to assign club admin', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleAdminPermission(admin: ClubAdmin, field: 'can_approve_apps' | 'can_manage_members') {
    try {
      await api.updateAdmin(admin.admin_id, {
        [field]: admin[field] === 1 ? false : true,
      });
      await onRefresh();
      onNotify(`Updated permissions for ${admin.student_name}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update permission', 'error');
    }
  }

  async function handleRevokeAdmin(admin: ClubAdmin) {
    try {
      await api.deleteAdmin(admin.admin_id);
      await onRefresh();
      onNotify(`Revoked ${admin.admin_role} privileges for ${admin.student_name}.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to revoke admin', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'members' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Club Members ({filteredMembers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('admins')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'admins' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Club Admins ({filteredAdmins.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            aria-label="Filter by club"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-800 focus:outline-none"
          >
            <option value="all">All Clubs</option>
            {clubs.map((c) => (
              <option key={c.club_id} value={String(c.club_id)}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          {isAdminMode && activeSubTab === 'members' && (
            <button
              type="button"
              onClick={() => {
                setEnrollForm({
                  student_id: students[0] ? String(students[0].student_id) : '',
                  club_id: clubs[0] ? String(clubs[0].club_id) : '',
                  designation: 'General Member',
                  wing: 'General',
                });
                setEnrollOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Enroll Member</span>
            </button>
          )}

          {isAdminMode && activeSubTab === 'admins' && (
            <button
              type="button"
              onClick={() => {
                setAdminForm({
                  student_id: students[0] ? String(students[0].student_id) : '',
                  club_id: clubs[0] ? String(clubs[0].club_id) : '',
                  admin_role: 'General Secretary',
                  can_approve_apps: true,
                  can_manage_members: true,
                });
                setAssignAdminOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Assign Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {activeSubTab === 'members' ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5 whitespace-nowrap">Student</th>
                  <th className="py-3 px-5 whitespace-nowrap">Club</th>
                  <th className="py-3 px-5 whitespace-nowrap">Designation &amp; Wing</th>
                  <th className="py-3 px-5 whitespace-nowrap">Status</th>
                  <th className="py-3 px-5 whitespace-nowrap">Joined</th>
                  {isAdminMode && <th className="py-3 px-5 text-right whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Loading club members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No club members found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.member_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{m.student_name}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {m.baust_id} · {m.department} ({m.batch})
                        </div>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{m.club_code}</div>
                        <div className="text-xs text-slate-500">{m.club_name}</div>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-700 whitespace-nowrap">
                        <span className="font-medium text-slate-900">{m.designation}</span>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span>{m.wing}</span>
                      </td>
                      <td className="py-3 px-5 text-xs font-medium whitespace-nowrap">
                        <span
                          className={
                            m.status === 'active'
                              ? 'text-emerald-700'
                              : m.status === 'alumni'
                                ? 'text-slate-600'
                                : 'text-red-700'
                          }
                        >
                          {m.status === 'active' ? 'Active' : m.status === 'alumni' ? 'Alumni' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {m.joined_at.slice(0, 10)}
                      </td>
                      {isAdminMode && (
                        <td className="py-3 px-5 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditMember(m);
                              setMemberEditForm({
                                designation: m.designation,
                                wing: m.wing,
                                status: m.status,
                              });
                            }}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Edit Role
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5 whitespace-nowrap">Admin Student</th>
                  <th className="py-3 px-5 whitespace-nowrap">Club</th>
                  <th className="py-3 px-5 whitespace-nowrap">Admin Role</th>
                  <th className="py-3 px-5 whitespace-nowrap">Approve Apps</th>
                  <th className="py-3 px-5 whitespace-nowrap">Manage Members</th>
                  {isAdminMode && <th className="py-3 px-5 text-right whitespace-nowrap">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && admins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Loading club admins...
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No club administrators assigned yet.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((ad) => (
                    <tr key={ad.admin_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{ad.student_name}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {ad.baust_id} · {ad.department} ({ad.batch})
                        </div>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{ad.club_code}</div>
                        <div className="text-xs text-slate-500">{ad.club_name}</div>
                      </td>
                      <td className="py-3 px-5 text-xs font-medium text-slate-800 whitespace-nowrap">
                        {ad.admin_role}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!isAdminMode}
                          onClick={() => handleToggleAdminPermission(ad, 'can_approve_apps')}
                          className={`text-xs font-medium ${
                            ad.can_approve_apps ? 'text-emerald-700' : 'text-slate-400'
                          } ${isAdminMode ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                        >
                          {ad.can_approve_apps ? 'Allowed' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!isAdminMode}
                          onClick={() => handleToggleAdminPermission(ad, 'can_manage_members')}
                          className={`text-xs font-medium ${
                            ad.can_manage_members ? 'text-emerald-700' : 'text-slate-400'
                          } ${isAdminMode ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                        >
                          {ad.can_manage_members ? 'Allowed' : 'Disabled'}
                        </button>
                      </td>
                      {isAdminMode && (
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRevokeAdmin(ad)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Revoke</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enroll Member Modal */}
      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Enroll Club Member"
        subtitle="Directly inserts a record into club_members (UNIQUE on student_id, club_id)."
      >
        <form onSubmit={handleDirectEnroll} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Student</label>
            <select
              required
              value={enrollForm.student_id}
              onChange={(e) => setEnrollForm({ ...enrollForm, student_id: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            >
              {students.map((s) => (
                <option key={s.student_id} value={String(s.student_id)}>
                  {s.baust_id} — {s.full_name} ({s.department})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Club</label>
            <select
              required
              value={enrollForm.club_id}
              onChange={(e) => setEnrollForm({ ...enrollForm, club_id: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            >
              {clubs.map((c) => (
                <option key={c.club_id} value={String(c.club_id)}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
              <input
                required
                value={enrollForm.designation}
                onChange={(e) => setEnrollForm({ ...enrollForm, designation: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Wing</label>
              <input
                required
                value={enrollForm.wing}
                onChange={(e) => setEnrollForm({ ...enrollForm, wing: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEnrollOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Enrolling...' : 'Enroll Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        open={Boolean(editMember)}
        onClose={() => setEditMember(null)}
        title="Update Member Role & Status"
        subtitle={editMember ? `${editMember.student_name} · ${editMember.club_name}` : ''}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveMemberEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
            <input
              required
              value={memberEditForm.designation}
              onChange={(e) => setMemberEditForm({ ...memberEditForm, designation: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Wing</label>
            <input
              required
              value={memberEditForm.wing}
              onChange={(e) => setMemberEditForm({ ...memberEditForm, wing: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Membership Status</label>
            <select
              value={memberEditForm.status}
              onChange={(e) => setMemberEditForm({ ...memberEditForm, status: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="alumni">Alumni</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditMember(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Admin Modal */}
      <Modal
        open={assignAdminOpen}
        onClose={() => setAssignAdminOpen(false)}
        title="Assign Club Administrator"
        subtitle="Creates a governance record in club_admins and ensures active membership."
      >
        <form onSubmit={handleAssignAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Student</label>
            <select
              required
              value={adminForm.student_id}
              onChange={(e) => setAdminForm({ ...adminForm, student_id: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            >
              {students.map((s) => (
                <option key={s.student_id} value={String(s.student_id)}>
                  {s.baust_id} — {s.full_name} ({s.department})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Club</label>
              <select
                required
                value={adminForm.club_id}
                onChange={(e) => setAdminForm({ ...adminForm, club_id: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              >
                {clubs.map((c) => (
                  <option key={c.club_id} value={String(c.club_id)}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Admin Role</label>
              <input
                required
                value={adminForm.admin_role}
                onChange={(e) => setAdminForm({ ...adminForm, admin_role: e.target.value })}
                placeholder="e.g. Vice President"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={adminForm.can_approve_apps}
                onChange={(e) => setAdminForm({ ...adminForm, can_approve_apps: e.target.checked })}
                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <span>Can review and approve student applications</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={adminForm.can_manage_members}
                onChange={(e) => setAdminForm({ ...adminForm, can_manage_members: e.target.checked })}
                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <span>Can manage club member designations and wings</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignAdminOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Assigning...' : 'Assign Admin'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
