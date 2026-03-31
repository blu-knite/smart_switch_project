-- Create database
CREATE DATABASE IF NOT EXISTS smartswitch_db;
USE smartswitch_db;

-- Users table
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    role ENUM('user', 'admin') DEFAULT 'user',
    theme ENUM('dark', 'light') DEFAULT 'dark',
    isActive BOOLEAN DEFAULT TRUE,
    lastLogin DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Places table
CREATE TABLE IF NOT EXISTS Places (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT 'home',
    address VARCHAR(500),
    latitude FLOAT,
    longitude FLOAT,
    userId INT NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Boards table (ESP8266 devices)
CREATE TABLE IF NOT EXISTS Boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT 'microchip',
    description TEXT,
    placeId INT,
    userId INT NOT NULL,
    firmwareVersion VARCHAR(50) DEFAULT '1.0.0',
    ipAddress VARCHAR(45),
    lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    isOnline BOOLEAN DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (placeId) REFERENCES Places(id) ON DELETE SET NULL,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Switches table (individual relays on boards)
CREATE TABLE IF NOT EXISTS Switches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boardId INT NOT NULL,
    `index` INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT 'lightbulb',
    color VARCHAR(50) DEFAULT 'primary',
    state BOOLEAN DEFAULT FALSE,
    mode INT DEFAULT 3,
    power INT DEFAULT 60,
    room VARCHAR(255),
    lastActive DATETIME DEFAULT CURRENT_TIMESTAMP,
    settings JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (boardId) REFERENCES Boards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_board_switch (boardId, `index`)
);

-- Schedules table
CREATE TABLE IF NOT EXISTS Schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    switchId INT,
    boardId INT,
    placeId INT,
    userId INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    mode ENUM('manual', 'ai', 'presence', 'all') DEFAULT 'manual',
    cronExpression VARCHAR(100),
    startTime TIME,
    endTime TIME,
    daysOfWeek JSON,
    isActive BOOLEAN DEFAULT TRUE,
    lastRun DATETIME,
    nextRun DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (switchId) REFERENCES Switches(id) ON DELETE CASCADE,
    FOREIGN KEY (boardId) REFERENCES Boards(id) ON DELETE CASCADE,
    FOREIGN KEY (placeId) REFERENCES Places(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Routines table
CREATE TABLE IF NOT EXISTS Routines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    boardId INT,
    placeId INT,
    userId INT NOT NULL,
    actions JSON NOT NULL,
    trigger ENUM('manual', 'time', 'device', 'presence', 'weather') DEFAULT 'manual',
    triggerConfig JSON,
    enabled BOOLEAN DEFAULT TRUE,
    isAIGenerated BOOLEAN DEFAULT FALSE,
    confidence INT DEFAULT 0,
    lastExecuted DATETIME,
    executionCount INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (boardId) REFERENCES Boards(id) ON DELETE CASCADE,
    FOREIGN KEY (placeId) REFERENCES Places(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_user_email ON Users(email);
CREATE INDEX idx_place_user ON Places(userId);
CREATE INDEX idx_board_uid ON Boards(uid);
CREATE INDEX idx_board_user ON Boards(userId);
CREATE INDEX idx_switch_board ON Switches(boardId);
CREATE INDEX idx_switch_state ON Switches(state);
CREATE INDEX idx_schedule_user ON Schedules(userId);
CREATE INDEX idx_schedule_next_run ON Schedules(nextRun);
CREATE INDEX idx_routine_user ON Routines(userId);