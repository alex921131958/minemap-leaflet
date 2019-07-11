import { multiPoint, lineString, polygon, point, featureCollection } from '@turf/helpers'
import { pointToLineDistance, mask, union, convex, voronoi, tin, bbox, circle, buffer } from '@turf/turf'


//线面的自相交点
function selfIntersection(feature) {
    if(!feature) throw new Error('input must lineString');
    let type = feature.geometry.type;
    let points = [];
    let coors = type==='lineString'? [feature.geometry.coordinates] : feature.geometry.coordinates;
    coors.map(line1=>{
        coors.map(line2=>{
            for(let i=0; i<line1.length-1; i++){
                for(let k=i; k<line2.length-1; k++){
                    if(line1 === line2){
                        if (Math.abs(i - k) === 1) {
                            continue;
                        }
                        if (
                            i === 0 && k === line1.length - 2 &&
                            line1[i][0] === line1[line1.length - 1][0] &&
                            line1[i][1] === line1[line1.length - 1][1]) {
                            continue;
                        }
                    }
                    let line1_ = lineString([[line1[i][0], line1[i][1]], [line1[i + 1][0], line1[i + 1][1]]]);
                    let line2_ = lineString([[line2[k][0], line2[k][1]], [line2[k + 1][0], line2[k + 1][1]]]);
                    let intersection = interrupt(line1_, line2_);
                    // console.log(intersection);
                    if (intersection) {
                        points.push(intersection)
                    }
                }
            }
        })
    });
    return points
}

//线和线的交点
function lineIntersection(line1, line2) {
    let points = [];
    let type1 = line1.geometry.type;
    let type2 = line2.geometry.type;
    let coors1 = line1.geometry.coordinates;
    let coors2 = line2.geometry.coordinates;
    if(type1 !== "LineString" || type2 !== "LineString") throw new Error('input must lineString');
    if(coors1.length === 0 || coors2.length === 0) throw new Error('lineString must have points');
    if(coors1.length === 2 && coors2.length === 2){
        return [ interrupt(line1, line2) ]
    }
    if(coors1.length > 2 || coors2.length > 2){
        for(let i=0; i<coors1.length-1; i++){
            for(let j=0; j<coors2.length-1; j++){
                let temp = interrupt(lineString( [ coors1[i], coors1[i+1] ] ), lineString( [ coors2[j], coors2[j+1] ] ))
                // console.log(temp)
                if(temp){
                    points.push(temp)
                }
            }
        }
        return points
    }
}

//线的交点（线是双端点线）
function interrupt(line1, line2) {
    let line1_coor = line1.geometry.coordinates;
    let line2_coor = line2.geometry.coordinates;
    if(line1_coor.length !==2 || line2_coor.length !==2) throw new Error('line must have two points');

    let x1 = line1_coor[0][0];
    let y1 = line1_coor[0][1];
    let x2 = line1_coor[1][0];
    let y2 = line1_coor[1][1];
    let x3 = line2_coor[0][0];
    let y3 = line2_coor[0][1];
    let x4 = line2_coor[1][0];
    let y4 = line2_coor[1][1];
    //面积
    let area_123 = (x1 - x3) * (y2 - y3) - (y1 - y3) * (x2 - x3);
    let area_124 = (x1 - x4) * (y2 - y4) - (y1 - y4) * (x2 - x4);
    let area_134 = (x3 - x1) * (y4 - y1) - (y3 - y1) * (x4 - x1);
    let area_234 = area_134 + area_123 - area_124;
    
    //是否相交
    if(area_134 * area_234 >= 0 || area_123 * area_124 >= 0){
        return false
    }
    
    let t = area_134 / ( area_124- area_123 );
    let dx= t*(x2 - x1),
        dy= t*(y2 - y1);
    //todo 完善
    if(dx && dy){

    }
    return point([x1 + dx, y1 + dy])
}

