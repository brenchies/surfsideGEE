import ee

import json
from time import sleep
import os

bucket_name = 'surfsidegis'

# to get arguments sent to this script
import sys
start_date = None
end_date = None
if len(sys.argv) == 3:
  start_date = sys.argv[1]
  end_date = sys.argv[2]

# Trigger the authentication flow.
# ee.Authenticate()
# Actually, use service account as login
credentials = ee.ServiceAccountCredentials(os.environ['GOOGLE_SERVICE_ACCOUNT'], os.environ['GOOGLE_APPLICATION_CREDENTIALS'])

# Initialize the library.
ee.Initialize(credentials)

#region of interest
r1 = ee.Geometry.Polygon(
    [[[-70.04522660301417, 12.515923275989358],
      [-70.04416444824427, 12.517536247552213],
      [-70.0465462498495, 12.519400578746355],
      [-70.0476620487997, 12.51833225577721]]])

r2 = ee.Geometry.Polygon(
    [[[-70.04079356987614, 12.511763138720246],
      [-70.0387336333527, 12.51440258402275],
      [-70.04416242439885, 12.517502850386245],
      [-70.04519239266057, 12.515806087597849]]])

r3 = ee.Geometry.Polygon(
    [[[-70.03575500041414, 12.505320361827717],
      [-70.03365214854647, 12.507247626598383],
      [-70.03511127025057, 12.508504530657978],
      [-70.03652747661043, 12.50745711103308]]])

r4 = ee.Geometry.Polygon(
    [[[-70.02484806169787, 12.49334824465247],
      [-70.00759609331408, 12.479269744710132],
      [-70.00545032610216, 12.48362745749824],
      [-70.02905376543322, 12.502398304220096],
      [-70.03310859629882, 12.507513014633629],
      [-70.03572643229737, 12.505271522850787]]])

r5 = ee.Geometry.Polygon(
    [[[-70.00611097296958, 12.47992743672679],
      [-69.9990728565145, 12.47607248559914],
      [-69.99855787238364, 12.477455246409352],
      [-70.00533849677329, 12.481100671328898]]])

r6 = ee.Geometry.Polygon(
    [[[-69.99855787238364, 12.477455246409352],
      [-69.9990728565145, 12.476114387550362],
      [-69.9932363696981, 12.473223137010926],
      [-69.98855859717612, 12.471798450962043],
      [-69.98328000983481, 12.467105312094375],
      [-69.98199254950767, 12.468571927122097],
      [-69.98787195166831, 12.473684063172557],
      [-69.99272138556724, 12.47498303248762]]])

r7 = ee.Geometry.Polygon(
    [[[-69.98201400717979, 12.468530023950787],
      [-69.98328000983481, 12.467105312094375],
      [-69.97961074790244, 12.464737758893008],
      [-69.97383863410239, 12.463333978198078],
      [-69.97396738013511, 12.465093940845199],
      [-69.97740060767417, 12.466246290866449],
      [-69.98064071616416, 12.467126263796068]]])

r8 = ee.Geometry.Polygon(
    [[[-69.97091729542655, 12.463992033906274],
      [-69.97122843167227, 12.463342522511914],
      [-69.96966202160758, 12.462703485519562],
      [-69.96929724143374, 12.463030861019353],
      [-69.96930797001761, 12.463442044524685]]])

r9 = ee.Geometry.Polygon(
    [[[-69.96668878896527, 12.46211306929221],
      [-69.96684972150616, 12.461840691770135],
      [-69.9665868650227, 12.461694026832019],
      [-69.96643129689984, 12.462018784797712]]])

r10 = ee.Geometry.Polygon(
    [[[-69.96114525835651, 12.455801649960103],
      [-69.96070001166004, 12.456445942102386],
      [-69.96169242899555, 12.45731023392616],
      [-69.96229860823291, 12.456896421836566]]])

r11 = ee.Geometry.Polygon(
    [[[-69.95318559822155, 12.448460435094454],
      [-69.95359329399182, 12.447884221211808],
      [-69.95281008895947, 12.447339436000895],
      [-69.95238093551708, 12.448093753680782]]])

r12 = ee.Geometry.Polygon(
    [[[-69.94823232220968, 12.443884187355614],
      [-69.94775488900503, 12.444638515075356],
      [-69.94917109536489, 12.44526188146763],
      [-69.94968071507772, 12.44450231717698]]])

r13 = ee.Geometry.Polygon(
    [[[-69.94358004985186, 12.441546754986772],
      [-69.94319381175372, 12.442673017511128],
      [-69.94707228598925, 12.444464550624046],
      [-69.9476033633742, 12.443783559961409]]])

