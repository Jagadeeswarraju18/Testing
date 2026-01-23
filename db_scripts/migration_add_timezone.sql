-- Migration: Add timezone column to workspaces table
-- Run this in Supabase SQL Editor

-- Add timezone column with default value for existing records
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

-- Update existing workspaces based on their currency (optional - run manually if needed)
-- This sets reasonable defaults based on currency
/*
UPDATE workspaces SET timezone = CASE currency
    WHEN 'INR' THEN 'Asia/Kolkata'
    WHEN 'USD' THEN 'America/New_York'
    WHEN 'EUR' THEN 'Europe/Berlin'
    WHEN 'GBP' THEN 'Europe/London'
    WHEN 'JPY' THEN 'Asia/Tokyo'
    WHEN 'CNY' THEN 'Asia/Shanghai'
    WHEN 'AUD' THEN 'Australia/Sydney'
    WHEN 'CAD' THEN 'America/Toronto'
    WHEN 'CHF' THEN 'Europe/Zurich'
    WHEN 'HKD' THEN 'Asia/Hong_Kong'
    WHEN 'SGD' THEN 'Asia/Singapore'
    WHEN 'KRW' THEN 'Asia/Seoul'
    WHEN 'MXN' THEN 'America/Mexico_City'
    WHEN 'BRL' THEN 'America/Sao_Paulo'
    WHEN 'RUB' THEN 'Europe/Moscow'
    WHEN 'ZAR' THEN 'Africa/Johannesburg'
    WHEN 'AED' THEN 'Asia/Dubai'
    WHEN 'SAR' THEN 'Asia/Riyadh'
    WHEN 'NZD' THEN 'Pacific/Auckland'
    WHEN 'THB' THEN 'Asia/Bangkok'
    ELSE 'Asia/Kolkata'
END;
*/