//按顺序添加交点
function pointInsertPolygon(point_arr, inersectPoint) {
    if(point_arr.length<2) throw new Error('point_arr need two or more points');
    if(inersectPoint.length<2) throw new Error('inersectPoint need at least one point');
    for(let i=0; i<inersectPoint.length; i++){  //循环所有点
        let line_with_distance = [];
        let line_distance = [];
        for(let k=0; k<point_arr.length-1; k++){  //添加点
            let single_line = lineString([point_arr[k], point_arr[k+1]]);
            single_line.properties.distance = pointToLineDistance(inersectPoint[i], single_line).toFixed(8);  //科学计数法转数字
            line_with_distance.push(single_line);
            line_distance.push(single_line.properties.distance);
        }
        let line_with_distance_after_sort = line_with_distance.sort(function (a, b) {
            return a.properties.distance - b.properties.distance
        })[0];
        let temp_arr = [];
        for(let j=0; j<point_arr.length-1; j++){
            // [  point_arr[j],  point_arr[j+1] ] === line_with_distance_after_sort.geometry.coordinates  //false
            let condition1 = point_arr[j]===line_with_distance_after_sort.geometry.coordinates[0];
            let condition2 = point_arr[j+1]===line_with_distance_after_sort.geometry.coordinates[1];
            if(condition1 && condition2){
                temp_arr.push(point_arr[j], inersectPoint[i].geometry.coordinates, point_arr[j+1])
            }else{
                temp_arr.push(point_arr[j], point_arr[j+1])
            }
        }
        point_arr = Array.from(new Set(temp_arr));
    }
    return point_arr
}

//按点切割线段
function sliceLineByPoint(line_arr, point_arr) {
    let temp = [];
    let result = [];
    for(let i=0; i<point_arr.length; i++){
        // console.log(point_arr[i].geometry.coordinates);
        temp[i] = line_arr.indexOf(point_arr[i].geometry.coordinates)
    }
    temp.sort();
    for(let k=0; k<temp.length-1; k++){
        // console.log(line_arr.slice(temp[k], temp[k+1]+1));
        result.push(line_arr.slice(temp[k], temp[k+1]+1));
    }
    result.push(line_arr.slice(temp[temp.length-1]).concat(line_arr.slice(1, temp[0]+1)));
    return result
}

//连接两个首尾相连的线段
function connectLine(line1, line2) {
    let point_arr = [];
    let line1_last_point = line1.geometry.coordinates[line1.geometry.coordinates.length-1];
    let line2_first_point = line2.geometry.coordinates[0];
    if(line1_last_point===line2_first_point){
        point_arr = line1.geometry.coordinates.concat(line2.geometry.coordinates)
    }else{
        point_arr = line1.geometry.coordinates.concat(line2.geometry.coordinates.reverse())
    }
    let _point_arr = [];
    point_arr.map(item=>{
        if(_point_arr.indexOf(item)===-1) _point_arr.push(item)
    });

    _point_arr.push(_point_arr[0]);
    return _point_arr
}

//环面
function ringPolygon(inner, outer) {
    if(!outer) throw new Error('outer polygon is needed');
    if(!inner) throw new Error('inner polygon is needed');
    let coors = outer.geometry.coordinates;
    if(coors.length===1){
        return mask(inner, outer);
    }else{
        let _union = polygon([outer.geometry.coordinates[1]]);
        for(let i=2; i<outer.geometry.coordinates.length; i++){
            _union = union(polygon([outer.geometry.coordinates[i]]), _union)
        }
        _union = union(_union, inner);
        return mask(_union, polygon([outer.geometry.coordinates[0]]));
    }
}

//闭包
function pointConvex(points) {
    if(!points) throw new Error("pt is required");
    if(points instanceof Array){
        let points_arr = [];
        points.map(item=>{
            if(item.geometry.type==="Point"){
                points_arr.push(item)
            }
        });
        let temp = featureCollection(points_arr);
        return convex(temp)
    }
    if(points.type && points.type==="FeatureCollection"){
        return convex(points)
    }
}


//泰森多边形
function pointVoronoi(points) {
    if(!points) throw new Error("pt is required");
    let _bbox;
    let features;
    if(points instanceof Array){
        let points_arr = [];
        points.map(item=>{
            if(item.geometry.type==="Point"){
                points_arr.push(item)
            }
        });
        features = featureCollection(points_arr);
        _bbox = bbox(temp);
    }
    if(points.type && points.type==="FeatureCollection"){
        _bbox = bbox(points);
        features = points;
    }
    return voronoi(features, {
        bbox: _bbox
    })
}

