/*
 * Landsat 9 Level 2, Collection 2, Tier 1数据集波段说明
 * 
 * 地表温度相关波段：
 * ST_B10 - 热红外波段温度
 *   - 比例因子: 0.00341802
 *   - 偏移量: 149.0
 *   注：TIRS的Band10热红外波段与TM/ETM+6热红外波段具有近似的波谱范围
 * 
 * 大气参数相关波段：
 * ST_TRAD - 传感器接收的热红外辐射亮度
 *   - 比例因子: 0.001
 * ST_URAD - 大气上行辐射
 *   - 比例因子: 0.001
 * ST_ATRAN - 大气透射率
 *   - 比例因子: 0.0001
 * ST_DRAD - 大气下行辐射
 *   - 比例因子: 0.001
 * 
 * 地表反射率波段：
 * Landsat 8/9的波段对应：
 * SR_B2 - 蓝光波段
 * SR_B3 - 绿光波段
 * SR_B4 - 红光波段
 * SR_B5 - 近红外波段
 * 
 * 当前使用波段的校正参数：
 * SR_B4 - 红光波段表观反射率
 *   - 比例因子: 0.0000275
 *   - 偏移量: -0.2
 * SR_B5 - 近红外波段表观反射率
 *   - 比例因子: 0.0000275
 *   - 偏移量: -0.2
 * 
 * 计算过程中使用的常量参数：
 * 
 * 1. 地表比辐射率计算：
 *    采用Sobrino提出的NDVI阈值法计算地表比辐射率
 *    公式：ε = 0.004 * Pv + 0.986
 *    其中Pv为植被覆盖度
 * 
 * 2. 植被覆盖度(Pv)计算：
 *    公式：Pv = [(NDVI - NDVISoil)/(NDVIVeg - NDVISoil)]
 *    参数说明：
 *    - NDVIVeg = 0.70 (完全被植被覆盖的像元的NDVI值，即纯植被像元)
 *    - NDVISoil = 0.05 (完全是裸土或无植被覆盖区域的NDVI值)
 *    边界条件：
 *    - 当NDVI > 0.70时，Pv = 1
 *    - 当NDVI < 0.05时，Pv = 0
 *    注：本例采用简化的植被覆盖度计算模型，可根据需要使用更精确的计算模型
 * 
 * 3. 普朗克公式常量：
 *    不同传感器的辐射常数：
 *    TM (Landsat 5):
 *      - K1 = 607.76 W/(m2*µm*sr)
 *      - K2 = 1260.56 K
 *    ETM+ (Landsat 7):
 *      - K1 = 666.09 W/(m2*µm*sr)
 *      - K2 = 1282.71 K
 *    TIRS Band10 (Landsat 8/9):
 *      - K1 = 774.89 W/(m2*µm*sr)
 *      - K2 = 1321.08 K
 */

// 设置时间范围
var startDate = '2022-09-01';
var endDate = '2022-10-01';

// 月份过滤参数设置
// 1. includeMonths: 指定要包含的月份数组，例如[5,6,7]表示只包含5、6、7月
// 2. excludeMonths: 指定要排除的月份数组，例如[1,2,12]表示排除1、2、12月
// 注意：如果同时设置了includeMonths和excludeMonths，优先使用includeMonths
var includeMonths = null; // 例如: [5, 6, 7]
var excludeMonths = null; // 例如: [1, 2, 12]
 


// 设置云量限制参数
var cloudCoverMinThreshold = 0;    // 最小云量百分比（0-100），默认0表示不限制最小云量
var cloudCoverMaxThreshold = 100;  // 最大云量百分比（0-100），默认100表示不限制最大云量

// 设置条带号
var path = 122;
var row = 44;

// 加载 Landsat 9 数据集（Landsat 9 Level 2, Collection 2, Tier 1数据集）
var dataset = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterDate(startDate, endDate) // 过滤时间
    .filter(ee.Filter.eq('WRS_PATH', path)) // 过滤 Path
    .filter(ee.Filter.eq('WRS_ROW', row));  // 过滤 Row

// 按月份过滤
if (includeMonths !== null && includeMonths.length > 0) {
  // 创建包含指定月份的过滤器
  var monthFilters = includeMonths.map(function(month) {
    return ee.Filter.calendarRange(month, month, 'month');
  });
  
  // 组合所有月份过滤器（OR关系）
  var combinedFilter;
  if (monthFilters.length === 1) {
    combinedFilter = monthFilters[0];
  } else {
    combinedFilter = ee.Filter.or.apply(null, monthFilters);
  }
  
  // 应用月份过滤器
  dataset = dataset.filter(combinedFilter);
  print('已筛选包含月份:', includeMonths);
} else if (excludeMonths !== null && excludeMonths.length > 0) {
  // 创建排除指定月份的过滤器
  var monthFilters = excludeMonths.map(function(month) {
    return ee.Filter.calendarRange(month, month, 'month');
  });
  
  // 组合所有月份过滤器（OR关系）
  var combinedFilter;
  if (monthFilters.length === 1) {
    combinedFilter = monthFilters[0];
  } else {
    combinedFilter = ee.Filter.or.apply(null, monthFilters);
  }
  
  // 应用排除月份过滤器（NOT）
  dataset = dataset.filter(combinedFilter.not());
  print('已排除月份:', excludeMonths);
}

// 按云量范围过滤
dataset = dataset
  .filter(ee.Filter.gte('CLOUD_COVER', cloudCoverMinThreshold))
  .filter(ee.Filter.lte('CLOUD_COVER', cloudCoverMaxThreshold));
