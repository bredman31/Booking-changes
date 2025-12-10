/**
 * BOOKING MODULE
 * Handles individual booking creation, modification, and cancellation
 */

/**
 * Create a single booking via webhook
 */
async function createBooking(bookingData) {
  const counsellorName = selectedCounsellor || sessionStorage.getItem('counsellorName');
  
  const payload = {
    action: 'create',
    timestamp: new Date().toISOString(),
    client_id: clientId || window.clientId,
    counsellor_name: counsellorName,
    service_id: '2',
    provider_id: bookingData.roomId,
    location_id: bookingData.locationId,
    room_name: bookingData.room,
    start_datetime: `${bookingData.date}T${bookingData.time}:00`,
    end_datetime: `${bookingData.date}T${bookingData.endTime}:00`,
    additional_fields: {
      comments: bookingData.comments || `Booked via counsellor calendar by ${counsellorName}`
    },
    payment: {
      paymentId: bookingData.paymentId || null,
      paymentAmount: bookingData.price || 0,
      paymentStatus: bookingData.price === 0 ? 'free' : 'paid',
      paymentMethod: bookingData.price === 0 ? 'none' : 'card'
    }
  };
  
  console.log('Creating booking:', payload);
  
  const response = await fetch(WEBHOOKS.NEW_BOOKING, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
  }
  
  return true;
}

/**
 * Modify an existing booking via webhook
 */
async function modifyBooking(originalBooking, newDetails) {
  const counsellorId = originalBooking.clientId || clientId || '6';
  
  // Room mapping for SimplybookMe
  const ROOM_MAPPING = {
    'Room_1': '3',
    'Room_2': '7',
    'Room_4': '8',
    'Room_5': '13',
    'Room_6': '9',
    'Room_7': '10',
    'Online': '11',
    'Henley_Holding_Room': '18'
  };
  
  const originalRoom = convertRoomNameToUnderscore(originalBooking.room);
  const newRoom = convertRoomNameToUnderscore(newDetails.room || originalBooking.room);
  
  const payload = {
    timestamp: new Date().toISOString(),
    action: 'modify',
    counsellor_id: counsellorId,
    original_booking_code: originalBooking.bookingId,
    original_room: originalRoom,
    original_room_id: ROOM_MAPPING[originalRoom] || '3',
    original_location_id: originalBooking.locationId || '2',
    original_datetime: `${originalBooking.date}T${originalBooking.start}:00`,
    requested_room: newRoom,
    requested_room_id: ROOM_MAPPING[newRoom] || '3',
    requested_location_id: newDetails.locationId || originalBooking.locationId || '2',
    requested_datetime: `${newDetails.date || originalBooking.date}T${newDetails.time || originalBooking.start}:00`,
    service_id: '2',
    comments: originalBooking.comments || '',
    is_paid: originalBooking.isPaid ? 'True' : 'No'
  };
  
  console.log('Modifying booking:', payload);
  
  const response = await fetch(WEBHOOKS.MODIFY_CANCEL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Modification failed: ${response.status}`);
  }
  
  return true;
}

/**
 * Cancel a booking via webhook
 */
async function cancelBooking(booking) {
  const counsellorId = booking.clientId || clientId || '6';
  const roomKey = convertRoomNameToUnderscore(booking.room) || 'Room_1';
  
  // Room mapping for SimplybookMe
  const ROOM_MAPPING = {
    'Room_1': '3',
    'Room_2': '7',
    'Room_4': '8',
    'Room_5': '13',
    'Room_6': '9',
    'Room_7': '10',
    'Online': '11',
    'Henley_Holding_Room': '18'
  };
  
  let payload;
  
  if (booking.isPaid) {
    // Move to holding room instead of cancelling
    payload = {
      timestamp: new Date().toISOString(),
      action: 'modify',
      counsellor_id: counsellorId,
      original_booking_code: booking.bookingId,
      original_room: roomKey,
      original_room_id: ROOM_MAPPING[roomKey] || '3',
      original_location_id: booking.locationId || '2',
      original_datetime: `${booking.date}T${booking.start}:00`,
      requested_room: 'Henley_Holding_Room',
      requested_room_id: '18',
      requested_location_id: '2',
      requested_datetime: `2030-01-01T${booking.start}:00`,
      service_id: '2',
      is_paid: 'True'
    };
  } else {
    // Cancel directly
    payload = {
      timestamp: new Date().toISOString(),
      action: 'cancel',
      counsellor_id: counsellorId,
      booking_code: booking.bookingId,
      original_datetime: `${booking.date}T${booking.start}:00`,
      original_room: roomKey,
      service_id: '2',
      is_paid: 'No'
    };
  }
  
  console.log('Cancelling booking:', payload);
  
  const response = await fetch(WEBHOOKS.MODIFY_CANCEL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Cancellation failed: ${response.status}`);
  }
  
  return true;
}

/**
 * Convert room display name to underscore format for webhook
 */
function convertRoomNameToUnderscore(roomName) {
  if (!roomName) return roomName;
  if (roomName.startsWith('Room ')) {
    return roomName.replace('Room ', 'Room_');
  }
  return roomName;
}

/**
 * Log change request to Google Sheets
 */
async function logChangeToGoogleSheets(changeData, webhookPayload) {
  try {
    const formData = new FormData();
    formData.append('timestamp', new Date().toISOString());
    formData.append('counsellorName', changeData.counsellorName || selectedCounsellor);
    formData.append('action', changeData.action || 'modify');
    formData.append('originalBookingCode', changeData.originalBookingCode || '');
    formData.append('originalRoom', changeData.originalRoom || '');
    formData.append('originalDateTime', changeData.originalDateTime || '');
    formData.append('requestedRoom', changeData.requestedRoom || '');
    formData.append('requestedDateTime', changeData.requestedDateTime || '');
    formData.append('webhookSent', 'Yes');
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      console.log('Logged to Google Sheets');
    }
  } catch (error) {
    console.warn('Google Sheets logging failed:', error);
  }
}
