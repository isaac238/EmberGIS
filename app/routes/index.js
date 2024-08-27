import Route from '@ember/routing/route';
import L from 'leaflet';

export default class IndexRoute extends Route {
  loadMapAfterRender = function() {
    console.log("Loading map");

    const map = L.map('map').setView([51.505, -0.09], 13);
    this.set('map', map);

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributor',
    }).addTo(map);

    const controller = this.get('controller');
    controller.set('map', map);
  }

  async model() {
    Ember.run.scheduleOnce('afterRender', this, this.loadMapAfterRender);
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    this.set('controller', controller);
  }
}
