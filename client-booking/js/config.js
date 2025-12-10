/**
 * CONFIGURATION
 * Firebase setup and app constants
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVp4QDAnh5RcxGZIrEY2LriUWKQNcNbzE",
  authDomain: "cherry-tree-bookings.firebaseapp.com",
  databaseURL: "https://cherry-tree-bookings-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cherry-tree-bookings",
  storageBucket: "cherry-tree-bookings.firebasestorage.app",
  messagingSenderId: "280166213685",
  appId: "1:280166213685:web:f80b11799f41f5f385297c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Webhook URLs
const WEBHOOKS = {
  NEW_BOOKING: 'https://hook.eu2.make.com/eq57vfwrpkw2rtozjeiy71j88e5sw1kr',
  MODIFY_CANCEL: 'https://hook.eu2.make.com/p754q5eks857boisu6m3unr6qer6be4t'
};

// Google Apps Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxaMATLZvtAxJULI2l3teqb0u6FkBiP8LBuGMV7VrcU2NxMEbH92aj8Q4YI6aZ1GLUm4Q/exec';

// Room configuration
const ROOMS = {
  'Room 1': { id: '1', providerId: '3', location: '2' },
  'Room 2': { id: '2', providerId: '7', location: '2' },
  'Room 4': { id: '4', providerId: '8', location: '2' },
  'Room 5': { id: '5', providerId: '13', location: '2' },
  'Room 6': { id: '6', providerId: '9', location: '2' },
  'Room 7': { id: '7', providerId: '10', location: '2' },
  'Online': { id: 'online', providerId: '11', location: '1' }
};

// Business hours
const BUSINESS_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

// Day names
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Location names
const LOCATIONS = {
  '1': 'Buckhurst Hill',
  '2': 'Henley'
};

// Helper functions
function getRoomLocationId(roomName) {
  return ROOMS[roomName]?.location || '2';
}

function getRoomProviderId(roomName) {
  return ROOMS[roomName]?.providerId || null;
}

function getRoomId(roomName) {
  return ROOMS[roomName]?.id || null;
}

function getLocationName(locationId) {
  return LOCATIONS[locationId] || 'Unknown';
}

// Date formatting helpers
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}
