-- The security check: phone_key gets a fixed search_path like every other function here.
alter function phone_key(text) set search_path = public;
