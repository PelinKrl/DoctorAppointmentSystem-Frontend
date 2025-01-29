import apiClient from './api.js';

// Store the authentication token
let authToken = null;

// Initialize Firebase when the script loads
if (typeof window.firebaseConfig !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }
}

// Initialize the form
document.addEventListener('DOMContentLoaded', async () => {
    // Add click handler for Google Sign In button
    document.getElementById('google-sign-in').addEventListener('click', async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            
            // Store the token for later use
            const token = await user.getIdToken();
            localStorage.setItem('doctorToken', token);
            
            // Set the token in the API client
            apiClient.setAuthToken(token);
            
            // Show the doctor details form
            document.getElementById('doctor-details').style.display = 'block';
            
            // Pre-fill name if available
            if (user.displayName) {
                document.getElementById('fullname').value = user.displayName;
            }

            Swal.fire({
                icon: 'success',
                title: 'Successfully signed in!',
                text: 'Please complete your registration details.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error during Google sign in:', error);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Failed',
                text: error.message || 'Please try again.'
            });
        }
    });

    // Initialize city dropdown
    const citySelect = document.getElementById('city');
    const townSelect = document.getElementById('town');
    
    try {
        const response = await fetch('https://turkiyeapi.dev/api/v1/provinces');
        const data = await response.json();
        const cities = data.data;
        
        // Sort cities alphabetically
        cities.sort((a, b) => a.name.localeCompare(b.name, 'tr')).forEach(city => {
            const option = document.createElement('option');
            option.value = city.id; // Store city ID as value
            option.textContent = city.name;
            option.dataset.name = city.name; // Store city name in dataset
            citySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading cities:', error);
        showError('Failed to load cities. Please refresh the page.');
    }

    // Handle city selection
    citySelect.addEventListener('change', async (e) => {
        const selectedOption = e.target.selectedOptions[0];
        const provinceId = selectedOption.value;
        
        if (provinceId) {
            try {
                const response = await fetch(`https://turkiyeapi.dev/api/v1/districts?provinceId=${provinceId}`);
                const data = await response.json();
                const districts = data.data;
                
                townSelect.innerHTML = '<option value="">İlçe Seçin</option>';
                districts.sort((a, b) => a.name.localeCompare(b.name, 'tr')).forEach(district => {
                    const option = document.createElement('option');
                    option.value = district.name; // Use district name as value
                    option.textContent = district.name;
                    townSelect.appendChild(option);
                });
                townSelect.disabled = false;
            } catch (error) {
                console.error('Error loading towns:', error);
                showError('Failed to load towns. Please try again.');
            }
        } else {
            townSelect.innerHTML = '<option value="">İlçe Seçin</option>';
            townSelect.disabled = true;
        }
    });

    // Set default times
    document.getElementById('startTime').value = '09:00';
    document.getElementById('endTime').value = '17:00';
});

// Helper function to show errors
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}

// Handle form submission
document.getElementById('doctorRegistrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const citySelect = document.getElementById('city');
    const selectedCityOption = citySelect.options[citySelect.selectedIndex];
    const townSelect = document.getElementById('town');
    const streetAddress = document.getElementById('address').value;
    
    // Get the city name from the dataset
    const cityName = selectedCityOption.dataset.name;
    const townName = townSelect.value;
    
    // Combine address components
    const fullAddress = `${streetAddress}, ${townName}, ${cityName}`;

    // Convert day strings to DayOfWeek enum values (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayToNumber = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    };

    const doctorData = {
        fullName: document.getElementById('fullname').value,
        specialty: document.getElementById('areaOfInterest').value.toLowerCase(),
        address: fullAddress,
        googleToken: localStorage.getItem('doctorToken'),
        availability: Array.from(document.querySelectorAll('input[name="days"]:checked'))
            .map(cb => ({
                day: parseInt(dayToNumber[cb.value]),
                startTime: document.getElementById('startTime').value + ':00',
                endTime: document.getElementById('endTime').value + ':00'
            }))
    };

    // Update validation to match required DTO fields
    if (!doctorData.fullName || !doctorData.specialty || !doctorData.address || !doctorData.googleToken) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Please fill in all required fields and ensure you are properly signed in with Google'
        });
        return;
    }

    if (doctorData.availability.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Please select at least one available day'
        });
        return;
    }

    // Log the data being sent
    console.log('Sending doctor registration data:', JSON.stringify(doctorData, null, 2));

    try {
        // Ensure token is set before making the request
        const token = localStorage.getItem('doctorToken');
        if (!token) {
            throw new Error('Authentication token not found. Please sign in again.');
        }
        apiClient.setAuthToken(token);

        const response = await apiClient.registerDoctor(doctorData);
        console.log('Registration response:', response);
        
        Swal.fire({
            icon: 'success',
            title: 'Registration Successful!',
            text: 'Please wait for admin approval.',
            timer: 3000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = 'index.html';
        });
    } catch (error) {
        console.error('Registration error details:', error);
        
        let errorMessage = 'Registration failed. ';
        if (error.response) {
            try {
                const errorData = await error.response.json();
                console.log('Error response data:', errorData);
                errorMessage += errorData.message || errorData.title || 'Please check your information and try again.';
            } catch (e) {
                console.log('Error parsing error response:', e);
                errorMessage += 'Server error occurred. Please try again later.';
            }
        } else {
            errorMessage += error.message || 'Please try again.';
        }

        Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: errorMessage
        });
    }
});

// Export functions for external use
export {
    getApprovedDoctors,
    getUnapprovedDoctors,
    approveDoctor,
    getDoctor
};

async function getApprovedDoctors() {
    try {
        return await apiClient.getApprovedDoctors();
    } catch (error) {
        console.error('Error fetching approved doctors:', error);
        throw error;
    }
}

async function getUnapprovedDoctors() {
    try {
        return await apiClient.getUnapprovedDoctors();
    } catch (error) {
        console.error('Error fetching unapproved doctors:', error);
        throw error;
    }
}

async function approveDoctor(doctorId) {
    try {
        return await apiClient.approveDoctor(doctorId);
    } catch (error) {
        console.error('Error approving doctor:', error);
        throw error;
    }
}

async function getDoctor(id) {
    try {
        return await apiClient.getDoctor(id);
    } catch (error) {
        console.error('Error fetching doctor:', error);
        throw error;
    }
} 