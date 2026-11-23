let allData = [];
let map;
let markers = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    initMap();
    setupEventListeners();
});

// 1. Загрузка данных
async function fetchData() {
    try {
        // Загружаем наш JSON файл
        const response = await fetch('data/catalog.json');
        if (!response.ok) throw new Error('Файл данных не найден');
        
        allData = await response.json();
        console.log(`Загружено ${allData.length} записей`);
        
        populateFilters();
        renderResults(allData);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('countResult').textContent = 'Ошибка загрузки данных';
    }
}

// 2. Инициализация карты (Leaflet + OpenStreetMap)
function initMap() {
    // Центр России примерно
    map = L.map('map').setView([55.75, 37.61], 5); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// 3. Заполнение фильтров
function populateFilters() {
    const regionSelect = document.getElementById('regionFilter');
    const regions = [...new Set(allData.map(item => item.region))].sort();

    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });

    regionSelect.addEventListener('change', updateCities);
}

function updateCities() {
    const region = document.getElementById('regionFilter').value;
    const citySelect = document.getElementById('cityFilter');
    
    citySelect.innerHTML = '<option value="">Все города</option>';
    
    if (region) {
        const cities = [...new Set(allData
            .filter(item => item.region === region)
            .map(item => item.city))].sort();
        
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
        citySelect.disabled = false;
    } else {
        citySelect.disabled = true;
    }
    
    applyFilters();
}

// 4. Логика фильтрации и отображения
function setupEventListeners() {
    document.getElementById('cityFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('globalSearch').addEventListener('input', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    // Переключение видов
    document.getElementById('viewMap').addEventListener('click', (e) => switchView('map', e.target));
    document.getElementById('viewList').addEventListener('click', (e) => switchView('list', e.target));
}

function applyFilters() {
    const region = document.getElementById('regionFilter').value;
    const city = document.getElementById('cityFilter').value;
    const type = document.getElementById('typeFilter').value;
    const search = document.getElementById('globalSearch').value.toLowerCase();

    const filtered = allData.filter(item => {
        const matchRegion = region ? item.region === region : true;
        const matchCity = city ? item.city === city : true;
        const matchType = type ? item.type === type : true;
        const matchSearch = search ? 
            (item.name.toLowerCase().includes(search) || 
             item.city.toLowerCase().includes(search) || 
             (item.specialization && item.specialization.toLowerCase().includes(search))) 
            : true;

        return matchRegion && matchCity && matchType && matchSearch;
    });

    document.getElementById('countResult').textContent = filtered.length;
    renderResults(filtered);
}

function resetFilters() {
    document.getElementById('regionFilter').value = '';
    document.getElementById('cityFilter').value = '';
    document.getElementById('cityFilter').disabled = true;
    document.getElementById('typeFilter').value = '';
    document.getElementById('globalSearch').value = '';
    applyFilters();
}

function switchView(view, btn) {
    document.querySelectorAll('.view-controls button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const mapDiv = document.getElementById('map');
    const listDiv = document.getElementById('listContainer');

    if (view === 'map') {
        mapDiv.style.display = 'block';
        listDiv.classList.add('hidden');
        if(map) map.invalidateSize(); // Пересчет размера карты
    } else {
        mapDiv.style.display = 'none';
        listDiv.classList.remove('hidden');
    }
}

function renderResults(data) {
    // Очистка карты
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Очистка списка
    const grid = document.getElementById('cardsGrid');
    grid.innerHTML = '';

    data.forEach(item => {
        // 1. Добавляем маркер на карту
        if (item.lat && item.lng) {
            const marker = L.marker([item.lat, item.lng]).addTo(map);
            const popupContent = `
                <b>${item.name}</b><br>
                ${item.city}, ${item.region}<br>
                <small>${item.type === 'platform' ? 'Площадка' : 'Агентство'}</small><br>
                <a href="${item.url}" target="_blank">Перейти на сайт</a>
            `;
            marker.bindPopup(popupContent);
            markers.push(marker);
        }

        // 2. Добавляем карточку в список
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h4>${item.name}</h4>
            <div class="meta">📍 ${item.city}, ${item.region}</div>
            <div class="meta">💼 ${item.specialization || 'Нет описания'}</div>
            ${item.price_from ? `<div class="price">от ${item.price_from} ₽</div>` : ''}
            <div style="margin-top:10px;">
                <a href="${item.url}" target="_blank" class="btn-primary" style="display:inline-block; font-size:0.9rem; padding:5px 10px;">Сайт</a>
            </div>
        `;
        grid.appendChild(card);
    });
}
