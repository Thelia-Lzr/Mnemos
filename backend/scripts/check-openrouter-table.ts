import { pool } from '../src/config/database';

async function checkAndCreateTable() {
  try {
    console.log('🔍 Checking if openrouter_config table exists...');
    
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'openrouter_config'
      )
    `);
    
    console.log('openrouter_config table exists:', result.rows[0].exists);
    
    if (!result.rows[0].exists) {
      console.log('📝 Creating openrouter_config table...');
      
      await pool.query(`
        CREATE TABLE openrouter_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          api_key VARCHAR(255) NOT NULL,
          base_url VARCHAR(255) DEFAULT 'https://openrouter.ai/api/v1',
          timeout INTEGER DEFAULT 30000,
          max_retries INTEGER DEFAULT 3,
          retry_delay INTEGER DEFAULT 1000,
          daily_token_limit INTEGER,
          monthly_token_limit INTEGER,
          cost_threshold DECIMAL(10,2),
          is_active BOOLEAN DEFAULT true,
          last_tested_at TIMESTAMP WITH TIME ZONE,
          test_status VARCHAR(20) DEFAULT 'untested' CHECK (test_status IN ('untested', 'testing', 'success', 'failed', 'expired')),
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_by UUID REFERENCES users(id),
          CONSTRAINT single_config CHECK (id = 1)
        );
      `);
      
      // Create trigger for updated_at
      await pool.query(`
        CREATE TRIGGER update_openrouter_config_updated_at 
        BEFORE UPDATE ON openrouter_config 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      
      console.log('✅ Table created successfully');
    } else {
      console.log('✅ Table already exists');
    }
    
    await pool.end();
    console.log('🎉 Database check completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndCreateTable();