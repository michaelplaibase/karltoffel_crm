-- Tilbudsmotor-payload på leads: valgte services, estimat og kundetype
-- (JSON blob string, samme konvention som Lead.utm — schemaet bruger ikke Json-typen).
ALTER TABLE "Lead" ADD COLUMN "payload" TEXT;
