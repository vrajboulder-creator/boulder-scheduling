-- ═══════════════════════════════════════════════════════════════
-- Phase-chain dependency links
-- Phase order from canonical CSV sequence (hardcoded rank).
-- For any NEW phase added in future: assign the next rank number.
-- Last activity of phase N → First activity of phase N+1 (FS).
-- Safe to re-run: ON CONFLICT DO NOTHING.
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: clear all existing links
DELETE FROM activity_links;

-- STEP 2: insert correct phase-chain links
WITH

-- Canonical phase order — rank is the sort position from the CSV.
-- New phases: just append with the next rank number.
phase_rank(phase_name, rank) AS (
  VALUES
    ('Owner Request for Proposal',                                  1),
    ('Bid Preparation',                                             2),
    ('Bid Submission to Owner',                                     3),
    ('Notice to Proceed',                                           4),
    ('Pre-Construction (2-3 months before Start)',                  5),
    ('Pre-Mobilization Requirements',                               6),
    ('Earthwork - Preconstruction',                                 7),
    ('Job Mobilization',                                            8),
    ('Earthwork - Site Prep',                                       9),
    ('Earthwork - Rough Paving',                                   10),
    ('Earthwork - Building Pad',                                   11),
    ('Concrete - Building Pad Form',                               12),
    ('Plumbing - Underground',                                     13),
    ('Electrical - Underground',                                   14),
    ('Fire Sprinkler -  Fire Riser',                               15),
    ('Concrete - Footings to Pour',                                16),
    ('Onsite Utility Pre-Construction Meeting',                    17),
    ('Utility - Sanitary Sewer',                                   18),
    ('Utility - Irrigation',                                       19),
    ('Utility - Fire Line',                                        20),
    ('Utility - Gas Line',                                         21),
    ('Utility - Sleeves',                                          22),
    ('Utility - Electrical',                                       23),
    ('Earthwork - Final Grading',                                  24),
    ('Concrete - Paving',                                          25),
    ('CMU',                                                        26),
    ('Mockup Wall Started',                                        27),
    ('Structural Steel',                                           28),
    ('Locations Finalized for Framing, MEP Rough',                 29),
    ('Framing - 1st Floor',                                        30),
    ('Framing - 2nd Floor',                                        31),
    ('Framing - 3rd Floor',                                        32),
    ('Framing - 4th Floor',                                        33),
    ('Blocking Locations',                                         34),
    ('Framing - Roof',                                             35),
    ('Roof - TPO',                                                 36),
    ('Insulate Corridor - 1st Floor',                              37),
    ('Insulate Corridor - 2nd Floor',                              38),
    ('Insulate Corridor - 3rd Floor',                              39),
    ('Insulate Corridor - 4th Floor',                              40),
    ('Prerock Corridor and Furdown Areas - 1st Floor',             41),
    ('Prerock Corridor and Fur Down Areas - 2nd Floor',            42),
    ('Prerock Corridor and Fur Down Areas - 3rd Floor',            43),
    ('Prerock Corridor and Fur Down Areas - 4th Floor',            44),
    ('Swimming Pool Rough to Gunite',                              45),
    ('Plumbing 1st Floor Top Out',                                 46),
    ('Plumbing - 2nd Floor Top Out',                               47),
    ('Plumbing - 3rd Floor Top Out',                               48),
    ('Plumbing - 4th Floor Top Out',                               49),
    ('Plumbing  - Roof Top Out',                                   50),
    ('Plumbing - Outdoor Top Out (Roof / Canopy Drains)',          51),
    ('Plumbing - Dumpster Pad / Work Shop',                        52),
    ('Gas Rough In - 1st Floor',                                   53),
    ('Gas - Outdoor Rough In',                                     54),
    ('Gas Line',                                                   55),
    ('Mechanical 1st Floor Rough',                                 56),
    ('Mechanical 2nd Floor Rough In',                              57),
    ('Mechanical 3rd Floor Rough In',                              58),
    ('Mechanical 4th Floor Rough In',                              59),
    ('Mechanical Roof Rough In',                                   60),
    ('Mechanical Outdoor Rough In',                                61),
    ('Fire Sprinkler 1st Floor Rough In',                          62),
    ('Fire Sprinkler 2nd Floor Rough In',                          63),
    ('Fire Sprinkler 3rd Floor Rough In',                          64),
    ('Fire Sprinkler 4th Floor Rough In',                          65),
    ('Fire Sprinkler Roof Concealed Space',                        66),
    ('Fire Sprinkler Dry System',                                  67),
    ('Fire Sprinkler Stand Alone Pool Equipment / Pool Bathroom',  68),
    ('Electrical 1st Floor Rough In',                              69),
    ('Electrical 2nd Floor Rough In',                              70),
    ('Electrical 3rd Floor Rough In',                              71),
    ('Electrical 4th Floor Rough In',                              72),
    ('Electrical Roof Rough In',                                   73),
    ('Electrical Outdoor Rough In',                                74),
    ('Structured Cabling 1st Floor Rough',                         75),
    ('Structured Cabling 2nd Floor Rough',                         76),
    ('Structured Cabling 3rd Floor Rough',                         77),
    ('Structured Cabling 4th Floor Rough',                         78),
    ('Structured Cabling Roof Rough',                              79),
    ('Fire Alarm 1st Floor Rough In',                              80),
    ('Fire Alarm 2nd Floor Rough',                                 81),
    ('Fire Alarm 3rd Floor Rough',                                 82),
    ('Fire Alarm 4th Floor Rough',                                 83),
    ('Fire Alarm Roof Rough',                                      84),
    ('Insulation 1st Floor Walls / Ceilings',                      85),
    ('Insulation - 2nd Floor',                                     86),
    ('Insulation - 3rd Floor',                                     87),
    ('Insulation - 4th Floor',                                     88),
    ('Drywall (Tape/Bed/Sand) - 1st Floor',                        89),
    ('Drywall (Tape/Bed/Sand) - 2nd Floor',                        90),
    ('Drywall (Tape/Bed/Sand) - 3rd Floor',                        91),
    ('Drywall (Tape/Bed/Sand) - 4th Floor',                        92),
    ('Swimming Pool - Finish Out',                                 93),
    ('Sports Court Install',                                       94),
    ('Wallpaper Corridor - 1st Floor',                             95),
    ('Tile - Flooring 1st Floor',                                  96),
    ('Tile - Flooring 2nd Floor',                                  97),
    ('Tile - Flooring 3rd Floor',                                  98),
    ('Tile - Flooring 4th Floor',                                  99),
    ('Millwork Install',                                          100),
    ('Fire Sprinkler  - Trim Out 1st Floor',                      101),
    ('Fire Sprinkler - Trim Out 2nd Floor',                       102),
    ('Fire Sprinkler - Trim Out 3rd Floor',                       103),
    ('Fire Sprinkler - Trim Out 4th Floor',                       104),
    ('Fire Alarm - Trim Out 1st Floor',                           105),
    ('Fire Alarm - Trim Out 2nd Floor',                           106),
    ('Fire Alarm - Trim Out 3rd Floor',                           107),
    ('Fire Alarm - Trim Out 4th Floor',                           108),
    ('Vanity / Kitchen Cabinets Install - 4th Floor',             109),
    ('Vanity / Kitchen Cabinets Install - 3rd Floor',             110),
    ('Vanity / Kitchen Cabinets Install - 2nd Floor',             111),
    ('Vanity / Kitchen Cabinets Install - 1st Floor',             112),
    ('Vanity / Kitchen / Window Sill Granite - 4th Floor',        113),
    ('Vanity / Kitchen / Window Sill Granite - 3rd Floor',        114),
    ('Vanity / Kitchen / Window Sill Granite - 2nd Floor',        115),
    ('Vanity / Kitchen / Window Sill Granite - 1st Floor',        116),
    ('Mechanical Trim Out 1st Floor',                             117),
    ('Mechanical Trim Out 2nd Floor',                             118),
    ('Mechanical - Trim Out 3rd Floor',                           119),
    ('Mechanical - Trim Out 4th Floor',                           120),
    ('FFE Hang Install - 4th Floor',                              121),
    ('Plumbing Trim Out - 1st Floor',                             122),
    ('Plumbing Trim Out - 2nd Floor',                             123),
    ('Plumbing Trim Out - 3rd Floor',                             124),
    ('Plumbing Trim Out - 4th Floor',                             125),
    ('Gas Line Trim Out',                                         126),
    ('Electrical - Signage Install',                              127),
    ('Swimming Pool',                                             128),
    ('FFE Install - 4th Floor',                                   129),
    ('FFE Install - 3rd Floor',                                   130),
    ('FFE Install - 2nd Floor',                                   131),
    ('FFE Install - 1st Floor',                                   132)
),

