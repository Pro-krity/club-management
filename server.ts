import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { db, getSchemaSql, initializeDatabase } from './server/db.ts';

initializeDatabase();

const app = express();
app.use(express.json());

function parsePositiveInt(val: unknown): number | null {
  const num = Number(val);
  return Number.isInteger(num) && num > 0 ? num : null;
}

// 1. Overview & KPI Metrics
app.get('/api/overview', (_req, res) => {
  try {
    const counts = {
      students: (db.prepare('SELECT COUNT(*) AS c FROM students').get() as { c: number }).c,
      clubs: (db.prepare('SELECT COUNT(*) AS c FROM clubs').get() as { c: number }).c,
      recruitingClubs: (db.prepare('SELECT COUNT(*) AS c FROM clubs WHERE is_recruiting = 1').get() as { c: number }).c,
      pendingApplications: (db.prepare("SELECT COUNT(*) AS c FROM club_applications WHERE status = 'pending'").get() as { c: number }).c,
      totalApplications: (db.prepare('SELECT COUNT(*) AS c FROM club_applications').get() as { c: number }).c,
      activeMembers: (db.prepare("SELECT COUNT(*) AS c FROM club_members WHERE status = 'active'").get() as { c: number }).c,
      clubAdmins: (db.prepare('SELECT COUNT(*) AS c FROM club_admins').get() as { c: number }).c,
    };

    const departmentBreakdown = db
      .prepare('SELECT department, COUNT(*) AS count FROM students GROUP BY department ORDER BY count DESC')
      .all();

    const clubStats = db
      .prepare(`
        SELECT
          c.club_id,
          c.code,
          c.name,
          c.category,
          c.is_recruiting,
          c.image_url,
          c.room_location,
          c.advisor_name,
          (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.club_id AND cm.status = 'active') AS member_count,
          (SELECT COUNT(*) FROM club_applications ca WHERE ca.club_id = c.club_id AND ca.status = 'pending') AS pending_count,
          (SELECT COUNT(*) FROM club_admins cad WHERE cad.club_id = c.club_id) AS admin_count
        FROM clubs c
        ORDER BY member_count DESC, c.name ASC
      `)
      .all();

    const recentApplications = db
      .prepare(`
        SELECT
          ca.application_id,
          ca.application_subject,
          ca.motivation,
          ca.status,
          ca.applied_at,
          s.student_id,
          s.baust_id,
          s.full_name AS student_name,
          s.department,
          s.batch,
          c.club_id,
          c.code AS club_code,
          c.name AS club_name
        FROM club_applications ca
        JOIN students s ON s.student_id = ca.student_id
        JOIN clubs c ON c.club_id = ca.club_id
        ORDER BY CASE WHEN ca.status = 'pending' THEN 0 ELSE 1 END, ca.applied_at DESC
        LIMIT 8
      `)
      .all();

    res.json({ counts, departmentBreakdown, clubStats, recentApplications });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load overview' });
  }
});

// 2. Database Schema & Live Table Metadata
app.get('/api/schema', (_req, res) => {
  try {
    const tables = ['students', 'clubs', 'club_applications', 'club_members', 'club_admins'];
    const tableDetails = tables.map((tableName) => {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
      const countRow = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count: number };
      return {
        name: tableName,
        rowCount: countRow.count,
        columns,
        foreignKeys,
      };
    });

    res.json({
      sql: getSchemaSql(),
      tables: tableDetails,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to inspect schema' });
  }
});

// 3. Students CRUD
app.get('/api/students', (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';

    const rows = db
      .prepare(`
        SELECT
          s.*,
          (SELECT COUNT(*) FROM club_members cm WHERE cm.student_id = s.student_id AND cm.status = 'active') AS active_clubs_count,
          (SELECT COUNT(*) FROM club_admins ca WHERE ca.student_id = s.student_id) AS admin_roles_count,
          (SELECT COUNT(*) FROM club_applications app WHERE app.student_id = s.student_id AND app.status = 'pending') AS pending_apps_count
        FROM students s
        ORDER BY s.baust_id ASC
      `)
      .all() as Array<Record<string, unknown>>;

    const filtered = rows.filter((row) => {
      const matchesDept = !department || department === 'ALL' || row.department === department;
      const matchesSearch =
        !search ||
        String(row.full_name).toLowerCase().includes(search) ||
        String(row.baust_id).toLowerCase().includes(search) ||
        String(row.email).toLowerCase().includes(search);
      return matchesDept && matchesSearch;
    });

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch students' });
  }
});

