-- Afventende abonnementer: oprettes ved lead-konvertering (tilbudsmotor-payload),
-- godkendes efter bekræftelses-opkaldet. active=false imens — pending adskiller
-- dem fra STOPPEDE abonnementer (som også har active=false).
ALTER TABLE "Subscription" ADD COLUMN "pending" BOOLEAN NOT NULL DEFAULT false;
