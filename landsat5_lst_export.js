// 时间范围，可修改
var startDate = '2008-07-01';
var endDate = '2008-08-01';

// 条带号，可修改
var path = 122;
var row = 44;

// 加载 Landsat 5 数据集（Landsat 5 Level 2, Collection 2, Tier 1数据集）
var dataset = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterDate(startDate, endDate) // 过滤时间
    .filter(ee.Filter.eq('WRS_PATH', path)) // 过滤path
    .filter(ee.Filter.eq('WRS_ROW', row));  // 过滤row

// 应用比例因子和偏移量校正 ST_B6 波段
var applyScaleFactors = function(image) {
  var thermalBands = image.select('ST_B6') // 选择ST_B6波段
                          .multiply(0.00341802) // 乘以比例因子
                          .add(149.0).subtract(273.15); // 加上偏移量并转换为摄氏度
  return image.addBands(thermalBands.rename('LST'), null, true); // 重命名为LST
};

dataset = dataset.map(applyScaleFactors);

// 地图中心定位
Map.centerObject(dataset);

// 导出图像
var exportImages = function(image) {
  var fileName = image.get('LANDSAT_PRODUCT_ID');

  Export.image.toDrive({
    image: image.select('LST'), // 选择LST波段
    description: fileName.getInfo(),
    scale: 30, // 分辨率
    region: image.geometry(),
    maxPixels: 1e13
  });
};

// 循环遍历并导出
var imageList = dataset.toList(dataset.size());

for (var i = 0; i < imageList.size().getInfo(); i++) {
  var image = ee.Image(imageList.get(i));
  
  // LST波段显示参数
  var lstParams = {min: 0, max: 60, palette: ['black', 'white']};
  // 添加LST图层
  Map.addLayer(image.select('LST'), lstParams, image.get('LANDSAT_PRODUCT_ID').getInfo() + '_LST');
  
  exportImages(image);
}