app.post('/api/students', (req, res) => {
  try {
    const { baust_id, full_name, email, phone, department, batch, semester } = req.body ?? {};
    if (!baust_id || !full_name || !email || !department || !batch || !semester) {
      res.status(400).json({ error: 'All required student fields must be provided.' });
      return;
    }
    const stmt = db.prepare(`
      INSERT INTO students (baust_id, full_name, email, phone, department, batch, semester)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      String(baust_id).trim(),
      String(full_name).trim(),
      String(email).trim().toLowerCase(),
      phone ? String(phone).trim() : null,
      String(department).trim(),
      String(batch).trim(),
      String(semester).trim(),
    );
    const created = db.prepare('SELECT * FROM students WHERE student_id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create student';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'A student with this BAUST ID or Email already exists.' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

app.delete('/api/students/:id', (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid student ID' });
      return;
    }
    const result = db.prepare('DELETE FROM students WHERE student_id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json({ deleted: true, student_id: id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete student' });
  }
});

// 4. Clubs CRUD
app.get('/api/clubs', (_req, res) => {
  try {
    const rows = db
      .prepare(`
        SELECT
          c.*,
          (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.club_id AND cm.status = 'active') AS member_count,
          (SELECT COUNT(*) FROM club_applications ca WHERE ca.club_id = c.club_id AND ca.status = 'pending') AS pending_count,
          (SELECT COUNT(*) FROM club_admins cad WHERE cad.club_id = c.club_id) AS admin_count
        FROM clubs c
        ORDER BY c.name ASC
      `)
      .all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch clubs' });
  }
});

app.post('/api/clubs', (req, res) => {
  try {
    const { code, name, category, advisor_name, room_location, founded_year, description, is_recruiting } =
      req.body ?? {};
    if (!code || !name || !category || !advisor_name || !room_location || !founded_year || !description) {
      res.status(400).json({ error: 'All club fields are required.' });
      return;
    }
    const defaultImage =
      category === 'Technical'
        ? '/src/assets/images/baust_robotics_club_lab_1795155534444.jpg'
        : category === 'Cultural' || category === 'Academic'
          ? '/src/assets/images/baust_campus_cultural_debate_1795155534136.jpg'
          : '/assets/aistudio/image_09278975.png';

    const info = db
      .prepare(`
        INSERT INTO clubs (code, name, category, advisor_name, room_location, founded_year, description, image_url, is_recruiting)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        String(code).trim().toUpperCase(),
        String(name).trim(),
        String(category).trim(),
        String(advisor_name).trim(),
        String(room_location).trim(),
        Number(founded_year),
        String(description).trim(),
        defaultImage,
        is_recruiting === 0 || is_recruiting === false ? 0 : 1,
      );

    const created = db.prepare('SELECT * FROM clubs WHERE club_id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create club';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'A club with that code or name already exists.' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

app.patch('/api/clubs/:id', (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid club ID' });
      return;
    }
    const existing = db.prepare('SELECT * FROM clubs WHERE club_id = ?').get(id) as
      | { is_recruiting: number; advisor_name: string; room_location: string; description: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Club not found' });
      return;
    }
    const { is_recruiting, advisor_name, room_location, description } = req.body ?? {};
    db.prepare(`
      UPDATE clubs
      SET
        is_recruiting = ?,
        advisor_name = ?,
        room_location = ?,
        description = ?
      WHERE club_id = ?
    `).run(
      is_recruiting !== undefined ? (is_recruiting ? 1 : 0) : existing.is_recruiting,
      advisor_name !== undefined ? String(advisor_name).trim() : existing.advisor_name,
      room_location !== undefined ? String(room_location).trim() : existing.room_location,
      description !== undefined ? String(description).trim() : existing.description,
      id,
    );
    const updated = db.prepare('SELECT * FROM clubs WHERE club_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update club' });
  }
});

// 5. Club Applications & Transactional Approval Workflow
app.get('/api/applications', (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const clubId = req.query.club_id ? parsePositiveInt(req.query.club_id) : null;

    const rows = db
      .prepare(`
        SELECT
          ca.*,
          s.baust_id,
          s.full_name AS student_name,
          s.email AS student_email,
          s.department,
          s.batch,
          c.code AS club_code,
          c.name AS club_name,
          reviewer_student.full_name AS reviewer_name,
          cad.admin_role AS reviewer_role
        FROM club_applications ca
        JOIN students s ON s.student_id = ca.student_id
        JOIN clubs c ON c.club_id = ca.club_id
        LEFT JOIN club_admins cad ON cad.admin_id = ca.reviewed_by_admin_id
        LEFT JOIN students reviewer_student ON reviewer_student.student_id = cad.student_id
        ORDER BY CASE WHEN ca.status = 'pending' THEN 0 ELSE 1 END, ca.applied_at DESC
      `)
      .all() as Array<Record<string, unknown>>;

    const filtered = rows.filter((row) => {
      const okStatus = !status || status === 'all' || row.status === status;
      const okClub = !clubId || row.club_id === clubId;
      return okStatus && okClub;
    });

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch applications' });
  }
});

