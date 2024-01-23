//=====================================================================================================================
// Code adapted by Max van Schie from NASA ARSET tutorial
//                                       
// https://github.com/abarenblitt/MappingTutorials/blob/master/GEEGuyanaMangroveRFC
// NASA - University of Maryland (ESSIC)                                                  
// Code: Mangrove Extent Mapping Tutorial
// Written by: Abigail Barenblitt NASA Goddard and University of Maryland 
// Objective: This code works through a tutorial for mapping mangrove extent in surfside in 2009 and 2019
// link to working code: https://code.earthengine.google.com/1da32fb15399aaa2d4158cb6c8683928
//=====================================================================================================================

// adding Sentinel 2

var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

// dates
var year = 2020; 
var startDate = (year-1)+'-01-01'; 
var endDate = (year+1)+'-12-31'; 

// 1 - ROI AND MAP SETUP

//var ROI = ee.FeatureCollection("users/maxwellvanschie/AruCoastFinal");
//var ROI = ee.FeatureCollection(Aruba.difference(Coast));
var ROI = Aruba;
//Map.addLayer(ROI);
Map.centerObject(ROI,13);
Map.setOptions('satellite'); 

// 2 - SENTINEL PREPROCESSING

// cloud masking function
function maskS2clouds(image) {
  var qa = image.select('QA60');  // sentinel quality band

  var cloudBitMask = 1 << 10;   // Bits 10 and 11 are clouds and cirrus, respectively.
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)  // 0 for clear conditions
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}

var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate('2023-01-01', '2023-06-30')
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))       // Pre-filter to get less cloudy granules.
                  .map(maskS2clouds);
var visualization = {min: 0.0, max: 0.3, bands: ['B4', 'B3', 'B2'],};

// This function maps spectral indices for Mangrove Mapping using Sentinel 2 Imagery
var addIndicesS2 = function(img) {
  // NDVI (NIR - Red) / (NIR + Red)
  var ndvi = img.normalizedDifference(['B8','B4']).rename('NDVI');
  // NDMI (SWIR2 - Green) / (SWIR2 + Green) (Normalized Difference Mangrove Index - Shi et al 2016 - New spectral metrics for mangrove forest identification)
  var ndmi = img.normalizedDifference(['B12','B3']).rename('NDMI');
  // MNDWI (Green - NIR / (Green + NIR) (Modified Normalized Difference Water Index - Hanqiu Xu, 2006)
  var mndwi = img.normalizedDifference(['B3','B11']).rename('MNDWI');
  // SR (Simple Ratio) (NIR / Red)
  var sr = img.select('B4').divide(img.select('B3')).rename('SR');
  // Band Ratio 84 (NIR / Red)
  var ratio84 = img.select('B8').divide(img.select('B4')).rename('R84');
  // Band Ratio 38 (Green / NIR)
  var ratio38 = img.select('B3').divide(img.select('B8')).rename('R38');
  // GCVI 
  var gcvi = img.expression('(NIR/GREEN)-1',{
    'NIR':img.select('B8'),
    'GREEN':img.select('B3')
  }).rename('GCVI');
  return img
    .addBands(ndvi)
    .addBands(ndmi)
    .addBands(mndwi)
    .addBands(sr)
    .addBands(ratio84)
    .addBands(ratio38)
    .addBands(gcvi);
};

// filter and mask sentinel imagery
var S2 = S2.filterDate(startDate,endDate).map(maskS2clouds).map(addIndicesS2)
    
// sentinel composite (per pixel, per-band using .median() OR with quality bands like .qualityMosaic('NDVI')
var composite = S2.median().clip(ROI); 

// mask to low elevation and high NDVI and MNDWI areas
var srtmClip = SRTM.clip(ROI); // Clip SRTM data to region
var elevationMask = srtmClip.lt(30); // less than 65 meters
var NDVIMask = composite.select('NDVI').gt(0.25); // NDVI mask > 0.25
var MNDWIMask = composite.select('MNDWI').gt(-0.50); // MNDWI mask > -0.5

