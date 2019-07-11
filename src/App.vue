<template>
  <div id="app">
      <minemap_leaflet :mapTitleLayer="mapTitleLayer"
                       :poiTitleLayer="poiTitleLayer"
                       :titleLayerOptions="titleLayerOptions"
                       :mapOptions="mapOptions"
      >
          <editor :editor_item="editor_item"></editor>
      </minemap_leaflet>

  </div>
</template>

<script>
import minemap_leaflet from './components/minemap-leaflet'
import editor from './components/editor'

export default {
  name: 'app',
    data(){
      return{
          mapTitleLayer: 'http://117.51.148.237:8001/minemap-data/view/{z}/{x}/{y}',
          poiTitleLayer: 'http://117.51.148.237:8001/minemap-data/view/t/{z}/{x}/{y}',
          titleLayerOptions: {
              subdomains: "1234",
              maxZoom: 18, //25
              minZoom: 3,
              tileSize: 512,
              zoomOffset: -1
          },
          mapOptions:{
              editable: true,
              minZoom: 3,
              maxZoom: 18,
              zoom: 18,
              center: [25.43,119.01],
              doubleClickZoom: false,
              zoomControl: false
          },
          editor_item: ['point','line','adsorptionLine','intersectLine','polygon','maskPolygon','intersectPolygon','unionPolygon','differencePolygon','circle','rectangle']
      }
    },
  components: {
      minemap_leaflet,
      editor
  }
}
</script>

<style>
    * {margin: 0;padding: 0}

    html, body {height: 100%}

    html{
        position: relative;
    }

    #app { height: 100%; position: relative; }
</style>
