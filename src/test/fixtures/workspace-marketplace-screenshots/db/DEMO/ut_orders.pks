create or replace package ut_orders as

  -- %suite(Orders)
  -- %suitepath(demo.orders)
  -- %tags(demo, fast)

  -- %test(Total of two items)
  procedure total_of_two_items;

  -- %test(Gold customer receives 10 percent discount)
  procedure gold_customer_discount;

  -- %test(Invalid quantity is rejected)
  procedure invalid_quantity_is_rejected;

  -- %test(Express shipping is free above the threshold) %disabled
  procedure express_shipping_is_free;

end ut_orders;
/

create or replace package body ut_orders as

  procedure total_of_two_items is
  begin
    ut.expect(orders.calculate_total(2, 19.90)).to_equal(39.80);
  end total_of_two_items;

  procedure gold_customer_discount is
  begin
    ut.expect(orders.apply_discount(100, 'GOLD')).to_equal(90);
  end gold_customer_discount;

  procedure invalid_quantity_is_rejected is
  begin
    -- Fails on purpose: the demo screenshot shows an expected x actual diff.
    ut.expect(orders.calculate_total(2, 10)).to_equal(999);
  end invalid_quantity_is_rejected;

  procedure express_shipping_is_free is
  begin
    ut.expect(1).to_equal(1);
  end express_shipping_is_free;

end ut_orders;
/
