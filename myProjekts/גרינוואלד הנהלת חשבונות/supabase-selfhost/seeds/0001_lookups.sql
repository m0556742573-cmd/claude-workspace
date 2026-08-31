-- Seed: reference data for every lookup table.
-- Idempotent — every insert is `on conflict (code|name) do nothing`, safe to re-run.
--
-- Sourcing (important, per the rule adopted 31/08/2026):
--   [מתועד]  = the value list is already documented in docs/entities/<table>.md
--   [מקור]   = taken from the source workbook (גיליון "רשימות")
--   [הצעה]   = NOT grounded in any source material — my proposal, needs Yitzhak's review
--
-- The concrete values do not exist in the source workbook: it declares these
-- fields as "קישור לישות" (links to an entity), so the rows themselves lived in
-- Origami, not in the spec. Where a list is marked [הצעה] it is a starting point.

-- ── entity_types [מתועד] ──
-- turnover_threshold deliberately left NULL: the legal exempt-dealer ceiling
-- changes yearly and is not documented anywhere in our materials. Filling in a
-- wrong legal number is worse than leaving it empty — Yitzhak to supply.
insert into entity_types (code, name) values
  ('exempt_dealer',    'עוסק פטור'),
  ('licensed_dealer',  'עוסק מורשה'),
  ('company',          'חברה בע"מ'),
  ('partnership',      'שותפות'),
  ('nonprofit',        'מלכ"ר / עמותה')
on conflict (code) do nothing;

-- ── client_statuses [מתועד] ──
-- continues_collection = true only for suspended_debt: a client suspended over a
-- debt keeps being collected from; a temporarily frozen one does not.
insert into client_statuses (code, name, continues_collection) values
  ('lead',             'ליד',                      false),
  ('onboarding',       'בהקמה',                    false),
  ('active',           'פעיל',                     false),
  ('suspended_debt',   'מושהה בגין חוב',           true),
  ('frozen_temporary', 'מוקפא זמנית',              false),
  ('retiring',         'בתהליך עזיבה',             false),
  ('departed',         'עזב',                      false)
on conflict (code) do nothing;

-- ── reporting_frequencies [מתועד] ──
insert into reporting_frequencies (name, months_interval) values
  ('חד-חודשי', 1),
  ('דו-חודשי', 2),
  ('שנתי',     12)
on conflict (name) do nothing;

-- ── employee_roles [מקור: גיליון "רשימות", עמודת "קבוצות משתמשים"] ──
-- The workbook lists 11 groups. Two of them are not office employees and are
-- deliberately excluded: "לקוח (פורטל)" and "מערכת / אוטומציה" are auth actor
-- types, and belong to the future auth model, not to this table.
insert into employee_roles (code, name) values
  ('system_admin',       'מפתח / מנהל מערכת'),
  ('owner',              'בעל/ת המשרד'),
  ('team_lead',          'מנהל צוות'),
  ('bookkeeper',         'מנהל/ת חשבונות'),
  ('payroll_accountant', 'חשב/ת שכר'),
  ('tax_advisor',        'יועץ/ת מס'),
  ('intern',             'מתמחה'),
  ('office_manager',     'מנהל/ת משרד'),
  ('external_viewer',    'צופה / רו"ח חיצוני')
on conflict (code) do nothing;

-- ── responsibility_areas [מתועד] ──
-- The four that actually drive routing logic; the list is open by design.
insert into responsibility_areas (code, name) values
  ('material',   'חומר'),
  ('collection', 'גבייה'),
  ('payroll',    'שכר'),
  ('approvals',  'אישורים')
on conflict (code) do nothing;

-- ── client_contact_roles [מתועד: הרשימה שהייתה CHECK עד 31/08/2026] ──
insert into client_contact_roles (code, name) values
  ('signatory',    'חתום'),
  ('primary',      'איש קשר ראשי'),
  ('auditor',      'רו"ח מבקר'),
  ('tax_assessor', 'פקיד שומה'),
  ('bank_rep',     'נציג בנק'),
  ('other',        'אחר')
on conflict (code) do nothing;

-- ── tag_categories [מתועד: חמש הקטגוריות הידועות] ──
insert into tag_categories (code, name) values
  ('character',   'אופי ושיתוף פעולה'),
  ('business_value', 'ערך עסקי'),
  ('complexity',  'מורכבות טיפול'),
  ('risk',        'סיכון'),
  ('operational', 'מאפיין תפעולי')
on conflict (code) do nothing;

-- ── credential_types [מתועד: שתי הטבלאות שאוחדו] ──
insert into credential_types (code, name) values
  ('professional', 'מקצועי (רשויות)'),
  ('financial',    'פיננסי (מערכות כספיות)')
on conflict (code) do nothing;

-- ── absence_types [מתועד + מילואים] ──
-- 'reserve' was the concrete example that the old closed CHECK list could not
-- express, and is the reason this became a lookup.
insert into absence_types (code, name) values
  ('vacation', 'חופשה'),
  ('sick',     'מחלה'),
  ('reserve',  'מילואים'),
  ('other',    'אחר')
on conflict (code) do nothing;

-- ── specializations [הצעה — לאישור יצחק] ──
-- Not grounded in any source document. Derived from the service types the firm
-- provides and from the role list. Replace with the firm's real specializations.
insert into specializations (code, name) values
  ('bookkeeping',       'הנהלת חשבונות'),
  ('payroll',           'חשבות שכר'),
  ('tax_advisory',      'ייעוץ מס'),
  ('audit_support',     'ליווי ביקורת'),
  ('company_formation', 'פתיחת תיקים והקמת חברות')
on conflict (code) do nothing;

-- ── bank_account_purposes [הצעה — לאישור יצחק] ──
-- Not grounded in any source document. The source workbook lists the field's
-- allowed values only as "כל הסוגים ואחר".
insert into bank_account_purposes (code, name) values
  ('collection', 'גבייה'),
  ('refunds',    'החזרים מרשויות'),
  ('general',    'כללי')
on conflict (code) do nothing;
