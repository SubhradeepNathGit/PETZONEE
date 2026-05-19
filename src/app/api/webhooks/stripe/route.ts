import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get('stripe-signature') as string;

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error(`Webhook signature verification failed.`, err.message);
            return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
        }

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            
            const metadata = session.metadata;
            if (!metadata) {
                return NextResponse.json({ error: 'No metadata found in session' }, { status: 400 });
            }

            const { orderId, userId, isPlanCheckout, planName, planPrice, planPeriod } = metadata;

            // 1. Update order status to paid
            if (orderId) {
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        payment_status: 'paid',
                    })
                    .eq('id', orderId);

                if (updateError) {
                    console.error("Error updating order payment_status:", updateError);
                }
            }

            // 2. Clear cart if not a plan checkout
            if (isPlanCheckout !== 'true' && userId) {
                const { error: cartClearError } = await supabase
                    .from("cart")
                    .delete()
                    .eq("user_id", userId);
                    
                if (cartClearError) {
                    console.error("Could not clear cart:", cartClearError);
                }
            }

            // 3. Activate plan if it's a plan checkout
            if (isPlanCheckout === 'true' && userId && planName && planPrice && planPeriod) {
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
                    console.error("Error updating user_subscriptions:", planError);
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("Stripe Webhook Error:", err);
        return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
    }
}
