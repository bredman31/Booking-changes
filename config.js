/**
 * CONFIG.JS - Cherry Tree Centre Configuration
 * ============================================
 * Centralized configuration - NO FIREBASE CHANGES REQUIRED
 * This just extracts existing values from index.html
 */

// ================================
// FIREBASE CONFIGURATION
// ================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCVp4QDAnh5RcxGZIrEY2LriUWKQNcNbzE",
  authDomain: "cherry-tree-bookings.firebaseapp.com",
  databaseURL: "https://cherry-tree-bookings-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cherry-tree-bookings",
  storageBucket: "cherry-tree-bookings.firebasestorage.app",
  messagingSenderId: "280166213685",
  appId: "1:280166213685:web:f80b11799f41f5f385297c"
};

// ================================
// WEBHOOK URLS (Make.com)
// ================================
const WEBHOOKS = {
  BOOKING_CHANGES: 'https://hook.eu2.make.com/p754q5eks857boisu6m3unr6qer6be4t',
  NEW_BOOKING: 'https://hook.eu2.make.com/eq57vfwrpkw2rtozjeiy71j88e5sw1kr'
};

// ================================
// GOOGLE APPS SCRIPT URLS
// ================================
const GOOGLE_SCRIPTS = {
  MAIN: 'https://script.google.com/macros/s/AKfycbxaMATLZvtAxJULI2l3teqb0u6FkBiP8LBuGMV7VrcU2NxMEbH92aj8Q4YI6aZ1GLUm4Q/exec',
  CHANGE_REQUESTS: 'https://script.google.com/macros/s/AKfycbwVIQAryAHaD9HfEqAvaxXDo-nd1BSN664E4Kyg1tVWgmOsTfG6VS7JYgHohqN7HQiz/exec'
};

// ================================
// ROOM CONFIGURATION
// ================================
const ROOM_PROVIDER_IDS = {
  'Room_1': '3',
  'Room_2': '7',
  'Room_4': '8',
  'Room_5': '13',
  'Room_6': '9',
  'Room_7': '10',
  'Car Park': '12',
  'Online': '11',
  'Online Counselling': '11',
  'Henley_Holding_Room': '18'
};

// Rooms for calendar display (ordered)
const CALENDAR_ROOMS = ['Room 1', 'Room 2', 'Room 4', 'Room 5', 'Room 6', 'Room 7', 'Online'];

// Henley location rooms
const HENLEY_ROOMS = ['Room_1', 'Room 1', 'Room_2', 'Room 2', 'Room_4', 'Room 4', 'Room_5', 'Room 5', 'Room_6', 'Room 6', 'Room_7', 'Room 7', 'Car Park', 'Henley_Holding_Room'];

// Log successful load
console.log('✅ config.js loaded');