print('云量范围设置为:', cloudCoverMinThreshold + '% - ' + cloudCoverMaxThreshold + '%');

// 检查筛选结果
var imageCount = dataset.size().getInfo();
print('符合条件的影像数量:', imageCount);

// 定义计算地表温度的主要函数
// 包括：波段校正、NDVI计算、植被覆盖度计算、比辐射率计算、地表温度计算
var calculateLST = function(image) {
  // 计算USGS提供的LST产品
  var LST = image.select('ST_B10')
                 .multiply(0.00341802)
                 .add(149.0).subtract(273.15); // 转换为摄氏度

  // 校正大气参数相关波段
  var ST_TRAD = image.select('ST_TRAD').multiply(0.001); // 传感器接受辐射亮度
  var ST_URAD = image.select('ST_URAD').multiply(0.001); // 大气上行辐射
  var ST_ATRAN = image.select('ST_ATRAN').multiply(0.0001); // 大气透射率
  var ST_DRAD = image.select('ST_DRAD').multiply(0.001); // 大气下行辐射

  // 校正反射率波段并计算NDVI
  var SR_B5 = image.select('SR_B5').multiply(0.0000275).add(-0.2); // NIR波段
  var SR_B4 = image.select('SR_B4').multiply(0.0000275).add(-0.2); // 红光波段
  var NDVI = SR_B5.subtract(SR_B4).divide(SR_B5.add(SR_B4)); // 计算NDVI

  // 计算植被覆盖度Pv
  var NDVIVeg = ee.Image.constant(0.70);
  var NDVISoil = ee.Image.constant(0.05);
  var Pv = NDVI.subtract(NDVISoil)
               .divide(NDVIVeg.subtract(NDVISoil));
  
  // 处理Pv的边界条件
  Pv = Pv.where(NDVI.gt(0.70), 1)  // NDVI > 0.70时，Pv = 1
         .where(NDVI.lt(0.05), 0)   // NDVI < 0.05时，Pv = 0
         .clamp(0, 1);              // 限制Pv在[0,1]范围内

  // 基于植被覆盖度计算比辐射率
  var EM = Pv.multiply(0.004).add(0.986);

  // 计算黑体辐射
  var blackbodyRadiation = ST_TRAD.subtract(ST_URAD).subtract(
    ST_ATRAN.multiply(ee.Image(1).subtract(EM)).multiply(ST_DRAD)
  ).divide(ST_ATRAN.multiply(EM));

  // 使用普朗克公式计算地表温度LST2
  var LST2 = ee.Image(1321.08).divide(
    ee.Image(774.89).divide(blackbodyRadiation).add(1).log()
  ).subtract(273.15);

  return image.addBands(LST.rename('LST'))
             .addBands(LST2.rename('LST2')); // 添加两种方法计算的地表温度结果
};

// 检查是否有符合条件的影像
if (imageCount === 0) {
  // 没有符合条件的影像，显示警告信息
  print('警告: 没有符合筛选条件的影像!');
  print('请尝试放宽筛选条件，例如:');
  print(' - 扩大时间范围');
  print(' - 调整月份筛选设置');
  print(' - 放宽云量限制');
  print(' - 检查Path/Row设置');
  
  // 在地图上显示提示
  var panel = ui.Panel({
    style: {
      position: 'top-center',
      padding: '8px 15px',
      width: '400px',
      backgroundColor: 'rgba(255, 165, 0, 0.8)'  // 橙色背景带透明度
    }
  });
  
  panel.add(ui.Label({
    value: '⚠️ 警告: 没有符合筛选条件的影像!',
    style: {fontWeight: 'bold', fontSize: '16px', margin: '2px 0'}
  }));
  
  Map.add(panel);
  
} else {
  // 有符合条件的影像，继续处理
  dataset = dataset.map(calculateLST);

  // 地图中心定位到数据集
  Map.centerObject(dataset);

  // 导出 LST 图像
  var exportImages = function(image) {
    var fileName = image.get('LANDSAT_PRODUCT_ID');

    // 导出LST
    Export.image.toDrive({
      image: image.select('LST'),
      description: fileName.getInfo() + '_LST',
      scale: 30,
      region: image.geometry(),
      maxPixels: 1e13
    });

    // 导出LST2
    Export.image.toDrive({
      image: image.select('LST2'),
      description: fileName.getInfo() + '_LST2',
      scale: 30,
      region: image.geometry(),
      maxPixels: 1e13
    });
}  ;

  // 循环遍历并导出图像
  var imageList = dataset.toList(dataset.size());

  // 添加真彩RGB图层和LST图层
  var addLayer = function(image, name) {
    // 添加RGB图层
    Map.addLayer(image, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 65535, gamma: 2.0}, 'RGB_' + name);
    // 添加LST图层
    Map.addLayer(image.select('LST'), {min: 20, max: 40, palette: ['blue', 'limegreen', 'yellow', 'darkorange', 'red']}, 'LST_' + name);
    // 添加LST2图层
    Map.addLayer(image.select('LST2'), {min: 20, max: 40, palette: ['blue', 'limegreen', 'yellow', 'darkorange', 'red']}, 'LST2_' + name);
  };

  var evaluateFileName = function(image) {
    var fileName = ee.String(image.get('LANDSAT_PRODUCT_ID'));
    fileName.evaluate(function(name) {
      addLayer(image, name);
    });
}  ;  

for (var i = 0; i < imageList.size().getInfo(); i++) {
    var image = ee.Image(imageList.get(i));
    evaluateFileName(image);
    print(image.getInfo()); // 打印图像元信息
    exportImages(image);
  }
}