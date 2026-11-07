create or replace package orders as

  /**
   * Demo package used only for Marketplace screenshots.
   * All customer data is fictional.
   */
  function calculate_total(
    p_quantity in number,
    p_unit_price in number
  ) return number;

  function apply_discount(
    p_total in number,
    p_customer_tier in varchar2
  ) return number;

end orders;
/

create or replace package body orders as

  function calculate_total(
    p_quantity in number,
    p_unit_price in number
  ) return number is
  begin
    if p_quantity is null or p_unit_price is null then
      raise_application_error(-20001, 'quantity and price are required');
    end if;
    return p_quantity * p_unit_price;
  end calculate_total;

  function apply_discount(
    p_total in number,
    p_customer_tier in varchar2
  ) return number is
  begin
    case upper(p_customer_tier)
      when 'GOLD' then
        return p_total * 0.90;
      when 'SILVER' then
        return p_total * 0.95;
      else
        return p_total;
    end case;
  end apply_discount;

end orders;
/
