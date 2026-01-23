-- ==========================================================
-- 1. CLEAN UP (XÓA SẠCH ĐỂ LÀM MỚI)
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
-- 2. ĐỊNH NGHĨA ENUM (CHUẨN HÓA YÊU CẦU)
-- ==========================================================

CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- Trạng thái Đảng viên
CREATE TYPE member_status_enum AS ENUM ('MASSES', 'POTENTIAL', 'RESERVE', 'OFFICIAL', 'TRANSFERRED', 'DELETED');
-- MASSES: Quần chúng (Chưa có gì)
-- POTENTIAL: Cảm tình Đảng (Đang bồi dưỡng)
-- RESERVE: Dự bị
-- OFFICIAL: Chính thức

-- [NEW] Các bước trong Progress Bar Kết nạp
CREATE TYPE admission_step_enum AS ENUM (
    'STEP_1_INTRO',         -- Giới thiệu quần chúng
    'STEP_2_TRAINING',      -- Học lớp bồi dưỡng (Cảm tình Đảng)
    'STEP_3_FILE_PREP',     -- Hoàn thiện hồ sơ lý lịch
    'STEP_4_VERIFICATION',  -- Thẩm tra lý lịch
    'STEP_5_ADMISSION',     -- Lễ kết nạp (Trở thành Dự bị)
    'STEP_6_OFFICIAL'       -- Lễ công nhận chính thức (Sau 12 tháng)
);

CREATE TYPE assessment_grade_enum AS ENUM ('EXCELLENT', 'GOOD', 'COMPLETE', 'INCOMPLETE');
CREATE TYPE assessment_status_enum AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'FINALIZED');

-- [UPDATED] Các mức kỷ luật chuẩn Điều lệ
CREATE TYPE discipline_type_enum AS ENUM ('REPRIMAND', 'WARNING', 'DEMOTION_SUSPENSION', 'EXPULSION');
-- REPRIMAND: Khiển trách
-- WARNING: Cảnh cáo
-- DEMOTION_SUSPENSION: Cách chức / Đình chỉ
-- EXPULSION: Khai trừ (Ra khỏi Đảng)

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
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2: Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- ADMIN, SECRETARY, MEMBER
    description VARCHAR(255)
);

-- Bảng 3: Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Bảng 4: Hồ sơ (Đảng viên tự update được field: image, dob, phone, email...)
CREATE TABLE party_members (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE, 
    party_cell_id INT NOT NULL,
    
    -- Thông tin cá nhân
    full_name VARCHAR(255) NOT NULL,
    image_url TEXT, -- [UPDATED] Link ảnh đại diện (Cloudflare)
    dob DATE,
    gender gender_enum,
    phone VARCHAR(20),
    email VARCHAR(100),
    hometown VARCHAR(255),
    permanent_address VARCHAR(255),
    
    -- Thông tin Đảng
    join_date DATE, -- Ngày vào Đảng (Dự bị)
    official_date DATE, -- Ngày chính thức
    party_card_id VARCHAR(50),
    
    status member_status_enum DEFAULT 'MASSES', -- Bắt đầu từ Quần chúng
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Tracking thời gian update
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (party_cell_id) REFERENCES party_cells(id)
);

