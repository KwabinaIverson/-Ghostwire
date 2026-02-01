-- 1. Setup Database
CREATE DATABASE IF NOT EXISTS ghostwire;
USE ghostwire;

-- =======================================================
-- 2. USERS TABLE
-- =======================================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    username VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    color VARCHAR(20) DEFAULT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    -- INDEXES:
    -- Unique indexes needed for login and registration checks
    UNIQUE INDEX idx_users_email (email),
    UNIQUE INDEX idx_users_username (username)
);

-- =======================================================
-- 3. GROUPS TABLE
-- =======================================================
CREATE TABLE `groups` (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv7
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    admin_id VARCHAR(36) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    -- Foreign Key: Link to Users table
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- INDEX: Fast lookup to see which groups a specific admin owns
    INDEX idx_groups_admin (admin_id)
);

-- =======================================================
-- 4. GROUP MEMBERS (Join Table)
-- =======================================================
CREATE TABLE group_members (
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    joined_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

    -- Composite Primary Key: A user can't join the same group twice
    PRIMARY KEY (group_id, user_id),

    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- INDEX: Critical for "Show me all my groups" query
    INDEX idx_members_user (user_id)
);

-- =======================================================
-- 5. MESSAGES TABLE (The Heavy Lifter)
-- =======================================================
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv7 (Time-sortable)
    sender_id VARCHAR(36) NOT NULL,
    
    -- Polymorphic logic: Is it a group chat or a DM?
    -- We use specific columns so we can use Foreign Keys
    group_id VARCHAR(36) DEFAULT NULL,
    recipient_id VARCHAR(36) DEFAULT NULL,
    
    type ENUM('private', 'group') NOT NULL,
    content TEXT NOT NULL,
    
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,

    -- PERFORMANCE INDEXES (DSA Logic):
    
    -- 1. Fetching Group History:
    -- "SELECT * FROM messages WHERE group_id = ? ORDER BY created_at DESC"
    -- This composite index handles the filtering AND the sorting instantly.
    INDEX idx_msg_group_time (group_id, created_at),

    -- 2. Fetching DM History:
    -- "SELECT * FROM messages WHERE (sender_id = A AND recipient_id = B) OR ..."
    -- This helps find messages between two specific people.
    INDEX idx_msg_dm_sender (sender_id, recipient_id),
    INDEX idx_msg_dm_recipient (recipient_id, sender_id)
);