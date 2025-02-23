// 定义时间范围
var startDate = '2022-01-01';
var endDate = '2022-06-01';

// 定义条带号
var path = 122;
var row = 44;

// 定义Landsat 9 Level 2, Collection 2, Tier 1数据集
var dataset = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate(startDate, endDate)
    .filter(ee.Filter.eq('WRS_PATH', path))
    .filter(ee.Filter.eq('WRS_ROW', row));

// 应用比例因子和偏移量来校正ST_B10波段
var applyScaleFactors = function(image) {
  var thermalBands = image.select('ST_B10')
                          .multiply(0.00341802)
                          .add(149.0);
  return image.addBands(thermalBands.rename('LST'), null, true);
};

dataset = dataset.map(applyScaleFactors);

// 导出图像
var exportImages = function(image) {
  // 获取图像的原始文件名
  var fileName = image.get('LANDSAT_PRODUCT_ID');

  // 导出图像到Google Cloud Storage或Google Drive
  Export.image.toDrive({
    image: image.select('LST'),
    description: fileName.getInfo(),
    scale: 30, // 分辨率
    region: image.geometry(),
    maxPixels: 1e13
  });
};

// 循环遍历图像集合，并导出每个图像
var imageList = dataset.toList(dataset.size());

for (var i = 0; i < imageList.size().getInfo(); i++) {
  var image = ee.Image(imageList.get(i));
  exportImages(image);
}