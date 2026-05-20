import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build');

export async function POST(req: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration is missing' }, { status: 500 });
    }

    try {
        const { session_id } = await req.json();
        
        if (!session_id) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        const metadata = session.metadata;
        if (!metadata || metadata.isPlanCheckout !== 'true') {
            return NextResponse.json({ success: true, message: 'Not a plan checkout' });
        }

        const { orderId, userId, planName, planPrice, planPeriod } = metadata;

        const authHeader = req.headers.get('Authorization');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabaseOptions = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
        const supabase = createClient(supabaseUrl, supabaseServiceKey, supabaseOptions);

        // 1. Update order status to paid
        if (orderId) {
            await supabase
                .from('orders')
                .update({ payment_status: 'paid' })
                .eq('id', orderId);
        }

        // 2. Activate plan
        if (userId && planName && planPrice && planPeriod) {
            const endDate = new Date();
            if (planPeriod === 'year') endDate.setFullYear(endDate.getFullYear() + 1);
            else endDate.setMonth(endDate.getMonth() + 1);

            const { error: planError } = await supabase
                .from("user_subscriptions")
                .upsert({
                    user_id: userId,
                    plan_name: planName,
                    price: parseFloat(planPrice),
                    period: planPeriod,
                    status: "active",
                    start_date: new Date().toISOString(),
                    end_date: endDate.toISOString()
                }, { onConflict: 'user_id' });

            if (planError) {
                console.error("Error updating user_subscriptions on verify:", planError);
                return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
            }
        }

        return NextResponse.json({ 
            success: true, 
            planDetails: { 
                planName, 
                planPeriod, 
                orderNumber: metadata.orderNumber 
            } 
        });
    } catch (err: any) {
        console.error("Verify session error:", err);
        return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
    }
}
