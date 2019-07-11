# minemap-leaflet

## Project setup
```
npm install minemap-leaflet
```

### MMLeaflet

####参数
##### mapTitleLayer
地图瓦片<br>
minemap底图瓦片分为两部分，测试阶段可以使用高德或腾讯地图瓦片服务<br>
//http://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}  高德<br>
//http://rt{s}.map.gtimg.com/realtimerender?z={z}&x={x}&y={y}&type=vector&style={t} 腾讯<br>
##### poiTitleLayer
poi瓦片<br>
##### titleLayerOptions
minZoom: `Number` 地图瓦片最小显示级别<br>
maxZoom: `Number` 地图瓦片最大显示级别<br>
tileSize: `Number` 瓦片大小<br>
瓦片配置项，注意minemap瓦片大小为512*512，高德、百度、Google为256*256<br>
##### mapOptions
preferCanvas: `boolean(default:false)` 是否应在Canvas渲染器上渲染路径<br>
crs: `Crs` 要使用的坐标参考系统<br>
center: `LatLng` 地图中心点<br>
zoom: `Number` Zoom显示范围<br>
minZoom: `Number` 最小显示级别<br>
maxZoom: `Number` 最大显示级别<br>
layers: `Layer[]` 最初给地图添加的图层<br>
maxBounds: `LatLngBounds` 给定的地图视窗范围<br>
地图配置项<br>
```html
<MMLeaflet :mapTitleLayer='xxxx://xxxxxxxx/xxxxx/view/{z}/{x}/{y}'
           :poiTitleLayer='xxxx://xxxxxxxx/xxxxx/view/t/{z}/{x}/{y}'
           :titleLayerOptions={}
           :mapOptions={}
/>
```

### Editor

####参数
##### editor_item
可选择项，提供'point','line','adsorptionLine','intersectLine','polygon','maskPolygon','intersectPolygon','unionPolygon','differencePolygon','rectangle','circle'类型<br>
point: 创建点<br>
line: 创建普通线<br>
adsorptionLine: 创建可吸附线<br>
intersectLine: 创建可打断线，该线可以切割线段或者平面<br>
polygon: 创建面<br>
maskPolygon: 创建环面<br>
intersectPolygon: 得到面的交集<br>
unionPolygon: 得到面的并集<br>
differencePolygon: 得到两个面的差集<br>
rectangle: 创建矩形<br>
circle: 创建圆<br>
```html
 <Editor :editor_item="['point','line','adsorptionLine','intersectLine','polygon','maskPolygon']"></editor>
```
### Function
#### interrupt()
输入双端点线段，返回相交处的单个点<br>
这里使用矢量求面积法进行算法优化，可提高部分效率<br>
##### arguments
line: GeoJSON<br>
```html
var line1 = line([[0,0],[0,2]]);
var line2 = line([[1,-1],[1,1]]);
interrupt(line1, line2);
//point([1,0])
```

#### lineIntersection()
输入多端点线段，返回相交点的数组<br>
##### arguments
line: GeoJSON<br>
```html
var line1 = line([[0,0],[0,4]]);
var line2 = line([[0,-1],[2,1],[4,-1]]);
lineIntersection(line1, line2);
//[point([1,0]), point([3,0])]
```
#### selfIntersection()
输入线或面，输出线或面的自相交点数组、若无自相交输出false<br>
##### arguments
feature: GeoJSON<br>
```html
var line = line([[0,0],[2,2],[0,2],[2,0]]);
selfIntersection(line);
//[point([1,1])]
```

#### pointInsertPolygon()
按空间顺序将点插入线或面的coordinates中，返回插入点后的新数组，点必须在线或者面的边上 <br>
##### arguments
coors: Array<br>
points: [ GeoJSON ]<br>
```html
var line = line([[0,0],[2,0],[2,2],[0,2],[0,0]]);
var point = point([2,1]);
pointInsertPolygon(line.geometry.coordinates, points);
//[[0,0],[2,0],[2,1],[2,2],[0,2],[0,0]]
```

