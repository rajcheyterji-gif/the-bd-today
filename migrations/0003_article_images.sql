-- THE BD TODAY — 0003: real photos for seeded articles
--
-- The 12 published seed articles (0002) shipped with featured_image_url
-- NULL, so every image slot on the homepage rendered the grey
-- "THE BD TODAY" placeholder box. This migration gives each article a
-- real, topic-matched photo (Wikimedia Commons, freely licensed,
-- hotlink-friendly thumb URLs at 1280px wide, all verified HTTP 200 +
-- image/jpeg). Captions are in Bengali; credit is the photo source.
--
-- The two not-yet-published articles (13 scheduled, 14 draft) get photos
-- too, so they render correctly the moment they are published.
--
-- NOTE on the Highlights carousel / special-coverage band: there is no
-- featured/highlight flag column in the schema, and those sections are
-- NOT flag-driven — HomePage fills them from deduped article pools
-- (trending/latest) after the lead block and image row have taken their
-- share. With only 12 published articles the pools are exhausted before
-- the carousel (needs 3) and the band (needs 3) get anything, so no
-- data-only migration can make them appear. They will start appearing
-- once ~17+ articles are published (carousel) / ~23+ (both), or if the
-- homepage is changed to reuse articles in those sections.

-- 1. Padma Bridge / economy (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/Padma_Bridge_Day_Before_Inauguration_ceremony.jpg/1280px-Padma_Bridge_Day_Before_Inauguration_ceremony.jpg',
    image_caption = 'পদ্মা সেতু, পদ্মা নদীর ওপর',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'padma-setu-dokkhinanchol-orthoniti';

-- 2. National election / voter list (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Women%27s_line_to_vote_in_the_general_election_of_2026_in_Bangladesh_at_Chhagalnaiya%2C_Feni_2026-02-12_in_the_morning.jpg/1280px-Women%27s_line_to_vote_in_the_general_election_of_2026_in_Bangladesh_at_Chhagalnaiya%2C_Feni_2026-02-12_in_the_morning.jpg',
    image_caption = 'ফেনীর ছাগলনাইয়ায় ভোটের লাইনে নারী ভোটাররা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'jatiya-nirbachon-prostuti';

-- 3. Bangladesh T20 cricket series win (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Spectators_of_Bangladesh_vs_Pakistan_cricket_match%2C_22_Jul_2025.jpg/1280px-Spectators_of_Bangladesh_vs_Pakistan_cricket_match%2C_22_Jul_2025.jpg',
    image_caption = 'মিরপুরে বাংলাদেশ-পাকিস্তান ম্যাচে দর্শকরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'bangladesh-cricket-t20-series-joy';

-- 4. Remittance record (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Dhaka_Hazrat_Shahjalal_International_Airport_Migrant_Lounge_Inauguration_2024-11-11_%28PID-0005332%29.jpg/1280px-Dhaka_Hazrat_Shahjalal_International_Airport_Migrant_Lounge_Inauguration_2024-11-11_%28PID-0005332%29.jpg',
    image_caption = 'ঢাকা বিমানবন্দরে প্রবাসী লাউঞ্জের উদ্বোধন',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'remittance-record-probashi-ay';

-- 5. Dhaka metro rail new line (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Metro_Rail_Station_at_Uttara_Center_in_Dhaka%2C_Bangladesh.jpg/1280px-Metro_Rail_Station_at_Uttara_Center_in_Dhaka%2C_Bangladesh.jpg',
    image_caption = 'উত্তরা সেন্টার মেট্রোরেল স্টেশন, ঢাকা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'dhaka-metro-rail-notun-line';

-- 6. Climate summit / Bangladesh demand (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Sariakandi_Char_Land_Flood_Affected_Bangladesh.jpg/1280px-Sariakandi_Char_Land_Flood_Affected_Bangladesh.jpg',
    image_caption = 'বন্যায় প্লাবিত সারিয়াকান্দির চরাঞ্চল',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'jalbayu-sommelon-bangladesh-dabi';

-- 7. New curriculum / assessment (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Kids_playing_at_school%2C_Dhaka%2C_Bangladesh_5.JPG/1280px-Kids_playing_at_school%2C_Dhaka%2C_Bangladesh_5.JPG',
    image_caption = 'ঢাকার একটি স্কুলে শিক্ষার্থীরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'notun-shikkhakrom-mulyayan-poddoti';

-- 8. Local startups / investment (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/CubeSpace.jpg/1280px-CubeSpace.jpg',
    image_caption = 'কো-ওয়ার্কিং অফিসে কাজের পরিবেশ',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'deshio-startup-biniyog-joar';

-- 9. World Cup football final (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Fans_at_The_2014_FIFA_World_Cup_Final_-_140713-8626-jikatu_%2814662725741%29.jpg/1280px-Fans_at_The_2014_FIFA_World_Cup_Final_-_140713-8626-jikatu_%2814662725741%29.jpg',
    image_caption = '২০১৪ বিশ্বকাপ ফাইনালে স্টেডিয়ামে ভক্তরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'bishwokap-football-final-uttejana';

-- 10. Dengue awareness (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Children_under_mosquito_net_%2826483462482%29.jpg/1280px-Children_under_mosquito_net_%2826483462482%29.jpg',
    image_caption = 'মশারির নিচে শিশুরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'dengue-mokabila-sochetonota';

-- 11. Dhaka film festival (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Cambridge_Film_Festival_Audience_2023.jpg/1280px-Cambridge_Film_Festival_Audience_2023.jpg',
    image_caption = 'চলচ্চিত্র উৎসবে দর্শকরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'dhaka-cholochchitro-utsab';

-- 12. Aman paddy bumper harvest (published)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Rice_harvesting_by_farmers_in_a_wetland_field%2C_Bangladesh_2026_09.jpg/1280px-Rice_harvesting_by_farmers_in_a_wetland_field%2C_Bangladesh_2026_09.jpg',
    image_caption = 'বাংলাদেশের জলাভূমিতে ধান কাটছেন কৃষকরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'amon-dhan-bumper-folon';

-- 13. Dhaka–Chattogram highway four lanes (scheduled — photo ready for publish)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/N704_and_N713_Bangladesh_National_Highway.jpg/1280px-N704_and_N713_Bangladesh_National_Highway.jpg',
    image_caption = 'বাংলাদেশের জাতীয় মহাসড়ক',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'dhaka-chattogram-mahasarak-char-len';

-- 14. Digital attendance in schools (draft — photo ready for publish)
UPDATE articles
SET featured_image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Tabletunterricht_07.jpg/1280px-Tabletunterricht_07.jpg',
    image_caption = 'ট্যাবলেটে পড়াশোনা করছে শিক্ষার্থীরা',
    image_credit = 'উইকিমিডিয়া কমন্স'
WHERE slug = 'shikkha-protisthane-digital-hajira';
