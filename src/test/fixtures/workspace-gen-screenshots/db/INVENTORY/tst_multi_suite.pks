create or replace package tst_multi_suite as

  -- %suite(Order Processing Tests)
  -- %suitepath(app.orders)

  -- %test(Calculate order total)
  procedure calc_order_total;

  -- %test(Validate customer email)
  procedure validate_customer_email;

end tst_multi_suite;
/

create or replace package body tst_multi_suite as

  procedure calc_order_total is
  begin
    ut.expect(150.00).to_equal(150.00);
  end;

  procedure validate_customer_email is
  begin
    ut.expect('test@example.com').to_be_like('%@%.%');
  end;

end tst_multi_suite;
/

create or replace package tst_inventory_suite as

  -- %suite(Inventory Management Tests)
  -- %suitepath(app.inventory)

  -- %test(Check stock level)
  procedure check_stock_level;

  -- %test(Reserve item for order)
  procedure reserve_item;

end tst_inventory_suite;
/

create or replace package body tst_inventory_suite as

  procedure check_stock_level is
  begin
    ut.expect(42).to_be_greater_than(0);
  end;

  procedure reserve_item is
  begin
    ut.expect('RESERVED').to_equal('RESERVED');
  end;

end tst_inventory_suite;
/
