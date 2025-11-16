-- Migration: Add assistantId field to users table for team hierarchy

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "assistantId" TEXT;


