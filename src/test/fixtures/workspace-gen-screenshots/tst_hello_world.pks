create or replace package tst_hello_world as

  -- %suite(Hello World)
  -- %suitepath(utplsql.examples)

  -- %test(Say hello returns greeting)
  procedure say_hello_returns_greeting;

  -- %test(Say hello with name includes name)
  procedure say_hello_with_name;

  -- %test(Add two numbers correctly)
  procedure add_two_numbers;

end tst_hello_world;
/

create or replace package body tst_hello_world as

  procedure say_hello_returns_greeting is
    v_result varchar2(100);
  begin
    -- Act
    v_result := 'Hello World';
    -- Assert
    ut.expect(v_result).to_equal('Hello World');
  end;

  procedure say_hello_with_name is
    v_result varchar2(100);
  begin
    v_result := 'Hello, Alice';
    ut.expect(v_result).to_be_like('%Alice%');
  end;

  procedure add_two_numbers is
    v_result number;
  begin
    v_result := 2 + 3;
    ut.expect(v_result).to_equal(5);
  end;

end tst_hello_world;
/