r14 = ee.Geometry.Polygon(
    [[[-69.94356982003711, 12.44154532396081],
      [-69.94004003297351, 12.439806155481834],
      [-69.93956796418689, 12.440958617823853],
      [-69.94319431077503, 12.442802546933741]]])

r15 = ee.Geometry.Polygon(
    [[[-69.93439028182846, 12.437927944872785],
      [-69.9337143651567, 12.438912783767806],
      [-69.93812391677719, 12.44041098896846],
      [-69.93840286651474, 12.439478540593356]]])

r16 = ee.Geometry.Polygon(
    [[[-69.93372073778127, 12.438913440186163],
      [-69.93438592561697, 12.437928601293622],
      [-69.93398895868276, 12.437991463462144],
      [-69.92906442293142, 12.436273225381445],
      [-69.92692938455556, 12.434995016511412],
      [-69.92589941629384, 12.43465974757012],
      [-69.92542734750722, 12.43563412173244],
      [-69.92710104593252, 12.43671326304557],
      [-69.92986908563589, 12.43763524430604],
      [-69.93207922586416, 12.43832672810404]]])

r17 = ee.Geometry.Polygon(
    [[[-69.90454002957128, 12.42160016337365],
      [-69.90363880734228, 12.423402319375915],
      [-69.91541800962655, 12.430047728450745],
      [-69.9164908932325, 12.428947604677399]]])

r18 = ee.Geometry.Polygon(
    [[[-69.90320965389989, 12.423590916375346],
      [-69.9031023655393, 12.421390609539785],
      [-69.90061327557348, 12.4208248133452],
      [-69.900527444885, 12.423402319375915]]])

r19 = ee.Geometry.Polygon(
    [[[-69.89707599273088, 12.413514420382608],
      [-69.89456544509294, 12.414310748156506],
      [-69.89690433135392, 12.421121346684503],
      [-69.90076671233537, 12.419822107802164]]])

r20 = ee.Geometry.Polygon(
    [[[-69.89625358268695, 12.419417772692949],
      [-69.89526652976947, 12.416651625292133],
      [-69.8924984900661, 12.41807661398915],
      [-69.89363574668842, 12.420214082402342]]])

r21 = ee.Geometry.Polygon(
    [[[-69.89498758003192, 12.415729569624263],
      [-69.89453696891742, 12.414409347867135],
      [-69.88887214347797, 12.414178832270448],
      [-69.88852882072406, 12.416148686241911]]])

roiFeatures = ee.FeatureCollection([
  ee.Feature(r1,{'name':'R1'}), ee.Feature(r2,{'name':'R2'}),
  ee.Feature(r3,{'name':'R3'}), ee.Feature(r4,{'name':'R4'}),
  ee.Feature(r5,{'name':'R5'}), ee.Feature(r6,{'name':'R6'}),
  ee.Feature(r7,{'name':'R7'}), ee.Feature(r8,{'name':'R8'}),
  ee.Feature(r9,{'name':'R9'}), ee.Feature(r10,{'name':'R10'}),
  ee.Feature(r11,{'name':'R11'}), ee.Feature(r12,{'name':'R12'}),
  ee.Feature(r13,{'name':'R13'}), ee.Feature(r14,{'name':'R14'}),
  ee.Feature(r15,{'name':'R15'}), ee.Feature(r16,{'name':'R16'}),
  ee.Feature(r17,{'name':'R17'}),
  ee.Feature(r18,{'name':'R18'}), ee.Feature(r19,{'name':'R19'}),
  ee.Feature(r20,{'name':'R20'}), ee.Feature(r21,{'name':'R21'})])
roi = roiFeatures
arusquare = ee.FeatureCollection('users/sevold/arusquare')

# time period of interest
i_date = '2022-06-01'
f_date = '2023-05-31'
threshold = 0

if start_date != None and end_date != None:
  i_date = start_date
  f_date = end_date

# parameters for sentinel image collection
imagery = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
mPerPixel = 10; # resolution
band1 = 'B3'; # first band for normalized difference calculation
band2 = 'B8'; # second
band3 = 'B3'; # third
band4 = 'B11'; # fourth
index = 'ndwi_median'; # for ndwi
# var index = 'mndwi_median'; # for mndwi

# imagery preprocessing
imagery = imagery.filterBounds(roi)
imagery = imagery.filterDate(i_date, f_date)
# adding both ndwi and mndwi indices
def addIndex(image):
 ndwi = image.normalizedDifference([band1, band2]).rename('ndwi')
 mndwi = image.normalizedDifference([band3, band4]).rename('mndwi')
 indices = ndwi.addBands(mndwi)
 ab = image.addBands(indices)
 return ab

imagery = imagery.map(addIndex);

# Li et al imagery processing
# building the clean mosiac image based on different filters
cloudBitMask = ee.Number(2).pow(10).int()
cirrusBitMask = ee.Number(2).pow(11).int()

