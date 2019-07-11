<template>
    <div id="map-container">
        <slot></slot>
    </div>
</template>

<script>
    let leaflet_map = [];
    export function getMap() {
        return leaflet_map[0]
    }

    export default {
        name: "minemap-leaflet",
        data(){
            return{
                map: null,
            }
        },
        props:{
            mapTitleLayer: {
                type: String,
                required: true,
            },
            poiTitleLayer: {
                type: String
            },
            titleLayerOptions:{
                type: Object,
            },
            mapOptions: {
                type: Object,
            }
        },

        mounted(){
            this.map = L.map('map-container', this.mapOptions);
            let minemap = L.tileLayer(this.mapTitleLayer, this.titleLayerOptions);
            let minemap_poi = L.tileLayer(this.poiTitleLayer, this.titleLayerOptions);

            minemap.addTo(this.map);
            minemap_poi.addTo(this.map);
            leaflet_map.push(this.map)
        }
    }
</script>

<style scoped>
    #map-container{
        position: relative;
        height: 100%;
        /*z-index: 1;*/
    }
</style>