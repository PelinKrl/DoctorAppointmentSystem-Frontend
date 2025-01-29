import apiClient from '../js/api.js';

// Functions
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// State management for filters and cities
let activeFilters = {
    searchQuery: '',
    city: '',
    availability: false,
    online: false
};

let cities = [];
let cityDropdownVisible = false;
let specialties = [];
let map;
let markers = [];

// Add state for selected appointment
let selectedAppointmentState = {
    doctorId: null,
    selectedDateTime: null
};

// Fetch cities on load
async function fetchCities() {
    try {
        const response = await fetch('https://turkiyeapi.dev/api/v1/provinces');
        const data = await response.json();
        cities = data.data.sort((a, b) => a.name.localeCompare(b.name));
        setupCitySearch();
    } catch (error) {
        console.error('Error fetching cities:', error);
    }
}

function setupCitySearch() {
    const locationInput = document.getElementById('locationInput');
    const searchBox = locationInput.parentElement;
    
    // Create dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'city-dropdown';
    searchBox.appendChild(dropdownContainer);

    // Handle input changes
    locationInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredCities = cities.filter(city => 
            city.name.toLowerCase().includes(searchTerm)
        );
        
        updateCityDropdown(filteredCities, dropdownContainer);
    });

    // Show dropdown on focus
    locationInput.addEventListener('focus', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredCities = cities.filter(city => 
            city.name.toLowerCase().includes(searchTerm)
        );
        updateCityDropdown(filteredCities, dropdownContainer);
    });

    // Handle click outside
    document.addEventListener('click', function(e) {
        if (!searchBox.contains(e.target)) {
            hideDropdown(dropdownContainer);
        }
    });

    // Prevent dropdown from closing when clicking inside it
    dropdownContainer.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

function updateCityDropdown(filteredCities, dropdownContainer) {
    // Add visible class for animation
    dropdownContainer.classList.add('visible');
    
    if (filteredCities.length === 0) {
        dropdownContainer.innerHTML = '<div class="city-item no-results">Sonuç bulunamadı</div>';
        return;
    }

    const cityItems = filteredCities.slice(0, 8).map(city => `
        <div class="city-item" data-city-id="${city.id}" data-city-name="${city.name}">
            <i class="fas fa-map-marker-alt"></i>
            ${city.name}
        </div>
    `).join('');

    dropdownContainer.innerHTML = cityItems;

    // Add click handlers to city items - only update input, don't search
    dropdownContainer.querySelectorAll('.city-item').forEach(item => {
        item.addEventListener('click', function() {
            const cityName = this.dataset.cityName;
            document.getElementById('locationInput').value = cityName;
            activeFilters.city = cityName;
            hideDropdown(dropdownContainer);
        });
    });
}

function hideDropdown(dropdownContainer) {
    dropdownContainer.classList.remove('visible');
}

async function fetchSpecialties() {
    try {
        const response = await apiClient.getSpecialties();
        specialties = response; // Set the global specialties array
        setupSpecialtySearch();
    } catch (error) {
        console.error('Error fetching specialties:', error);
    }
}

function setupSpecialtySearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBox = searchInput.parentElement;
    
    // Create dropdown container if it doesn't exist
    let dropdownContainer = searchBox.querySelector('.specialty-dropdown');
    if (!dropdownContainer) {
        dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'specialty-dropdown';
        searchBox.appendChild(dropdownContainer);
    }

    // Handle input changes - only update dropdown, don't search
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredSpecialties = specialties.filter(specialty => 
            specialty.toLowerCase().includes(searchTerm)
        );
        updateSpecialtyDropdown(filteredSpecialties, dropdownContainer);
    });

    // Show dropdown on focus
    searchInput.addEventListener('focus', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredSpecialties = specialties.filter(specialty => 
            specialty.toLowerCase().includes(searchTerm)
        );
        updateSpecialtyDropdown(filteredSpecialties, dropdownContainer);
    });

    // Handle click outside
    document.addEventListener('click', function(e) {
        if (!searchBox.contains(e.target)) {
            hideSpecialtyDropdown(dropdownContainer);
        }
    });

    // Prevent dropdown from closing when clicking inside it
    dropdownContainer.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Add search button click handler
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchQuery = searchInput.value;
            const locationInput = document.getElementById('locationInput');
            const city = locationInput ? locationInput.value : '';
            
            activeFilters.searchQuery = searchQuery;
            activeFilters.city = city;
            
            fetchDoctors(activeFilters, true);
        });
    }
}

