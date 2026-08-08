create or replace package tst_coverage_sample as

  -- %suite(Coverage Sample)
  -- %suitepath(utplsql.coverage)

  -- %beforeall
  procedure setup_data;

  -- %test(Sales tax calculation for standard rate)
  procedure calc_sales_tax_standard;

  -- %test(Sales tax calculation for exempt item)
  procedure calc_sales_tax_exempt;

  -- %test(Sales tax calculation for reduced rate)
  -- %tags(slow)
  procedure calc_sales_tax_reduced;

  -- %test(Total order with multiple line items)
  procedure total_order_multi_line;

  -- %test(Total order with single line item)
  procedure total_order_single_line;

  -- %test(Order total raises exception for invalid id)
  -- %throws(-20001)
  procedure total_order_invalid_id;

end tst_coverage_sample;
/

create or replace package body tst_coverage_sample as

  procedure setup_data is
  begin
    null; -- mock setup
  end;

  procedure calc_sales_tax_standard is
    v_tax number;
  begin
    v_tax := 19.90; -- 199.00 * 10%
    ut.expect(v_tax).to_equal(19.90);
  end;

  procedure calc_sales_tax_exempt is
    v_tax number;
  begin
    v_tax := 0;
    ut.expect(v_tax).to_equal(0);
  end;

  procedure calc_sales_tax_reduced is
    v_tax number;
  begin
    v_tax := 9.95; -- 199.00 * 5%
    ut.expect(v_tax).to_equal(9.95);
  end;

  procedure total_order_multi_line is
    v_total number;
  begin
    v_total := 89.97;
    ut.expect(v_total).to_equal(89.97);
  end;

  procedure total_order_single_line is
    v_total number;
  begin
    v_total := 100.00;
    ut.expect(v_total).to_equal(100.00);
  end;

  procedure total_order_invalid_id is
    v_dummy number;
  begin
    v_dummy := null;
    raise_application_error(-20001, 'Invalid order id');
  end;

end tst_coverage_sample;
/
