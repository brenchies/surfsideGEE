// link to working code: https://code.earthengine.google.com/2f6441da7bdaa5cc3153575876b531ab

var roi = surfside2; //region of interest

//time period of interest
var start = '2022-01-01';
var end = '2022-12-31';

// LI ET AL image preprocessing
//building the clean mosiac image based on different filters
var cloudBitMask = ee.Number(2).pow(10).int();
var cirrusBitMask = ee.Number(2).pow(11).int();

//this function is used to build clean water mosaic in the Google Earth Engine
//the threshold value could be revised, the current value is suggested for a common clean coral reefs waters
function mask(img){
  var qa = img.select('QA60');
  var ma = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));
   
  ma = ma.and(img.select(['SCL']).neq(3));
  ma = ma.and(img.select(['SCL']).neq(4));
  ma = ma.and(img.select(['SCL']).neq(5));
  ma = ma.and(img.select(['SCL']).neq(8));
  ma = ma.and(img.select(['SCL']).neq(9));
  ma = ma.and(img.select(['SCL']).neq(10));
  ma = ma.and(img.select(['B3']).gt(100));
  ma = ma.focal_min({kernel: ee.Kernel.circle({radius: 1}), iterations: 1});
  img = img.mask(ma);
 
  //adjust for mask bad data
    img = img.updateMask(img.select([4]).lt(1000));
    img = img.updateMask(img.select([7]).lt(300))
  
  var ndwi_revise = (img.select([2]).subtract(img.select([7]))).divide(img.select([2]).add(img.select([7])));
         img = img.updateMask(ndwi_revise.gt(0));
  //end of adjust
  
  return img;
}
//bad water region maskout end

var sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(roi);

//Set up the date range and filter, this example uses two years window to build the clean water mosaic
sentinel = sentinel.filterDate(start,end);

//run the mask function
sentinel = sentinel.map(mask);
//get the median value of it
var median = sentinel.reduce(ee.Reducer.median());

var visualization = {
  min: 0.0,
  max: 2000.0,
  bands: ["B4_median", "B3_median", "B2_median"],
};

Map.addLayer(median.clip(roi), visualization, 'RGB');

var image = median;
var bands = ['B2_median', 'B3_median', 'B4_median', 'B8_median', 'B11_median', 'B12_median'];
var points = seagrass.merge(sand).merge(rubble).merge(coral).merge(ocean);
var label = 'landcover';

var training = image.select(bands).sampleRegions({
  collection: points,
  properties: [label],
  scale: 10
});

// Train a CART classifier with default parameters.
var trained = ee.Classifier.smileCart().train(training, label, bands);

//Added code Tatiana for getting information about the trained classifier
print('Results of trained classifier', trained.explain());

///Get a confusion matrix and overall accuracy for the training sample.
var trainAccuracy = trained.confusionMatrix();
print('Training error matrix', trainAccuracy);
print('Training overall accuracy', trainAccuracy.accuracy());
// End added code Tatiana

// Classify the image with the same bands used for training.
image = image.clip(roi);
var classified = image.select(bands).classify(trained);

Map.addLayer(image,
             {bands: ['B4_median', 'B3_median', 'B2_median'], min: 0, max: 2000.0},
             'image');
Map.addLayer(classified,
             {min: 1, max: 5, palette: ['green', 'white', 'yellow', 'purple', 'blue']},
             'classification');
             
Map.centerObject(roi,15);


// Export the surfside region of interest as a shapefile.
Export.table.toDrive({
  collection: ee.FeatureCollection(surfside2),
  description: 'seafloor_roi_shp'+start+'_'+end+'_js',
  folder: 'SSSjs',
  fileFormat: 'SHP'
});

// Export the seafloor cover classification map
Export.image.toDrive({
  image: classified,
  description: 'seafloor_cover'+start+'_'+end+'_js',
  folder: 'SSSjs',
  region: roi,
  scale: 10,
  crs: 'EPSG:4326'
});

// Export the processed sentinel imagery
Export.image.toDrive({
  image: image.toFloat(),
  description: 'seafloor_sentinelSR'+start+'_'+end+'_js',
  folder: 'SSSjs',
  region: roi,
  scale: 10,
  crs: 'EPSG:4326'
});

