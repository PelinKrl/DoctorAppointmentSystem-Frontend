import apiClient from './api.js';

// Initialize Firebase when the script loads
if (typeof window.firebaseConfig !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }
}

// Add click handler for Google Sign In button
document.getElementById('google-sign-in').addEventListener('click', async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        // Store the token for later use
        const token = await user.getIdToken();
        localStorage.setItem('patientToken', token);
        
        // Set the token in the API client
        apiClient.setAuthToken(token);

        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Successfully signed in!',
            text: 'You can now make appointments.',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            // Redirect to the appointment page or dashboard
            window.location.href = 'appointment.html';
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