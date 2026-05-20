require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking schema...");
    const { data: q1, error: e1 } = await supabase.rpc('get_my_claims'); // Just a dummy, we can't easily get schema.
    // Let's just try to insert a fake order with is_subscription_purchase
    const { data, error } = await supabase.from('orders').insert({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        order_number: 'TEST-123',
        total_amount: 0,
        is_subscription_purchase: true
    }).select();
    if (error) console.error("Insert error:", error.message);
    else console.log("Insert success:", data);
}

check();