// apply the masks
var compositeNew = composite.updateMask(NDVIMask).updateMask(MNDWIMask).updateMask(elevationMask)

// display on map
//var visPar = {bands:['B8A','B11','B4'], min: 0, max: 0.35}; 
//Map.addLayer(compositeNew.clip(ROI), visPar, 'Sentinel 2')

// 3 - RANDOM FOREST MODEL CONSTRUCTION

// training data and predictors
var classes = Mangrove.merge(NonMangrove) // merge training polygons
var bands = ['B8','B11','B4','NDVI','NDMI','MNDWI','SR','GCVI'] // define bands to include
var image = compositeNew.select(bands).clip(ROI) // clip to bands and geometry

//Assemble samples for the model
var samples = image.sampleRegions({
    collection: classes, // Set of geometries selected for training
    properties: ['landcover'], // Label from each geometry
    scale: 10, // Make each sample the same size as Sentinel pixel
    tileScale: 16
    }).randomColumn('random'); // creates a column with random numbers
    
// split samples into training and testing data
var split = 0.8; // Roughly 80% for training, 20% for testing.
var training = samples.filter(ee.Filter.lt('random', split)); //Subset training data
var testing = samples.filter(ee.Filter.gte('random', split)); //Subset testing data

//Print these variables to see how much training and testing data you are using
print('Samples n =', samples.aggregate_count('.all'));
print('Training n =', training.aggregate_count('.all'));
print('Testing n =', testing.aggregate_count('.all'));

//.smileRandomForest is used to run the model using 100 trees and 5 randomly selected predictors per split ("(100,5)")
var classifier = ee.Classifier.smileRandomForest(100,5).train({ 
    features: training.select(['B8','B11','B4','NDVI','NDMI','MNDWI','SR','GCVI', 'landcover']), //Train using bands and landcover property
    classProperty: 'landcover', //Pull the landcover property from classes
    inputProperties: bands
    });

// test the model accuracy
var validation = testing.classify(classifier);
var testAccuracy = validation.errorMatrix('landcover', 'classification');
print('Validation error matrix RF: ', testAccuracy);
print('Validation overall accuracy RF: ', testAccuracy.accuracy());

// classify the sentinel composite using the RF model
var classifiedrf = image.select(bands).classify(classifier); // select predictor bands and .classify applies the Random Forest

//To reduce noise, create a mask to mask
// unconnected pixels
//var pixelcount = classifiedrf.connectedPixelCount(100, false); //Create an image that shows the number of pixels each pixel is connected to
//var countmask = pixelcount.select(0).gt(25); //filter out all pixels connected to 4 or less 

//Mask to only display mangrove extent
var classMask = classifiedrf.select('classification').gt(0);
var classed= classifiedrf.updateMask(classMask);
//var classed= classifiedrf.updateMask(countmask).updateMask(classMask);

// map results
// Add classification to map
Map.addLayer (classed, {min: 1, max: 1, palette:'blue'}, 'Mangrove Extent 2019');

var area = classed.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: ROI,
  scale: 10,
  tileScale: 4
  });
print(area.get('classification'));

// add Global Mangrove Forests dataset to the map
var GMF = ee.ImageCollection('LANDSAT/MANGROVE_FORESTS');
Map.addLayer (GMF, {min: 0, max: 1.0, palette:'d40115'}, 'Global Mangrove Forests');


///////////////////////////////////////////////////////////////
//          6) Calculate Mangrove Area                       //
///////////////////////////////////////////////////////////////

//6.2) Calculate Mangrove Area in 2019
///////////////////////////////////////

//Use reduceRegion with a Sum reducer to calculate total area
var area1 = classed.reduceRegion({
      reducer:ee.Reducer.sum(),
      geometry:ROI,
      scale: 10,
      maxPixels:1e13,
      tileScale: 16
});
var getExtent = area1.get('classification');
      
print(getExtent, 'Mangrove Extent in ha');

///////////////////////////////////////////////////////////////
//          7) Running an independent accuracy assessment     //
///////////////////////////////////////////////////////////////

