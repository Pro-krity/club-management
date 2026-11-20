import type {
  Club,
  ClubAdmin,
  ClubApplication,
  ClubMember,
  OverviewData,
  SchemaData,
  Student,
} from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getOverview: () => request<OverviewData>('/api/overview'),
  getSchema: () => request<SchemaData>('/api/schema'),

  getStudents: (params?: { search?: string; department?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.department) qs.set('department', params.department);
    const query = qs.toString();
    return request<Student[]>(`/api/students${query ? `?${query}` : ''}`);
  },
  createStudent: (payload: {
    baust_id: string;
    full_name: string;
    email: string;
    phone?: string;
    department: string;
    batch: string;
    semester: string;
  }) => request<Student>('/api/students', { method: 'POST', body: JSON.stringify(payload) }),
  deleteStudent: (id: number) => request<{ deleted: boolean }>(`/api/students/${id}`, { method: 'DELETE' }),

  getClubs: () => request<Club[]>('/api/clubs'),
  createClub: (payload: {
    code: string;
    name: string;
    category: string;
    advisor_name: string;
    room_location: string;
    founded_year: number;
    description: string;
    is_recruiting: boolean;
  }) => request<Club>('/api/clubs', { method: 'POST', body: JSON.stringify(payload) }),
  updateClub: (id: number, payload: Partial<{ is_recruiting: boolean; advisor_name: string; room_location: string; description: string }>) =>
    request<Club>(`/api/clubs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getApplications: (params?: { status?: string; club_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.club_id) qs.set('club_id', String(params.club_id));
    const query = qs.toString();
    return request<ClubApplication[]>(`/api/applications${query ? `?${query}` : ''}`);
  },
  createApplication: (payload: {
    student_id: number;
    club_id: number;
    application_subject?: string;
    motivation: string;
    experience?: string;
  }) => request<ClubApplication>('/api/applications', { method: 'POST', body: JSON.stringify(payload) }),
  reviewApplication: (
    id: number,
    payload: { status: 'approved' | 'rejected'; reviewed_by_admin_id?: number | null; review_note?: string },
  ) => request<ClubApplication>(`/api/applications/${id}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getMembers: (params?: { club_id?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.club_id) qs.set('club_id', String(params.club_id));
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return request<ClubMember[]>(`/api/members${query ? `?${query}` : ''}`);
  },
  createMember: (payload: { student_id: number; club_id: number; designation: string; wing: string }) =>
    request<ClubMember>('/api/members', { method: 'POST', body: JSON.stringify(payload) }),
  updateMember: (id: number, payload: Partial<{ designation: string; wing: string; status: string }>) =>
    request<ClubMember>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteMember: (id: number) => request<{ deleted: boolean }>(`/api/members/${id}`, { method: 'DELETE' }),

  getAdmins: (clubId?: number) =>
    request<ClubAdmin[]>(`/api/admins${clubId ? `?club_id=${clubId}` : ''}`),
  createAdmin: (payload: {
    student_id: number;
    club_id: number;
    admin_role: string;
    can_approve_apps: boolean;
    can_manage_members: boolean;
  }) => request<ClubAdmin>('/api/admins', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdmin: (
    id: number,
    payload: Partial<{ admin_role: string; can_approve_apps: boolean; can_manage_members: boolean }>,
  ) => request<ClubAdmin>(`/api/admins/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdmin: (id: number) => request<{ deleted: boolean }>(`/api/admins/${id}`, { method: 'DELETE' }),
};
