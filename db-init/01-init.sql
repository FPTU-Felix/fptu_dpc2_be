-- ==========================================================
-- 1. CLEAN UP
-- ==========================================================
DROP TABLE IF EXISTS system_audit_logs CASCADE;
DROP TABLE IF EXISTS party_fees CASCADE;
DROP TABLE IF EXISTS admission_progress CASCADE;
DROP TABLE IF EXISTS meeting_opinions CASCADE;
DROP TABLE IF EXISTS meeting_sessions CASCADE;
DROP TABLE IF EXISTS meeting_attendees CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS disciplines CASCADE;
DROP TABLE IF EXISTS commendations CASCADE;
DROP TABLE IF EXISTS annual_assessments CASCADE;
DROP TABLE IF EXISTS party_positions CASCADE;
DROP TABLE IF EXISTS party_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS party_cells CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Xóa Enums
DROP TYPE IF EXISTS gender_enum CASCADE;
DROP TYPE IF EXISTS member_status_enum CASCADE;
DROP TYPE IF EXISTS admission_step_enum CASCADE;
DROP TYPE IF EXISTS assessment_grade_enum CASCADE;
DROP TYPE IF EXISTS assessment_status_enum CASCADE;
DROP TYPE IF EXISTS discipline_type_enum CASCADE;
DROP TYPE IF EXISTS meeting_type_enum CASCADE;
DROP TYPE IF EXISTS meeting_format_enum CASCADE;
DROP TYPE IF EXISTS meeting_scope_enum CASCADE;
DROP TYPE IF EXISTS meeting_status_enum CASCADE;
DROP TYPE IF EXISTS attendee_status_enum CASCADE;
DROP TYPE IF EXISTS fee_status_enum CASCADE;
DROP TYPE IF EXISTS doc_category_enum CASCADE;

-- ==========================================================
-- 2. ĐỊNH NGHĨA ENUM
-- ==========================================================
CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE member_status_enum AS ENUM ('MASSES', 'POTENTIAL', 'RESERVE', 'OFFICIAL', 'TRANSFERRED', 'DELETED');
CREATE TYPE admission_step_enum AS ENUM ('STEP_1_INTRO', 'STEP_2_TRAINING', 'STEP_3_FILE_PREP', 'STEP_4_VERIFICATION', 'STEP_5_ADMISSION', 'STEP_6_OFFICIAL');
CREATE TYPE assessment_grade_enum AS ENUM ('EXCELLENT', 'GOOD', 'COMPLETE', 'INCOMPLETE');
CREATE TYPE assessment_status_enum AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'FINALIZED');
CREATE TYPE discipline_type_enum AS ENUM ('REPRIMAND', 'WARNING', 'DEMOTION_SUSPENSION', 'EXPULSION');
CREATE TYPE meeting_type_enum AS ENUM ('PERIODIC', 'EXTRAORDINARY', 'ADMISSION_CEREMONY');
CREATE TYPE meeting_format_enum AS ENUM ('OFFLINE', 'ONLINE', 'HYBRID');
CREATE TYPE meeting_scope_enum AS ENUM ('ENTIRE_CELL', 'SELECTED_MEMBERS');
CREATE TYPE meeting_status_enum AS ENUM ('SCHEDULED', 'HAPPENING', 'COMPLETED', 'CANCELLED');
CREATE TYPE attendee_status_enum AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');
CREATE TYPE fee_status_enum AS ENUM ('UNPAID', 'PAID');
CREATE TYPE doc_category_enum AS ENUM ('RESOLUTION', 'LAW', 'INSTRUCTION', 'FORM');

-- ==========================================================
-- 3. CẤU TRÚC BẢNG (CORE)
-- ==========================================================

-- Bảng 1: Tổ chức
CREATE TABLE party_cells (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), -- ID tự sinh ngẫu nhiên
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2: Roles
CREATE TABLE roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, 
    description VARCHAR(255)
);

-- Bảng 3: Users
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id TEXT NOT NULL, -- FK phải là TEXT
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Bảng 4: Hồ sơ Đảng viên
CREATE TABLE party_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE, -- 1 User chỉ link với 1 Member
    party_cell_id TEXT NOT NULL,
    
    -- Thông tin cá nhân
    full_name VARCHAR(255) NOT NULL,
    image_url TEXT,
    dob TIMESTAMP, -- Theo yêu cầu: DATE -> TIMESTAMP
    gender gender_enum,
    phone VARCHAR(20),
    email VARCHAR(100),
    hometown VARCHAR(255),
    permanent_address VARCHAR(255),
    
    -- Thông tin Đảng
    join_date TIMESTAMP, -- Ngày vào Đảng
    official_date TIMESTAMP, -- Ngày chính thức
    party_card_id VARCHAR(50),
    
    status member_status_enum DEFAULT 'MASSES',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (party_cell_id) REFERENCES party_cells(id)
);

