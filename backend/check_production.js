import { supabase } from './services/db.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function check() {
    console.log('--- PRODUCTION HEALTH CHECK ---');

    // 1. Supabase Connection
    try {
        const { data, error } = await supabase.from('settings').select('id').limit(1);
        if (error) throw error;
        console.log('✅ Supabase Connection: OK');
    } catch (err) {
        console.error('❌ Supabase Connection: FAILED', err.message);
    }

    // 2. Environment Variables
    const requiredEnv = ['SUPABASE_URL', 'SUPABASE_KEY', 'OPENROUTER_API_KEY', 'DASHBOARD_API_KEY'];
    requiredEnv.forEach(env => {
        if (process.env[env]) {
            console.log(`✅ ENV ${env}: OK`);
        } else {
            console.warn(`⚠️ ENV ${env}: MISSING`);
        }
    });

    // 3. WordPress Blogs Connectivity
    try {
        const { data: blogs } = await supabase.from('blogs').select('*').eq('is_active', true);
        if (blogs && blogs.length > 0) {
            console.log(`Checking ${blogs.length} active blogs...`);
            for (const blog of blogs) {
                try {
                    const res = await axios.get(`${blog.api_url}/autowriter/v1/health`, { timeout: 5000 });
                    console.log(`✅ Blog [${blog.blog_key}]: OK (${res.data.status})`);
                } catch (bErr) {
                    console.error(`❌ Blog [${blog.blog_key}]: unreachable - ${bErr.message}`);
                }
            }
        } else {
            console.log('ℹ️ No active blogs found in database.');
        }
    } catch (err) {
        console.error('❌ Blog Check Failed:', err.message);
    }

    console.log('--- CHECK COMPLETE ---');
    process.exit(0);
}

check();
