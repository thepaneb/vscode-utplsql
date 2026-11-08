create or replace package ut_customers as

  -- %suite(Customers)
  -- %suitepath(demo.customers)
  -- %tags(demo)

  -- %test(Silver customer keeps 95 percent of the total)
  procedure silver_customer_discount;

  -- %test(Regular customer pays the full total)
  procedure regular_customer_total;

end ut_customers;
/

create or replace package body ut_customers as

  procedure silver_customer_discount is
  begin
    ut.expect(orders.apply_discount(200, 'SILVER')).to_equal(190);
  end silver_customer_discount;

  procedure regular_customer_total is
  begin
    ut.expect(orders.apply_discount(200, 'REGULAR')).to_equal(200);
  end regular_customer_total;

end ut_customers;
/
