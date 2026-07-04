-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "FixedPriceAgreement_contactId_idx" ON "FixedPriceAgreement"("contactId");

-- CreateIndex
CREATE INDEX "Order_contactId_idx" ON "Order"("contactId");

-- CreateIndex
CREATE INDEX "Order_subscriptionId_idx" ON "Order"("subscriptionId");

-- CreateIndex
CREATE INDEX "Order_plannedAt_idx" ON "Order"("plannedAt");

-- CreateIndex
CREATE INDEX "StandardTask_companyId_idx" ON "StandardTask"("companyId");

-- CreateIndex
CREATE INDEX "Subscription_contactId_idx" ON "Subscription"("contactId");

-- CreateIndex
CREATE INDEX "TaskLine_orderId_idx" ON "TaskLine"("orderId");

-- CreateIndex
CREATE INDEX "TaskLine_subscriptionId_idx" ON "TaskLine"("subscriptionId");

-- CreateIndex
CREATE INDEX "TaskLine_fixedPriceId_idx" ON "TaskLine"("fixedPriceId");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
