import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import L from 'leaflet';
import togeojson from '@mapbox/togeojson';

const poly_options = {color: 'blue', weight: 1};
export default class IndexController extends Controller {
  @tracked
  sources = {};

  /*
    Sources:
  {
    Nominatim: {
      Manchester: layer
      London: layer
    },
    example.kml: {
      poly1: layer
      poly2: layer
    }
  }
  */

  addSource(name) {
    if (this.sources[name] === undefined) {
      this.sources = {...this.sources, [name]: {}};
    }
  }

  addLayer(source, name, layer) {
    this.sources[source] = {...this.sources[source], [name]: layer};
    this.sources = {...this.sources};
  }

  @action
  async getPolygon(place)  {
    console.log(place)

    const map = this.get('map')
    let layer = null;
    const nominatim_url = "https://nominatim.openstreetmap.org/search?";

    const params = new URLSearchParams("");
    params.set("q", place);
    params.set("format", "jsonv2")
    console.log(nominatim_url + params);

    const nominatim_req = await fetch(nominatim_url + params)
    let nominatim_resp = await nominatim_req.json();
    const nominatim_relations = nominatim_resp.filter((resp) => resp.osm_type === "relation")

    if (nominatim_relations.length > 0) {
      const osm_id = nominatim_relations[0].osm_id;
      const osm_url = "http://polygons.openstreetmap.fr/get_geojson.py?id=" + osm_id;
      const osm_req = await fetch(osm_url);
      const osm_resp = await osm_req.json();
      console.log(osm_resp);

      layer = L.geoJSON(osm_resp, { style: poly_options }).addTo(map).getLayers()[0];
      layer.feature.properties.name = place;
    } else {
      const lat = nominatim_resp[0].lat;
      const lon = nominatim_resp[0].lon;
      const feature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat]
        },
        properties: {
          name: place
        }
      }
      console.log(feature);
      layer = L.geoJSON(feature).addTo(map).getLayers()[0];
    }

    if (layer) {
      console.log(layer);
      this.addSource("Nominatim");
      this.addLayer("Nominatim", place, layer);
      console.log(this.sources);
      this.flyTo("Nominatim", place);
    }
  }

  @action
  removeLayer(source, place) {
    const layer = this.sources[source][place];
    layer.remove();
    delete this.sources[source][place];
    if (Object.keys(this.sources[source]).length === 0) {
      delete this.sources[source];
    } else {
      this.sources[source] = {...this.sources[source]};
    }
    this.sources = {...this.sources};
    console.log(this.sources);
  }

  @action
  toggleSource(source) {
    document.getElementById(`${source}-polygons`).classList.toggle("hidden");
  }

  @action
  flyTo(source, place) {
    let map = this.get('map')
    const layer = this.sources[source][place];
    if (layer.feature.geometry.type === "Point") {
      map.flyTo(layer.getLatLng());
    }

    if (layer.feature.geometry.type.includes("Polygon")) {
      map.flyToBounds(layer.getBounds());
    }
  }

  @action
  async uploadKML(event) {
    const map = this.get('map');
    const kmljson = await this.readKMLFile(event.target.files[0]);
    console.log(kmljson);
    const geo = L.geoJSON(kmljson, { style: poly_options }).addTo(map);
    console.log(geo);
    console.log(geo.getLayers());
    this.addSource(event.target.files[0].name);
    geo.getLayers().forEach((layer) => {
      this.addLayer(event.target.files[0].name, layer.feature.properties.name, layer);
      console.log(layer);
    });
    console.log(this.sources);
    this.findOverlap("Nominatim");

  }

  readKMLFile(file) {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onerror = () => {
        fileReader.abort();
        reject(new DOMException("Problem parsing input file."));
      }

      fileReader.onload = () => {
        const kml = new DOMParser().parseFromString(fileReader.result, 'text/xml');
        const converted = togeojson.kml(kml);
        resolve(converted);
      }
      fileReader.readAsText(file);
    });
  }

  findOverlap(target) {
    Object.entries(this.sources).forEach((entry) => {
      const [source, layers] = entry;
      if (source === target) {
        return;
      }

      Object.values(layers).forEach((layer) => {
        console.log(layer);
        if (layer.feature.geometry.type.includes("Polygon")) {
          const bounds = layer.getBounds();
          Object.entries(this.sources[target]).forEach((entry) => {
            const [target_name, target_layer] = entry;
            if (target_layer.feature.geometry.type.includes("Polygon")) {
              const target_bounds = target_layer.getBounds();
              if (bounds.intersects(target_bounds)) {
                console.log(layer.feature.properties.name, "intersects polygon", target_layer.feature.properties.name);
              }
            } else {
              if (bounds.contains(target_layer.getLatLng())) {
                console.log(layer.feature.properties.name, "contains point", target_layer.feature.properties.name);
              }
            }
          });
        }
      })
      console.log(source, layers);
    });
  }
}
