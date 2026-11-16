-- Sample fleet for the Jazzar owner.
-- Creates nothing until Authentication has a user with this email.
-- Re-running fails if that owner already has cars. Delete those rows first to load the sample again.
-- June 2026 Toyota Corolla is the worked example:
--   5 rented days, $150 rental revenue, $100 cash collected, $40 expenses, $110 profit, $50 balance.

do $$
declare
  owner_email text := 'owner@jazzar.app';
  uid uuid;
begin
  select id into uid from auth.users where email = owner_email;
  if uid is null then
    raise exception 'No auth user with email %. Create that user in Authentication with Auto Confirm on, then run this seed again. Change owner_email in supabase/seed.sql if you use a different address.', owner_email;
  end if;

  if exists (select 1 from public.cars where owner_id = uid) then
    raise exception 'Seed skipped: % already has cars. Delete that owner''s cars, rentals, payments, and expenses first if you want to reload the sample fleet.', owner_email;
  end if;

  insert into public.cars (id, owner_id, name, make, model, year, license_plate, default_daily_rate) values
    ('11111111-1111-4111-8111-111111111111', uid, 'Toyota Corolla', 'Toyota', 'Corolla', 2019, 'JAZ-1001', 30.00),
    ('22222222-2222-4222-8222-222222222222', uid, 'Honda Civic', 'Honda', 'Civic', 2020, 'JAZ-1002', 40.00),
    ('33333333-3333-4333-8333-333333333333', uid, 'Hyundai Elantra', 'Hyundai', 'Elantra', 2018, 'JAZ-1003', 28.00),
    ('44444444-4444-4444-8444-444444444444', uid, 'Nissan Sentra', 'Nissan', 'Sentra', 2017, 'JAZ-1004', 27.00),
    ('55555555-5555-4555-8555-555555555555', uid, 'Kia Forte', 'Kia', 'Forte', 2021, 'JAZ-1005', 25.00),
    ('66666666-6666-4666-8666-666666666666', uid, 'Toyota Camry', 'Toyota', 'Camry', 2022, 'JAZ-1006', 45.00),
    ('77777777-7777-4777-8777-777777777777', uid, 'Mazda 3', 'Mazda', '3', 2019, 'JAZ-1007', 35.00),
    ('88888888-8888-4888-8888-888888888888', uid, 'Ford Focus', 'Ford', 'Focus', 2016, 'JAZ-1008', 32.00);

  insert into public.rentals (id, owner_id, car_id, pickup_date, return_date, daily_rate, customer_name, customer_phone, notes) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', uid, '11111111-1111-4111-8111-111111111111', '2026-06-01', '2026-06-06', 30.00, 'Nour Haddad', '555-0101', 'Worked example'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', uid, '11111111-1111-4111-8111-111111111111', '2026-07-10', '2026-07-13', 30.00, 'Family trip', null, null),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', uid, '22222222-2222-4222-8222-222222222222', '2026-05-30', '2026-06-03', 40.00, 'Sami Khoury', '555-0102', 'Crosses May and June. Paid in July.'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', uid, '55555555-5555-4555-8555-555555555555', '2026-06-15', '2026-06-15', 25.00, 'Walk-in', null, 'Same-day rental'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', uid, '66666666-6666-4666-8666-666666666666', '2026-08-01', '2026-08-05', 45.00, 'Rana Mansour', '555-0106', null),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', uid, '77777777-7777-4777-8777-777777777777', '2026-06-01', '2026-06-04', 35.00, 'Omar Saleh', null, 'Same dates as the Corolla, different car'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', uid, '88888888-8888-4888-8888-888888888888', '2026-03-10', '2026-03-12', 32.00, 'Lina Farah', null, null);

  insert into public.payments (id, owner_id, rental_id, amount, payment_date) values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 100.00, '2026-06-02'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 90.00, '2026-07-10'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 160.00, '2026-07-15'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 25.00, '2026-06-15'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 100.00, '2026-08-01'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 30.00, '2026-08-20'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 105.00, '2026-06-02'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8', uid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 64.00, '2026-03-10');

  insert into public.expenses (id, owner_id, car_id, expense_date, category, amount, description) values
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', uid, '11111111-1111-4111-8111-111111111111', '2026-06-08', 'oil_change', 40.00, 'Oil change'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', uid, '33333333-3333-4333-8333-333333333333', '2026-06-12', 'cleaning', 20.00, 'Interior detail'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', uid, '33333333-3333-4333-8333-333333333333', '2026-06-01', 'insurance', 90.00, 'June premium'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', uid, '44444444-4444-4444-8444-444444444444', '2026-04-01', 'insurance', 200.00, 'April premium'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc5', uid, '88888888-8888-4888-8888-888888888888', '2026-03-20', 'tires', 80.00, 'Two tires');
end $$;
