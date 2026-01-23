-- Migration: Add notification_time and notification_frequency to subscriptions

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS notification_time TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'once';

-- notification_frequency values: 'once', '1h', '3h', '5h', '24h'
-- notification_time format: 'HH:MM' (24-hour)
