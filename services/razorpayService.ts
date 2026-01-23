import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { User } from '../types';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        if (Capacitor.isNativePlatform()) {
            resolve(false);
            return;
        }

        const script = document.createElement('script');
        script.src = RAZORPAY_SCRIPT_URL;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

interface CreateSubscriptionParams {
    user: User;
    planId: string; // "monthly" (Mapped to real plan ID in backend)
    onSuccess: (response: any) => void;
    onFailure: (error: any) => void;
}

export const createRazorpaySubscription = async ({
    user,
    planId,
    onSuccess,
    onFailure
}: CreateSubscriptionParams) => {
    if (Capacitor.isNativePlatform()) {
        console.warn('Razorpay is for Web only.');
        return;
    }

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
        onFailure(new Error('Failed to load Razorpay SDK'));
        return;
    }

    try {
        // 1. Call Edge Function to create subscription Order
        // We send 'monthly' and let backend map it to actual Razorpay Plan ID
        const { data: orderData, error } = await supabase.functions.invoke('create-razorpay-subscription', {
            body: { planType: planId }
        });

        if (error || !orderData || !orderData.id) {
            console.error('Order creation failed:', error || orderData);
            throw new Error('Failed to create subscription order. Please try again.');
        }

        console.log('Razorpay Order Created:', orderData);

        // 2. Open Razorpay Checkout
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Public Key from Env
            subscription_id: orderData.id,
            name: 'Spendyx Premium',
            description: 'Unlock unlimited subscriptions',
            image: '/pwa-192x192.png', // App Logo
            handler: async function (response: any) {
                console.log('Razorpay Payment Success:', response);
                // Optimistic UI update can happen here, but real source of truth is Webhook -> DB -> Realtime
                onSuccess(response);
            },
            prefill: {
                name: user.name,
                email: user.email,
                contact: '' // Optional
            },
            theme: {
                color: '#4f46e5' // Indigo-600
            },
            modal: {
                ondismiss: function () {
                    // User closed checkout without paying
                }
            }
        };

        const rzp1 = new window.Razorpay(options);

        rzp1.on('payment.failed', function (response: any) {
            console.error('Payment Failed:', response.error);
            onFailure(response.error);
        });

        rzp1.open();

    } catch (err) {
        console.error('Razorpay Error:', err);
        onFailure(err);
    }
};
