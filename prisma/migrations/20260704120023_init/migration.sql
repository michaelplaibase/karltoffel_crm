-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cvr" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "planTier" TEXT NOT NULL DEFAULT 'Pro',
    "hourlyPrice" INTEGER NOT NULL DEFAULT 600,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "calendarColor" TEXT,
    "activeCalendar" BOOLEAN NOT NULL DEFAULT true,
    "canReceiveOnline" BOOLEAN NOT NULL DEFAULT false,
    "homeAddress" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "canSeePrices" BOOLEAN NOT NULL DEFAULT true,
    "canEditOrders" BOOLEAN NOT NULL DEFAULT true,
    "canHandlePayment" BOOLEAN NOT NULL DEFAULT true,
    "canChangePaymentOption" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT,
    "cvr" TEXT,
    "ean" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "att" TEXT,
    "note" TEXT,
    "revenueYtd" INTEGER,
    "avgYearlyFromSubs" INTEGER NOT NULL DEFAULT 0,
    "skipDeliveryAddressOnInvoice" BOOLEAN NOT NULL DEFAULT false,
    "showDeliveryNameOnInvoice" BOOLEAN NOT NULL DEFAULT false,
    "skipInvoiceOverSms" BOOLEAN NOT NULL DEFAULT false,
    "invoiceChoicePreselect" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardTask" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "letter" TEXT,
    "customerPresenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StandardTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLine" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "customerPresenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "isStandardTask" BOOLEAN NOT NULL DEFAULT false,
    "fromSubscription" BOOLEAN NOT NULL DEFAULT false,
    "intervalMultiplier" TEXT,
    "startWeek" TEXT,
    "subscriptionId" INTEGER,
    "fixedPriceId" INTEGER,
    "orderId" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "displayNo" INTEGER NOT NULL,
    "contactId" INTEGER NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "baseInterval" TEXT NOT NULL,
    "startWeek" TEXT,
    "nextWeek" TEXT,
    "fixedWeekdays" TEXT,
    "fixedTimeOfDay" TEXT,
    "fixedEmployee" TEXT NOT NULL DEFAULT 'Ingen',
    "notiOverride" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedPriceAgreement" (
    "id" SERIAL NOT NULL,
    "displayNo" INTEGER NOT NULL,
    "contactId" INTEGER NOT NULL,
    "deliveryAddress" TEXT NOT NULL,

    CONSTRAINT "FixedPriceAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "contactId" INTEGER NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Afventer levering',
    "sourceType" TEXT NOT NULL,
    "subscriptionId" INTEGER,
    "fixedPriceId" INTEGER,
    "employeeId" INTEGER,
    "lockedFully" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "addressNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayWeek" (
    "id" SERIAL NOT NULL,
    "startWeek" TIMESTAMP(3) NOT NULL,
    "endWeek" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_displayNo_key" ON "Subscription"("displayNo");

-- CreateIndex
CREATE UNIQUE INDEX "FixedPriceAgreement_displayNo_key" ON "FixedPriceAgreement"("displayNo");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardTask" ADD CONSTRAINT "StandardTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLine" ADD CONSTRAINT "TaskLine_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLine" ADD CONSTRAINT "TaskLine_fixedPriceId_fkey" FOREIGN KEY ("fixedPriceId") REFERENCES "FixedPriceAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLine" ADD CONSTRAINT "TaskLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedPriceAgreement" ADD CONSTRAINT "FixedPriceAgreement_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fixedPriceId_fkey" FOREIGN KEY ("fixedPriceId") REFERENCES "FixedPriceAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
