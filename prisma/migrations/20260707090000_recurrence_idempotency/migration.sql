-- Recurrence-idempotens: dedup-nøgle pr. genererings-uge + tombstones for
-- bruger-slettede abonnements-ordrer, så flyttede/slettede ordrer ikke
-- genopstår ved næste natlige generering.

-- Rytme-ugen ordren blev genereret FOR (null for manuelle/online ordrer).
ALTER TABLE "Order" ADD COLUMN "sourceWeek" TIMESTAMP(3);

-- Backfill: eksisterende abonnements-ordrer antages at ligge i deres rytme-uge
-- (mandag i plannedAt's ISO-uge). date_trunc('week') er netop mandag i Postgres.
UPDATE "Order"
SET "sourceWeek" = date_trunc('week', "plannedAt")
WHERE "subscriptionId" IS NOT NULL AND "sourceWeek" IS NULL;

-- Har dobbeltbookings-bug'en allerede skabt to ordrer i samme uge, beholder den
-- ÆLDSTE sin sourceWeek; dubletter får NULL (ordren bevares, men tæller ikke
-- længere som ugens genererede) — ellers ville unique-indexet vælte deployet.
UPDATE "Order" o SET "sourceWeek" = NULL
WHERE o."sourceWeek" IS NOT NULL AND EXISTS (
  SELECT 1 FROM "Order" p
  WHERE p."subscriptionId" = o."subscriptionId" AND p."sourceWeek" = o."sourceWeek" AND p."id" < o."id"
);

-- Concurrency-værn: cron + manuel generering kan ikke dobbelt-oprette en uge.
-- (NULL-værdier er indbyrdes distinkte i Postgres, så manuelle ordrer rammes ikke.)
CREATE UNIQUE INDEX "Order_subscriptionId_sourceWeek_key" ON "Order"("subscriptionId", "sourceWeek");

CREATE TABLE "SubscriptionWeekSkip" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "week" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionWeekSkip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionWeekSkip_subscriptionId_week_key" ON "SubscriptionWeekSkip"("subscriptionId", "week");

ALTER TABLE "SubscriptionWeekSkip" ADD CONSTRAINT "SubscriptionWeekSkip_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
