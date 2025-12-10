/**
 * CALENDAR MODULE
 * Renders day and week calendar views
 */

// Calendar state
let selectedDate = formatDate(new Date());
let currentView = 'day';
let bookingData = [];
let holdingRoomBookings = [];

/**
 * Initialize calendar
 */
function initCalendar() {
  // Set date picker to today
  document.getElementById('datePicker').value = selectedDate;
  updateDateLabel();
  
  // Load initial data
  refreshData();
}

/**
 * Refresh booking data from Firebase
 */
async function refreshData() {
  showLoading(true);
  
  try {
    // Load bookings
    const bookingsSnapshot = await database.ref('bookings').once('value');
    const allBookings = bookingsSnapshot.val() || {};
    
    // Separate active bookings from holding room
    bookingData = [];
    holdingRoomBookings = [];
    
    Object.entries(allBookings).forEach(([id, booking]) => {
      if (!booking || booking.status === 'cancelled' || booking.status === 'cancel') {
        return;
      }
      
      // Check for holding room
      if (booking.room === 'Henley_Holding_Room' || booking.date === '2030-01-01') {
        holdingRoomBookings.push({ ...booking, bookingId: id });
      } else {
        bookingData.push({ ...booking, bookingId: id });
      }
    });
    
    console.log(`Loaded ${bookingData.length} bookings, ${holdingRoomBookings.length} in holding`);
    
    // Render appropriate view
    if (currentView === 'day') {
      renderDayView();
    } else {
      renderWeekView();
    }
    
  } catch (error) {
    console.error('Error loading bookings:', error);
    showToast('Error loading calendar data');
  }
  
  showLoading(false);
}

/**
 * Switch between day and week view
 */