//These points were created in GEE using Stratified Random Sampling (see below)
//We then used the Class Accuracy plug-in (Pete Bunting) to classify each point using
//satellie data as validation

//7.1) Creating Stratified Random Samples
////////////////////////////////////////////

var stratSamples = classifiedrf.stratifiedSample({
                      numPoints:150,        //Number of points per class
                      classBand: 'classification',
                      region:ROI,
                      scale: 30,
                      geometries:true
        });

//Add a 15m Radius buffer around each point
var stratBuff = function(feature) {
        var num = feature.get('classification');
            
        return feature.buffer(15).set('classification', num);
        };
        
//Map the buffer across all points (see export code below
////////////////////////////////////////////////////////////////////

var stratPoints = stratSamples.map(stratBuff)


///////////////////////////////////////////////////////////////
//          8) Export Layers of Interest                      //
///////////////////////////////////////////////////////////////


//8.1) 2019 Mangrove Extent
//------------------
Export.image.toDrive({
  image: classed,
  description: 'SentinelMangroveExtent',
  region: ROI,
  scale: 10,
  maxPixels: 1e13
  });


//8.3) Stratified Random Samples
//-------------------------
Export.table.toDrive({
  collection: stratPoints,
  description:'StratifiedrandomPoints',
  fileFormat: 'SHP',
});

//Imports:

