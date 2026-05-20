require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking orders...");
    const { data, error } = await supabase.from('orders').select(`*`).limit(5);
    if (error) console.error("Error:", error.message);
    else console.log("Orders data keys:", Object.keys(data[0] || {}));
}

check();