# this function is used to build clean water mosaic in the Google Earth Engine
# the threshold value could be revised, the current value is suggested for a common clean coral reefs waters
def mask (img):
  qa = img.select('QA60')
  ma = qa.bitwiseAnd(cloudBitMask).eq(0).And(qa.bitwiseAnd(cirrusBitMask).eq(0))
  ma = ma.And(img.select(['SCL']).neq(3))
  ma = ma.And(img.select(['SCL']).neq(8))
  ma = ma.And(img.select(['SCL']).neq(9))
  ma = ma.And(img.select(['SCL']).neq(10))
  img = img.mask(ma)
  return img
# bad water region maskout end

imagery = imagery.map(mask) # run the mask function
imagery = imagery.reduce(ee.Reducer.median()) #get the median value of it
imagery = imagery.clip(roi)

# create mask layer with 1 for water pixels with index above threshold, 0 otherwise
waterMask = imagery.select(index).gt(threshold)

# create vector layer to delineate mask boundary contour
islands = waterMask.reduceToVectors(reducer=None,geometry=roi,scale=mPerPixel,geometryInNativeProjection=True)

lc = islands.filter('label == 0').union(1)

area = lc.geometry().area().divide(10000)
# print('Island area in square meters:')
# print(area);
island_area_ha = area.getInfo()

# Function to compute feature geometry area and add as a property.
def addArea(feature):
  area=lc.geometry().intersection(feature.geometry(),1).area()
  withArea=feature.set('areaM2',area)
  return withArea

rifs = roiFeatures.map(addArea)

# Export the vectorized islands as a shapefile
taskSHP = ee.batch.Export.table.toCloudStorage(collection=ee.FeatureCollection(islands),
  description='rifIslands_shp'+i_date+'_'+f_date,
  bucket=bucket_name,
  fileNamePrefix=i_date+'_'+f_date + '/rifIslands_shp'+i_date+'_'+f_date,
  fileFormat='SHP')

taskSHP.start()

# Export the island area data as a csv
taskRIA = ee.batch.Export.table.toCloudStorage(collection=rifs,
  description='rifAreas_'+i_date+'_'+f_date,
  bucket=bucket_name,
  fileNamePrefix=i_date+'_'+f_date + '/rifAreas_'+i_date+'_'+f_date,
  fileFormat='CSV')

taskRIA.start()

# Export the processed sentinel imagery
taskS2 = ee.batch.Export.image.toCloudStorage(image=imagery.toFloat(),
  description='rifS2_'+i_date+'_'+f_date,
  bucket=bucket_name,
  fileNamePrefix=i_date+'_'+f_date + '/rifS2_'+i_date+'_'+f_date,
  region=arusquare.first().geometry(),
  scale=10,
  crs='EPSG:4326',
  fileFormat='GeoTIFF',
  maxPixels=10000000000000)

taskS2.start()

taskSHP_status = {}
taskRIA_status = {}
taskS2_status = {}

file_list = []
shape_exts = ['shp', 'shx', 'dbf', 'prj', 'cpg', 'fix']

stat_list = []

# shapefiles
for ext in shape_exts:
  file_list.append({
    'type': 'shapefile',
    'file_extension': ext,
    'filename': i_date+'_'+f_date + '/rifIslands_shp'+i_date+'_'+f_date + '.' + ext
  })

# CSV export
file_list.append({
  'type': 'csv',
  'file_extension': 'csv',
  'filename': i_date+'_'+f_date + '/rifAreas_'+i_date+'_'+f_date + '.' + 'csv'
})

# tif export
file_list.append({
  'type': 'geotiff',
  'file_extension': 'tif',
  'filename': i_date+'_'+f_date + '/rifS2_'+i_date+'_'+f_date + '.' + 'tif'
})

stat_list.append({
  'label': 'island',
  'area_ha': island_area_ha
})

jsonBody = {
  'subject': 'reefislands',
  'location': 'surfside',
  'window_start': i_date,
  'window_end': f_date,
  'files': file_list,
  'stats': stat_list
}

while True:
  taskSHP_status = taskSHP.status()
  taskRIA_status = taskRIA.status()
  taskS2_status = taskS2.status()
  if taskSHP_status['state'] == 'COMPLETED' and taskRIA_status['state'] == 'COMPLETED' and taskS2_status['state'] == 'COMPLETED':
    print(json.dumps(jsonBody))
    break
  elif taskSHP_status['state'] == 'FAILED' or taskRIA_status['state'] == 'FAILED' or taskS2_status['state'] == 'FAILED':
    print('at least one of the tasks failed', file=sys.stderr)
    sys.exit(1)
  else:
    sleep(1)
