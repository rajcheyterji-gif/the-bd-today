-- THE BD TODAY — 0004: fix two mismatched article photos
--
-- A visual check of the live homepage (2026-11-18) found all 12
-- published stories render real photos, but two clearly mismatch
-- their headlines:
--
-- * Education (notun-shikkhakrom-mulyayan-poddoti) showed children
--   playing in football shirts — wrong for a story about the new
--   curriculum, assessment reform and teacher training. Replaced
--   with a real classroom scene: a teacher presenting to students
--   at desks (Asian University for Women, Bangladesh).
-- * Climate summit (jalbayu-sommelon-bangladesh-dabi) showed a flood
--   scene — climate impact, but wrong for a story about the summit
--   itself and Bangladesh's demands there. Replaced with the COP26
--   venue: delegates walking past the UK Presidency and Indonesia
--   pavilions under "Leading Climate Action Together" signage.
--
-- Both replacements are Wikimedia Commons photos (freely licensed,
-- hotlink-friendly thumb URLs at 1280px, each verified HTTP 200 +
-- image/jpeg and visually inspected). The other 10 published photos
-- were reviewed against their headlines and already match, so they
-- are left untouched.

-- 1. New curriculum / assessment / teacher training (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/AUW_Classroom.jpg/1280px-AUW_Classroom.jpg',
    image_caption = 'শ্রেণিকক্ষে শিক্ষকের পাঠদান',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'notun-shikkhakrom-mulyayan-poddoti';

-- 2. Climate summit / Bangladesh demand (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/COP26_Behind_the_Scenes_%28cop26_0112%29_%2851645727682%29.jpg/1280px-COP26_Behind_the_Scenes_%28cop26_0112%29_%2851645727682%29.jpg',
    image_caption = 'জলবায়ু সম্মেলনে প্রতিনিধিরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'jalbayu-sommelon-bangladesh-dabi';
