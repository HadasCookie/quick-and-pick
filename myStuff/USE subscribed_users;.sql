USE subscribed_users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    gender ENUM('male', 'female', 'other'),
    city VARCHAR(100),
    disabled_permit BOOLEAN DEFAULT FALSE,
    preferences JSON DEFAULT NULL,
    budget ENUM('weekly', 'monthly', 'other') DEFAULT 'weekly',
    supermarket_radius INT DEFAULT 5,
    budget_amount DECIMAL(10,2) DEFAULT 0,
    newsletter BOOLEAN DEFAULT FALSE,
    marketing_updates BOOLEAN DEFAULT FALSE,
    subscription_status ENUM('Active', 'Inactive') DEFAULT 'Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- \sql
-- \connect root@34.136.219.66
-- gcloud sql connect subscribed-users-db --user=root