var SRTM = ee.Image("USGS/SRTMGL1_003"),
    Mangrove = 
    /* color: #98ff00 */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.00970731496197, 12.489314837322848],
                  [-70.00908504418415, 12.488874889203244],
                  [-70.00818382024151, 12.49067657758724],
                  [-70.00720750060493, 12.490273295535356],
                  [-70.00667105435711, 12.490948924779829],
                  [-70.00862370251996, 12.492006886153161]]]),
            {
              "landcover": 1,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.0353799750772, 12.515467706172474],
                  [-70.03536656403213, 12.515438902966409],
                  [-70.03525525235801, 12.515491272429603],
                  [-70.03516808056503, 12.515571135840515],
                  [-70.03520160817772, 12.515601248267721]]]),
            {
              "landcover": 1,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.0348569443193, 12.515662782347174],
                  [-70.03479793572097, 12.515779304287227],
                  [-70.0348556032148, 12.515801561281043],
                  [-70.03492399954467, 12.51575835652661]]]),
            {
              "landcover": 1,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03390393804013, 12.514886450507992],
                  [-70.03387309263645, 12.514954530953789],
                  [-70.03403670738636, 12.515040940724505],
                  [-70.03408230493962, 12.514991189647928]]]),
            {
              "landcover": 1,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03449947372076, 12.515402316070073],
                  [-70.0345262958109, 12.51529234014719],
                  [-70.03435999885198, 12.51528710319732]]]),
            {
              "landcover": 1,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03217768933843, 12.503552989045419],
                  [-70.03203285005162, 12.50333302706027],
                  [-70.0315071370847, 12.503746764924802],
                  [-70.03164661195348, 12.503924829118258]]]),
            {
              "landcover": 1,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.0319738414533, 12.503851508582866],
                  [-70.03174317147801, 12.50401909834747],
                  [-70.03201675679753, 12.504579475833335],
                  [-70.03229034211705, 12.504490443977552]]]),
            {
              "landcover": 1,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.032462003494, 12.504155264951148],
                  [-70.03261220719884, 12.504008623990357],
                  [-70.03232252862523, 12.503678681524283],
                  [-70.03214550283025, 12.503762476476215]]]),
            {
              "landcover": 1,
              "system:index": "7"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03155005242894, 12.503448245266318],
                  [-70.03108871247838, 12.5030135581293],
                  [-70.03097605969975, 12.50309735329695],
                  [-70.03143203523229, 12.50357917498355]]]),
            {
              "landcover": 1,
              "system:index": "8"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03171098496983, 12.503264943550722],
                  [-70.03180754449437, 12.50312877647781],
                  [-70.03124428060124, 12.502652191157507],
                  [-70.03112089898656, 12.50283549330781]]]),
            {
              "landcover": 1,
              "system:index": "9"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03021557286024, 12.501558601926321],
                  [-70.02971131756544, 12.501951393751542],
                  [-70.02999026730299, 12.502171356912886],
                  [-70.03050525143385, 12.501804751539977]]]),
            {
              "landcover": 1,
              "system:index": "10"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.02933580830336, 12.500623754980854],
                  [-70.02897907450438, 12.500775635106846],
                  [-70.02914805367232, 12.500940608246008],
                  [-70.02932776167631, 12.500872524106098],
                  [-70.02944309666395, 12.500712788168984]]]),
            {
              "landcover": 1,
              "system:index": "11"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.02638564284142, 12.49771737333107],
                  [-70.02610488429467, 12.497989418783188],
                  [-70.02709193721215, 12.499063063185263],
                  [-70.02745671763817, 12.498790724539564]]]),
            {
              "landcover": 1,
              "system:index": "12"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.02437091467083, 12.495687780375063],
                  [-70.02411674679941, 12.495958130396135],
                  [-70.02486776532358, 12.496764679774675],
                  [-70.02509307088083, 12.496586610647809]]]),
            {
              "landcover": 1,
              "system:index": "13"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.02388275263012, 12.495331640515188],
                  [-70.02241290208995, 12.494315591748153],
                  [-70.02202666399181, 12.494420339228315],
                  [-70.02333558199108, 12.495729679149852],
                  [-70.02389348146617, 12.495404963467625]]]),
            {
              "landcover": 1,
              "system:index": "14"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.01948391142682, 12.49128888188913],
                  [-70.01917277518109, 12.491634552458489],
                  [-70.02136145773724, 12.493991384934967],
                  [-70.02174769583539, 12.49369809139701]]]),
            {
              "landcover": 1,
              "system:index": "15"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.0027031575844, 12.487068992765918],
                  [-70.00327178589556, 12.485832934666062],
                  [-70.00231691948626, 12.485455831019365],
                  [-70.00172683350299, 12.485434880800662],
                  [-70.00152298561785, 12.4859376855815],
                  [-70.00217744461749, 12.486440489385263]]]),
            {
              "landcover": 1,
              "system:index": "16"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.98862272203722, 12.47318293223302],
                  [-69.988762196906, 12.472926279770386],
                  [-69.98811310232439, 12.472722005179609],
                  [-69.98803800047197, 12.47292104196238]]]),
            {
              "landcover": 1,
              "system:index": "17"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.98713677824297, 12.472051564365046],
                  [-69.98712604940691, 12.471863002573299],
                  [-69.98686855734148, 12.471595873133374],
                  [-69.98667543829241, 12.471836813424693],
                  [-69.98753374517717, 12.472659151426953],
                  [-69.98774832189837, 12.472549157323126]]]),
            {
              "landcover": 1,
              "system:index": "18"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.98757929238623, 12.477980478163792],
                  [-69.98761147889441, 12.477823346944172],
                  [-69.98652786645239, 12.477404329892288],
                  [-69.98637229832953, 12.47729433780381],
                  [-69.98601824673956, 12.477158157058101],
                  [-69.98595923814123, 12.47737290358606],
                  [-69.9862220946247, 12.477613838502991],
                  [-69.98680681618994, 12.477713355033693]]]),
            {
              "landcover": 1,
              "system:index": "19"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.98990728884948, 12.47946157507232],
                  [-69.98968734771026, 12.479527046011125],
                  [-69.98945667773498, 12.479867494626108],
                  [-69.98948349982513, 12.480042956429765],
                  [-69.989821458161, 12.48021841811448],
                  [-69.98988046675933, 12.480100570727409],
                  [-69.98966589003814, 12.479935584295385]]]),
            {
              "landcover": 1,
              "system:index": "20"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.96870278228242, 12.463652229751656],
                  [-69.96905683387239, 12.463222713771385],
                  [-69.96801613677461, 12.46277224502751],
                  [-69.96765135634858, 12.463201761754142]]]),
            {
              "landcover": 1,
              "system:index": "21"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.96355070784475, 12.459744143007757],
                  [-69.96329321577932, 12.459199382700357],
                  [-69.96245636656667, 12.45885366883478],
                  [-69.96198429778005, 12.459587000728828],
                  [-69.96288552000905, 12.459838428329379],
                  [-69.96459140494252, 12.461022230005778],
                  [-69.96476306631948, 12.46081270797882]]]),
            {
              "landcover": 1,
              "system:index": "22"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.96189846709157, 12.45937747754215],
                  [-69.96229543402578, 12.458769859343427],
                  [-69.96196284010793, 12.45857081169287],
                  [-69.96145858481313, 12.458696526016249],
                  [-69.96034278586293, 12.45735557009172],
                  [-69.95945229246999, 12.458162239721013]]]),
            {
              "landcover": 1,
              "system:index": "23"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.9601389379778, 12.457198426365457],
                  [-69.96033205702687, 12.456140322796434],
                  [-69.95939864828969, 12.455427933803792],
                  [-69.95786442473317, 12.456266038297917],
                  [-69.95901241019155, 12.457942239161842]]]),
            {
              "landcover": 1,
              "system:index": "24"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.95837582092119, 12.454851022903235],
                  [-69.95691669921709, 12.454411015981258],
                  [-69.95687378387285, 12.455186265771424],
                  [-69.95768917541338, 12.455898655427758],
                  [-69.95859039764238, 12.455437697638231]]]),
            {
              "landcover": 1,
              "system:index": "25"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.97242004058901, 12.481087993238079],
                  [-69.97280627868716, 12.480155691129955],
                  [-69.97030645988528, 12.480134740482208],
                  [-69.96985584877078, 12.480857536849607]]]),
            {
              "landcover": 1,
              "system:index": "26"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.97168511531893, 12.478427256990843],
                  [-69.97130960605685, 12.478490109343536],
                  [-69.97141152999941, 12.479689538816753],
                  [-69.97181922576968, 12.47965811278791]]]),
            {
              "landcover": 1,
              "system:index": "27"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.97245759151522, 12.477673027568423],
                  [-69.97272581241671, 12.47720163306371],
                  [-69.97290820262972, 12.476510252904443],
                  [-69.97285455844943, 12.476017905302044],
                  [-69.97268289707247, 12.476017905302044],
                  [-69.97271508358065, 12.476290267921172],
                  [-69.97267216823641, 12.476573105722474],
                  [-69.97245759151522, 12.477227821669816],
                  [-69.97224301479403, 12.477479232153692],
                  [-69.97163683555667, 12.477966339271548],
                  [-69.971878234368, 12.47818108512922]]]),
            {
              "landcover": 1,
              "system:index": "28"
            })]),
    NonMangrove = 
    /* color: #0b4a8b */
    /* shown: false */
    ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03671663037285, 12.515005127981798],
                  [-70.03523605099663, 12.516241046556585],
                  [-70.03655569783196, 12.51748743302393],
                  [-70.0380577348803, 12.516408628280596]]]),
            {
              "landcover": 0,
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.03381188298339, 12.508841050009346],
                  [-70.03145153905028, 12.510810184837855],
                  [-70.03443415547484, 12.514559878783437],
                  [-70.03735239888304, 12.512465084410305]]]),
            {
              "landcover": 0,
              "system:index": "1"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.99805502494439, 12.483094683561244],
                  [-69.99863439179269, 12.480811069921913],
                  [-69.99887041648492, 12.480182560325844],
                  [-69.99831251341573, 12.479910208218563],
                  [-69.99629549583062, 12.47888361709417],
                  [-69.99494366248712, 12.482130962952331]]]),
            {
              "landcover": 0,
              "system:index": "2"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.89566442067482, 12.419244490176723],
                  [-69.89480611379005, 12.42213634203198],
                  [-69.89806767995216, 12.424567149156204],
                  [-69.89884015614845, 12.421633413583782]]]),
            {
              "landcover": 0,
              "system:index": "3"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.0399761404729, 12.516695468730221],
                  [-70.03830244204761, 12.51811990740766],
                  [-70.0433449949956, 12.522078967726642],
                  [-70.0469284262395, 12.521115392501827]]]),
            {
              "landcover": 0,
              "system:index": "4"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.05348167596101, 12.52374470808388],
                  [-70.05043468652009, 12.521000621670986],
                  [-70.04773101983308, 12.524394067772905],
                  [-70.04964075265168, 12.52655160596711]]]),
            {
              "landcover": 0,
              "system:index": "5"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.98747874682294, 12.501311005098941],
                  [-69.98833705370771, 12.48471891748726],
                  [-69.93992854540693, 12.486394934261224],
                  [-69.94387675707685, 12.509858028521709]]]),
            {
              "landcover": 0,
              "system:index": "6"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-69.9217324394499, 12.459074508048971],
                  [-69.89787150805341, 12.475165414633638],
                  [-69.92997218554365, 12.496618401430144],
                  [-69.94816829150068, 12.471813224829958]]]),
            {
              "landcover": 0,
              "system:index": "7"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.00276005834993, 12.501312574333873],
                  [-69.97426426977572, 12.531477276080388],
                  [-70.01614964575228, 12.564654371175223],
                  [-70.03812230200228, 12.534158412210905]]]),
            {
              "landcover": 0,
              "system:index": "8"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-70.04322098850915, 12.550588678924465],
                  [-70.04988926132701, 12.539561524707254],
                  [-70.03941791733287, 12.533864196543567],
                  [-70.03169315536998, 12.545426289728876]]]),
            {
              "landcover": 0,
              "system:index": "9"
            })]),
    Coast = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-70.05011458873312, 12.53310615311535],
          [-70.0337209272341, 12.522046241725752],
          [-70.01500983714621, 12.502187483824548],
          [-70.00496764659445, 12.492676525358979],
          [-69.99874117301292, 12.48560171471286],
          [-69.98947145865745, 12.481579243889128],
          [-69.98578073905296, 12.486774923591787],
          [-69.98148920462913, 12.483925692801128],
          [-69.98251917289085, 12.4778919240518],
          [-69.97891428397483, 12.476215852219738],
          [-69.97419359610862, 12.486607322649059],
          [-69.96698381827659, 12.48618831981728],
          [-69.96252062247581, 12.481495441748839],
          [-69.96325018332786, 12.474916889088146],
          [-69.96153356955833, 12.469595262439313],
          [-69.9576914239262, 12.466574194427974],
          [-69.95159744504437, 12.467244649416106],
          [-69.9491590784665, 12.462286490834222],
          [-69.9509615229245, 12.457006509876406],
          [-69.9537540397894, 12.457133445632543],
          [-69.94976291277524, 12.454954375602274],
          [-69.93936989457028, 12.44600259228594],
          [-69.93074391037838, 12.443467217630277],
          [-69.92211792618649, 12.441518524415631],
          [-69.92228958756344, 12.439171691673364],
          [-69.92125961930172, 12.434142692972735],
          [-69.91490814835446, 12.4334721524582],
          [-69.90684006363766, 12.433136881552112],
          [-69.90134689957516, 12.428610681990122],
          [-69.89516709000485, 12.424587327334557],
          [-69.89121887833493, 12.424587327334557],
          [-69.8846957460107, 12.42140212742054],
          [-69.88040421158688, 12.416372784994186],
          [-69.87388107926266, 12.415031610596742],
          [-69.86958954483883, 12.4177139524798],
          [-69.87061951310055, 12.422575626663793],
          [-69.87959856862068, 12.447507765731775],
          [-69.8861598079184, 12.468623803166164],
          [-69.88957675104916, 12.48076422212899],
          [-69.8945549309808, 12.482482165435131],
          [-69.89884646540463, 12.485080009262408],
          [-69.90275176173031, 12.491071710891651],
          [-69.90524085169613, 12.491239308941893],
          [-69.90936072474301, 12.494088459178137],
          [-69.91519721155942, 12.497356563437172],
          [-69.91245062952817, 12.499619072952376],
          [-69.91751464014828, 12.503850750544004],
          [-69.92244990473569, 12.503054697675317],
          [-69.92309363489926, 12.504227827362557],
          [-69.92073329096615, 12.506699761764894],
          [-69.9242523491937, 12.510679945411647],
          [-69.92725642329037, 12.513696464781841],
          [-69.93052023104568, 12.51664172061307],
          [-69.93515508822341, 12.524685508111153],
          [-69.94322317294021, 12.526193690344236],
          [-69.94493978670974, 12.529377601647896],
          [-69.94785803011794, 12.535410167861738],
          [-69.95764272860427, 12.533734469187403],
          [-69.95970266512771, 12.539096666587415],
          [-69.96709965863667, 12.545746824682393],
          [-69.97370862164937, 12.548260251387324],
          [-69.97928761640034, 12.552616799538773],
          [-69.98907231488667, 12.556135496126243],
          [-69.99292177608956, 12.563552713675842],
          [-69.99729914120186, 12.567238809294112],
          [-70.00219149044503, 12.571008625132182],
          [-70.00562471798409, 12.57528101621701],
          [-70.01008791378487, 12.579050714040774],
          [-70.01635355404366, 12.58541718913783],
          [-70.02027148091074, 12.59183302725775],
          [-70.02207392536874, 12.597612835141184],
          [-70.02670878254648, 12.598450477648662],
          [-70.03134363972421, 12.599623172560996],
          [-70.03254526936288, 12.60406261184072],
          [-70.0361501582789, 12.607999408744423],
          [-70.04138583027597, 12.610679746485882],
          [-70.04559153401132, 12.614532682842354],
          [-70.04833811604257, 12.618720591377103],
          [-70.0552045711207, 12.621065790225455],
          [-70.05692118489023, 12.617380468100654],
          [-70.0540887721705, 12.613862611118934],
          [-70.05065554463144, 12.609255820553157],
          [-70.04790896260019, 12.602303597928469],
          [-70.04619234883066, 12.594848595449989],
          [-70.04267329060312, 12.589110608855464],
          [-70.04061335407968, 12.58450337344241],
          [-70.03968417091909, 12.579088992700147],
          [-70.0405468655132, 12.56970225001647],
          [-70.04269263272512, 12.564592015911677],
          [-70.04664084439504, 12.557722360828263],
          [-70.05676886563528, 12.54255820454302]]]),
    Aruba = 
    /* color: #98ff00 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-70.06916900157492, 12.541987253564153],
          [-70.06436248302023, 12.531262867496329],
          [-70.04925628184836, 12.511823780744288],
          [-70.02865691661398, 12.492718424621717],
          [-70.0073709058718, 12.47595817801712],
          [-69.98951812266867, 12.46724242097496],
          [-69.97132201671164, 12.458861608906547],
          [-69.96033568858664, 12.448133774246928],
          [-69.94866271495383, 12.439417082070424],
          [-69.92600341319601, 12.42835316690774],
          [-69.9084939527468, 12.421312248439106],
          [-69.88858123302023, 12.410247562982633],
          [-69.87656493663351, 12.406223924394943],
          [-69.86111541270773, 12.412259358961082],
          [-69.8648919630007, 12.42868844398422],
          [-69.87450500011008, 12.458526370788837],
          [-69.88034148692648, 12.482997613800967],
          [-69.90368743419211, 12.503109232120954],
          [-69.92360015391867, 12.524224746634316],
          [-69.9417962598757, 12.54131699251351],
          [-69.95106597423117, 12.542992641869478],
          [-69.9747552442507, 12.558743212703156],
          [-69.9963845777468, 12.574827906559161],
          [-70.01217742442648, 12.594597296117275],
          [-70.0293435621218, 12.612689978045845],
          [-70.05818267344992, 12.62910630545447],
          [-70.06710906505148, 12.61771549624022],
          [-70.05921264171164, 12.60498399192399],
          [-70.05303283214133, 12.578178757713875],
          [-70.0681390333132, 12.550700488458599]]]);
