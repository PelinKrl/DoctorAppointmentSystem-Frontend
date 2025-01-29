// Load configuration
let config = null;

async function loadConfig() {
    if (!config) {
        try {
            const response = await fetch('/config.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            config = await response.json();
            console.log('Config loaded:', config); // Debug log
        } catch (error) {
            console.error('Error loading config:', error);
            // Fallback configuration
            config = {
                apiGateway: {
                    baseUrl: 'https://localhost:9000',
                    endpoints: {
                        auth: {
                            patientLogin: '/auth/patient-login',
                            doctorLogin: '/auth/doctor-login',
                            adminLogin: '/auth/admin-login'
                        },
                        doctors: {
                            register: '/doctors/register',
                            getAvailability: '/doctors/{doctorId}/availability',
                            getDoctor: '/doctors/{id}',
                            approve: '/doctors/approve/{doctorId}',
                            getApproved: '/doctors/approved',
                            getUnapproved: '/doctors/unapproved'
                        },
                        patients: {
                            register: '/patients/register',
                            searchDoctors: '/patients/search-doctors',
                            makeAppointment: '/patients/make-appointment',
                            getAppointment: '/patients/get-appointment/{doctorId}',
                            getSpecialties: '/patients/specialties'
                        },
                        comments: {
                            getReviews: '/comments/reviews/{doctorId}',
                            addReview: '/comments/add-review',
                            checkInappropriate: '/comments/check-inappropriate'
                        }
                    }
                }
            };
        }
    }
    return config;
}

// Utility function to replace URL parameters
function replaceUrlParams(url, params) {
    let finalUrl = url;
    for (const [key, value] of Object.entries(params)) {
        finalUrl = finalUrl.replace(`{${key}}`, value);
    }
    return finalUrl;
}

// API Client class
class ApiClient {
    constructor() {
        this.baseUrl = null;
        this.authToken = null;
        this.endpoints = null;
        this.initialized = false;
        // Initialize immediately when instance is created
        this.initialize();
    }

    async initialize() {
        if (!this.initialized) {
            try {
                const config = await loadConfig();
                this.baseUrl = config.apiGateway.baseUrl;
                this.endpoints = config.apiGateway.endpoints;
                this.initialized = true;
                console.log('ApiClient initialized:', { baseUrl: this.baseUrl, endpoints: this.endpoints });
            } catch (error) {
                console.error('Failed to initialize ApiClient:', error);
                throw error;
            }
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.baseUrl || !this.endpoints) {
            throw new Error('ApiClient not properly initialized. Missing baseUrl or endpoints.');
        }
    }

    setAuthToken(token) {
        this.authToken = token;
    }

    async request(endpoint, options = {}) {
        await this.ensureInitialized();

        const url = `${this.baseUrl}${endpoint}`;
        console.log('Making request to:', url);
        console.log('Request options:', options);

        // Ensure headers object exists
        options.headers = options.headers || {};
        
        // Add authorization header if token exists
        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        // Add default headers
        options.headers['Content-Type'] = 'application/json';

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Auth endpoints
    async patientLogin(credentials) {
        await this.ensureInitialized();
        return this.request(this.endpoints.auth.patientLogin, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async doctorLogin(credentials) {
        await this.ensureInitialized();
        return this.request(this.endpoints.auth.doctorLogin, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async adminLogin(credentials) {
        await this.ensureInitialized();
        return this.request(this.endpoints.auth.adminLogin, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    // Doctor endpoints
    async registerDoctor(doctorData) {
        await this.ensureInitialized();
        return this.request(this.endpoints.doctors.register, {
            method: 'POST',
            body: JSON.stringify(doctorData)
        });
    }

    async getDoctorAvailability(doctorId) {
        await this.ensureInitialized();
        const endpoint = replaceUrlParams(this.endpoints.doctors.getAvailability, { doctorId });
        return this.request(endpoint);
    }

    async getDoctor(id) {
        await this.ensureInitialized();
        const endpoint = replaceUrlParams(this.endpoints.doctors.getDoctor, { id });
        return this.request(endpoint);
    }

    async approveDoctor(doctorId) {
        await this.ensureInitialized();
        const endpoint = replaceUrlParams(this.endpoints.doctors.approve, { doctorId });
        return this.request(endpoint, { method: 'POST' });
    }

    async getApprovedDoctors() {
        await this.ensureInitialized();
        return this.request(this.endpoints.doctors.getApproved);
    }

    async getUnapprovedDoctors() {
        await this.ensureInitialized();
        return this.request(this.endpoints.doctors.getUnapproved);
    }

    // Patient endpoints
    async registerPatient(patientData) {
        await this.ensureInitialized();
        return this.request(this.endpoints.patients.register, {
            method: 'POST',
            body: JSON.stringify(patientData)
        });
    }

    async searchDoctors(params) {
        await this.ensureInitialized();
        const queryString = new URLSearchParams(params).toString();
        return this.request(`${this.endpoints.patients.searchDoctors}?${queryString}`);
    }

    async makeAppointment(appointmentData) {
        await this.ensureInitialized();
        return this.request(this.endpoints.patients.makeAppointment, {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    }

    async getAppointment(doctorId) {
        await this.ensureInitialized();
        const endpoint = replaceUrlParams(this.endpoints.patients.getAppointment, { doctorId });
        return this.request(endpoint);
    }

    async getSpecialties() {
        await this.ensureInitialized();
        return this.request(this.endpoints.patients.getSpecialties);
    }

    // Add these new methods for reviews
    async getReviews(doctorId) {
        const endpoint = this.endpoints.comments.getReviews.replace('{doctorId}', doctorId);
        const response = await this.request(endpoint);
        return response;
    }

    async addReview(reviewData) {
        const endpoint = this.endpoints.comments.addReview;
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
        return response;
    }

    async checkInappropriate(reviewData) {
        const endpoint = this.endpoints.comments.checkInappropriate;
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
        return response;
    }

    // Add queueUnfinishedAppointment method
    async queueUnfinishedAppointment(appointmentData) {
        await this.ensureInitialized();
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        this.setAuthToken(token);
        
        // Ensure the data is properly formatted
        const data = {
            userId: 0,
            doctorId: 0,
            selectedDateTime: appointmentData.selectedDateTime,
            email: appointmentData.email
        };

        return this.request(this.endpoints.appointments.queueUnfinished, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// Export a singleton instance
const apiClient = new ApiClient();
export default apiClient; 