-- Bảng 5: Chức vụ
CREATE TABLE party_positions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id TEXT NOT NULL,
    title VARCHAR(100) NOT NULL,
    term VARCHAR(50),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_current BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- ==========================================================
-- 4. TÍNH NĂNG MỚI: TIẾN ĐỘ KẾT NẠP & ĐẢNG PHÍ
-- ==========================================================

-- Bảng 6: Tiến độ kết nạp
CREATE TABLE admission_progress (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id TEXT NOT NULL,
    step admission_step_enum NOT NULL,
    
    is_completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMP,
    
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (member_id, step),
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 7: Đảng phí
CREATE TABLE party_fees (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id TEXT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    
    salary_base DECIMAL(15, 2),
    fee_amount DECIMAL(15, 2),
    
    status fee_status_enum DEFAULT 'UNPAID',
    payment_date TIMESTAMP,
    payment_proof_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- ==========================================================
-- 5. QUẢN LÝ NGHIỆP VỤ & HỌP
-- ==========================================================

-- Bảng 8: Đánh giá
CREATE TABLE annual_assessments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id TEXT NOT NULL,
    year INT NOT NULL,
    
    self_grade assessment_grade_enum,
    self_comment TEXT,
    
    supervisor_comment TEXT,
    final_grade assessment_grade_enum,
    
    status assessment_status_enum DEFAULT 'DRAFT',
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 9: Khen thưởng
CREATE TABLE commendations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    decision_date TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 10: Kỷ luật
CREATE TABLE disciplines (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id TEXT NOT NULL,
    form discipline_type_enum NOT NULL,
    decision_date TIMESTAMP,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 11: Cuộc họp
CREATE TABLE meetings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    party_cell_id TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type meeting_type_enum DEFAULT 'PERIODIC',
    format meeting_format_enum DEFAULT 'OFFLINE',
    
    online_link TEXT,
    attachments JSONB, 
    
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    location VARCHAR(255),
    
    access_scope meeting_scope_enum DEFAULT 'ENTIRE_CELL',
    
    content TEXT,
    conclusion TEXT,
    status meeting_status_enum DEFAULT 'SCHEDULED',
    
    created_by TEXT, -- Lưu ID người tạo (User ID)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_cell_id) REFERENCES party_cells(id)
);

-- Bảng 12: Điểm danh (Tổng hợp)
CREATE TABLE meeting_attendees (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    status attendee_status_enum DEFAULT 'ABSENT',
    reason VARCHAR(255),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 13: Log chi tiết phiên ra/vào (Heartbeat)
CREATE TABLE meeting_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_id TEXT NOT NULL,
    
    join_time TIMESTAMP NOT NULL,
    leave_time TIMESTAMP,
    
    duration_minutes INT,
    
    FOREIGN KEY (attendee_id) REFERENCES meeting_attendees(id) ON DELETE CASCADE
);

-- Bảng 14: Ý kiến
CREATE TABLE meeting_opinions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id),
    FOREIGN KEY (member_id) REFERENCES party_members(id)
);

-- ==========================================================
-- 6. HỆ THỐNG & AI
-- ==========================================================

-- Bảng 15: Documents
CREATE TABLE documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    file_url TEXT,
    content_text TEXT,
    category doc_category_enum DEFAULT 'LAW',
    source_origin VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 16: System Audit Log
CREATE TABLE system_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50),
    target_id TEXT, -- ID của bản ghi mục tiêu cũng là TEXT
    
    old_value JSONB,
    new_value JSONB,
    
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 7. DỮ LIỆU MẪU (Dùng CTE để insert vì ID là ngẫu nhiên)
-- ==========================================================

-- Insert Roles và lấy ID
WITH role_insert AS (
    INSERT INTO roles (name) VALUES ('ADMIN'), ('MEMBER') RETURNING id, name
),
-- Insert Users dùng ID của Roles
user_insert AS (
    INSERT INTO users (username, password, role_id)
    SELECT 'admin', 'pass', id FROM role_insert WHERE name = 'ADMIN'
    UNION ALL
    SELECT 'quanchung', 'pass', id FROM role_insert WHERE name = 'MEMBER'
    RETURNING id, username
),
-- Insert Party Cell
cell_insert AS (
    INSERT INTO party_cells (name) VALUES ('Chi bộ Khối Giáo dục') RETURNING id
),
-- Insert Party Member
member_insert AS (
    INSERT INTO party_members (user_id, party_cell_id, full_name, status)
    SELECT u.id, c.id, 'Nguyễn Văn Em', 'MASSES'
    FROM user_insert u, cell_insert c
    WHERE u.username = 'quanchung'
    RETURNING id
)
-- Insert Progress
INSERT INTO admission_progress (member_id, step, is_completed, completion_date)
SELECT id, 'STEP_1_INTRO', TRUE, '2025-01-01 00:00:00'
FROM member_insert;