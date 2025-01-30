const doctorLoginBtn = document.getElementById('doctorLogin');
if (doctorLoginBtn) {
    doctorLoginBtn.addEventListener('click', function() {
        window.location.href = '/doctor-login.html'; // Redirect to Doctor Login Page
    });
}

const patientLoginBtn = document.getElementById('patientLogin');
if (patientLoginBtn) {
    patientLoginBtn.addEventListener('click', function() {
        window.location.href = '/patient-search.html'; // Redirect to Patient Search Page
    });
}

// Wait for Firebase to be available
let auth;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    if (typeof firebase !== 'undefined') {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();

            // Auth state observer
            auth.onAuthStateChanged((user) => {
                if (user) {
                    // User is signed in
                    console.log('User is signed in:', user.email);
                    // Get and store the new token
                    user.getIdToken().then(token => {
                        localStorage.setItem('token', token);
                        localStorage.setItem('user', JSON.stringify({
                            displayName: user.displayName,
                            email: user.email,
                            photoURL: user.photoURL,
                            uid: user.uid
                        }));
                    });
                } else {
                    // User is signed out
                    console.log('User is signed out');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            });
        } catch (error) {
            console.error('Error initializing Firebase:', error);
        }
    } else {
        console.error('Firebase is not loaded');
    }
});

// Mock API for demonstration (replace with actual API endpoint)
const MOCK_DOCTORS = [
    {
        id: 1,
        name: "Dr. Zehra Ince",
        specialty: "Obstetrics And Gynecology",
        rating: 5,
        reviewCount: 38,
        location: "Kultur District, Plevne Boulevard No:1 Floor 2",
        image: "../assets/default-doctor.png",
        availableDays: ["Today", "Tomorrow", "Wed", "Thu"],
        availableSlots: ["08:30", "09:00", "09:30", "10:00"]
    },
    {
        id: 2,
        name: "Dr. Ahmet Yilmaz",
        specialty: "Orthopedics",
        rating: 4.8,
        reviewCount: 45,
        location: "Alsancak, Main Street No:15",
        image: "../assets/default-doctor.png",
        availableDays: ["Today", "Wed", "Thu", "Fri"],
        availableSlots: ["10:30", "11:00", "14:30", "15:00"]
    }
];

// Function to fetch doctors from API
async function fetchDoctors(searchParams = {}) {
    try {
        // In a real application, you would make an API call here
        // const response = await fetch('your-api-endpoint/doctors');
        // const doctors = await response.json();
        
        // For now, we'll use mock data
        return MOCK_DOCTORS;
    } catch (error) {
        console.error('Error fetching doctors:', error);
        return [];
    }
}

// Function to create star rating HTML
function createStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
}

// Function to create doctor card HTML
function createDoctorCard(doctor) {
    return `
        <div class="doctor-card">
            <div class="doctor-info">
                <img src="${doctor.image}" alt="Doctor ${doctor.name}" class="doctor-image">
                <div class="doctor-details">
                    <h3>${doctor.name}</h3>
                    <p class="specialty">${doctor.specialty}</p>
                    <div class="rating">
                        <span class="stars">${createStarRating(doctor.rating)}</span>
                        <span class="review-count">${doctor.reviewCount} reviews</span>
                    </div>
                    <p class="location">${doctor.location}</p>
                </div>
            </div>
            <div class="availability">
                <div class="date-selector">
                    ${doctor.availableDays.map((day, index) => `
                        <button class="date-btn ${index === 0 ? 'active' : ''}">${day}</button>
                    `).join('')}
                </div>
                <div class="time-slots">
                    ${doctor.availableSlots.map(time => `
                        <button class="time-btn">${time}</button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Function to update search results
async function updateSearchResults(searchParams = {}) {
    const searchResults = document.querySelector('.search-results');
    if (!searchResults) return;

    // Show loading state
    searchResults.innerHTML = '<div class="loading">Loading doctors...</div>';

    // Fetch doctors
    const doctors = await fetchDoctors(searchParams);

    // Clear loading state and display results
    searchResults.innerHTML = doctors.length > 0
        ? doctors.map(doctor => createDoctorCard(doctor)).join('')
        : '<div class="no-results">No doctors found matching your criteria</div>';

    // Add event listeners to the new elements
    attachEventListeners();
}

// Function to attach event listeners to dynamic elements
function attachEventListeners() {
    // Date button listeners
    document.querySelectorAll('.date-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons in this group
            this.closest('.date-selector').querySelectorAll('.date-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            this.classList.add('active');
        });
    });

    // Time slot listeners
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Handle time slot selection
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });
}

// Function to handle search
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const locationInput = document.getElementById('locationInput');
    
    const searchParams = {
        query: searchInput?.value || '',
        location: locationInput?.value || ''
    };
    
    updateSearchResults(searchParams);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // Initialize specialty filters
    const specialtyItems = document.querySelectorAll('.specialty-item');
    specialtyItems.forEach(item => {
        item.addEventListener('click', function() {
            const specialty = this.querySelector('span').textContent;
            if (document.getElementById('searchInput')) {
                document.getElementById('searchInput').value = specialty;
                handleSearch();
            }
        });
    });

    // Load initial results
    updateSearchResults();
});

function checkAuthAndRedirect() {
    if (typeof firebase === 'undefined' || !auth) {
        console.error('Firebase is not initialized');
        window.location.href = 'user_register.html';
        return;
    }

    const user = auth.currentUser;
    if (user) {
        // User is signed in, redirect to appointment page
        window.location.href = 'appointment_page.html';
    } else {
        // No user is signed in, redirect to registration page
        window.location.href = 'user_register.html';
    }
}

// Initialize Google Auth Provider
function initializeGoogleAuth() {
    if (typeof firebase === 'undefined' || !auth) {
        console.error('Firebase is not initialized');
        return;
    }
    return new firebase.auth.GoogleAuthProvider();
}

function signInWithGoogle() {
    const googleProvider = initializeGoogleAuth();
    if (!googleProvider) return;

    auth.signInWithPopup(googleProvider)
        .then((result) => {
            // Get the user
            const user = result.user;
            
            // Get the ID token
            return user.getIdToken().then(token => {
                // Store the token in localStorage for protected routes
                localStorage.setItem('token', token);
                
                // Store user info
                localStorage.setItem('user', JSON.stringify({
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    uid: user.uid
                }));
                
                // Redirect to appointment page or dashboard
                window.location.href = 'appointment_page.html';
            });
        })
        .catch((error) => {
            console.error('Error during sign in:', error);
            // Handle errors here
            const errorCode = error.code;
            const errorMessage = error.message;
            alert('Sign in error: ' + errorMessage);
        });
}
