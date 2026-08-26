create or replace package tst_annotations as

  -- %suite(Annotations demo)
  -- %beforeall

  -- %test(Say hello returns greeting)
  -- %displayname(Hello customizado)
  -- %tags(fast, smoke)
  procedure say_hello_returns_greeting;

  -- %test(Say hello with name includes name)
  -- %throws(-20001)
  procedure say_hello_with_name;

  -- %test(Disabled test does not appear)
  -- %disabled
  procedure disabled_test_does_not_appear;

end tst_annotations;
/

create or replace package body tst_annotations as

  procedure say_hello_returns_greeting is
    v_result varchar2(100);
  begin
    v_result := 'Hello World';
    ut.expect(v_result).to_equal('Hello World');
  end;

  procedure say_hello_with_name is
    v_result varchar2(100);
  begin
    v_result := 'Hello World';
    ut.expect(v_result).to_equal('Hello World');
  end;

  procedure disabled_test_does_not_appear is
  begin
    null;
  end;

end tst_annotations;
/