function switchView(view) {
  currentView = view;
  
  // Update active button
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.view-btn[onclick*="${view}"]`)?.classList.add('active');
  
  // Render
  if (view === 'day') {
    renderDayView();
  } else {
    renderWeekView();
  }
}

/**
 * Navigate to previous/next day
 */
function navigateDate(direction) {
  const date = new Date(selectedDate + 'T12:00:00');
  date.setDate(date.getDate() + direction);
  selectedDate = formatDate(date);
  document.getElementById('datePicker').value = selectedDate;
  updateDateLabel();
  refreshData();
}

/**
 * Handle date picker change
 */
function onDateChange() {
  selectedDate = document.getElementById('datePicker').value;
  updateDateLabel();
  refreshData();
}

/**
 * Go to today
 */
function goToToday() {
  selectedDate = formatDate(new Date());
  document.getElementById('datePicker').value = selectedDate;
  updateDateLabel();
  refreshData();
}

/**
 * Update date label
 */
function updateDateLabel() {
  const label = document.getElementById('dateLabel');
  const date = new Date(selectedDate + 'T12:00:00');
  label.textContent = date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.display = show ? 'block' : 'none';
  }
}

/**
 * Render day view
 */
function renderDayView() {
  const container = document.getElementById('calendarContainer');
  
  // Build HTML
  let html = '<div class="day-grid">';
  
  // Header row with rooms
  html += '<div class="grid-header"></div>'; // Empty corner
  Object.keys(ROOMS).forEach(room => {
    html += `<div class="grid-header room-header">${room}</div>`;
  });
  
  // Track which cells are booked
  const bookedCells = new Set();
  
  // Get bookings for selected date
  const dayBookings = bookingData.filter(b => b.date === selectedDate);
  
  // Map bookings to cells
  dayBookings.forEach(booking => {
    const roomId = getRoomIdFromBooking(booking);
    const startHour = parseInt(booking.start?.split(':')[0] || 0);
    const endHour = parseInt(booking.end?.split(':')[0] || startHour + 1);
    
    for (let h = startHour; h < endHour; h++) {
      const cellId = `cell-${roomId}-${formatTime(h)}`;
      bookedCells.add(cellId);
    }
  });
  
  // Time rows
  BUSINESS_HOURS.forEach(time => {
    html += `<div class="grid-time">${time}</div>`;
    
    Object.entries(ROOMS).forEach(([roomName, roomConfig]) => {
      const cellId = `cell-${roomConfig.id}-${time}`;
      const isBooked = bookedCells.has(cellId);
      
      // Find booking for this cell
      const booking = dayBookings.find(b => {
        const bRoomId = getRoomIdFromBooking(b);
        const bStart = parseInt(b.start?.split(':')[0] || 0);
        const bEnd = parseInt(b.end?.split(':')[0] || bStart + 1);
        const cellHour = parseInt(time.split(':')[0]);
        return bRoomId === roomConfig.id && cellHour >= bStart && cellHour < bEnd;
      });
      
      if (isBooked && booking) {
        // Booked cell
        const isFirstHour = time === booking.start;
        html += `
          <div class="calendar-cell booked room-${roomConfig.id}" id="${cellId}" 
               ${isFirstHour ? `onclick="selectBooking('${booking.bookingId}')"` : ''}>
            ${isFirstHour ? `
              <div class="booking-info">
                <strong>${booking.client || 'Unknown'}</strong>
                <small>${booking.start} - ${booking.end}</small>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        // Available cell - check if bookable
        const bookableInfo = isSlotBookable(roomName, selectedDate, time, bookedCells);
        
        let cellClass = 'calendar-cell available';
        let cellTitle = '';
        let clickHandler = '';
        
        if (canMakeBookings() && bookableInfo.bookable) {
          cellClass += ' available-slot';
          if (bookableInfo.isFree) {
            cellTitle = `Book ${roomName} at ${time} - FREE`;
          } else {
            cellTitle = `Book ${roomName} at ${time} - £${(bookableInfo.price / 100).toFixed(2)}`;
          }
          clickHandler = `onclick="addToBasket('${roomName}', '${selectedDate}', '${time}')"`;
        } else if (!bookableInfo.bookable && bookableInfo.reason) {
          cellTitle = bookableInfo.reason;
        }
        
        html += `<div class="${cellClass}" id="${cellId}" title="${cellTitle}" ${clickHandler}></div>`;
      }
    });
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  // Re-apply basket highlights
  highlightBasketSlots();
}

/**
 * Render week view
 */
function renderWeekView() {
  const container = document.getElementById('calendarContainer');
  
  // Get week start (Monday)
  const weekStart = getWeekStart(new Date(selectedDate + 'T12:00:00'));
  
  // Build week days
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    weekDays.push(formatDate(day));
  }
  
  // Track booked cells
  const bookedCells = new Set();
  
  // Get bookings for the week
  const weekBookings = bookingData.filter(b => weekDays.includes(b.date));
  
  weekBookings.forEach(booking => {
    const roomId = getRoomIdFromBooking(booking);
    const startHour = parseInt(booking.start?.split(':')[0] || 0);
    const cellId = `week-${booking.date}-${roomId}-${formatTime(startHour)}`;
    bookedCells.add(cellId);
  });
  
  // Build HTML
  let html = '<div class="week-grid">';
  
  // Header row with days
  html += '<div class="grid-header"></div>';
  weekDays.forEach(day => {
    const date = new Date(day + 'T12:00:00');
    const isToday = day === formatDate(new Date());
    html += `
      <div class="grid-header day-header ${isToday ? 'today' : ''}">
        <div class="day-name">${WEEKDAYS_SHORT[date.getDay()]}</div>
        <div class="day-date">${date.getDate()}</div>
      </div>
    `;
  });
  
  // Simplified week view - just show first room
  const room = 'Room 1';
  const roomConfig = ROOMS[room];
  
  BUSINESS_HOURS.forEach(time => {
    html += `<div class="grid-time">${time}</div>`;
    
    weekDays.forEach(day => {
      const cellId = `week-${day}-${roomConfig.id}-${time}`;
      const booking = weekBookings.find(b => {
        const bRoomId = getRoomIdFromBooking(b);
        return b.date === day && bRoomId === roomConfig.id && b.start === time;
      });
      
      if (booking) {
        html += `
          <div class="calendar-cell booked" id="${cellId}">
            <small>${booking.client?.split(' ')[0] || '•'}</small>
          </div>
        `;
      } else {
        html += `<div class="calendar-cell available" id="${cellId}"></div>`;
      }
    });
  });
  
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Get room ID from booking data
 */
function getRoomIdFromBooking(booking) {
  // Try various room field formats
  if (booking.room === 'Room_1' || booking.room === '1') return '1';
  if (booking.room === 'Room_2' || booking.room === '2') return '2';
  if (booking.room === 'Room_4' || booking.room === '4') return '4';
  if (booking.room === 'Room_5' || booking.room === '5') return '5';
  if (booking.room === 'Room_6' || booking.room === '6') return '6';
  if (booking.room === 'Room_7' || booking.room === '7') return '7';
  if (booking.room === 'Online' || booking.location?.toLowerCase().includes('online')) return 'online';
  return booking.room || '1';
}

/**
 * Get week start date (Monday)
 */
function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? 6 : day - 1; // Adjust for Monday start
  result.setDate(result.getDate() - diff);
  return result;
}

/**
 * Select a booking (for viewing/editing)
 */
function selectBooking(bookingId) {
  const booking = bookingData.find(b => b.bookingId === bookingId);
  if (booking) {
    console.log('Selected booking:', booking);
    // TODO: Show booking details panel
  }
}
