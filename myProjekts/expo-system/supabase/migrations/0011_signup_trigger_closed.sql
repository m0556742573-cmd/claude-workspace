-- on_signup runs only as the trigger on a new user; nobody calls it through the API (the security check flagged it).
revoke execute on function on_signup() from public, anon, authenticated;
