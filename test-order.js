const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('orders').insert({
    user_id: '123e4567-e89b-12d3-a456-426614174000', // valid uuid format
    order_number: 'TEST-123',
    total_amount: 100,
    status: 'processing',
    payment_status: 'pending',
    shipping_address: {},
    contact_details: {},
    delivery_type: 'standard',
    payment_method: 'stripe',
    summary: {}
  }).select();
  console.log(error || data);
}

test();