#### sliceLineByPoint()
输入线和点，按点切割线段，点需在线上，返回被切后线的数组 <br>
##### arguments
coors: Array<br>
points: [ GeoJSON ]<br>
```html
var line = line([[0,0],[2,0],[2,2],[0,2],[0,0]]);
var point = point([2,2]);
sliceLineByPoint(line。geometry.coordinates, point);
//[[[0,0],[2,0],[2,2]], [[2,2],[0,2],[0,0]]]
```

#### ringPolygon()
输入包含关系的两个多边形，返回一个环装多边形 <br>
##### arguments
inner: GeoJSON 包含关系多边形被包含部分的多边形<br>
outer: GeoJSON 包含关系多边形包含部分的多边形<br>
```html
var polygon1 = line([[1,1],[3,1],[3,3],[1,3],[1,1]]);
var polygon2 = line([[0,0],[4,0],[4,4],[0,4],[0,0]]);
ringPolygon(polygon1, polygon2);
//polygon([[[0,0],[4,0],[4,4],[0,4],[0,0]], [[1,1],[3,1],[3,3],[1,3],[1,1]]])
```

#### connectLine()
输入两条线段，返回连接后的一条线 <br>
##### arguments
line: GeoJSON<br>
```html
var line1 = line([[0,0],[4,0],[4,4]]);
var line2 = line([[4,4],[0,4],[0,0]]);
connectLine(line1, line2);
//line([[0,0],[4,0],[4,4],[0,4],[0,0]])
```

#### pointConvex()
输入点集，返回该点集的闭包<br>
##### arguments
points: [ point ] / FeatureCollection <br>
```html
var point1 = point([0,0]);
var point2 = point([1,0]);
var point3 = point([0,1]);
var point4 = point([0,-1]);
var point5 = point([-1,0]);
pointConvex([point1, point2, point3, point4, point5]);
//FeatureCollection
```

#### pointVoronoi()
pointVoronoi(): 输入点集，返回改点集的泰森多边形<br>
##### arguments
points: [ point ] / FeatureCollection <br>
```html
var point1 = point([0,0]);
var point2 = point([1,0]);
var point3 = point([0,1]);
var point4 = point([0,-1]);
var point5 = point([-1,0]);
pointVoronoi([point1, point2, point3, point4, point5]);
//FeatureCollection
```

#### pointTin()
pointTin(): 输入点集，返回该点集的不规则三角网<br>
##### arguments
points: [ point ] / FeatureCollection <br>
```html
var point1 = point([0,0]);
var point2 = point([1,0]);
var point3 = point([0,1]);
var point4 = point([0,-1]);
var point5 = point([-1,0]);
pointTin([point1, point2, point3, point4, point5]);
//FeatureCollection
```

#### featureBuffer()
featureBuffer(): 输入点或线，返回输入feature的缓冲区<br>
##### arguments
feature: point / line <br>
options: <br>
  steps: Number 生成缓冲区包含的点数 <br>
  units: String(miles, kilometers, degrees, or radians) 缓冲区距离单位 <br>
  radius: Number 缓冲区单位长度 <br>
  type: String(inner,outer or auto) 缓冲区类型,在选择线缓冲区时生效 <br>
```html
var point = point([0,0]);
var line = line([[0,0],[4,0],[4,4],[0,4],[0,0]]);
featureBuffer(point, {
          steps:64,
          units:'kilometers',
          radius:0.05,
});
//FeatureCollection
featureBuffer(line， {
          units:'kilometers',
          radius:0.05,
          type:'auto'
});
//FeatureCollection
```

#### geoUtils()
simplify():  输入线或多边形，返回简化后的点的数组<br>
##### arguments
feature: polygon / line <br>
```html
var line = line([[0,0],[1,0],[2,0],[3,0],[4,0]]);
geoUtils(line)
//line([[0,0], [0,4])
```


### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
