
-- Insert mock locations
INSERT INTO public.locations 
  (name, country, latitude, longitude, rock_drop_ft, total_height_ft, cliff_aspect, anchor_info, access_info, notes, opened_by_name, opened_date, is_hidden)
VALUES
  (
    'Kjerag',
    'Norway',
    59.03611111,
    6.59388889,
    3228,
    3599,
    'Southwest',
    'Fixed bolts at the exit point',
    'Accessible via hiking trail from Øygardstøl parking area. Approximately 2.5 hour hike to the exit point.',
    'One of the most popular BASE jumping locations in the world. Best season is June through September. Strong updrafts common in afternoon.',
    'Carl Boenish',
    '1984',
    false
  ),
  (
    'Perrine Bridge',
    'United States',
    42.59861111,
    -114.46138889,
    486,
    486,
    'North',
    'No anchor needed - bridge exit',
    'Located in Twin Falls, Idaho. Legal year-round without permit. Easy access from parking area.',
    'One of the few places in the USA where BASE jumping is legal year-round. Popular training location. Watch for wind conditions.',
    'Unknown',
    '1976',
    false
  ),
  (
    'Monte Brento',
    'Italy',
    45.87416667,
    10.94361111,
    2805,
    3280,
    'Northwest',
    'Multiple fixed anchors available',
    'Park at Canale di Tenno. Hike approximately 45 minutes to the exit. Trail is well-marked.',
    'Famous European BASE jumping destination. Consistently good conditions. Large landing area. Popular with wingsuit pilots.',
    'Unknown',
    '1992',
    false
  ),
  (
    'Lauterbrunnen Valley',
    'Switzerland',
    46.59277778,
    7.90833333,
    2625,
    2953,
    'East',
    'Natural rock anchor points, bring your own gear',
    'Multiple exits in the valley. Most require helicopter access. Check local regulations and obtain permits.',
    'Stunning alpine valley with multiple BASE exits. High Nose and Nose are popular exits. Weather changes rapidly.',
    'Bruno Gouvy',
    '1991',
    false
  ),
  (
    'Tianmen Mountain',
    'China',
    29.05000000,
    110.47805556,
    4265,
    4987,
    'West',
    'Fixed anchors at designated exit points',
    'Access via cable car to the summit. Requires special permit and organized event participation.',
    'Spectacular location known for wingsuit flying through the Heaven''s Gate arch. Permits typically only available during organized events.',
    'Jeb Corliss',
    '2011',
    false
  );
