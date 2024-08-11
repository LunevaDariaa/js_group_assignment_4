'use strict';

class Visit {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, placeName, timeSpent) {
    this.coords = coords; //[lat,lng]
    this.placeName = placeName; // Name of the place
    this.timeSpent = timeSpent; // Minutes spent
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `Visit to ${this.placeName} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class CafeVisit extends Visit {
  type = 'cafe';
  constructor(coords, placeName, timeSpent, rating) {
    super(coords, placeName, timeSpent);
    this.rating = rating; // User rating for the café
    this._setDescription();
  }
}

class ParkVisit extends Visit {
  type = 'park';
  constructor(coords, placeName, timeSpent, activities) {
    super(coords, placeName, timeSpent);
    this.activities = activities; // List of activities done in the park
    this._setDescription();
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputPlaceName = document.querySelector('.form__input--place-name');
const inputTimeSpent = document.querySelector('.form__input--time-spent');
const inputRating = document.querySelector('.form__input--rating');
const inputActivities = document.querySelector('.form__input--activities');
const sortBtn = document.querySelector('.sort');

class App {
  #map;
  #mapzoomLevel = 13;
  #mapEvent;
  #visits = [];
  sort = false;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newVisit.bind(this));

    inputType.addEventListener('change', this._toggleExtraField);

    containerWorkouts.addEventListener('click', this._movePopup.bind(this));

    sortBtn.addEventListener('click', () => {
      this.#visits = this._sortVisits(this.#visits);
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapzoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#visits.forEach(visit => {
      this._renderVisitMarker(visit);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputPlaceName.focus();
  }

  _hideForm() {
    inputPlaceName.value = inputTimeSpent.value = inputRating.value = inputActivities.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleExtraField() {
    inputRating.closest('.form__row').classList.toggle('form__row--hidden');
    inputActivities.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newVisit(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    const type = inputType.value;
    const placeName = inputPlaceName.value;
    const timeSpent = +inputTimeSpent.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let visit;

    if (type === 'cafe') {
      const rating = +inputRating.value;
      if (!validInputs(timeSpent, rating) || !allPositive(timeSpent, rating)) {
        return alert('Inputs have to be positive numbers');
      }
      visit = new CafeVisit([lat, lng], placeName, timeSpent, rating);
    }

    if (type === 'park') {
      const activities = inputActivities.value;
      if (!validInputs(timeSpent) || !allPositive(timeSpent)) {
        return alert('Inputs have to be positive numbers');
      }
      visit = new ParkVisit([lat, lng], placeName, timeSpent, activities);
    }

    this.#visits.push(visit);

    this._renderVisitMarker(visit);
    this._renderVisit(visit);
    this._hideForm();
    this._setLocalStorage();
  }

  _renderVisitMarker(visit) {
    L.marker(visit.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${visit.type}-popup`,
        })
      )
      .setPopupContent(`${visit.type === 'cafe' ? '☕️' : '🌳'} ${visit.description}`)
      .openPopup();
  }

  _renderVisit(visit) {
    let html = `
    <li class="workout workout--${visit.type}" data-id="${visit.id}">
    <h2 class="workout__title">${visit.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${visit.type === 'cafe' ? '☕️' : '🌳'}</span>
      <span class="workout__value">${visit.timeSpent}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (visit.type === 'cafe') {
      html += ` <div class="workout__details">
      <span class="workout__icon">⭐️</span>
      <span class="workout__value">${visit.rating}</span>
      <span class="workout__unit">/5</span>
    </div>
  </li>`;
    }

    if (visit.type === 'park') {
      html += `  <div class="workout__details">
      <span class="workout__icon">🎯</span>
      <span class="workout__value">${visit.activities}</span>
      <span class="workout__unit"></span>
    </div>
  </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _movePopup(e) {
    const visitEl = e.target.closest('.workout');

    if (!visitEl) return;

    const visit = this.#visits.find(
      vis => vis.id === visitEl.dataset.id
    );

    this.#map.setView(visit.coords, this.#mapzoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    visit.click();
  }

  _setLocalStorage() {
    localStorage.setItem('visits', JSON.stringify(this.#visits));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('visits'));

    if (!data) return;

    this.#visits = data;

    this.#visits.forEach(visit => {
      this._renderVisit(visit);
      visit.__proto__ =
        visit.type === 'cafe' ? CafeVisit.prototype : ParkVisit.prototype;
    });
  }

  _sortVisits(visits) {
    this.sort = !this.sort;
    this.#visits = visits.reverse();
    this._deleteVisitList();
    this.#visits.forEach(visit => this._renderVisit(visit));

    return this.#visits;
  }

  _deleteVisitList() {
    const visitsDel = containerWorkouts.querySelectorAll('.workout');
    visitsDel.forEach(visit => visit.remove());
  }

  reset() {
    localStorage.removeItem('visits');
    location.reload();
  }
}

const app = new App();
