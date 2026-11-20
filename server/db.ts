import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'baust_clubs.db');
const SCHEMA_PATH = path.resolve(process.cwd(), 'database', 'schema.sql');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function getSchemaSql(): string {
  return fs.readFileSync(SCHEMA_PATH, 'utf-8');
}

export function initializeDatabase(): void {
  const schemaSql = getSchemaSql();
  db.exec(schemaSql);

  // Migrate legacy preferred_wing column if present in an existing SQLite DB
  const appCols = db.prepare('PRAGMA table_info(club_applications)').all() as Array<{ name: string }>;
  const hasPreferredWing = appCols.some((c) => c.name === 'preferred_wing');
  const hasApplicationSubject = appCols.some((c) => c.name === 'application_subject');
  if (hasPreferredWing && !hasApplicationSubject) {
    db.exec('ALTER TABLE club_applications RENAME COLUMN preferred_wing TO application_subject;');
    db.exec("UPDATE club_applications SET application_subject = 'Applying to join as a club member';");
  }

  // Ensure clubs point to the updated BAUST campus & club photography
  db.exec(`
    UPDATE clubs SET image_url = '/src/assets/images/baust_cse_programming_club_1795155534899.jpg'
    WHERE image_url = '/src/assets/images/club_programming_contest_1795154720143.jpg';
    UPDATE clubs SET image_url = '/src/assets/images/baust_robotics_club_lab_1795155534444.jpg'
    WHERE image_url = '/src/assets/images/club_robotics_lab_1795154720670.jpg';
    UPDATE clubs SET image_url = '/src/assets/images/baust_campus_cultural_debate_1795155534136.jpg'
    WHERE image_url = '/src/assets/images/club_cultural_debate_1795154720621.jpg';
    UPDATE clubs SET image_url = '/assets/aistudio/image_09278975.png'
    WHERE code IN ('BPC', 'BASC')
       OR image_url IN (
         '/src/assets/images/baust_campus_hero_1795154719425.jpg',
         '/src/assets/images/baust_saidpur_campus_1795155533252.jpg',
         '/src/assets/images/baust_real_campus_view.jpg',
         '/src/assets/images/baust_real_office_view.jpg'
       );
  `);

  const countRow = db.prepare('SELECT COUNT(*) AS count FROM students').get() as { count: number };
  if (countRow.count > 0) {
    return;
  }

  db.exec('BEGIN');
  try {
    const insertStudent = db.prepare(`
      INSERT INTO students (baust_id, full_name, email, phone, department, batch, semester)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const studentsData = [
      ['220101014', 'Tanvir Ahmed Chowdhury', 'tanvir.cse22@baust.edu.bd', '01712-450112', 'CSE', '15th', '7th Semester'],
      ['220101029', 'Nusrat Jahan Mim', 'nusrat.cse22@baust.edu.bd', '01819-334201', 'CSE', '15th', '7th Semester'],
      ['220201007', 'Mahmudul Hasan Rafi', 'rafi.eee22@baust.edu.bd', '01911-820415', 'EEE', '15th', '7th Semester'],
      ['230101042', 'Farhana Yasmin Toma', 'farhana.cse23@baust.edu.bd', '01675-912034', 'CSE', '16th', '5th Semester'],
      ['230301019', 'Sabbir Hossain Joy', 'sabbir.me23@baust.edu.bd', '01740-667123', 'ME', '16th', '5th Semester'],
      ['230401005', 'Tasnim Tabassum Orpa', 'tasnim.ce23@baust.edu.bd', '01842-501982', 'CE', '16th', '5th Semester'],
      ['240101061', 'Mehedi Hasan Nabil', 'nabil.cse24@baust.edu.bd', '01788-209341', 'CSE', '17th', '3rd Semester'],
      ['240201033', 'Raisa Rahman', 'raisa.eee24@baust.edu.bd', '01922-714509', 'EEE', '17th', '3rd Semester'],
      ['230601011', 'Ashfaqur Rahman', 'ashfaq.bba23@baust.edu.bd', '01719-883412', 'BBA', '16th', '5th Semester'],
      ['240701018', 'Maliha Karim', 'maliha.eng24@baust.edu.bd', '01855-441209', 'English', '17th', '3rd Semester'],
    ];

    for (const s of studentsData) {
      insertStudent.run(...s);
    }

    const insertClub = db.prepare(`
      INSERT INTO clubs (code, name, category, advisor_name, room_location, founded_year, description, image_url, is_recruiting)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const clubsData = [
      [
        'BCC',
        'BAUST Computer Club',
        'Technical',
        'Dr. Md. Golam Moazzam',
        'Academic Building 1, Lab 302',
        2016,
        'Trains BAUST students in competitive programming, algorithmic problem solving, software engineering, and inter-university hackathons.',
        '/src/assets/images/baust_cse_programming_club_1795155534899.jpg',
        1,
      ],
      [
        'BRC',
        'BAUST Robotics & Automation Club',
        'Technical',
        'Engr. Rakibul Islam',
        'Engineering Annex, Robotics Lab 104',
        2017,
        'Designs autonomous rovers, line-following robots, IoT telemetry rigs, and embedded hardware prototypes for national tech fests.',
        '/src/assets/images/baust_robotics_club_lab_1795155534444.jpg',
        1,
      ],
      [
        'BDS',
        'BAUST Debating Society',
        'Academic',
        'Prof. Dr. Sharmin Akter',
        'Central Auditorium Seminar Wing',
        2015,
        'Promotes parliamentary debate, public speaking, policy analysis, and bilingual extempore competitions across national circuits.',
        '/src/assets/images/baust_campus_cultural_debate_1795155534136.jpg',
        1,
      ],
      [
        'BPC',
        'BAUST Photography & Media Club',
        'Media',
        'Md. Tariqul Alam',
        'Student Center, Media Room 201',
        2018,
        'Documents campus life, convocation ceremonies, engineering exhibitions, and short documentary filmmaking at BAUST Saidpur.',
        '/assets/aistudio/image_09278975.png',
        1,
      ],
      [
        'BCLC',
        'BAUST Cultural & Literary Club',
        'Cultural',
        'Nadia Sultana',
        'Academic Building 2, Room 108',
        2016,
        'Organizes annual cultural nights, Pohela Boishakh celebrations, campus magazine publications, and stage drama productions.',
        '/src/assets/images/baust_campus_cultural_debate_1795155534136.jpg',
        1,
      ],
      [
        'BASC',
        'BAUST Athletics & Sports Club',
        'Sports',
        'Lt. Col. (Retd.) Kamrul Hasan',
        'BAUST Central Field Pavilion',
        2015,
        'Coordinates inter-departmental cricket, football, badminton, and annual athletics championships across the BAUST campus.',
        '/assets/aistudio/image_09278975.png',
        0,
      ],
    ];

    for (const c of clubsData) {
      insertClub.run(...c);
    }

    const insertAdmin = db.prepare(`
      INSERT INTO club_admins (student_id, club_id, admin_role, can_approve_apps, can_manage_members)
      VALUES (?, ?, ?, ?, ?)
    `);

    const adminsData = [
      [1, 1, 'Club President', 1, 1],
      [2, 1, 'General Secretary', 1, 1],
      [3, 2, 'Club President', 1, 1],
      [4, 3, 'General Secretary', 1, 1],
      [6, 4, 'Club President', 1, 1],
      [9, 5, 'Club President', 1, 1],
      [5, 6, 'Sports Secretary', 1, 1],
    ];

    for (const a of adminsData) {
      insertAdmin.run(...a);
    }

    const insertMember = db.prepare(`
      INSERT INTO club_members (student_id, club_id, designation, wing, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const membersData = [
      [1, 1, 'President', 'Competitive Programming', 'active'],
      [2, 1, 'General Secretary', 'Software Development', 'active'],
      [4, 1, 'Executive Member', 'Competitive Programming', 'active'],
      [3, 2, 'President', 'Autonomous Systems', 'active'],
      [5, 2, 'Joint Secretary', 'Mechatronics & CAD', 'active'],
      [4, 3, 'General Secretary', 'English Parliamentary', 'active'],
      [10, 3, 'Executive Member', 'Bangla Debate', 'active'],
      [6, 4, 'President', 'Documentary & Film', 'active'],
      [9, 5, 'President', 'Literary Magazine', 'active'],
      [5, 6, 'General Secretary', 'Football & Athletics', 'active'],
      [8, 2, 'General Member', 'Embedded Systems', 'active'],
    ];

    for (const m of membersData) {
      insertMember.run(...m);
    }

    const insertApp = db.prepare(`
      INSERT INTO club_applications (
        student_id, club_id, application_subject, motivation, experience, status, reviewed_by_admin_id, review_note, reviewed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const appsData = [
      [
        7,
        1,
        'Applying to join as a club member',
        'I solve Codeforces Div 3/4 problems regularly and want to represent BAUST in ICPC Dhaka Regional qualifiers.',
        'Ranked 4th in BAUST Intra-Freshers Programming Contest.',
        'pending',
        null,
        null,
        null,
      ],
      [
        7,
        2,
        'Applying to join as a club member',
        'Interested in learning ESP32 wireless sensor networks and PCB fabrication for autonomous drones.',
        'Built an obstacle-avoiding Arduino rover in 2nd semester.',
        'pending',
        null,
        null,
        null,
      ],
      [
        10,
        4,
        'Applying to join as a club member',
        'Want to cover campus seminars and edit the quarterly BAUST photojournalism digest.',
        'Managed high school yearbook photography team.',
        'pending',
        null,
        null,
        null,
      ],
      [
        8,
        1,
        'Applying to join as a club member',
        'Looking to collaborate with seniors on building campus web tools and attending workshops.',
        'Completed introductory HTML/CSS/TypeScript bootcamp.',
        'pending',
        null,
        null,
        null,
      ],
      [
        8,
        2,
        'Applying to join as a club member',
        'Eager to work with STM32 microcontrollers and motor drivers in the Robotics Lab.',
        'EEE circuit design lab assistant.',
        'approved',
        3,
        'Strong circuit background; approved to join as a club member.',
        "2026-10-12 14:20:00",
      ],
      [
        9,
        1,
        'Applying to join as a club member',
        'Would like to help organize sponsor outreach for BAUST TechFest.',
        'Lead coordinator for BBA Business Case Competition.',
        'rejected',
        1,
        'Fall 2026 general intake quota reached; encouraged to re-apply next semester.',
        "2026-10-08 11:05:00",
      ],
    ];

    for (const app of appsData) {
      insertApp.run(...app);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
