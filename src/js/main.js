// Получаем ссылки на HTML-элементы
const locationForm = document.querySelector('#locationForm');
const cityNameInput = document.querySelector('#cityNameInput');
const cardContainer = document.querySelector('.weather-cards');

// При загрузке страницы получаем геолокацию пользователя и отображаем погоду
window.addEventListener('load', async function() {
    try {
        const userCoordinates = await getUserGeolocation();
        if (userCoordinates.lat && userCoordinates.lon) {
            renderWeatherInfo(userCoordinates.lat, userCoordinates.lon);
        } else {
            renderWeatherInfo(null, null);
        }
    } catch (error) {
        console.error(error);
        renderWeatherInfo(null, null);
    }
});


// Добавляем слушатель события submit на форму для отображения информации о погоде
locationForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const cityName = cityNameInput.value;
    if (cityName === '') {
        const userCoordinates = await getUserGeolocation();
        renderWeatherInfo(userCoordinates.lat, userCoordinates.lon);
    } else {
        renderWeatherInfo(null, null, cityName);
    }
});

// Функция для отображения информации о погоде
async function renderWeatherInfo(lat, lon, cityName) {

    removeOldWeatherCards();
    // API-ключ для доступа к OpenWeatherMap API
    const apiKey = '61421fe7402aefb8c509652d22397967';

    try {
        if (lat && lon) {
            // Если переданы координаты, используем их для запроса погоды
            // Получаем данные о погоде для конкретных координат
            const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ru`);

            // Проверяем успешность запроса к Weather API
            if (!weatherResponse.ok) {
                throw new Error('Weather API request failed');
            }

            // Преобразуем ответ в формат JSON
            const weatherData = await weatherResponse.json();

            // Обновляем карточку с данными о погоде на странице
            updateWeatherCard(weatherData);
        } else if (cityName) {
            // Если передано название города, используем его для запроса погоды
            // Получаем геокодированные данные для введенного города
            const geocodingResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${apiKey}`);

            // Проверяем успешность запроса к Geocoding API
            if (!geocodingResponse.ok) {
                throw new Error('Geocoding API request failed');
            }

            // Преобразуем ответ в формат JSON
            const geocodingData = await geocodingResponse.json();

            // Проверяем, что найдены города с таким названием
            if (geocodingData.length === 0) {
                throw new Error('No matching cities found');
            }

            // Получаем координаты и запрашиваем погоду
            const { lat, lon } = geocodingData[0];
            const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ru`);

            // Проверяем успешность запроса к Weather API
            if (!weatherResponse.ok) {
                throw new Error('Weather API request failed');
            }

            // Преобразуем ответ в формат JSON
            const weatherData = await weatherResponse.json();

            // Обновляем карточку с данными о погоде на странице
            updateWeatherCard(weatherData);
        } else {
            // Если ни координаты, ни название города не переданы, выводим ошибку
            throw new Error('Neither coordinates nor city name provided');
        }
    } catch (error) {
        // В случае ошибки выводим сообщение в консоль и отображаем сообщение об ошибке на странице
        console.error('There was a problem with your fetch operation:', error);
        displayErrorMessage();
    }
}

// Функция для обновления карточки с данными о погоде
function updateWeatherCard(weatherData) {
    // Преобразуем время восхода солнца из формата timestamp в строку времени
    const sunriseTime = new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const weatherTypeObject = weatherType(weatherData.main.temp);

    // Генерируем HTML-код для карточки погоды и ползунка времени
    const weatherCardHTML = `
        <div class="weather-card weather-card__basis">
            <div class="weather-card__info">
                <div class="weather-card__city-name">Погода в городе ${weatherData.name}</div>
                <div class="weather-card__temperature">${Math.round(weatherData.main.temp)}&deg;C</div>
                <div class="weather-card__temperature weather-card__temperature_feels-like">Ощущается как ${Math.round(weatherData.main.feels_like)}&deg;C</div>
                <div class="weather-card__wind-speed">Скорость ветра ${weatherData.wind.speed}км/ч</div>
                <div class="weather-card__humidity">Влажность ${weatherData.main.humidity}%</div>
                <div class="weather-card__humidity">Атмосферное давление ${Math.round(weatherData.main.pressure*0.7500637554192)} мм рт. ст.</div>
            </div>
            <div class="weather-card__icon">
                <img src="src/images/animated-svg/${weatherData.weather[0].icon}.svg" alt="Иконка погоды" class="icon__image">
            </div>
        </div>
        <div class="weather-card weather-card__daylight-hours">
            <div class="sunrise">Восход солнца <span id="sunriseTime">${sunriseTime}</span></div>
            <input type="range" id="timeRange" min="0" max="1440" step="1" disabled>
            <div class="sunset">Закат солнца <span id="sunsetTime">${sunsetTime}</span></div>
        </div>
        <div class="weather-card weather-card__hobby-card"> 
            <div class="title-hobby">Сегодня ${weatherTypeObject.hobby}, прогноз для вашего хобби</div>
            <div class="hobby-list">${weatherTypeObject.hobbiesHTML}</div>
        </div>`;

    // Вставляем сгенерированный HTML-код в контейнер для карточек погоды
    cardContainer.insertAdjacentHTML('beforeend', weatherCardHTML);

    // Обновление положения ползунка в зависимости от времени
    setInterval(function() {
        const currentTime = new Date();
        document.getElementById('timeRange').value = calculateElapsedMinutes(new Date(weatherData.sys.sunrise * 1000), currentTime);
    }, 1000); // Обновление каждую секунду
}

// Функция для определения хобби в зависимости от типа погоды
function weatherType(temp) {

    const weatherType = {hobby: 'Нет данных', hobbiesHTML: ''};
    let weather;
    const temperature = temp;
    if (temperature < 0) {
        weather = 'cold'; // Холодная погода
    } else if (temperature >= 0 && temperature < 15) {
        weather = 'cool'; // Прохладная погода
    } else if (temperature >= 15 && temperature < 25) {
        weather = 'warm'; // Теплая погода
    } else {
        weather = 'hot'; // Жаркая погода
    }

    // Определение хобби в зависимости от типа погоды
    let hobbies;
    switch (weather) {
        case 'cold':
            weatherType.hobby = "холодно";
            hobbies = ['Лыжи', 'Катание на санях', 'Снежные баталии', 'Пешие прогулки'];
            break;
        case 'cool':
            weatherType.hobby = "прохладно";
            hobbies = ['Пешие прогулки', 'Катание на коньках', 'Фотографирование природы', 'Посещение музеев'];
            break;
        case 'warm':
            weatherType.hobby = "тепло";
            hobbies = ['Велосипед', 'Пикник', 'Прогулка по парку', 'Футбол'];
            break;
        case 'hot':
            weatherType.hobby = "жарко";
            hobbies = ['Плавание', 'Водные велосипеды', 'Барбекю на пляже', 'Занятия йогой на открытом воздухе'];
            break;
        default:
            hobbies = ['Нет данных'];
    }

    // Выбор случайного хобби из списка
    hobbies.forEach(hobby => {
        weatherType.hobbiesHTML += `<span class="hobby"><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">${hobby}</a></span>`;
    });
    return weatherType;
}

// Функция для отображения сообщения об ошибке
function displayErrorMessage() {
    removeOldWeatherCards();
    const weatherCardHTML = `<li class="weather-card weather-card__basis error">Ошибка! Такой город не найден</li>`;

    cardContainer.insertAdjacentHTML('beforeend', weatherCardHTML);
}

// Функция для удаления старых карточек погоды
function removeOldWeatherCards() {
    const oldWeatherCards = document.querySelectorAll('.weather-card');
    if (oldWeatherCards.length === 0) return;
    oldWeatherCards.forEach(card => card.remove());
}

function getUserGeolocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const userGeolocationData = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    resolve(userGeolocationData);
                },
                function(error) {
                    reject(error);
                }
            );
        } else {
            reject(new Error("Geolocation не поддерживается вашим браузером"));
        }
    });
}

// Функция для вычисления пройденных минут от начала дня
function calculateElapsedMinutes(startTime, currentTime) {
    const totalMinutes = (currentTime.getTime() - startTime.getTime()) / 60000; // Разница в минутах
    return Math.max(0, Math.min(totalMinutes, 1440)); // Ограничение от 0 до 1440 (24 часа)
}