function updateSpecialtyDropdown(filteredSpecialties, dropdownContainer) {
    dropdownContainer.classList.add('visible');
    
    if (filteredSpecialties.length === 0) {
        dropdownContainer.innerHTML = '<div class="specialty-item no-results">Sonuç bulunamadı</div>';
        return;
    }

    const specialtyItems = filteredSpecialties.slice(0, 8).map(specialty => `
        <div class="specialty-item" data-specialty="${specialty}">
            <i class="fas fa-stethoscope"></i>
            ${specialty}
        </div>
    `).join('');

    dropdownContainer.innerHTML = specialtyItems;

    // Add click handlers to specialty items - only update input, don't search
    dropdownContainer.querySelectorAll('.specialty-item').forEach(item => {
        item.addEventListener('click', function() {
            const specialty = this.dataset.specialty;
            document.getElementById('searchInput').value = specialty;
            hideSpecialtyDropdown(dropdownContainer);
        });
    });
}

function hideSpecialtyDropdown(dropdownContainer) {
    dropdownContainer.classList.remove('visible');
}

async function fetchDoctors(filters = {}, isSearch = false) {
    try {
        let doctors;
        if (isSearch) {
            // Use search API when user clicks search
            const searchParams = {};
            if (filters.searchQuery && filters.searchQuery.trim() !== '') {
                searchParams.specialty = filters.searchQuery.trim();
            }
            if (filters.city && filters.city.trim() !== '') {
                searchParams.location = filters.city.trim();
            }
            doctors = await apiClient.searchDoctors(searchParams);
        } else {
            // Use getApprovedDoctors API for initial load and other cases
            doctors = await apiClient.getApprovedDoctors();
        }
        
        displayDoctors(doctors);
        updateActiveFilters();
    } catch (error) {
        console.error('Error fetching doctors:', error);
        displayDoctors([]); // Show no doctors message
    }
}

// Rate limiting helper for Nominatim API
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Display doctors and update map
function displayDoctors(doctors) {
    const doctorsList = document.getElementById('doctorsList');
    doctorsList.innerHTML = '';

    if (!doctors || doctors.length === 0) {
        doctorsList.innerHTML = '<div class="no-results">Sonuç bulunamadı</div>';
        return;
    }

    // Create doctor cards and collect doctor data for map
    const doctorsForMap = doctors.map(doctor => {
        // Create doctor card
        const doctorCard = document.createElement('div');
        doctorCard.className = 'doctor-card';
        doctorCard.dataset.doctorId = doctor.id.toString();
        doctorCard.innerHTML = `
            <div class="doctor-info">
                <img src="${doctor.imageUrl || 'default-doctor-image.jpg'}" alt="${doctor.fullName}" class="doctor-image">
                <div class="doctor-details">
                    <h3>${doctor.fullName}</h3>
                    <p class="specialty">${doctor.specialty}</p>
                    <div class="rating">
                        <div class="rating-stars">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <span class="review-count" style="cursor: pointer">Yükleniyor...</span>
                    </div>
                    <p class="location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${doctor.address || `${doctor.city}, ${doctor.town}`}
                    </p>
                </div>
            </div>
            <div class="availability">
                <button class="add-review-btn" onclick="showAddReviewModal(${doctor.id}, '${doctor.fullName}')">
                    <i class="fas fa-star"></i> Yorum Yap
                </button>
                <div class="reviews-section"></div>
                <div class="date-selector"></div>
                <div class="time-slots"></div>
            </div>
        `;

        // Add click handler for the doctor info section only
        const doctorInfo = doctorCard.querySelector('.doctor-info');
        doctorInfo.addEventListener('click', function(e) {
            if (!e.target.classList.contains('review-count')) {
                // Find all expanded cards except this one
                const otherExpandedCards = document.querySelectorAll('.doctor-card.expanded:not([data-doctor-id="' + doctor.id + '"])');
                otherExpandedCards.forEach(card => card.classList.remove('expanded'));
                
                // Toggle this card
                doctorCard.classList.toggle('expanded');
                
                // Load availability and reviews if not already loaded
                if (doctorCard.classList.contains('expanded') && !doctorCard.dataset.loaded) {
                    loadDoctorData(doctorCard);
                    doctorCard.dataset.loaded = 'true';
                }
            }
        });

        // Prevent availability section clicks from closing the card
        const availabilitySection = doctorCard.querySelector('.availability');
        availabilitySection.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        doctorsList.appendChild(doctorCard);

        // Return doctor data for map
        return {
            id: doctor.id,
            name: doctor.fullName,
            specialty: doctor.specialty,
            address: doctor.address || `${doctor.city}, ${doctor.town}`
        };
    });

    // Update map with all doctors
    updateMapWithDoctors(doctorsForMap);
}

