<template>
    <div class="editor">
        <div v-for="item in editor_arr"
             @click="startPaint(item)"
             :key="item"
             class="editor-item"
             v-if=""
        >
            {{item}}
        </div>
    </div>
</template>

<script>
//leaflet加载瓦片默认zoom:400
import { multiPoint, lineString, polygon, point, featureCollection } from '@turf/helpers'
import { flip, polygonToLine, booleanContains, lineSplit, booleanWithin, difference, intersect, union, circle, distance } from '@turf/turf'
import { lineIntersection, selfIntersection, pointInsertPolygon, sliceLineByPoint, connectLine, ringPolygon } from './geoUtils'

    export default {
        name: "editor",
        data(){
            return{
                map: null,
                editor_arr: [],
                point_arr: [],        //存放point
                line_arr: [],         //存放line
                polygon_arr: [],      //存放polygon
                editor_status: '',    //当先编辑状态
                isEditor: false,     //当前是否编辑
                select_arr:[],       //选中状态数组
            }
        },
        props:{
            editor_item:{
                type: Array,
                required: true,
            }
        },
        mounted(){
            this.$nextTick(()=>{
                this.editor_arr = this.editor_item;
                this.map = this.$parent.map;
                // this.polygon_arr.push(L.polygon([[25.431066, 119.010424],[25.430126, 119.009823],[25.428856, 119.010826],[25.430189, 119.01191],[25.431066, 119.010424]]).addTo(this.map));
                // this.polygon_arr.push(L.polygon([
                //         [[25.431066, 119.010424],[25.430126, 119.009823],[25.428856, 119.010826],[25.430189, 119.01191],[25.431066, 119.010424]],
                //         [[25.430616, 119.010542],[25.430218, 119.010183],[25.429413, 119.01073],[25.430616, 119.010542]],
                        // [[25.430426, 119.011030],[25.429922, 119.010949],[25.429820, 119.01134],[25.430426, 119.011030]]
                    // ]
                // ).addTo(this.map));

                this.mapEvent();
            });
        },
        methods:{
            mapEvent(){
                let snapMarker = L.marker(this.map.getCenter(), {
                    icon: this.map.editTools.createVertexIcon({
                        className: 'leaflet-div-icon leaflet-drawing-icon'
                    }),
                    opacity: 1,
                    zIndexOffset: 1000,
                });
                let snap_marker = new L.Handler.MarkerSnap(this.map, {
                    snapDistance: 15,
                    snapVertices: true,
                });
                let addSnapGuideLayersForMarker = function(e){
                    for (let i in this.map._layers) {
                        if (this.map._layers[i]._leaflet_id !== e.layer._leaflet_id && this.map._layers[i] instanceof L.Polyline) {
                            snap_marker.addGuideLayer(this.map._layers[i])
                        }
                    }
                };
                let followMouse = function(e) {
                    snapMarker.setLatLng(e.latlng)
                };

                this.map.on('editable:drawing:commit',(e)=>{
                    if(this.editor_status==='point'){
                        this.point_arr.push(e.layer)
                    }
                    if(this.editor_status==='line'){
                        this.line_arr.push(e.layer)
                    }
                    if(this.editor_status==='adsorptionLine'){

                    }
                    if(this.editor_status==='intersectLine'){
                        this.intersectLineHandle(e)
                    }
                    if(this.editor_status==='polygon'){
                        this.polygon_arr.push(e.layer)
                    }
                    if(this.editor_status=== 'maskPolygon'){
                        this.maskPolygonHandle(e);
                    }
                    if(this.editor_status==='intersectPolygon'){
                       this.intersectPolygonHandle(e)
                    }
                    if(this.editor_status==='unionPolygon'){
                        this.unionPolygonHandle(e)
                    }
                    if(this.editor_status==='differencePolygon'){
                        this.differencePolygonHandle(e)
                    }
                    if(this.editor_status==='circle'){
                        this.circleHandle(e)
                    }
                    if(this.editor_status==='rectangle'){
                        this.polygon_arr.push(e.layer)
                    }
                    e.layer.on('click', (layer)=>{
                        let color = layer.target.options.color==='#FF3399'? '#3388ff':'#FF3399';
                        layer.target.setStyle({
                            color: color
                        });
                    });
                });

                this.map.on('editable:drawing:start',(e)=>{
                    if(this.editor_status==='adsorptionLine'){
                        snap_marker.watchMarker(snapMarker);
                        snap_marker.clearGuideLayers();
                        addSnapGuideLayersForMarker(e);
                        this.map.on('mousemove', followMouse);
                    }
                });
                this.map.on('editable:drawing:end', (e)=>{
                    if(this.editor_status==='adsorptionLine'){
                        snap_marker.unwatchMarker(snapMarker);
                        snap_marker.clearGuideLayers();
                        this.map.off('mousemove', followMouse);
                    }
                });
                this.map.on('editable:vertex:dragstart',(e)=>{
                    if(this.editor_status==='adsorptionLine'){
                        snap_marker.watchMarker(e.vertex);
                        snap_marker.clearGuideLayers();
                        addSnapGuideLayersForMarker(e);
                    }
                });
                //顶点拖拽后触发
                this.map.on('editable:vertex:dragend',(e)=>{
                    if(this.editor_status==='adsorptionLine'){
                        snap_marker.unwatchMarker(e.vertex);
                        snap_marker.clearGuideLayers();
                    }
                });

            },

            startPaint(data){
                this.editor_status = data;
                switch(data){
                    case 'point':
                        this.map.editTools.startMarker();
                        return;
                    case 'line':
                    case 'adsorptionLine':
                    case 'intersectLine':
                        this.map.editTools.startPolyline();
                        return;
                    case 'polygon':
                    case 'maskPolygon':
                    case 'intersectPolygon':
                    case 'unionPolygon':
                    case 'differencePolygon':
                        this.map.editTools.startPolygon();
                        return;
                    case 'rectangle':
                        this.map.editTools.startRectangle();
                        return;
                    case 'circle':
                        this.map.editTools.startCircle();
                        return;
                }
            },

            intersectLineHandle(e){
                let _line = flip(e.layer.toGeoJSON());
                if(this.polygon_arr.length > 0){
                    this.polygon_arr.map(poly=>{
                        let _poly =flip(poly.toGeoJSON());
                        if(_poly.geometry.coordinates.length === 1){   //没有内切面
                            let inersect_point = lineIntersection(_line, polygonToLine(_poly));   //线和面的交点
                            if(inersect_point.length === 2){
                                let outer_point_arr = pointInsertPolygon(polygonToLine(_poly).geometry.coordinates, inersect_point);
                                let line_point_arr = pointInsertPolygon(_line.geometry.coordinates, inersect_point);
                                let outer_line_arr = sliceLineByPoint(outer_point_arr, inersect_point);
                                let inner_line = sliceLineByPoint(line_point_arr, inersect_point)[0];
                                outer_line_arr.map(item=>{
                                    let temp_arr = connectLine(lineString(item), lineString(inner_line));
                                    let po = L.polygon([temp_arr], {color: '#000'}).addTo(this.map);
                                    po.on('click',(item)=>{
                                        item.sourceTarget.enableEdit();
                                    });
                                })
                            }else if(inersect_point.length !== 2 && inersect_point.length % 2===0){

                            }
                            else{
                                throw new Error('Please cross the polygon')
                            }
                        }
                        if(_poly.geometry.coordinates.length === 2){    //环面
                            let outer_inersect = lineIntersection(_line, polygonToLine(polygon([_poly.geometry.coordinates[0]])));
                            let inner_inersect = lineIntersection(_line, polygonToLine(polygon([_poly.geometry.coordinates[1]])));
                            if(outer_inersect.length===2 && inner_inersect.length===2){
                                let outer_polygon_point_array = pointInsertPolygon(polygonToLine(_poly).geometry.coordinates[0], outer_inersect);
                                let inner_polygon_point_array = pointInsertPolygon(polygonToLine(_poly).geometry.coordinates[1], inner_inersect);
                                let line_point_arr_outer = pointInsertPolygon(_line.geometry.coordinates, outer_inersect);
                                let line_point_arr_inner = pointInsertPolygon(_line.geometry.coordinates, inner_inersect);
                                let outer_line_arr = sliceLineByPoint(outer_polygon_point_array, outer_inersect);
                                let inner_line_arr = sliceLineByPoint(inner_polygon_point_array, inner_inersect);
                                let outer_inner_line = sliceLineByPoint(line_point_arr_outer, outer_inersect)[0];
                                let inner_inner_line = sliceLineByPoint(line_point_arr_inner, inner_inersect)[0];
                                let outer_polygon_arr = [];
                                let inner_polygon_arr = [];
                                outer_line_arr.map(item=>{
                                    let temp_arr = connectLine(lineString(item), lineString(outer_inner_line));
                                    outer_polygon_arr.push(polygon([temp_arr]));
                                });
                                inner_line_arr.map(item=>{
                                    let temp_arr = connectLine(lineString(item), lineString(inner_inner_line));
                                    inner_polygon_arr.push(polygon([temp_arr]));
                                });
                                let diff = difference(outer_polygon_arr[0], inner_polygon_arr[0]);
                                let diff_ = difference(outer_polygon_arr[1], inner_polygon_arr[1]);
                                let po = L.polygon(diff.geometry.coordinates, {color: '#000'}).addTo(this.map);
                                let po_ = L.polygon(diff_.geometry.coordinates, {color: '#000'}).addTo(this.map);
                                po.on('click',(item)=>{
                                    item.sourceTarget.enableEdit();
                                });
                                po_.on('click',(item)=>{
                                    item.sourceTarget.enableEdit();
                                })
                            }
                            if(outer_inersect.length===2 && inner_inersect.length===0){
                                let po;
                                let outer_point_arr = pointInsertPolygon(polygonToLine(_poly).geometry.coordinates[0], outer_inersect);
                                let line_point_arr = pointInsertPolygon(_line.geometry.coordinates, outer_inersect);
                                let outer_line_arr = sliceLineByPoint(outer_point_arr, outer_inersect);
                                let inner_line = sliceLineByPoint(line_point_arr, outer_inersect)[0];
                                let inner_polygon = polygon([_poly.geometry.coordinates[1]]);   //内环
                                outer_line_arr.map(item=>{
                                    item.push(item[0]);
                                    let temp_arr = connectLine(lineString(item), lineString(inner_line));
                                    if(item.length>3){
                                        let isWithin = booleanWithin(inner_polygon, polygon([item]));
                                        item.pop();
                                        if(isWithin){
                                            po = L.polygon([temp_arr, inner_polygon.geometry.coordinates[0]], {color: '#000'}).addTo(this.map);
                                        }else{
                                            po = L.polygon([temp_arr], {color: '#000'}).addTo(this.map);
                                        }
                                    }else{
                                        po = L.polygon([temp_arr], {color: '#000'}).addTo(this.map);
                                    }
                                    po.on('click',(item)=>{
                                        item.sourceTarget.enableEdit();
                                    });
                                })
                            }


                        }
                    })
                }
                if(this.line_arr.length > 0){
                    this.line_arr.map((item,index)=>{
                        let _item = flip(item.toGeoJSON());
                        let isIntersect = lineIntersection(_item, _line);
                        if(isIntersect[0]){
                            let newLine1 = lineSplit(_item, _line);
                            item.remove();
                            newLine1.features.map(item => {
                                let line = L.polyline(item.geometry.coordinates, {color: '#000'}).addTo(this.map);
                                line.on('click', (e) => {
                                    e.sourceTarget.enableEdit();
                                })
                            });
                        }
                    })
                }
                this.line_arr.push(e.layer)
            },

            maskPolygonHandle(e){
                let _polygon = flip(e.layer.toGeoJSON());
                let po = null;
                let maskPolygon = null;
                if(this.polygon_arr.length>0){
                    this.polygon_arr.map((poly, index)=>{
                        let _poly = flip(poly.toGeoJSON());
                        let isIntersect = (booleanContains(_polygon, _poly) || booleanContains(_poly, _polygon));
                        if(isIntersect){
                            maskPolygon = booleanContains(_poly, _polygon)? ringPolygon(_polygon, _poly):ringPolygon(_poly, _polygon);
                            this.map.removeLayer(e.layer);
                            this.map.removeLayer(poly);
                            po = L.polygon(maskPolygon.geometry.coordinates, {color: '#000'}).addTo(this.map);
                            po.on('click',(item)=>{
                                item.sourceTarget.enableEdit();
                            });
                            this.polygon_arr[index]=po
                        }else{
                            this.polygon_arr.push(e.layer)
                        }
                    });
                }else{
                    this.polygon_arr.push(e.layer)
                }
            },

            intersectPolygonHandle(e){
                if(this.polygon_arr.length>0){
                    let _polygon = flip(e.layer.toGeoJSON());
                    this.polygon_arr.map((item,index)=>{
                        let _item = flip(item.toGeoJSON());
                        let _intersect = intersect(_item, _polygon);
                        if(_intersect){
                            let po = L.polygon(_intersect.geometry.coordinates, {color: '#000'}).addTo(this.map);
                            po.on('click',(item)=>{
                                item.sourceTarget.enableEdit();
                            });
                        }
                    });
                    this.polygon_arr.push(e.layer)
                }else{
                    this.polygon_arr.push(e.layer)
                }
            },

            unionPolygonHandle(e){
                if(this.polygon_arr.length>0){
                    let _polygon = flip(e.layer.toGeoJSON());
                    let temp = [];
                    this.polygon_arr.map((item,index)=>{
                        let _item = flip(item.toGeoJSON());
                        let _intersect = intersect(_item, _polygon);
                        if(_intersect){
                            temp.push(_item);
                        }
                    });
                    if(temp.length > 0){
                        let _union = union(_polygon, ...temp);
                        let po = L.polygon(_union.geometry.coordinates, {color: '#000'}).addTo(this.map);
                        po.on('click',(item)=>{
                            item.sourceTarget.enableEdit();
                        });
                    }
                    this.polygon_arr.push(e.layer)
                }else{
                    this.polygon_arr.push(e.layer)
                }
            },

            differencePolygonHandle(e){
                if(this.polygon_arr.length>0){
                    let _polygon = flip(e.layer.toGeoJSON());
                    let temp = [];
                    this.polygon_arr.map((item,index)=>{
                        let _item = flip(item.toGeoJSON());
                        let _intersect = intersect(_item, _polygon);
                        if(_intersect){
                            temp.push(_item);
                        }
                    });
                    if(temp.length > 0){
                        temp.map(coor=>{
                            let _difference = difference(coor, _polygon);
                            let po = L.polygon(_difference.geometry.coordinates, {color: '#000'}).addTo(this.map);
                            po.on('click',(item)=>{
                                item.sourceTarget.enableEdit();
                            });
                        })
                    }
                    this.polygon_arr.push(e.layer)
                }else{
                    this.polygon_arr.push(e.layer)
                }
            },

            circleHandle(e){
                let radius = e.layer.getRadius();
                let _point = e.layer.toGeoJSON();
                let temp=flip(circle(_point.geometry.coordinates, radius, {
                    units: 'meters',
                }));
                let po = L.polygon(temp.geometry.coordinates[0], {color: '#000'}).addTo(this.map);
                this.polygon_arr.push(po);
                e.layer.remove()
            },
        }
    }
</script>

<style scoped>
    .editor{
        position: absolute;
        left: 1em;
        top: 1em;
        z-index: 1001;
    }
    .editor-item{
        width: 4em;
        height: 4em;
        background-color: #ffa969;
        cursor: pointer;
        margin-bottom: 1em;
        text-align: center;
        line-height: 4em;
        border-radius: 10px;
    }
</style>