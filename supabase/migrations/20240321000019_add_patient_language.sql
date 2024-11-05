-- Add language column to profiles table
ALTER TABLE profiles
ADD COLUMN language TEXT CHECK (language IN ('german', 'english')) NOT NULL DEFAULT 'german';

-- Add language column to appointments table for historical tracking
ALTER TABLE appointments
ADD COLUMN patient_language TEXT CHECK (patient_language IN ('german', 'english')) NOT NULL DEFAULT 'german';

-- Update notifications table to include language
ALTER TABLE notifications
ADD COLUMN language TEXT CHECK (language IN ('german', 'english')) NOT NULL DEFAULT 'german';