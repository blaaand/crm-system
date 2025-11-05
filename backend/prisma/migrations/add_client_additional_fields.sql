-- Migration: Add additionalData and commitments fields to clients table
-- This migration adds two new optional fields to store JSON data for client additional information and commitments

ALTER TABLE "clients" 
ADD COLUMN IF NOT EXISTS "additionalData" TEXT,
ADD COLUMN IF NOT EXISTS "commitments" TEXT;

-- These fields are optional (nullable) so existing records won't be affected
-- The fields will store JSON strings containing:
-- additionalData: { carName, workOrganization, age, salaryBankId, salary, insurancePercentage, hasServiceStop }
-- commitments: { obligationTypes, deductionPercentage, obligation1, obligation2, visaAmount }

