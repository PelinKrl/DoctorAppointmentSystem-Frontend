async function createAppointment(doctorId, selectedDate, selectedTime) {
    try {
        // Get the authentication token
        const token = localStorage.getItem('patientToken');
        if (!token) {
            throw new Error('Authentication token not found. Please sign in again.');
        }

        // Set the token in the API client
        apiClient.setAuthToken(token);

        const appointmentData = {
            doctorId: doctorId,
            appointmentDate: selectedDate,
            appointmentTime: selectedTime
        };

        console.log('Sending appointment data:', JSON.stringify(appointmentData, null, 2));

        const response = await apiClient.makeAppointment(appointmentData);
        console.log('Appointment response:', response);

        Swal.fire({
            icon: 'success',
            title: 'Appointment Created!',
            text: 'Your appointment has been successfully scheduled.',
            timer: 3000,
            showConfirmButton: false
        });

        return response;
    } catch (error) {
        console.error('Error creating appointment:', error);
        
        let errorMessage = 'Failed to create appointment. ';
        if (error.message.includes('token')) {
            errorMessage = error.message;
        } else {
            errorMessage += 'Please try again later.';
        }

        Swal.fire({
            icon: 'error',
            title: 'Appointment Creation Failed',
            text: errorMessage
        });

        throw error;
    }
} 