-- =========================================
-- Migration 001b: Seed People and Properties
-- 120 people (sellers, purchasers, attorneys, escrow agents)
-- 50 properties across 20 NY cities
-- Applied to Supabase 2026-03-21
-- =========================================

with first_names as (
  select array[
    'Ava','Liam','Noah','Emma','Olivia','Sophia','Mason','Lucas','Mia','Ethan',
    'Amelia','Harper','Elijah','James','Charlotte','Benjamin','Isabella','Henry','Evelyn','Alexander',
    'Michael','Daniel','Scarlett','Grace','Jack','Samuel','Chloe','Ella','Wyatt','David',
    'Abigail','Sofia','Matthew','Joseph','Leah','Victoria','Nathan','Logan','Avery','Julian',
    'Nora','Hannah','Isaac','Gabriel','Penelope','Layla','Andrew','Christopher','Zoey','Aria',
    'Anthony','Jonathan','Lillian','Brooklyn','Dylan','Leo','Stella','Hazel','Caleb','Thomas'
  ] as arr
),
last_names as (
  select array[
    'Rivera','Chen','Patel','Williams','Johnson','Kim','Garcia','Martinez','Thompson','Lopez',
    'Miller','Davis','Hernandez','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris',
    'Martin','Clark','Lewis','Walker','Hall','Allen','Young','King','Wright','Scott',
    'Torres','Nguyen','Hill','Flores','Green','Adams','Baker','Nelson','Carter','Mitchell',
    'Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart',
    'Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Cooper'
  ] as arr
),
cities as (
  select *
  from (
    values
      ('Manhattan',        true,  'New York',      '212',     '10001'),
      ('Brooklyn',         true,  'Kings',         '718',     '11201'),
      ('Queens',           true,  'Queens',        '718',     '11354'),
      ('Bronx',            true,  'Bronx',         '718',     '10451'),
      ('Staten Island',    true,  'Richmond',      '718',     '10301'),
      ('Buffalo',          false, 'Erie',          '716',     '14201'),
      ('Rochester',        false, 'Monroe',        '585',     '14601'),
      ('Yonkers',          false, 'Westchester',   '914',     '10701'),
      ('White Plains',     false, 'Westchester',   '914',     '10601'),
      ('Albany',           false, 'Albany',        '518',     '12201'),
      ('Syracuse',         false, 'Onondaga',      '315',     '13201'),
      ('Ithaca',           false, 'Tompkins',      '607',     '14850'),
      ('New Rochelle',     false, 'Westchester',   '914',     '10801'),
      ('Mount Vernon',     false, 'Westchester',   '914',     '10550'),
      ('Poughkeepsie',     false, 'Dutchess',      '845',     '12601'),
      ('Troy',             false, 'Rensselaer',    '518',     '12180'),
      ('Schenectady',      false, 'Schenectady',   '518',     '12301'),
      ('Utica',            false, 'Oneida',        '315',     '13501'),
      ('Binghamton',       false, 'Broome',        '607',     '13901'),
      ('Niagara Falls',    false, 'Niagara',       '716',     '14301')
  ) as t(city, is_nyc, county, area_code, base_postal)
),
numbered_people as (
  select
    gs as n,
    fn.arr[((gs - 1) % array_length(fn.arr, 1)) + 1]              as first_name,
    ln.arr[(((gs - 1) / 2) % array_length(ln.arr, 1)) + 1]        as last_name,
    c.city,
    c.is_nyc,
    c.area_code,
    c.base_postal
  from generate_series(1, 120) gs
  cross join first_names fn
  cross join last_names ln
  cross join lateral (
    select city, is_nyc, area_code, base_postal
    from cities
    order by city
    offset (gs - 1) % 20
    limit 1
  ) c
)
insert into public.people (
  first_name, last_name, email, phone, city, state, postal_code, is_nyc, masked_tax_id
)
select
  first_name,
  last_name,
  lower(first_name || '.' || last_name || n || '@example.com') as email,
  area_code || '-555-' || lpad((1000 + n)::text, 4, '0') as phone,
  city,
  'NY',
  (base_postal::int + (n % 10))::text as postal_code,
  is_nyc,
  'XXX-XX-' || lpad((1000 + n)::text, 4, '0') as masked_tax_id
