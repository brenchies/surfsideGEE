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

# region of interest
roi = ee.Geometry.BBox(-70.041, 12.516, -70.029, 12.505)

# time period of interest
i_date = '2023-03-01'
f_date = '2023-03-31'
threshold = 0
scale = 10

if start_date != None and end_date != None:
  i_date = start_date
  f_date = end_date

# function to add band to sentinel image
def addNDWI(image):
  ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
  ab = image.addBands(ndwi)
  return ab

# imagery loading and processing
sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') # sentinel image collection
sentinel = sentinel.filterBounds(roi) # spatial filtration
sentinel = sentinel.filterDate(i_date, f_date) # temporal filtration
sentinel = sentinel.map(addNDWI) # mapping of function to add NDWI band across collection
sentinel = sentinel.reduce(ee.Reducer.median()) # get per pixel median
sentinelS2 = sentinel
sentinel = sentinel.select('NDWI_median').rename('NDWI') # rename median bands
sentinel = sentinel.clip(roi) # clip mosaic to region of interest

# create mask layer with 1 for water pixels with NDWI above threshold, 0 otherwise
waterMask = sentinel.select('NDWI').gt(threshold)

# create vector layer to delineate mask boundary contour
coastline = waterMask.reduceToVectors(reducer=None,
 geometry=roi,
 scale=10,
 geometryInNativeProjection=True)

lc = coastline.filter('label == 0').union(1)

coastArea = lc.first().geometry().area().divide(10000)
# print('hectares of coast in roi:')
# print(coastArea)
coast_area_ha = coastArea.getInfo()

# Export the vectorized coast as a shapefile
taskSHP = ee.batch.Export.table.toCloudStorage(collection=ee.FeatureCollection(coastline),
  description= 'coastline_shp'+i_date+'_'+f_date,
  bucket=bucket_name,
  fileNamePrefix=i_date+'_'+f_date+'/coastline_shp'+i_date+'_'+f_date,
  fileFormat='SHP')

taskSHP.start()

# Export the water mask
taskWM = ee.batch.Export.image.toCloudStorage(image=waterMask,
  description= 'coastline_mask'+i_date+'_'+f_date,
  bucket=bucket_name,
  fileNamePrefix=i_date+'_'+f_date+'/coastline_mask'+i_date+'_'+f_date,
  region=roi,
  scale=10,
  crs='EPSG:4326')

taskWM.start()

# Export the processed sentinel imagery
taskS2 = ee.batch.Export.image.toCloudStorage(image=sentinelS2.toFloat(),
  description= 'sentinelS2_'+i_date+'_'+f_date,
  bucket=bucket_name,
  fileNamePrefix=i_date+'_'+f_date+'/sentinelS2_'+i_date+'_'+f_date,
  region=roi,
  scale=10,
  crs='EPSG:4326',
  fileFormat='GeoTIFF')

taskS2.start()

taskSHP_status = {}
taskWM_status = {}
taskS2_status = {}

file_list = []
shape_exts = ['shp', 'shx', 'dbf', 'prj', 'cpg', 'fix']

stat_list = []

# shapefiles
for ext in shape_exts:
  file_list.append({
    'type': 'shapefile',
    'file_extension': ext,
    'filename': i_date+'_'+f_date + '/coastline_shp'+i_date+'_'+f_date + '.' + ext
  })

# 1st tif export
file_list.append({
  'type': 'geotiff',
  'file_extension': 'tif',
  'filename': i_date+'_'+f_date + '/coastline_mask'+i_date+'_'+f_date + '.' + 'tif'
})

#2nd tif export
file_list.append({
  'type': 'geotiff',
  'file_extension': 'tif',
  'filename': i_date+'_'+f_date + '/sentinelS2_'+i_date+'_'+f_date + '.' + 'tif'
})

stat_list.append({
  'label': 'coast',
  'area_ha': coast_area_ha
})

jsonBody = {
  'subject': 'coastline',
  'location': 'surfside',
  'window_start': i_date,
  'window_end': f_date,
  'files': file_list,
  'stats': stat_list
}

while True:
  taskSHP_status = taskSHP.status()
  taskWM_status = taskWM.status()
  taskS2_status = taskS2.status()
  if taskSHP_status['state'] == 'COMPLETED' and taskWM_status['state'] == 'COMPLETED' and taskS2_status['state'] == 'COMPLETED':
    print(json.dumps(jsonBody))
    break
  elif taskSHP_status['state'] == 'FAILED' or taskWM_status['state'] == 'FAILED' or taskS2_status['state'] == 'FAILED':
    print('at least one of the tasks failed', file=sys.stderr)
    sys.exit(1)
  else:
    sleep(1)