// Update map with rate limiting
async function updateMapWithDoctors(doctors) {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // Add new markers with rate limiting
    for (const doctor of doctors) {
        await addDoctorToMap(doctor);
        await delay(1000); // 1 second delay between geocoding requests
    }

    // If we have markers, fit the map to show all markers
    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function updateActiveFilters() {
    const activeFiltersContainer = document.querySelector('.active-filters');
    activeFiltersContainer.innerHTML = '';

    // Add active filters
    if (activeFilters.searchQuery) {
        addActiveFilter('search', activeFilters.searchQuery);
    }
    if (activeFilters.city) {
        addActiveFilter('city', activeFilters.city);
    }
    if (activeFilters.availability) {
        addActiveFilter('availability', 'Uygun Tarihler');
    }
    if (activeFilters.online) {
        addActiveFilter('online', 'Online Görüşme');
    }
}

function addActiveFilter(type, value) {
    const activeFiltersContainer = document.querySelector('.active-filters');
    const filterElement = document.createElement('div');
    filterElement.className = 'active-filter';
    filterElement.innerHTML = `
        <span>${value}</span>
        <i class="fas fa-times remove-filter" data-filter-type="${type}"></i>
    `;

    filterElement.querySelector('.remove-filter').addEventListener('click', () => {
        removeFilter(type);
    });

    activeFiltersContainer.appendChild(filterElement);
}

function removeFilter(type) {
    switch (type) {
        case 'search':
            activeFilters.searchQuery = '';
            document.getElementById('searchInput').value = '';
            break;
        case 'city':
            activeFilters.city = '';
            document.getElementById('locationInput').value = '';
            break;
        case 'availability':
            activeFilters.availability = false;
            document.querySelector('[data-filter="available"]').classList.remove('active');
            break;
        case 'online':
            activeFilters.online = false;
            document.querySelector('[data-filter="online"]').classList.remove('active');
            break;
    }
    // Use the default endpoint to show all doctors
    fetchDoctors(activeFilters, false);
}

// Remove the standalone searchDoctors function and update the event listener
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const locationInput = document.getElementById('locationInput');
    
    activeFilters.searchQuery = searchInput?.value || '';
    activeFilters.city = locationInput?.value || '';
    
    // Always use search API when using the search function
    fetchDoctors(activeFilters, true);
}

function selectSpecialty(specialty) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = specialty;
        handleSearch();
    }
}

