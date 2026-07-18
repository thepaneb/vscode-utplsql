create or replace function greet(name varchar2) return varchar2 as
begin
  return 'Hello, ' || name || '!';
end greet;
/