app.post('/api/applications', (req, res) => {
  try {
    const studentId = parsePositiveInt(req.body?.student_id);
    const clubId = parsePositiveInt(req.body?.club_id);
    const applicationSubject =
      typeof req.body?.application_subject === 'string' && req.body.application_subject.trim()
        ? req.body.application_subject.trim()
        : 'Applying to join as a club member';
    const motivation = typeof req.body?.motivation === 'string' ? req.body.motivation.trim() : '';
    const experience = typeof req.body?.experience === 'string' ? req.body.experience.trim() : '';

    if (!studentId || !clubId || !motivation) {
      res.status(400).json({ error: 'Student, club, and motivation are required.' });
      return;
    }

    const club = db.prepare('SELECT * FROM clubs WHERE club_id = ?').get(clubId) as { is_recruiting: number } | undefined;
    if (!club) {
      res.status(404).json({ error: 'Selected club does not exist.' });
      return;
    }
    if (!club.is_recruiting) {
      res.status(400).json({ error: 'This club is currently not accepting new applications.' });
      return;
    }

    const activeMembership = db
      .prepare("SELECT member_id FROM club_members WHERE student_id = ? AND club_id = ? AND status = 'active'")
      .get(studentId, clubId);
    if (activeMembership) {
      res.status(409).json({ error: 'This student is already an active member of the selected club.' });
      return;
    }

    const info = db
      .prepare(`
        INSERT INTO club_applications (student_id, club_id, application_subject, motivation, experience)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(studentId, clubId, applicationSubject, motivation, experience || null);

    const created = db.prepare('SELECT * FROM club_applications WHERE application_id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to submit application';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'This student already has a pending application for this club.' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

app.patch('/api/applications/:id/review', (req, res) => {
  const id = parsePositiveInt(req.params.id);
  const status = req.body?.status;
  const adminId = req.body?.reviewed_by_admin_id ? parsePositiveInt(req.body.reviewed_by_admin_id) : null;
  const reviewNote = typeof req.body?.review_note === 'string' ? req.body.review_note.trim() : '';

  if (!id || (status !== 'approved' && status !== 'rejected')) {
    res.status(400).json({ error: 'Valid application ID and status (approved or rejected) are required.' });
    return;
  }

  const existingApp = db
    .prepare('SELECT * FROM club_applications WHERE application_id = ?')
    .get(id) as
    | {
        application_id: number;
        student_id: number;
        club_id: number;
        application_subject: string;
        status: string;
      }
    | undefined;

  if (!existingApp) {
    res.status(404).json({ error: 'Application not found.' });
    return;
  }

  if (existingApp.status !== 'pending') {
    res.status(400).json({ error: 'Only pending applications can be reviewed.' });
    return;
  }

  // Pick a valid admin for that club if none explicitly passed, or null if club has no admin yet
  let resolvedAdminId = adminId;
  if (resolvedAdminId) {
    const adminRow = db
      .prepare('SELECT admin_id, can_approve_apps FROM club_admins WHERE admin_id = ?')
      .get(resolvedAdminId) as { admin_id: number; can_approve_apps: number } | undefined;
    if (!adminRow) {
      res.status(400).json({ error: 'Selected reviewing admin does not exist.' });
      return;
    }
    if (!adminRow.can_approve_apps) {
      res.status(403).json({ error: 'Selected admin does not have permission to approve applications.' });
      return;
    }
  } else {
    const clubAdmin = db
      .prepare('SELECT admin_id FROM club_admins WHERE club_id = ? AND can_approve_apps = 1 LIMIT 1')
      .get(existingApp.club_id) as { admin_id: number } | undefined;
    resolvedAdminId = clubAdmin ? clubAdmin.admin_id : null;
  }

  db.exec('BEGIN');
  try {
    db.prepare(`
      UPDATE club_applications
      SET
        status = ?,
        reviewed_by_admin_id = ?,
        review_note = ?,
        reviewed_at = datetime('now')
      WHERE application_id = ?
    `).run(status, resolvedAdminId, reviewNote || null, id);

    if (status === 'approved') {
      const existingMember = db
        .prepare('SELECT member_id FROM club_members WHERE student_id = ? AND club_id = ?')
        .get(existingApp.student_id, existingApp.club_id) as { member_id: number } | undefined;

      if (existingMember) {
        db.prepare(`
          UPDATE club_members
          SET status = 'active', wing = 'General', designation = 'General Member', joined_at = datetime('now')
          WHERE member_id = ?
        `).run(existingMember.member_id);
      } else {
        db.prepare(`
          INSERT INTO club_members (student_id, club_id, designation, wing, status)
          VALUES (?, ?, 'General Member', 'General', 'active')
        `).run(existingApp.student_id, existingApp.club_id);
      }
    }

    db.exec('COMMIT');
    const updated = db.prepare('SELECT * FROM club_applications WHERE application_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to review application' });
  }
});

// 6. Club Members CRUD
app.get('/api/members', (req, res) => {
  try {
    const clubId = req.query.club_id ? parsePositiveInt(req.query.club_id) : null;
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const rows = db
      .prepare(`
        SELECT
          cm.*,
          s.baust_id,
          s.full_name AS student_name,
          s.email AS student_email,
          s.department,
          s.batch,
          c.code AS club_code,
          c.name AS club_name,
          CASE WHEN cad.admin_id IS NOT NULL THEN 1 ELSE 0 END AS is_admin,
          cad.admin_role
        FROM club_members cm
        JOIN students s ON s.student_id = cm.student_id
        JOIN clubs c ON c.club_id = cm.club_id
        LEFT JOIN club_admins cad ON cad.student_id = cm.student_id AND cad.club_id = cm.club_id
        ORDER BY c.name ASC, cm.status ASC, s.full_name ASC
      `)
      .all() as Array<Record<string, unknown>>;

    const filtered = rows.filter((row) => {
      const okClub = !clubId || row.club_id === clubId;
      const okStatus = !status || status === 'all' || row.status === status;
      return okClub && okStatus;
    });

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch club members' });
  }
});

app.post('/api/members', (req, res) => {
  try {
    const studentId = parsePositiveInt(req.body?.student_id);
    const clubId = parsePositiveInt(req.body?.club_id);
    const designation = typeof req.body?.designation === 'string' ? req.body.designation.trim() : 'General Member';
    const wing = typeof req.body?.wing === 'string' ? req.body.wing.trim() : 'General';

    if (!studentId || !clubId) {
      res.status(400).json({ error: 'Student and club are required.' });
      return;
    }

    const info = db
      .prepare(`
        INSERT INTO club_members (student_id, club_id, designation, wing, status)
        VALUES (?, ?, ?, ?, 'active')
      `)
      .run(studentId, clubId, designation || 'General Member', wing || 'General');

    const created = db.prepare('SELECT * FROM club_members WHERE member_id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to add club member';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'This student is already registered in this club.' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

app.patch('/api/members/:id', (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid member ID' });
      return;
    }
    const existing = db.prepare('SELECT * FROM club_members WHERE member_id = ?').get(id) as
      | { designation: string; wing: string; status: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    const { designation, wing, status } = req.body ?? {};
    db.prepare(`
      UPDATE club_members
      SET designation = ?, wing = ?, status = ?
      WHERE member_id = ?
    `).run(
      designation !== undefined ? String(designation).trim() : existing.designation,
      wing !== undefined ? String(wing).trim() : existing.wing,
      status !== undefined ? String(status).trim() : existing.status,
      id,
    );
    const updated = db.prepare('SELECT * FROM club_members WHERE member_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update member' });
  }
});

app.delete('/api/members/:id', (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid member ID' });
      return;
    }
    const result = db.prepare('DELETE FROM club_members WHERE member_id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    res.json({ deleted: true, member_id: id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete member' });
  }
});

// 7. Club Admins CRUD
app.get('/api/admins', (req, res) => {
  try {
    const clubId = req.query.club_id ? parsePositiveInt(req.query.club_id) : null;
    const rows = db
      .prepare(`
        SELECT
          cad.*,
          s.baust_id,
          s.full_name AS student_name,
          s.email AS student_email,
          s.department,
          s.batch,
          c.code AS club_code,
          c.name AS club_name
        FROM club_admins cad
        JOIN students s ON s.student_id = cad.student_id
        JOIN clubs c ON c.club_id = cad.club_id
        ORDER BY c.name ASC, cad.assigned_at DESC
      `)
      .all() as Array<Record<string, unknown>>;

    const filtered = clubId ? rows.filter((r) => r.club_id === clubId) : rows;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch club admins' });
  }
});

app.post('/api/admins', (req, res) => {
  const studentId = parsePositiveInt(req.body?.student_id);
  const clubId = parsePositiveInt(req.body?.club_id);
  const adminRole = typeof req.body?.admin_role === 'string' ? req.body.admin_role.trim() : 'Moderator';
  const canApproveApps = req.body?.can_approve_apps === false || req.body?.can_approve_apps === 0 ? 0 : 1;
  const canManageMembers = req.body?.can_manage_members === false || req.body?.can_manage_members === 0 ? 0 : 1;

  if (!studentId || !clubId || !adminRole) {
    res.status(400).json({ error: 'Student, club, and admin role are required.' });
    return;
  }

  db.exec('BEGIN');
  try {
    const info = db
      .prepare(`
        INSERT INTO club_admins (student_id, club_id, admin_role, can_approve_apps, can_manage_members)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(studentId, clubId, adminRole, canApproveApps, canManageMembers);

    // Ensure the admin also has an active membership record in club_members
    const memberExists = db
      .prepare('SELECT member_id FROM club_members WHERE student_id = ? AND club_id = ?')
      .get(studentId, clubId);
    if (!memberExists) {
      db.prepare(`
        INSERT INTO club_members (student_id, club_id, designation, wing, status)
        VALUES (?, ?, ?, 'Executive Committee', 'active')
      `).run(studentId, clubId, adminRole);
    }

    db.exec('COMMIT');
    const created = db.prepare('SELECT * FROM club_admins WHERE admin_id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    db.exec('ROLLBACK');
    const msg = err instanceof Error ? err.message : 'Failed to assign club admin';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'This student is already an administrator for this club.' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

app.patch('/api/admins/:id', (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid admin ID' });
      return;
    }
    const existing = db.prepare('SELECT * FROM club_admins WHERE admin_id = ?').get(id) as
      | { admin_role: string; can_approve_apps: number; can_manage_members: number }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Club admin not found' });
      return;
    }
    const { admin_role, can_approve_apps, can_manage_members } = req.body ?? {};
    db.prepare(`
      UPDATE club_admins
      SET admin_role = ?, can_approve_apps = ?, can_manage_members = ?
      WHERE admin_id = ?
    `).run(
      admin_role !== undefined ? String(admin_role).trim() : existing.admin_role,
      can_approve_apps !== undefined ? (can_approve_apps ? 1 : 0) : existing.can_approve_apps,
      can_manage_members !== undefined ? (can_manage_members ? 1 : 0) : existing.can_manage_members,
      id,
    );
    const updated = db.prepare('SELECT * FROM club_admins WHERE admin_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update admin' });
  }
});

app.delete('/api/admins/:id', (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid admin ID' });
      return;
    }
    const result = db.prepare('DELETE FROM club_admins WHERE admin_id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Club admin not found' });
      return;
    }
    res.json({ deleted: true, admin_id: id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to revoke admin' });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BAUST Club Management Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
