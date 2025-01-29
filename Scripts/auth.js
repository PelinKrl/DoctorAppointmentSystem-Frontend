import apiClient from '../js/api.js';

// DOM Elements
const googleSignInBtn = document.getElementById('google-sign-in');
const userInfoDiv = document.getElementById('user-info');
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const signOutBtn = document.getElementById('sign-out');

// Wait for Firebase initialization
function initializeAuth() {
    if (!window.auth || !window.GoogleAuthProvider) {
        setTimeout(initializeAuth, 100);
        return;
    }

    const auth = window.auth;
    const provider = new window.GoogleAuthProvider();

    // Sign in with Google
    async function signInWithGoogle() {
        try {
            const result = await window.signInWithPopup(auth, provider);
            const user = result.user;
            console.log('Successfully signed in:', user);
            // Redirect to appointment page after successful sign in
            window.location.href = 'appointment_page.html';
        } catch (error) {
            console.error('Error signing in:', error);
            alert('Error signing in. Please try again.');
        }
    }

    // Sign out
    async function signOut() {
        try {
            await auth.signOut();
            console.log('Signed out successfully');
            updateUIForSignedOutUser();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    // Update UI for signed-in user
    function updateUIForSignedInUser(user) {
        googleSignInBtn.style.display = 'none';
        userInfoDiv.style.display = 'block';
        userPhoto.src = user.photoURL || 'default-profile.png';
        userName.textContent = user.displayName;
        userEmail.textContent = user.email;
    }

    // Update UI for signed-out user
    function updateUIForSignedOutUser() {
        googleSignInBtn.style.display = 'block';
        userInfoDiv.style.display = 'none';
        userPhoto.src = '';
        userName.textContent = '';
        userEmail.textContent = '';
    }

    // Auth state observer
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user);
            updateUIForSignedInUser(user);
            
            // Store user info in localStorage for other pages
            localStorage.setItem('user', JSON.stringify({
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                uid: user.uid
            }));
        } else {
            console.log('User is signed out');
            updateUIForSignedOutUser();
            localStorage.removeItem('user');
        }
    });

    // Event Listeners
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', signInWithGoogle);
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
    }
}

// Start initialization
initializeAuth();

// Check if user is already signed in (for other pages)
function checkAuthState() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        return user;
    }
    return null;
}

// Export for use in other scripts
window.checkAuthState = checkAuthState;

// Handle Google Sign-In
window.handleGoogleSignIn = async (response) => {
    try {
        const credential = response.credential;
        const email = document.getElementById('email').value.trim();

        // Verify the credential with your backend
        const authResponse = await fetch('api/doctors/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: credential,
                email: email
            })
        });

        if (authResponse.ok) {
            // Store the token
            const data = await authResponse.json();
            localStorage.setItem('doctorToken', data.token);
            
            // Show the registration form
            document.getElementById('google-signin').style.display = 'none';
            document.getElementById('registration-form').style.display = 'block';
            
            // Pre-fill the email if available
            const decodedToken = JSON.parse(atob(credential.split('.')[1]));
            if (decodedToken.name) {
                document.getElementById('fullname').value = decodedToken.name;
            }
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Authentication failed. Please try again.');
    }
};

// Handle form submission
document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get selected days
    const selectedDays = Array.from(document.querySelectorAll('input[name="days"]:checked'))
        .map(checkbox => checkbox.value);

    const formData = {
        fullName: document.getElementById('fullname').value,
        areaOfInterest: document.getElementById('areaOfInterest').value,
        availableDays: selectedDays,
        availableHours: {
            start: document.getElementById('startTime').value,
            end: document.getElementById('endTime').value
        },
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        town: document.getElementById('town').value
    };

    try {
        const token = localStorage.getItem('doctorToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('api/doctors/complete-registration', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Registration successful! Your application is pending approval.');
            window.location.href = 'index.html';
        } else {
            throw new Error('Registration failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Registration failed. Please try again.');
    }
});

// Handle city selection to populate towns
document.getElementById('city').addEventListener('change', function(e) {
    const city = e.target.value;
    const townSelect = document.getElementById('town');
    townSelect.innerHTML = '<option value="">Select Town</option>';
    
    if (city === 'istanbul') {
        const towns = ['Besiktas', 'Kadikoy', 'Sisli', 'Uskudar'];
        towns.forEach(town => {
            const option = document.createElement('option');
            option.value = town.toLowerCase();
            option.textContent = town;
            townSelect.appendChild(option);
        });
    } else if (city === 'ankara') {
        const towns = ['Cankaya', 'Kecioren', 'Yenimahalle'];
        towns.forEach(town => {
            const option = document.createElement('option');
            option.value = town.toLowerCase();
            option.textContent = town;
            townSelect.appendChild(option);
        });
    } else if (city === 'izmir') {
        const towns = ['Karsiyaka', 'Bornova', 'Konak'];
        towns.forEach(town => {
            const option = document.createElement('option');
            option.value = town.toLowerCase();
            option.textContent = town;
            townSelect.appendChild(option);
        });
    }
});

export async function handlePatientLogin(email, password) {
    try {
        const response = await apiClient.patientLogin({ email, password });
        if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userType', 'patient');
            return response;
        }
        throw new Error('Login failed');
    } catch (error) {
        console.error('Patient login error:', error);
        throw error;
    }
}

export async function handleDoctorLogin(email, password) {
    try {
        const response = await apiClient.doctorLogin({ email, password });
        if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userType', 'doctor');
            return response;
        }
        throw new Error('Login failed');
    } catch (error) {
        console.error('Doctor login error:', error);
        throw error;
    }
}

export async function handleAdminLogin(email, password) {
    try {
        const response = await apiClient.adminLogin({ email, password });
        if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userType', 'admin');
            return response;
        }
        throw new Error('Login failed');
    } catch (error) {
        console.error('Admin login error:', error);
        throw error;
    }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    window.location.href = '/';
}

export function isAuthenticated() {
    return !!localStorage.getItem('token');
}

export function getUserType() {
    return localStorage.getItem('userType');
} 