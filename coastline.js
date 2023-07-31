// link to working code: https://code.earthengine.google.com/4bdbfe858cd185c5684cf39572d5255b

//region of interest
var roi = ee.Geometry.BBox(-70.041, 12.516, -70.029, 12.505);

//time period of interest
var start = '2023-03-01';
var end = '2023-03-31';
var threshold = 0;

//function to add band to sentinel image
var addNDWI = function(image) {
 var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
 return image.addBands(ndwi);
};

//imagery loading and processing
var sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED'); //sentinel image collection
sentinel = sentinel.filterBounds(roi); //spatial filtration
sentinel = sentinel.filterDate(start, end); //temporal filtration
sentinel = sentinel.map(addNDWI); //mapping of function to add NDWI band across collection
sentinel = sentinel.reduce(ee.Reducer.median()); //get per pixel median
var sentinelS2 = sentinel;
sentinel = sentinel.select('NDWI_median').rename('NDWI'); //rename median bands
sentinel = sentinel.clip(roi); //clip mosaic to region of interest

//create mask layer with 1 for water pixels with NDWI above threshold, 0 otherwise
var waterMask = sentinel.select('NDWI').gt(threshold);

//create vector layer to delineate mask boundary contour
var coastline = waterMask.reduceToVectors({
  reducer: null,
  geometry: roi,
  scale: 10,
  geometryInNativeProjection: true
  });

var lc = coastline.filter('label == 0').union(1);
Map.addLayer(lc, {color: 'green'}, 'Island')

var coastArea = lc.first().geometry().area().divide(10000);
print('hectares of coast in roi:')
print(coastArea);

// Export the vectorized coast as a shapefile.
Export.table.toDrive({
  collection: lc,
  description: 'coastline_shp'+start+'_'+end+'_js',
  folder: 'SSSjs',
  fileFormat: 'SHP'
});

// Export the water mask
Export.image.toDrive({
  image: waterMask,
  description: 'coastline_mask'+start+'_'+end+'_js',
  folder: 'SSSjs',
  region: roi,
  scale: 10,
  crs: 'EPSG:4326'
});

// Export the processed sentinel imagery
Export.image.toDrive({
  image: sentinelS2.toFloat(),
  description: 'coast_sentinelSR'+start+'_'+end+'_js',
  folder: 'SSSjs',
  region: roi,
  scale: 10,
  crs: 'EPSG:4326'
});

// Imports:

var surfside1 = 
    /* color: #ffc82d */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-70.03009388560505, 12.505891968182164],
          [-70.02976129168721, 12.505965288138416],
          [-70.02968618983479, 12.50650995001924],
          [-70.02821608747708, 12.508213241066992],
          [-70.02735778059231, 12.508747424042546],
          [-70.02887054647671, 12.51007763959181],
          [-70.03051205839382, 12.511774440032237],
          [-70.03293904042637, 12.514309523328278],
          [-70.03395559575267, 12.51515362648741],
          [-70.03492924244495, 12.516050095514018],
          [-70.03498288662524, 12.515992489228635],
          [-70.03499897987933, 12.515741116196542],
          [-70.03511699707599, 12.5154635581892],
          [-70.03553005726428, 12.51502365432091],
          [-70.03748806984515, 12.513463036931329],
          [-70.03657611878009, 12.510970219114956],
          [-70.03084692032428, 12.505722654224897]]]);