-- Bảng 5: Chức vụ
CREATE TABLE party_positions (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    term VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- ==========================================================
-- 4. TÍNH NĂNG MỚI: TIẾN ĐỘ KẾT NẠP & ĐẢNG PHÍ
-- ==========================================================

-- Bảng 6 [NEW]: Tiến độ kết nạp (Progress Bar)
CREATE TABLE admission_progress (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL,
    step admission_step_enum NOT NULL, -- Bước mấy
    
    is_completed BOOLEAN DEFAULT FALSE, -- Đã xong chưa
    completion_date DATE, -- Ngày hoàn thành
    
    note TEXT, -- Ghi chú (VD: Điểm thi lớp cảm tình Đảng: 9.0)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (member_id, step), -- Mỗi người chỉ có 1 record cho 1 bước
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 7 [NEW]: Đảng phí (1% Lương)
CREATE TABLE party_fees (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL,
    month INT NOT NULL, -- Tháng 1-12
    year INT NOT NULL,  -- Năm 2026
    
    salary_base DECIMAL(15, 2), -- Mức lương cơ sở (Đảng viên nhập)
    fee_amount DECIMAL(15, 2),  -- Số tiền phải đóng (Hệ thống tính: salary * 0.01)
    
    status fee_status_enum DEFAULT 'UNPAID',
    payment_date TIMESTAMP, -- Ngày đóng thực tế
    payment_proof_url TEXT, -- Ảnh chụp chuyển khoản (Cloudflare)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- ==========================================================
-- 5. QUẢN LÝ NGHIỆP VỤ & HỌP
-- ==========================================================

-- Bảng 8: Đánh giá (Tự đánh giá -> Cấp trên duyệt)
CREATE TABLE annual_assessments (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL,
    year INT NOT NULL,
    
    self_grade assessment_grade_enum,
    self_comment TEXT,
    
    supervisor_comment TEXT, -- Nhận xét cấp trên
    final_grade assessment_grade_enum, -- Kết quả cuối cùng
    
    status assessment_status_enum DEFAULT 'DRAFT',
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 9: Khen thưởng
CREATE TABLE commendations (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    decision_date DATE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 10: Kỷ luật (Theo các mức chuẩn)
CREATE TABLE disciplines (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL,
    form discipline_type_enum NOT NULL, -- Khiển trách / Cảnh cáo / ...
    decision_date DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE / EXPIRED (Đã xóa án)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 11: Cuộc họp (Meetings)
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    party_cell_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type meeting_type_enum DEFAULT 'PERIODIC',
    format meeting_format_enum DEFAULT 'OFFLINE',
    
    online_link TEXT, -- Link Google Meet
    
    -- [UPDATED] Attachments: Lưu mảng các link file từ Cloudflare
    -- Dùng JSONB để linh hoạt: [{"name": "bien_ban.pdf", "url": "https://..."}]
    attachments JSONB, 
    
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    location VARCHAR(255),
    
    access_scope meeting_scope_enum DEFAULT 'ENTIRE_CELL',
    
    content TEXT,
    conclusion TEXT,
    status meeting_status_enum DEFAULT 'SCHEDULED',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_cell_id) REFERENCES party_cells(id)
);

-- Bảng 12: Điểm danh (Tổng hợp)
CREATE TABLE meeting_attendees (
    id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    member_id INT NOT NULL,
    status attendee_status_enum DEFAULT 'ABSENT', -- Kết quả cuối cùng (Có/Vắng)
    reason VARCHAR(255),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES party_members(id) ON DELETE CASCADE
);

-- Bảng 13 [NEW]: Log chi tiết phiên ra/vào (Google Meet Log style)
CREATE TABLE meeting_sessions (
    id SERIAL PRIMARY KEY,
    attendee_id INT NOT NULL, -- Link với bảng attendees
    
    join_time TIMESTAMP NOT NULL, -- Giờ vào
    leave_time TIMESTAMP, -- Giờ ra
    
    duration_minutes INT, -- Số phút tham gia phiên này
    
    FOREIGN KEY (attendee_id) REFERENCES meeting_attendees(id) ON DELETE CASCADE
);
-- Một người có thể vào ra nhiều lần => 1 attendee có nhiều sessions

-- Bảng 14: Ý kiến
CREATE TABLE meeting_opinions (
    id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    member_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id),
    FOREIGN KEY (member_id) REFERENCES party_members(id)
);

-- ==========================================================
-- 6. HỆ THỐNG & AI
-- ==========================================================

-- Bảng 15: Documents (AI tự update từ nguồn)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_url TEXT, -- Link Cloudflare
    content_text TEXT, -- Text để AI học
    category doc_category_enum DEFAULT 'LAW',
    source_origin VARCHAR(255), -- Nguồn gốc (VD: chinhphu.vn)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 16 [NEW]: System Audit Log (Nhật ký hệ thống)
CREATE TABLE system_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT, -- Ai làm?
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN
    target_table VARCHAR(50), -- Tác động vào bảng nào (VD: party_members)
    target_id INT, -- ID của bản ghi bị tác động
    
    old_value JSONB, -- Dữ liệu cũ (để so sánh)
    new_value JSONB, -- Dữ liệu mới
    
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 7. DỮ LIỆU MẪU (TEST)
-- ==========================================================

INSERT INTO party_cells (name) VALUES ('Chi bộ Khối Giáo dục');
INSERT INTO roles (name) VALUES ('ADMIN'), ('MEMBER');
INSERT INTO users (username, password, role_id) VALUES ('admin', 'pass', 1), ('quanchung', 'pass', 2);

-- Tạo 1 Quần chúng (Bắt đầu lộ trình kết nạp)
INSERT INTO party_members (user_id, party_cell_id, full_name, status) 
VALUES (2, 1, 'Nguyễn Văn Em', 'MASSES');

-- Khởi tạo Lộ trình (Progress Bar)
INSERT INTO admission_progress (member_id, step, is_completed, completion_date) 
VALUES 
(1, 'STEP_1_INTRO', TRUE, '2025-01-01'), -- Đã xong giới thiệu
(1, 'STEP_2_TRAINING', FALSE, NULL); -- Đang học cảm tình Đảng

-- Tạo cuộc họp có Log chi tiết
INSERT INTO meetings (party_cell_id, title, format, start_time) 
VALUES (1, 'Họp Online', 'ONLINE', '2026-05-01 08:00:00');

-- Điểm danh & Log ra vào
-- Bước 1: Tạo attendee
INSERT INTO meeting_attendees (meeting_id, member_id, status) VALUES (1, 1, 'PRESENT');
-- Bước 2: Log session (Vào lúc 8:00, ra lúc 8:30)
INSERT INTO meeting_sessions (attendee_id, join_time, leave_time, duration_minutes) 
VALUES (1, '2026-05-01 08:00:00', '2026-05-01 08:30:00', 30);
-- Bước 3: Log session (Vào lại lúc 8:40, ra lúc 9:00)
INSERT INTO meeting_sessions (attendee_id, join_time, leave_time, duration_minutes) 
VALUES (1, '2026-05-01 08:40:00', '2026-05-01 09:00:00', 20);