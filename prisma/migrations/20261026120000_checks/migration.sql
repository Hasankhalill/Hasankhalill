ALTER TABLE "user"
  ADD CONSTRAINT "user_role_check"
  CHECK (role IN ('CUSTOMER', 'OWNER', 'ADMINISTRATOR', 'INVENTORY_MANAGER', 'ORDER_MANAGER'));

ALTER TABLE "Product"
  ADD CONSTRAINT "product_price_nonneg" CHECK ("priceCents" >= 0),
  ADD CONSTRAINT "product_sale_valid" CHECK ("salePriceCents" IS NULL OR ("salePriceCents" >= 0 AND "salePriceCents" <= "priceCents"));

ALTER TABLE "Variant"
  ADD CONSTRAINT "variant_price_nonneg" CHECK ("priceCents" IS NULL OR "priceCents" >= 0),
  ADD CONSTRAINT "variant_sale_valid" CHECK ("salePriceCents" IS NULL OR ("salePriceCents" >= 0 AND ("priceCents" IS NULL OR "salePriceCents" <= "priceCents")));

ALTER TABLE "Review"
  ADD CONSTRAINT "review_rating_range" CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE "CartItem"
  ADD CONSTRAINT "cart_item_qty_positive" CHECK (quantity > 0);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "order_item_qty_positive" CHECK (quantity > 0 AND "unitPriceCents" >= 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT "payment_amount_nonneg" CHECK ("amountCents" >= 0);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "coupon_amount_nonneg" CHECK (amount >= 0 AND "minSubtotalCents" >= 0);

ALTER TABLE "ShippingMethod"
  ADD CONSTRAINT "shipping_fee_nonneg" CHECK ("feeCents" >= 0);