from numbered_people
on conflict do nothing;

-- 50 properties
with prop_seed as (
  select *
  from (
    values
      (1,  '112 W 87th St',          'Manhattan',      '10024', 'New York',     'single_family',  4,  2.0,  1905),
      (2,  '245 Dean St',            'Brooklyn',       '11217', 'Kings',        'townhouse',      3,  1.5,  1899),
      (3,  '37-18 85th St',          'Queens',         '11372', 'Queens',       'condo',          2,  1.0,  1965),
      (4,  '815 Grand Concourse',    'Bronx',          '10451', 'Bronx',        'co_op',          2,  1.0,  1932),
      (5,  '29 Stuyvesant Pl',       'Staten Island',  '10301', 'Richmond',     'single_family',  4,  2.5,  1952),
      (6,  '74 Bidwell Pkwy',        'Buffalo',        '14222', 'Erie',         'single_family',  3,  1.5,  1920),
      (7,  '21 Oxford St',           'Rochester',      '14607', 'Monroe',       'townhouse',      3,  2.0,  1935),
      (8,  '92 Park Hill Ave',       'Yonkers',        '10705', 'Westchester',  'single_family',  4,  2.0,  1948),
      (9,  '10 Lake St',             'White Plains',   '10603', 'Westchester',  'condo',          2,  1.0,  1978),
      (10, '55 Dove St',             'Albany',         '12210', 'Albany',       'townhouse',      2,  1.5,  1910),
      (11, '143 Euclid Ave',         'Syracuse',       '13210', 'Onondaga',     'single_family',  3,  1.5,  1943),
      (12, '8 Cascadilla Park',      'Ithaca',         '14850', 'Tompkins',     'single_family',  4,  2.5,  1929),
      (13, '17 Webster Ave',         'New Rochelle',   '10801', 'Westchester',  'condo',          2,  1.0,  1972),
      (14, '66 S 11th Ave',          'Mount Vernon',   '10550', 'Westchester',  'single_family',  3,  2.0,  1955),
      (15, '109 Hooker Ave',         'Poughkeepsie',   '12601', 'Dutchess',     'single_family',  4,  2.0,  1938),
      (16, '31 2nd St',              'Troy',           '12180', 'Rensselaer',   'townhouse',      3,  1.5,  1902),
      (17, '402 Union St',           'Schenectady',    '12305', 'Schenectady',  'co_op',          2,  1.0,  1960),
      (18, '77 Genesee St',          'Utica',          '13502', 'Oneida',       'single_family',  3,  1.5,  1928),
      (19, '14 Riverside Dr',        'Binghamton',     '13905', 'Broome',       'multi_family',   6,  3.0,  1915),
      (20, '801 Whirlpool St',       'Niagara Falls',  '14305', 'Niagara',      'townhouse',      3,  1.5,  1940),
      (21, '300 E 74th St',          'Manhattan',      '10021', 'New York',     'condo',          3,  2.0,  1981),
      (22, '1223 Bergen St',         'Brooklyn',       '11213', 'Kings',        'single_family',  4,  2.5,  1908),
      (23, '66-11 Yellowstone Blvd', 'Queens',         '11375', 'Queens',       'co_op',          2,  1.0,  1955),
      (24, '251 City Island Ave',    'Bronx',          '10464', 'Bronx',        'single_family',  3,  2.0,  1962),
      (25, '45 Grymes Hill Rd',      'Staten Island',  '10301', 'Richmond',     'townhouse',      3,  2.0,  1970),
      (26, '19 Norwood Ave',         'Buffalo',        '14222', 'Erie',         'condo',          2,  1.0,  1975),
      (27, '415 Park Ave',           'Rochester',      '14607', 'Monroe',       'single_family',  4,  2.5,  1922),
      (28, '7 Bronxville Glen Dr',   'Yonkers',        '10708', 'Westchester',  'condo',          2,  1.0,  1985),
      (29, '88 Mamaroneck Ave',      'White Plains',   '10601', 'Westchester',  'co_op',          2,  1.0,  1958),
      (30, '24 Madison Ave',         'Albany',         '12202', 'Albany',       'single_family',  3,  1.5,  1915),
      (31, '918 Euclid Ave',         'Syracuse',       '13210', 'Onondaga',     'townhouse',      3,  2.0,  1930),
      (32, '42 Stewart Ave',         'Ithaca',         '14850', 'Tompkins',     'condo',          2,  1.0,  1990),
      (33, '505 Main St',            'New Rochelle',   '10801', 'Westchester',  'townhouse',      3,  1.5,  1945),
      (34, '13 S Fulton Ave',        'Mount Vernon',   '10550', 'Westchester',  'co_op',          2,  1.0,  1963),
      (35, '250 Mill St',            'Poughkeepsie',   '12601', 'Dutchess',     'condo',          2,  1.5,  1988),
      (36, '99 River St',            'Troy',           '12180', 'Rensselaer',   'single_family',  3,  2.0,  1918),
      (37, '18 N Church St',         'Schenectady',    '12305', 'Schenectady',  'single_family',  4,  2.5,  1925),
      (38, '256 Culver Ave',         'Utica',          '13501', 'Oneida',       'townhouse',      3,  1.5,  1935),
      (39, '61 Front St',            'Binghamton',     '13905', 'Broome',       'condo',          2,  1.0,  1980),
      (40, '14 Ferry Ave',           'Niagara Falls',  '14301', 'Niagara',      'multi_family',   8,  4.0,  1912),
      (41, '170 W 10th St',          'Manhattan',      '10014', 'New York',     'co_op',          1,  1.0,  1920),
      (42, '8901 3rd Ave',           'Brooklyn',       '11209', 'Kings',        'condo',          3,  2.0,  1993),
      (43, '150-12 12th Ave',        'Queens',         '11357', 'Queens',       'single_family',  4,  2.5,  1959),
      (44, '1200 Pelham Pkwy S',     'Bronx',          '10461', 'Bronx',        'condo',          2,  1.0,  1968),
      (45, '88 Tysen St',            'Staten Island',  '10301', 'Richmond',     'single_family',  5,  3.0,  1971),
      (46, '212 Richmond Ave',       'Buffalo',        '14222', 'Erie',         'townhouse',      3,  1.5,  1948),
      (47, '511 East Ave',           'Rochester',      '14607', 'Monroe',       'condo',          2,  1.0,  1995),
      (48, '27 Warburton Ave',       'Yonkers',        '10701', 'Westchester',  'townhouse',      3,  2.0,  1937),
      (49, '9 Barker Ave',           'White Plains',   '10601', 'Westchester',  'single_family',  4,  2.5,  1953),
      (50, '71 Lark St',             'Albany',         '12210', 'Albany',       'condo',          2,  1.0,  2001)
  ) as t(n, street_1, city, postal_code, county, property_type_text, bedrooms, bathrooms, year_built)
)
insert into public.properties (
  street_1, city, state, postal_code, county, property_type, bedrooms, bathrooms, year_built,
  legal_description, has_public_road_access, delivered_vacant, as_is_sale
)
select
  street_1, city, 'NY', postal_code, county, property_type_text::property_type,
  bedrooms, bathrooms, year_built,
  'Schedule A legal description for ' || street_1 || ', ' || city || ', New York.',
  true, true, true
from prop_seed
on conflict do nothing;
