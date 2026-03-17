-- Add 'screen' to tag_dimension enum (must be in separate migration from INSERT;
-- PostgreSQL requires new enum values to be committed before use)
ALTER TYPE "tag_dimension" ADD VALUE IF NOT EXISTS 'screen';
