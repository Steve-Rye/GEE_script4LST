// 设置时间范围
var startDate = '2022-09-01';
var endDate = '2022-10-01';

// 设置条带号
var path = 122;
var row = 44;

// 加载 Landsat 8 数据集
var dataset = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(startDate, endDate) // 过滤时间
    .filter(ee.Filter.eq('WRS_PATH', path)) // 过滤 Path
    .filter(ee.Filter.eq('WRS_ROW', row));  // 过滤 Row

// 应用比例因子和偏移量校正，计算地表温度（LST）
var applyScaleFactors = function(image) {
  var LST = image.select('ST_B10')
                  .multiply(0.00341802)
                  .add(149.0).subtract(273.15); // 转换为摄氏度
  return image.addBands(LST.rename('LST'), null, true);
};

dataset = dataset.map(applyScaleFactors);

// 地图中心定位到数据集
Map.centerObject(dataset);

// 导出 LST 图像
var exportImages = function(image) {
  var fileName = image.get('LANDSAT_PRODUCT_ID');

  Export.image.toDrive({
    image: image.select('LST'),
    description: fileName.getInfo(),
    scale: 30,
    region: image.geometry(),
    maxPixels: 1e13
  });
};

// 循环遍历并导出图像
var imageList = dataset.toList(dataset.size());

// 添加真彩RGB图层
var addLayer = function(image, name) {
  Map.addLayer(image, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 65535, gamma: 2.0}, name);
};

var evaluateFileName = function(image) {
  var fileName = ee.String(image.get('LANDSAT_PRODUCT_ID'));
  fileName.evaluate(function(name) {
    addLayer(image, name);
  });
};

for (var i = 0; i < imageList.size().getInfo(); i++) {
  var image = ee.Image(imageList.get(i));
  evaluateFileName(image);
  print(image.getInfo()); // 打印图像元信息
  exportImages(image);
}