-- Last activity in each phase (highest sort_order)
last_per_phase AS (
  SELECT DISTINCT ON (pr.rank)
    pr.rank,
    a.id AS activity_id
  FROM activities a
  JOIN phase_rank pr
    ON TRIM(REPLACE(a.phase, ' [TPSJ]', '')) = pr.phase_name
  WHERE a.parent_id IS NULL
  ORDER BY pr.rank, a.sort_order DESC, a.id DESC
),

-- First activity in each phase (lowest sort_order)
first_per_phase AS (
  SELECT DISTINCT ON (pr.rank)
    pr.rank,
    a.id AS activity_id
  FROM activities a
  JOIN phase_rank pr
    ON TRIM(REPLACE(a.phase, ' [TPSJ]', '')) = pr.phase_name
  WHERE a.parent_id IS NULL
  ORDER BY pr.rank, a.sort_order ASC, a.id ASC
),

-- Pair: last of phase N → first of phase N+1
phase_links AS (
  SELECT
    l.activity_id AS predecessor_id,
    f.activity_id AS successor_id
  FROM last_per_phase l
  JOIN first_per_phase f ON f.rank = l.rank + 1
  WHERE l.activity_id IS NOT NULL
    AND f.activity_id IS NOT NULL
    AND l.activity_id <> f.activity_id
)

INSERT INTO activity_links (predecessor_id, successor_id, link_type, lag_days)
SELECT predecessor_id, successor_id, 'FS', 0
FROM phase_links
ON CONFLICT (predecessor_id, successor_id) DO NOTHING;
