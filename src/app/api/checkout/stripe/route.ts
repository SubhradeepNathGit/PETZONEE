import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build');

// Since we are in an API route, we need a service role key to insert securely if needed, 
// but we can just use the user's token or anon key if RLS allows it.
export async function POST(req: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error("STRIPE_SECRET_KEY is missing from environment variables.");
        return NextResponse.json({ error: 'Stripe configuration is missing' }, { status: 500 });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        
        // Pass the user's auth token to Supabase if it exists
        const supabaseOptions = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
        const supabase = createClient(supabaseUrl, supabaseServiceKey, supabaseOptions);

        const body = await req.json();
        const {
            userId,
            items,
            total,
            subtotal,
            contact,
            addr,
            delivery,
            payMode,
            isPlanCheckout,
            planDetails, // { name, price, period }
            deliveryFee,
            totalTax,
            promoDiscount,
            subDiscount,
            promoCode
        } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orderNumber = `BM-${Date.now().toString(36).toUpperCase()}`;

        // 1. Insert into orders table as 'pending'
        const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
                user_id: userId,
                order_number: orderNumber,
                total_amount: total,
                status: "processing",
                payment_status: "pending",
                shipping_address: addr || {},
                contact_details: contact || {},
                summary: {
                    subtotal,
                    sgst: totalTax / 2,
                    cgst: totalTax / 2,
                    totalTax,
                    deliveryFee,
                    promoCode,
                    promoDiscount,
                    subDiscount,
                    total
                }
            })
            .select()
            .single();

        if (orderError) {
            console.error("Order creation error:", orderError);
            return NextResponse.json({ error: `Failed to create order: ${orderError.message}`, details: orderError }, { status: 500 });
        }

        // 2. Insert into order_items table
        if (items && items.length > 0) {
            const orderItems = items.map((it: any) => ({
                order_id: orderData.id,
                product_id: it.product_id === "PLAN" ? null : it.product_id,
                product_name: it.name,
                quantity: it.quantity,
                unit_price: Number(it.price),
                image_url: it.image_url
            }));

            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItems);

            if (itemsError) {
                console.error("Order items error:", itemsError);
                return NextResponse.json({ error: 'Failed to save order items' }, { status: 500 });
            }
        }

        // 3. Prepare Stripe Line Items
        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

        if (isPlanCheckout && planDetails) {
            line_items.push({
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: `${planDetails.name} (${planDetails.period === 'year' ? 'Yearly' : 'Monthly'})`,
                    },
                    unit_amount: Math.round(planDetails.price * 100), // Stripe expects amounts in paise
                },
                quantity: 1,
            });
        } else {
            // Add cart items
            items.forEach((item: any) => {
                line_items.push({
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: item.name,
                            images: item.image_url ? [item.image_url] : [],
                        },
                        unit_amount: Math.round(item.price * 100),
                    },
                    quantity: item.quantity,
                });
            });

            // Add Delivery Fee if applicable
            if (deliveryFee > 0) {
                line_items.push({
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Delivery Fee (${delivery})`,
                        },
                        unit_amount: Math.round(deliveryFee * 100),
                    },
                    quantity: 1,
                });
            }

            // Add Taxes
            if (totalTax > 0) {
                line_items.push({
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Taxes (SGST + CGST)`,
                        },
                        unit_amount: Math.round(totalTax * 100),
                    },
                    quantity: 1,
                });
            }
        }

        // We can't do negative line items in Stripe for discounts.
        // Instead, Stripe provides "discounts" array using Coupons, but that requires creating a coupon in Stripe.
        // Easiest workaround for dynamic discounts in a single checkout session without pre-creating Stripe coupons:
        // Adjust the unit_amount of items, OR create a single negative line item (Stripe doesn't allow this).
        // Since Stripe requires unit_amount > 0, we can create an ephemeral coupon if there's a discount.

        const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
        const totalDiscountAmount = (promoDiscount || 0) + (subDiscount || 0);

        if (totalDiscountAmount > 0) {
            // Create a coupon on the fly
            const coupon = await stripe.coupons.create({
                amount_off: Math.round(totalDiscountAmount * 100),
                currency: 'inr',
                duration: 'once',
                name: 'Applied Discount',
            });
            discounts.push({ coupon: coupon.id });
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        // Metadata to pass to webhook
        const metadata: Record<string, string> = {
            orderId: orderData.id, // Supabase UUID
            orderNumber: orderNumber,
            userId: userId,
            isPlanCheckout: isPlanCheckout ? 'true' : 'false',
        };

        if (isPlanCheckout && planDetails) {
            metadata.planName = planDetails.name;
            metadata.planPrice = planDetails.price.toString();
            metadata.planPeriod = planDetails.period;
        }

        // Create Checkout Session Configuration
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: isPlanCheckout 
                ? `${origin}/checkout/plan-success?session_id={CHECKOUT_SESSION_ID}`
                : `${origin}/checkout/success?order=${orderNumber}`,
            cancel_url: isPlanCheckout ? `${origin}/` : `${origin}/cart`,
            customer_email: contact?.email || undefined,
            metadata,
            discounts: discounts.length > 0 ? discounts : undefined,
        };

        if (!isPlanCheckout) {
            sessionConfig.shipping_address_collection = {
                allowed_countries: ['IN', 'US', 'GB'],
            };
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create(sessionConfig);

        return NextResponse.json({ url: session.url, orderNumber });
    } catch (err: any) {
        console.error("Stripe Checkout Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
