import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Loader, Globe, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Link } from './Link';

interface AuthProps {
    onComplete: (session: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onComplete }) => {
    const [view, setView] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const handleAuth = async () => {
        setLoading(true);
        setError(null);

        try {
            if (view === 'signup') {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name,
                            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
                        }
                    }
                });
                if (error) throw error;
                if (data.user) {
                    if (data.session) {
                        // onComplete(data.session); // Let App.tsx listener handle it
                    }
                    else alert("Please check your email for confirmation link if required.");
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
                // Success! The onAuthStateChange listener in App.tsx will handle the state update
                // onComplete(data.session); 
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <motion.div
                key="auth-card-clean"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-gray-100"
            >
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                        <img src="/Spendyx.png" alt="Spendyx" className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {view === 'login' ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-2">
                        {view === 'login' ? 'Please enter your details to sign in.' : 'Start managing your subscriptions today.'}
                    </p>
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 overflow-hidden"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <div className="space-y-4">
                    {view === 'signup' && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 ml-1">Full Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all placeholder-gray-400"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>


                        </>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all placeholder-gray-400"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 text-gray-900 text-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all placeholder-gray-400"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>


                    {view === 'signup' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 text-gray-900 text-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all placeholder-gray-400"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-3 px-1">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms"
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                                    />
                                </div>
                                <label htmlFor="terms" className="text-xs text-gray-500 leading-tight">
                                    I agree to the <Link href="/terms" className="text-purple-600 font-semibold cursor-pointer">Terms of Service</Link> and <Link href="/privacy-policy" className="text-purple-600 font-semibold cursor-pointer">Privacy Policy</Link>.
                                </label>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleAuth}
                        disabled={loading || (view === 'signup' && !agreedToTerms)}
                        className="w-full h-12 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl mt-2 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
                    >
                        {loading ? <Loader className="animate-spin" size={18} /> : (view === 'login' ? 'Sign in' : 'Create account')}
                    </button>
                </div>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px bg-gray-100 flex-1"></div>
                    <span className="text-xs text-gray-400 font-medium lowercase">Or continue with</span>
                    <div className="h-px bg-gray-100 flex-1"></div>
                </div>

                <button
                    onClick={async () => {
                        try {
                            setLoading(true);
                            // Explicitly define redirect URL to debug
                            const redirectUrl = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android'
                                ? 'com.jwr.spendyx://login-callback'
                                : window.location.origin;

                            const { data, error } = await supabase.auth.signInWithOAuth({
                                provider: 'google',
                                options: {
                                    redirectTo: redirectUrl,
                                    skipBrowserRedirect: false
                                }
                            });

                            if (error) throw error;
                        } catch (err: any) {
                            setError(err.message);
                            setLoading(false);
                            alert(`Login Error: ${err.message}`);
                        }
                    }}
                    disabled={loading}
                    className="w-full h-12 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Google
                </button>

                {/* Footer Toggle */}
                <div className="mt-8 text-center pt-6 border-t border-gray-100">
                    <p className="text-gray-500 text-sm">
                        {view === 'login' ? "Don't have an account?" : 'Already have an account?'}
                        <button
                            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                            className="ml-2 font-bold text-gray-900 hover:underline"
                        >
                            {view === 'login' ? 'Sign up' : 'Log in'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );

};

export default Auth;
