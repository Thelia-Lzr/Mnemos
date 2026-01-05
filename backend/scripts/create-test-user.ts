import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createTestUser = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_language_learning',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    // Test user details
    const testEmail = 'thelia@example.com';
    const testPassword = '123456';
    const testUsername = 'Thelia';

    // Check if test user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  Test user already exists!');
      console.log('📧 Email:', testEmail);
      console.log('👤 Username:', testUsername);
      console.log('');
      console.log('💡 Tip: Delete the user from database if you want to recreate it.');
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(testPassword, saltRounds);

    // Generate UUID for test user
    const testUserId = uuidv4();

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, username, email, role`,
      [testUserId, testUsername, testEmail, passwordHash]
    );

    // Create user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id, created_at, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [testUserId]
    );

    // Create user credits record
    await pool.query(
      `INSERT INTO user_credits (id, user_id, current_balance, created_at, updated_at)
       VALUES ($1, $2, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [uuidv4(), testUserId]
    );

    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('📋 Account Details:');
    console.log('  📧 Email:', testEmail);
    console.log('  🔑 Password:', testPassword);
    console.log('  👤 Username:', testUsername);
    console.log('  🎭 Role: user');
    console.log('  💰 Initial Credits: 100');
    console.log('');
    console.log('🌐 You can now login at: http://localhost:3000');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run the script
createTestUser().catch(console.error);