//不规则三角网
function pointTin(points) {
    if(!points) throw new Error("pt is required");
    let features;
    if(points instanceof Array){
        let points_arr = [];
        points.map(item=>{
            if(item.geometry.type==="Point"){
                points_arr.push(item)
            }
        });
        features = featureCollection(points_arr);
    }
    if(points.type && points.type==="FeatureCollection"){
        features = points;
    }
    return tin(features)
}

//缓冲区
function featureBuffer(feature, options={
    steps: 64,
    units: 'kilometers',
    radius: 0.05,
    type: 'auto'
}) {
    if(!points) throw new Error("feature is required");
    let type = feature.geometry.type;
    let result;
    if (type === 'LineString') {
        let _buffer = buffer(feature, options.radius, {
            steps: options.steps,
            units: options.units
        });
        if(options.type==='inner'){
            result = _buffer[1]
        }else if(options.type==='outer'){
            result = _buffer[0]
        }else if(options.type==='auto'){
            result = _buffer
        }
    }else if(type === 'Point') {
        result = circle(feature, options.radius, {
            steps: options.steps,
            units: options.units
        })
    }
    return result
}

//中心点
function featureCenter() {

}

//简化线或多边形
function geoUtils(feature) {
    if (!feature) throw new Error('feature is required');
    let type = feature.geometry.type;
    let new_coors = [];
    if (type === 'LineString') {
        new_coors = cleanLine(feature);
    }else if(type === 'Polygon') {
        feature.geometry.coordinates.map(line => {
            new_coors.push(cleanLine(line))
        })
    }
    return new_coors
}

function cleanLine(line) {
    if(!line) throw new Error("line is required");
    let points = line.geometry.coordinates;
    if (points.length === 2 && !equals(points[0], points[1])) return points;
    let newPoints = [];
    let secondToLast = points.length - 1;
    let newPointsLength = newPoints.length;
    newPoints.push(points[0]);
    for (let i = 1; i < secondToLast; i++) {
        let prevAddedPoint = newPoints[newPoints.length - 1];
        if ((points[i][0] === prevAddedPoint[0]) && (points[i][1] === prevAddedPoint[1]))
            continue;
        else {
            newPoints.push(points[i]);
            newPointsLength = newPoints.length;
            if (newPointsLength > 2) {
                if (isPointOnLineSegment(newPoints[newPointsLength - 3], newPoints[newPointsLength - 1], newPoints[newPointsLength - 2]))
                    newPoints.splice(newPoints.length - 2, 1);
            }
        }
    }
    newPoints.push(points[points.length - 1]);
    newPointsLength = newPoints.length;
    if (equals(points[0], points[points.length - 1]) && newPointsLength < 4)
        throw new Error('invalid polygon');
    if (isPointOnLineSegment(newPoints[newPointsLength - 3], newPoints[newPointsLength - 1], newPoints[newPointsLength - 2]))
        newPoints.splice(newPoints.length - 2, 1);
    return newPoints;
}

//判断两个点是否相同 注意：point[0,0] !== point[0,0]
function equals(pt1, pt2) {
    return pt1[0] === pt2[0] && pt1[1] === pt2[1];
}

function isPointOnLineSegment(start, end, point) {
    let x = point[0], y = point[1];
    let startX = start[0], startY = start[1];
    let endX = end[0], endY = end[1];
    let dxc = x - startX;
    let dyc = y - startY;
    let dxl = endX - startX;
    let dyl = endY - startY;
    let cross = dxc * dyl - dyc * dxl;
    if (cross !== 0)
        return false;
    else if (Math.abs(dxl) >= Math.abs(dyl))
        return dxl > 0 ? startX <= x && x <= endX : endX <= x && x <= startX;
    else
        return dyl > 0 ? startY <= y && y <= endY : endY <= y && y <= startY;
}

//

//

export { lineIntersection, selfIntersection, pointInsertPolygon, sliceLineByPoint, connectLine, ringPolygon,
    pointConvex, pointVoronoi, pointTin, geoUtils, featureBuffer }