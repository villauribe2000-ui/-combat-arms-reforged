-- Crear tabla de usuarios (auth + profile)
CREATE TABLE users (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    username NVARCHAR(255) NOT NULL UNIQUE,
    avatar_url NVARCHAR(500),
    bio NVARCHAR(500),
    rank NVARCHAR(50) DEFAULT 'unranked',
    points INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    kd_ratio DECIMAL(5,2) DEFAULT 0,
    cash_balance INT DEFAULT 0,
    is_admin BIT DEFAULT 0,
    country NVARCHAR(255),
    main_game NVARCHAR(255),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Crear tabla de torneos
CREATE TABLE tournaments (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    game NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'upcoming',
    start_date DATETIME2,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    max_participants INT DEFAULT 32,
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Crear tabla de participantes en torneos
CREATE TABLE tournament_participants (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    tournament_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    placement INT,
    points_earned INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Crear tabla de clanes
CREATE TABLE clans (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    tag NVARCHAR(10) NOT NULL UNIQUE,
    description NVARCHAR(500),
    logo_url NVARCHAR(500),
    leader_id UNIQUEIDENTIFIER NOT NULL,
    member_count INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (leader_id) REFERENCES users(id)
);

-- Crear tabla de miembros de clanes
CREATE TABLE clan_members (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    clan_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(50) DEFAULT 'member',
    joined_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (clan_id) REFERENCES clans(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(clan_id, user_id)
);

-- Crear tabla de productos
CREATE TABLE products (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    category NVARCHAR(50),
    image_url NVARCHAR(500),
    rarity NVARCHAR(50),
    is_active BIT DEFAULT 1,
    stock INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Crear tabla de compras
CREATE TABLE purchases (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status NVARCHAR(50) DEFAULT 'completed',
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Crear tabla de transacciones
CREATE TABLE transactions (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    type NVARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description NVARCHAR(255),
    balance_after DECIMAL(10,2),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Crear tabla de tickets de soporte
CREATE TABLE tickets (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    subject NVARCHAR(255) NOT NULL,
    category NVARCHAR(50),
    status NVARCHAR(50) DEFAULT 'open',
    priority NVARCHAR(50) DEFAULT 'normal',
    assigned_to UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Crear tabla de mensajes de tickets
CREATE TABLE ticket_messages (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    ticket_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    is_staff BIT DEFAULT 0,
    message NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Crear índices para mejorar performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_points ON users(points DESC);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_clan_members_user ON clan_members(user_id);
CREATE INDEX idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