// Imports:

var surfside2 = 
    /* color: #ffc82d */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-70.02874205226155, 12.505525368088623],
          [-70.02976129168721, 12.505965288138416],
          [-70.02968618983479, 12.50650995001924],
          [-70.02821608747708, 12.508213241066992],
          [-70.02735778059231, 12.508747424042546],
          [-70.02887054647671, 12.51007763959181],
          [-70.03051205839382, 12.511774440032237],
          [-70.03293904042637, 12.514309523328278],
          [-70.03395559575267, 12.51515362648741],
          [-70.03492924244495, 12.516050095514018],
          [-70.03511163265793, 12.516217677362057],
          [-70.03519746334644, 12.516102464853198],
          [-70.03514918358417, 12.515861565804983],
          [-70.03519746334644, 12.51570969455031],
          [-70.03551665120328, 12.515560441655792],
          [-70.03637361849604, 12.51515065010719],
          [-70.03796013863177, 12.516437628372412],
          [-70.04140945209689, 12.51881516850092],
          [-70.04260572464557, 12.519726397313104],
          [-70.04390381545876, 12.518589988644383],
          [-70.0473530227459, 12.515738492441542],
          [-70.04403507606013, 12.513453946700613],
          [-70.04168951856374, 12.511515613623317],
          [-70.04077426978738, 12.50853539477927],
          [-70.03847131937201, 12.505495084787999],
          [-70.03186962415182, 12.499491837123847],
          [-70.03043559850234, 12.501077977168984],
          [-70.02984732369634, 12.501504445681997],
          [-70.02849102929206, 12.50225187829307],
          [-70.02790943778218, 12.503275011480387],
          [-70.02867006891573, 12.50363993973414],
          [-70.02877625496478, 12.504130557570287],
          [-70.02904882994079, 12.504204740034828]]]),
    seagrass = 
    /* color: #00ffff */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-70.03131901583443, 12.507111010538615]),
            {
              "landcover": 1,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03129755816231, 12.507927999305263]),
            {
              "landcover": 1,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03047143778572, 12.50773946366541]),
            {
              "landcover": 1,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03058945498238, 12.508954468707781]),
            {
              "landcover": 1,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03124391398201, 12.508943994550801]),
            {
              "landcover": 1,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03130828699837, 12.510106623381413]),
            {
              "landcover": 1,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03157650789986, 12.509792399889312]),
            {
              "landcover": 1,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03173744044075, 12.511133084124298]),
            {
              "landcover": 1,
              "system:index": "7"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03277813753853, 12.511195928527014]),
            {
              "landcover": 1,
              "system:index": "8"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03270303568611, 12.51243186533867]),
            {
              "landcover": 1,
              "system:index": "9"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03317510447273, 12.51330120717872]),
            {
              "landcover": 1,
              "system:index": "10"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03407632670174, 12.513646848301795]),
            {
              "landcover": 1,
              "system:index": "11"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03366863093147, 12.511887215947404]),
            {
              "landcover": 1,
              "system:index": "12"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03452693781624, 12.512787981627111]),
            {
              "landcover": 1,
              "system:index": "13"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03484880289803, 12.512494709425265]),
            {
              "landcover": 1,
              "system:index": "14"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03592168650398, 12.513604952432734]),
            {
              "landcover": 1,
              "system:index": "15"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03551399073372, 12.514243863697086]),
            {
              "landcover": 1,
              "system:index": "16"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03446256479988, 12.514589503558001]),
            {
              "landcover": 1,
              "system:index": "17"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03314291796455, 12.505634139671857]),
            {
              "landcover": 1,
              "system:index": "18"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03227388224373, 12.510572905008726]),
            {
              "landcover": 1,
              "system:index": "19"
            })]),
    ocean = 
    /* color: #bf04c2 */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-70.03774558863411, 12.505733829576121]),
            {
              "landcover": 5,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03937804257468, 12.507662918746528]),
            {
              "landcover": 5,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04032218014792, 12.509066458957788]),
            {
              "landcover": 5,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03512942349509, 12.509569217774931]),
            {
              "landcover": 5,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04309770931037, 12.517584966664685]),
            {
              "landcover": 5,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04193899501594, 12.518003918589026]),
            {
              "landcover": 5,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03957865108283, 12.51620242048895]),
            {
              "landcover": 5,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04120943416389, 12.516453793071774]),
            {
              "landcover": 5,
              "system:index": "7"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03919241298469, 12.514484701287529]),
            {
              "landcover": 5,
              "system:index": "8"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03781912196906, 12.514065743650761]),
            {
              "landcover": 5,
              "system:index": "9"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03721830714973, 12.51247369843007]),
            {
              "landcover": 5,
              "system:index": "10"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03816244472297, 12.512599386567588]),
            {
              "landcover": 5,
              "system:index": "11"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0373041378382, 12.510462679908375]),
            {
              "landcover": 5,
              "system:index": "12"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0366174923304, 12.509792336920626]),
            {
              "landcover": 5,
              "system:index": "13"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03683206905158, 12.508116471838395]),
            {
              "landcover": 5,
              "system:index": "14"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03803369869026, 12.509205785378882]),
            {
              "landcover": 5,
              "system:index": "15"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04661676753791, 12.515825361155676]),
            {
              "landcover": 5,
              "system:index": "16"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04223940242561, 12.512348010231356]),
            {
              "landcover": 5,
              "system:index": "17"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0358450161341, 12.503801069202208]),
            {
              "landcover": 5,
              "system:index": "18"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03279802669319, 12.500993923938076]),
            {
              "landcover": 5,
              "system:index": "19"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0460099419306, 12.507569818206449]),
            {
              "landcover": 5,
              "system:index": "20"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04502288901313, 12.510586373909405]),
            {
              "landcover": 5,
              "system:index": "21"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04176132285102, 12.504092356110558]),
            {
              "landcover": 5,
              "system:index": "22"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04806987845404, 12.504092356110558]),
            {
              "landcover": 5,
              "system:index": "23"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.05437843405707, 12.50581014444243]),
            {
              "landcover": 5,
              "system:index": "24"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04343502127631, 12.50262594240032]),
            {
              "landcover": 5,
              "system:index": "25"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04377834403022, 12.498519939740076]),
            {
              "landcover": 5,
              "system:index": "26"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.05214683615668, 12.501033826663539]),
            {
              "landcover": 5,
              "system:index": "27"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04124633872016, 12.5025421470798]),
            {
              "landcover": 5,
              "system:index": "28"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04828445517524, 12.502709737693678]),
            {
              "landcover": 5,
              "system:index": "29"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.05146019064887, 12.512052742425603]),
            {
              "landcover": 5,
              "system:index": "30"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0549792488764, 12.502919225808174]),
            {
              "landcover": 5,
              "system:index": "31"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04734031760199, 12.510753959304155]),
            {
              "landcover": 5,
              "system:index": "32"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.05064479910834, 12.50660618882055]),
            {
              "landcover": 5,
              "system:index": "33"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03463737570746, 12.50061484720773]),
            {
              "landcover": 5,
              "system:index": "34"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.038156433935, 12.499357904764771]),
            {
              "landcover": 5,
              "system:index": "35"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04223339163764, 12.509329479981965]),
            {
              "landcover": 5,
              "system:index": "36"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04553787314399, 12.499399802944692]),
            {
              "landcover": 5,
              "system:index": "37"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.04854194724066, 12.515153037011851]),
            {
              "landcover": 5,
              "system:index": "38"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.05703918539984, 12.511591884646442]),
            {
              "landcover": 5,
              "system:index": "39"
            })]),
    sand = 
    /* color: #ff0000 */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-70.03209582921286, 12.508712076502245]),
            {
              "landcover": 2,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03256789799948, 12.508717313585493]),
            {
              "landcover": 2,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03301314469596, 12.508177893453588]),
            {
              "landcover": 2,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0345527326705, 12.511304419722231]),
            {
              "landcover": 2,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03543249722739, 12.512058551044921]),
            {
              "landcover": 2,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03600112553855, 12.512084736120725]),
            {
              "landcover": 2,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0305514391736, 12.510248563584812]),
            {
              "landcover": 2,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.02989698017397, 12.50885288541878]),
            {
              "landcover": 2,
              "system:index": "7"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.02989698017397, 12.508763855035937]),
            {
              "landcover": 2,
              "system:index": "8"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.02989161575594, 12.508690535874086]),
            {
              "landcover": 2,
              "system:index": "9"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.02990770901003, 12.508625072319129]),
            {
              "landcover": 2,
              "system:index": "10"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.030803566821, 12.50680256028777]),
            {
              "landcover": 2,
              "system:index": "11"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03069627846041, 12.50689682846684]),
            {
              "landcover": 2,
              "system:index": "12"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03066409195223, 12.508153734233579]),
            {
              "landcover": 2,
              "system:index": "13"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03165114486971, 12.508090889090502]),
            {
              "landcover": 2,
              "system:index": "14"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03323891026652, 12.511409871637458]),
            {
              "landcover": 2,
              "system:index": "15"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0341186748234, 12.51248346026501]),
            {
              "landcover": 2,
              "system:index": "16"
            })]),
    rubble = 
    /* color: #00ff00 */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-70.03341698884901, 12.50659615737621]),
            {
              "landcover": 3,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03388905763563, 12.506648528632908]),
            {
              "landcover": 3,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03400707483229, 12.50622955828205]),
            {
              "landcover": 3,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03442549943861, 12.50647046631683]),
            {
              "landcover": 3,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03371739625868, 12.50558015289527]),
            {
              "landcover": 3,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03352427720961, 12.505234500975297]),
            {
              "landcover": 3,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03374958276686, 12.505004066105032]),
            {
              "landcover": 3,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03394270181593, 12.50558015289527]),
            {
              "landcover": 3,
              "system:index": "7"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03439331293043, 12.506177186940405]),
            {
              "landcover": 3,
              "system:index": "8"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03313803911146, 12.504606041754098]),
            {
              "landcover": 3,
              "system:index": "9"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03338480234083, 12.50468983640525]),
            {
              "landcover": 3,
              "system:index": "10"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03784184136163, 12.515454293531088]),
            {
              "landcover": 3,
              "system:index": "11"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03750120081673, 12.515189827595425]),
            {
              "landcover": 3,
              "system:index": "12"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03754411616097, 12.514996060302241]),
            {
              "landcover": 3,
              "system:index": "13"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03728930630456, 12.514812766782923]),
            {
              "landcover": 3,
              "system:index": "14"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.0376567689396, 12.515103417874542]),
            {
              "landcover": 3,
              "system:index": "15"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03737513699303, 12.515043192900453]),
            {
              "landcover": 3,
              "system:index": "16"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03780429043542, 12.515362646950397]),
            {
              "landcover": 3,
              "system:index": "17"
            })]),
    coral = 
    /* color: #0000ff */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Point([-70.03462934732374, 12.504071850214048]),
            {
              "landcover": 4,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03465080499586, 12.504511772739054]),
            {
              "landcover": 4,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03541255235609, 12.504752682375779]),
            {
              "landcover": 4,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03542328119215, 12.50521355235921]),
            {
              "landcover": 4,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03374958276686, 12.504637464751468]),
            {
              "landcover": 4,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03455424547133, 12.505150706500803]),
            {
              "landcover": 4,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03578806161818, 12.50542303844352]),
            {
              "landcover": 4,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03266597032484, 12.50272065491794]),
            {
              "landcover": 4,
              "system:index": "7"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03291273355421, 12.502385473595638]),
            {
              "landcover": 4,
              "system:index": "8"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03358865022597, 12.503223426086159]),
            {
              "landcover": 4,
              "system:index": "9"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03244066476759, 12.502270254915674]),
            {
              "landcover": 4,
              "system:index": "10"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03189885854658, 12.50148467163753]),
            {
              "landcover": 4,
              "system:index": "11"
            }),
        ee.Feature(
            ee.Geometry.Point([-70.03157162904677, 12.501259470657363]),
            {
              "landcover": 4,
              "system:index": "12"
            })]);