// Initialize map when the page loads
function initMap() {
    map = L.map('map').setView([38.4192, 27.1287], 12); // İzmir coordinates
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Function to geocode address and add marker
async function addDoctorToMap(doctor) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(doctor.address)}`);
        const data = await response.json();
        
        if (data.length > 0) {
            const { lat, lon } = data[0];
            const marker = L.marker([lat, lon]).addTo(map);
            
            const popupContent = `
                <div class="map-popup">
                    <h4>${doctor.name}</h4>
                    <p>${doctor.specialty}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${doctor.address}</p>
                    ${doctor.rating ? `
                        <div class="rating">
                            ${'★'.repeat(doctor.rating)}${'☆'.repeat(5-doctor.rating)}
                            <span>(${doctor.reviewCount} görüş)</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            marker.bindPopup(popupContent);
            markers.push(marker);
            
            if (markers.length === 1) {
                map.setView([lat, lon], 12);
            }
        }
    } catch (error) {
        console.error('Error geocoding address:', error);
    }
}

// Update the loadAvailability function with correct API endpoint
async function loadAvailability(card) {
    const doctorId = parseInt(card.dataset.doctorId);
    const dateSelector = card.querySelector('.date-selector');
    const timeSlots = card.querySelector('.time-slots');
    
    try {
        // Fetch doctor's availability schedule
        const availability = await apiClient.getDoctorAvailability(doctorId);

        // Fetch doctor's appointments
        const appointments = await apiClient.getAppointment(doctorId);

        // Get next 7 days and filter only available days based on doctor's schedule
        const next7Days = getNext7Days();
        const availableDays = next7Days.filter(date => {
            const dayOfWeek = new Date(date.value).getDay() || 7; // Convert Sunday (0) to 7
            return availability.some(a => a.day === dayOfWeek);
        });

        if (availableDays.length === 0) {
            dateSelector.innerHTML = '<div class="no-slots">Bu hafta için müsait gün bulunmamaktadır</div>';
            timeSlots.innerHTML = '';
            return;
        }
        
        // Add date buttons only for available days
        dateSelector.innerHTML = availableDays.map((date, index) => `
            <button class="date-btn ${index === 0 ? 'active' : ''}" data-date="${date.value}">
                ${date.label}
            </button>
        `).join('');

        // Add click handlers for date buttons
        dateSelector.querySelectorAll('.date-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                dateSelector.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                updateTimeSlots(timeSlots, availability, appointments, e.target.dataset.date, doctorId);
            });
        });

        // Initially load time slots for first available date
        if (availableDays.length > 0) {
            updateTimeSlots(timeSlots, availability, appointments, availableDays[0].value, doctorId);
        }

    } catch (error) {
        console.error('Error loading availability:', error);
        timeSlots.innerHTML = '<div class="error-message">Müsaitlik bilgisi yüklenirken hata oluştu</div>';
    }
}

function updateTimeSlots(timeSlotsElement, availability, appointments, selectedDate, doctorId) {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay() || 7; // Convert Sunday (0) to 7

    // Find doctor's availability for this day
    const dayAvailability = availability.find(a => a.day === dayOfWeek);
    
    if (!dayAvailability) {
        timeSlotsElement.innerHTML = '<div class="no-slots">Bu gün için müsaitlik bulunmamaktadır</div>';
        return;
    }

    // Parse start and end times from availability
    const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);

    // Generate time slots only for the available hours
    const slots = [];
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
        slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
        currentMinute += 30;
        if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
        }
    }
    
    // Filter out already booked appointments for the selected date
    const bookedSlots = appointments
        .filter(app => {
            const appDate = new Date(app.appointmentDate);
            return appDate.toDateString() === date.toDateString();
        })
        .map(app => {
            const appDate = new Date(app.appointmentDate);
            return `${appDate.getHours().toString().padStart(2, '0')}:${appDate.getMinutes().toString().padStart(2, '0')}`;
        });

    // Only show time slots within doctor's availability
    timeSlotsElement.innerHTML = slots.map(slot => {
        const isBooked = bookedSlots.includes(slot);
        return `
            <div class="time-slot ${isBooked ? 'unavailable' : ''}" 
                 data-time="${slot}" 
                 ${!isBooked ? `onclick="selectTimeSlot('${selectedDate} ${slot}', ${doctorId})"` : ''}>
                ${slot}
            </div>
        `;
    }).join('');
}

function getNext7Days() {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push({
            value: date.toISOString().split('T')[0],
            label: i === 0 ? 'Bugün' : 
                   i === 1 ? 'Yarın' : 
                   date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' })
        });
    }
    
    return days;
}

// Update selectTimeSlot function to store selected appointment state
window.selectTimeSlot = async function(dateTime, doctorId) {
    selectedAppointmentState.doctorId = doctorId;
    selectedAppointmentState.selectedDateTime = dateTime;

    const token = localStorage.getItem('token');
    if (!token) {
        Swal.fire({
            title: 'Giriş Gerekli',
            text: 'Randevu oluşturmak için lütfen giriş yapın',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Giriş Yap',
            cancelButtonText: 'İptal'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.setItem('pendingAppointment', JSON.stringify({
                    dateTime: dateTime,
                    doctorId: doctorId
                }));
                window.location.href = 'user_register.html';
            }
        });
        return;
    }

    // Add create appointment button to the map section
    const mapSection = document.querySelector('.map-section');
    mapSection.innerHTML = `
        <div class="appointment-summary" style="padding: 20px; background: white;">
            <h3>Randevu Özeti</h3>
            <p><strong>Tarih:</strong> ${new Date(dateTime).toLocaleDateString('tr-TR')}</p>
            <p><strong>Saat:</strong> ${new Date(dateTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
            <button id="createAppointmentBtn" class="nav-btn" style="width: 100%; justify-content: center; background-color: var(--primary-color); color: white; margin-top: 20px;">
                <i class="fas fa-calendar-check"></i>
                Randevu Oluştur
            </button>
        </div>
        <div id="map"></div>
    `;

    // Add click handler for the create appointment button
    document.getElementById('createAppointmentBtn').addEventListener('click', () => {
        createAppointment(doctorId, dateTime);
        // Clear selected appointment state after successful creation
        selectedAppointmentState = {
            doctorId: null,
            selectedDateTime: null
        };
    });

    // Re-initialize the map since we modified its container
    initMap();
};

// Function to create the appointment
async function createAppointment(doctorId, dateTime) {
    try {
        // Get the authentication token
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found. Please sign in again.');
        }

        // Get user data from localStorage
        const userJson = localStorage.getItem('user');
        if (!userJson) {
            throw new Error('User information not found. Please sign in again.');
        }

        const user = JSON.parse(userJson);
        if (!user.uid) {
            throw new Error('User ID not found. Please sign in again.');
        }

        // Set the token in the API client
        apiClient.setAuthToken(token);

        // Parse the selected date and time
        const [datePart, timePart] = dateTime.split(' ');
        
        // Create a Date object in local timezone
        const localDate = new Date(`${datePart}T${timePart}`);
        
        // Convert to UTC ISO string
        const formattedDate = localDate.toISOString();
        
        const appointmentData = {
            id: 0,
            doctorId: parseInt(doctorId),
            patientId: user.uid, // Add patientId from user data
            appointmentDate: formattedDate
        };

        console.log('Sending appointment data:', JSON.stringify(appointmentData, null, 2));

        const response = await apiClient.makeAppointment(appointmentData);
        console.log('Appointment response:', response);

        Swal.fire({
            title: 'Başarılı!',
            text: 'Randevunuz başarıyla oluşturuldu',
            icon: 'success',
            confirmButtonText: 'Tamam'
        }).then(() => {
            // Reload availability to update the UI
            const doctorCard = document.querySelector(`[data-doctor-id="${doctorId}"]`);
            if (doctorCard) {
                loadAvailability(doctorCard);
            }
            // Reset the map section
            const mapSection = document.querySelector('.map-section');
            mapSection.innerHTML = '<div id="map"></div>';
            initMap();
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        
        let errorMessage = 'Randevu oluşturulamadı. ';
        if (error.message.includes('token') || error.message.includes('User')) {
            errorMessage = error.message;
            // Redirect to login for any authentication related errors
            window.location.href = 'user_register.html';
        } else if (error.message.includes('status: 400')) {
            // Extract the error message from the response
            const match = error.message.match(/message: (.*)/);
            if (match) {
                try {
                    const errorObj = JSON.parse(match[1]);
                    if (errorObj.errors) {
                        errorMessage = Object.values(errorObj.errors)
                            .flat()
                            .join('\n');
                    }
                } catch (e) {
                    errorMessage = match[1];
                }
            }
        } else {
            errorMessage += 'Lütfen tekrar deneyin.';
        }

        Swal.fire({
            title: 'Hata!',
            text: errorMessage,
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
    }
}

// Update the event listener to use handleSearch
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    initMap();
    
    // Fetch specialties
    fetchSpecialties();
    
    // Fetch cities
    fetchCities();

    // Set up specialty item click listeners
    document.querySelectorAll('.specialty-item').forEach(item => {
        item.addEventListener('click', function() {
            const specialty = this.dataset.specialty;
            if (specialty) {
                document.getElementById('searchInput').value = specialty;
            }
        });
    });

    // Set up search button click listener
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }

    // Set up search input listeners for Enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Initial load - show all doctors using default endpoint
    fetchDoctors({}, false);
});

// Export functions
export async function getDoctorAvailability(doctorId) {
    try {
        return await apiClient.getDoctorAvailability(doctorId);
    } catch (error) {
        console.error('Error fetching doctor availability:', error);
        throw error;
    }
}

export async function makeAppointment(appointmentData) {
    try {
        return await apiClient.makeAppointment(appointmentData);
    } catch (error) {
        console.error('Error making appointment:', error);
        throw error;
    }
}

export async function getAppointment(doctorId) {
    try {
        return await apiClient.getAppointment(doctorId);
    } catch (error) {
        console.error('Error fetching appointment:', error);
        throw error;
    }
}

export async function searchDoctors(searchParams) {
    try {
        return await apiClient.searchDoctors(searchParams);
    } catch (error) {
        console.error('Error searching doctors:', error);
        throw error;
    }
}

export async function getSpecialties() {
    try {
        return await apiClient.getSpecialties();
    } catch (error) {
        console.error('Error fetching specialties:', error);
        throw error;
    }
}

// Add these new functions for reviews
async function showReviewsModal(doctorId, doctorName) {
    try {
        const reviews = await apiClient.getReviews(doctorId);
        
        const modalHtml = `
            <div class="reviews-modal">
                <h2>Reviews for Dr. ${doctorName}</h2>
                <div class="reviews-list">
                    ${reviews.reviews.map(review => `
                        <div class="review-item">
                            <div class="review-header">
                                <div class="review-rating">
                                    ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                                </div>
                                <div class="review-date">
                                    ${new Date(review.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                            <div class="review-comment">${review.comment}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        Swal.fire({
            html: modalHtml,
            width: '600px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                container: 'reviews-modal-container'
            }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        Swal.fire('Error', 'Could not load reviews', 'error');
    }
}

async function showAddReviewModal(doctorId, doctorName) {
    const { value: formValues } = await Swal.fire({
        title: `Review Dr. ${doctorName}`,
        html: `
            <div class="rating-input">
                <div class="stars">
                    ${[1,2,3,4,5].map(num => `
                        <i class="far fa-star" data-rating="${num}"></i>
                    `).join('')}
                </div>
            </div>
            <textarea id="review-comment" class="swal2-textarea" placeholder="Write your review here..."></textarea>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Submit Review',
        didOpen: () => {
            const stars = document.querySelectorAll('.stars i');
            let selectedRating = 0;

            stars.forEach(star => {
                star.addEventListener('click', () => {
                    selectedRating = parseInt(star.dataset.rating);
                    stars.forEach(s => {
                        const rating = parseInt(s.dataset.rating);
                        if (rating <= selectedRating) {
                            s.classList.remove('far');
                            s.classList.add('fas', 'selected');
                        } else {
                            s.classList.remove('fas', 'selected');
                            s.classList.add('far');
                        }
                    });
                });
                
                star.addEventListener('mouseover', () => {
                    const rating = parseInt(star.dataset.rating);
                    stars.forEach(s => {
                        const currentRating = parseInt(s.dataset.rating);
                        if (currentRating <= rating) {
                            s.classList.remove('far');
                            s.classList.add('fas');
                        }
                    });
                });
                
                star.addEventListener('mouseout', () => {
                    stars.forEach(s => {
                        const rating = parseInt(s.dataset.rating);
                        if (rating <= selectedRating) {
                            s.classList.remove('far');
                            s.classList.add('fas', 'selected');
                        } else {
                            s.classList.remove('fas', 'selected');
                            s.classList.add('far');
                        }
                    });
                });
            });
        },
        preConfirm: () => {
            const rating = document.querySelectorAll('.stars .selected').length;
            const comment = document.getElementById('review-comment').value;
            
            if (!rating) {
                Swal.showValidationMessage('Please select a rating');
                return false;
            }
            if (!comment.trim()) {
                Swal.showValidationMessage('Please write a review');
                return false;
            }
            
            return { rating, comment };
        }
    });

    if (formValues) {
        try {
            const reviewData = {
                doctorId: doctorId,
                patientId: JSON.parse(localStorage.getItem('user')).uid,
                rating: formValues.rating,
                comment: formValues.comment
            };

            await apiClient.addReview(reviewData);
            
            Swal.fire(
                'Success!',
                'Your review has been submitted.',
                'success'
            ).then(() => {
                // Refresh the doctor card to show updated rating
                fetchDoctors(activeFilters, false);
            });
        } catch (error) {
            console.error('Error submitting review:', error);
            Swal.fire('Error', 'Could not submit review', 'error');
        }
    }
}

// Make the new functions globally accessible
window.showReviewsModal = showReviewsModal;
window.showAddReviewModal = showAddReviewModal;

// Add styles to the document
const styles = `
    .reviews-modal {
        padding: 20px;
    }
    
    .reviews-modal h2 {
        margin-bottom: 20px;
        color: #333;
    }
    
    .reviews-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .review-item {
        border-bottom: 1px solid #eee;
        padding: 15px 0;
    }
    
    .review-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    }
    
    .review-rating {
        color: #FFC107;
    }
    
    .review-date {
        color: #666;
        font-size: 0.9em;
    }
    
    .review-comment {
        color: #333;
        line-height: 1.5;
    }
    
    .rating-input {
        margin-bottom: 20px;
    }
    
    .stars {
        display: flex;
        justify-content: center;
        gap: 10px;
        font-size: 24px;
        color: #FFC107;
        cursor: pointer;
    }
    
    .stars i:hover {
        transform: scale(1.2);
    }
    
    .add-review-btn {
        width: 100%;
        padding: 12px;
        margin-bottom: 20px;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s ease;
    }
    
    .add-review-btn:hover {
        background-color: var(--secondary-color);
        transform: translateY(-1px);
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// New function to load both availability and reviews
async function loadDoctorData(card) {
    const doctorId = parseInt(card.dataset.doctorId);
    
    // Load availability
    loadAvailability(card);
    
    try {
        // Fetch reviews
        const reviews = await apiClient.getReviews(doctorId);
        
        // Update rating display
        const ratingDiv = card.querySelector('.rating');
        const averageRating = reviews.averageRating || 0;
        const reviewCount = reviews.reviews?.length || 0;
        
        ratingDiv.innerHTML = `
            <div class="rating-stars">
                ${'★'.repeat(averageRating)}${'☆'.repeat(5-averageRating)}
            </div>
            <span class="review-count" style="cursor: pointer">${reviewCount} görüş</span>
        `;
        
        // Add click handler for review count
        const reviewCountSpan = ratingDiv.querySelector('.review-count');
        reviewCountSpan.addEventListener('click', () => showReviewsModal(doctorId, card.querySelector('h3').textContent));
        
        // Display recent reviews in the reviews section
        const reviewsSection = card.querySelector('.reviews-section');
        if (reviews.reviews && reviews.reviews.length > 0) {
            const recentReviews = reviews.reviews.slice(0, 3); // Show only the 3 most recent reviews
            reviewsSection.innerHTML = `
                <h4>Son Yorumlar</h4>
                ${recentReviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <div class="review-rating">
                                ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                            </div>
                            <div class="review-date">
                                ${new Date(review.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="review-comment">${review.comment}</div>
                    </div>
                `).join('')}
                ${reviews.reviews.length > 3 ? `
                    <button class="show-all-reviews" onclick="showReviewsModal(${doctorId}, '${card.querySelector('h3').textContent}')">
                        Tüm yorumları gör (${reviews.reviews.length})
                    </button>
                ` : ''}
            `;
        } else {
            reviewsSection.innerHTML = '<p class="no-reviews">Henüz yorum yapılmamış</p>';
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        const ratingDiv = card.querySelector('.rating');
        ratingDiv.innerHTML = `
            <div class="rating-stars">
                <span class="error-message">Rating yüklenemedi</span>
            </div>
        `;
    }
}

// Add these additional styles
const additionalStyles = `
    .reviews-section {
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
    }

    .reviews-section h4 {
        margin: 0 0 15px 0;
        color: #333;
    }

    .show-all-reviews {
        width: 100%;
        padding: 10px;
        margin-top: 15px;
        background: none;
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .show-all-reviews:hover {
        background: var(--primary-color);
        color: white;
    }

    .no-reviews {
        text-align: center;
        color: #666;
        font-style: italic;
        margin: 10px 0;
    }

    .error-message {
        color: #dc3545;
        font-size: 0.9em;
    }
`;

// Append the additional styles
styleSheet.textContent += additionalStyles;

// Remove the beforeunload event listener and add navigation handler
function handleNavigation(targetUrl) {
    if (selectedAppointmentState.doctorId && selectedAppointmentState.selectedDateTime) {
        Swal.fire({
            title: 'Unfinished Appointment',
            text: 'Would you like to receive a reminder email about your unfinished appointment?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, remind me',
            cancelButtonText: 'No, thanks',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        console.error('No token found');
                        await Swal.fire({
                            title: 'Authentication Error',
                            text: 'Please login to set a reminder',
                            icon: 'error',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        window.location.href = 'user_register.html';
                        return;
                    }

                    const userJson = localStorage.getItem('user');
                    if (!userJson) {
                        console.error('No user data found');
                        window.location.href = targetUrl;
                        return;
                    }

                    const user = JSON.parse(userJson);
                    if (!user.uid || !user.email) {
                        console.error('Invalid user data:', user);
                        window.location.href = targetUrl;
                        return;
                    }

                    // Set the token in apiClient before making the request
                    apiClient.setAuthToken(token);

                    // Create the request data
                    const requestData = {
                        userId: 0,
                        doctorId: 0,
                        selectedDateTime: new Date(selectedAppointmentState.selectedDateTime).toISOString(),
                        email: user.email
                    };

                    console.log('Sending request with data:', requestData);
                    // Send the request and ignore the response
                    try {
                        await apiClient.queueUnfinishedAppointment(requestData);
                        // Show success message
                        await Swal.fire({
                            title: 'Reminder Set',
                            text: 'You will receive an email reminder about your appointment.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    } catch (error) {
                        console.error('Error:', error);
                        // Don't show error message since the request might have succeeded
                    }
                    
                    // Always navigate to target URL
                    window.location.href = targetUrl;
                } catch (error) {
                    console.error('Error queueing unfinished appointment:', error);
                    await Swal.fire({
                        title: 'Error',
                        text: error.message || 'Failed to set reminder. Please try again later.',
                        icon: 'error',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            } else {
                // User clicked "No, thanks"
                window.location.href = targetUrl;
            }
        });
    } else {
        // No unfinished appointment, proceed with navigation
        window.location.href = targetUrl;
    }
}

// Update all navigation links to use the handler
document.addEventListener('DOMContentLoaded', function() {
    // Update all navigation links
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (!this.hasAttribute('data-bypass-check')) {
                e.preventDefault();
                handleNavigation(this.href);
            }
        });
    });

    // Update navigation buttons
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        const originalOnClick = authButton.onclick;
        authButton.onclick = function(e) {
            e.preventDefault();
            if (selectedAppointmentState.doctorId && selectedAppointmentState.selectedDateTime) {
                const targetUrl = localStorage.getItem('token') ? 'index.html' : 'user_register.html';
                handleNavigation(targetUrl);
            } else {
                originalOnClick.call(this);
            }
        };
    }

    // Update home button
    const homeBtn = document.querySelector('.home-btn');
    if (homeBtn) {
        homeBtn.onclick = function(e) {
            e.preventDefault();
            handleNavigation('index.html');
        };
    }
}); 