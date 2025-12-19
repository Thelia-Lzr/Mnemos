import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createAdminUser = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_language_learning',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    // Admin user details
    const adminEmail = 'thelia@example.com';
    const adminPassword = 'TheliaThelia123';
    const adminUsername = 'Thelia';

    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [adminEmail, adminUsername]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Admin user already exists!');
      console.log('📧 Email:', adminEmail);
      console.log('👤 Username:', adminUsername);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Generate UUID for admin user
    const adminId = uuidv4();

    // Create admin user
    const userResult = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, username, email, role`,
      [adminId, adminUsername, adminEmail, passwordHash]
    );

    // Create user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id, created_at, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [adminId]
    );

    // Create user credits record
    await pool.query(
      `INSERT INTO user_credits (id, user_id, current_balance, created_at, updated_at)
       VALUES ($1, $2, 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [uuidv4(), adminId]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Username:', adminUsername);
    console.log('🎭 Role: admin');
    console.log('💰 Initial Credits: 1000');
    console.log('');
    console.log('🌐 You can now login at: http://localhost:3003');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await pool.end();
  }
};

// Run the script
createAdminUser().catch(console.error);