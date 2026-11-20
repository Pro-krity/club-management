import {
  Building2,
  ClipboardList,
  Database,
  GraduationCap,
  LayoutDashboard,
  Menu,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from './api';
import { ApplicationsView } from './components/ApplicationsView';
import { ClubsView } from './components/ClubsView';
import { DatabaseDesignView } from './components/DatabaseDesignView';
import { MembersAdminsView } from './components/MembersAdminsView';
import { Modal } from './components/Modal';
import { OverviewView } from './components/OverviewView';
import { StudentsView } from './components/StudentsView';
import type {
  ActiveTab,
  Club,
  ClubAdmin,
  ClubApplication,
  ClubMember,
  OverviewData,
  SchemaData,
  Student,
} from './types';

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'clubs', label: 'Clubs Directory', icon: Building2 },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'applications', label: 'Applications', icon: ClipboardList },
  { id: 'members', label: 'Members & Admins', icon: Users },
  { id: 'database', label: 'Database Design', icon: Database },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(true);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<ClubApplication[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [admins, setAdmins] = useState<ClubAdmin[]>([]);
  const [schema, setSchema] = useState<SchemaData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Global Apply to Club modal state
  const [applyOpen, setApplyOpen] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyForm, setApplyForm] = useState({
    student_id: '',
    club_id: '',
    motivation: '',
    experience: '',
  });

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ov, cl, st, ap, mb, ad, sc] = await Promise.all([
        api.getOverview(),
        api.getClubs(),
        api.getStudents(),
        api.getApplications(),
        api.getMembers(),
        api.getAdmins(),
        api.getSchema(),
      ]);
      setOverview(ov);
      setClubs(cl);
      setStudents(st);
      setApplications(ap);
      setMembers(mb);
      setAdmins(ad);
      setSchema(sc);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to connect to BAUST Club database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openApplyModal(preselectedClubId?: number) {
    const recruitingClubs = clubs.filter((c) => c.is_recruiting === 1);
    const defaultClub =
      (preselectedClubId ? clubs.find((c) => c.club_id === preselectedClubId) : undefined) ??
      recruitingClubs[0] ??
      clubs[0];

    setApplyForm({
      student_id: students[0] ? String(students[0].student_id) : '',
      club_id: defaultClub ? String(defaultClub.club_id) : '',
      motivation: '',
      experience: '',
    });
    setApplyOpen(true);
  }

  async function handleSubmitApplication(e: FormEvent) {
    e.preventDefault();
    setApplySubmitting(true);
    try {
      await api.createApplication({
        student_id: Number(applyForm.student_id),
        club_id: Number(applyForm.club_id),
        application_subject: 'Applying to join as a club member',
        motivation: applyForm.motivation,
        experience: applyForm.experience || undefined,
      });
      setApplyOpen(false);
      await loadAll();
      notify('Club application submitted to pending review queue.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to submit application', 'error');
    } finally {
      setApplySubmitting(false);
    }
  }

  const currentNavLabel = NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Overview';
  const pendingCount = overview?.counts.pendingApplications ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation (256px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Lockup */}
          <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                BAUST Clubs
              </div>
              <div className="text-[11px] text-slate-500 whitespace-nowrap">Saidpur Campus Portal</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'applications' && pendingCount > 0 && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isActive ? 'text-emerald-200' : 'text-amber-700 font-semibold'
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Workspace Role Selector */}
        <div className="p-4 border-t border-slate-200 space-y-2.5">
          <div className="text-[11px] font-medium text-slate-500">Workspace View Mode</div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setIsAdminMode(true)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isAdminMode ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Club Admin
            </button>
            <button
              type="button"
              onClick={() => setIsAdminMode(false)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                !isAdminMode ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            {isAdminMode
              ? 'Full administrative access: approve applications, charter clubs, and assign admins.'
              : 'Student view: browse clubs, inspect schema, and submit club applications.'}
          </p>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on Left, Single Primary CTA on Right */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">BAUST Campus</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{currentNavLabel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openApplyModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Apply to Club</span>
          </button>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1320px] w-full mx-auto">
          {loadError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-center justify-between gap-4">
              <div className="text-sm text-red-800">{loadError}</div>
              <button
                type="button"
                onClick={loadAll}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewView
              data={overview}
              loading={loading}
              onNavigate={setActiveTab}
              onOpenApplyModal={openApplyModal}
            />
          )}

          {activeTab === 'clubs' && (
            <ClubsView
              clubs={clubs}
              loading={loading}
              isAdminMode={isAdminMode}
              onRefresh={loadAll}
              onOpenApplyModal={openApplyModal}
              onNotify={notify}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              students={students}
              loading={loading}
              isAdminMode={isAdminMode}
              onRefresh={loadAll}
              onNotify={notify}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsView
              applications={applications}
              clubs={clubs}
              admins={admins}
              loading={loading}
              isAdminMode={isAdminMode}
              onRefresh={loadAll}
              onOpenApplyModal={() => openApplyModal()}
              onNotify={notify}
            />
          )}

          {activeTab === 'members' && (
            <MembersAdminsView
              members={members}
              admins={admins}
              clubs={clubs}
              students={students}
              loading={loading}
              isAdminMode={isAdminMode}
              onRefresh={loadAll}
              onNotify={notify}
            />
          )}

          {activeTab === 'database' && <DatabaseDesignView schema={schema} loading={loading} />}
        </main>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm font-medium transition-opacity ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-white text-slate-900'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Global Apply to Club Modal */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Submit Club Application"
        subtitle="Inserts a pending request into club_applications for club admin review."
      >
        <form onSubmit={handleSubmitApplication} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Applying Student</label>
            <select
              required
              value={applyForm.student_id}
              onChange={(e) => setApplyForm({ ...applyForm, student_id: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            >
              {students.map((s) => (
                <option key={s.student_id} value={String(s.student_id)}>
                  {s.baust_id} — {s.full_name} ({s.department}, {s.batch})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Club</label>
              <select
                required
                value={applyForm.club_id}
                onChange={(e) => setApplyForm({ ...applyForm, club_id: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              >
                {clubs.map((c) => (
                  <option key={c.club_id} value={String(c.club_id)} disabled={!c.is_recruiting}>
                    {c.code} — {c.name} {!c.is_recruiting ? '(Closed)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Application Subject</label>
              <input
                type="text"
                readOnly
                value="Applying to join as a club member"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Statement of Interest</label>
            <textarea
              required
              rows={3}
              value={applyForm.motivation}
              onChange={(e) => setApplyForm({ ...applyForm, motivation: e.target.value })}
              placeholder="Explain why you want to join this club and how you plan to contribute..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Relevant Experience (Optional)</label>
            <input
              value={applyForm.experience}
              onChange={(e) => setApplyForm({ ...applyForm, experience: e.target.value })}
              placeholder="Prior contests, robotics kits, or event volunteering..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setApplyOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={applySubmitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {applySubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
