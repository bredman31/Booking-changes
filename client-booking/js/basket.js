/**
 * BASKET MODULE
 * Handles multi-slot booking with separate webhooks
 */

// Basket state
let bookingBasket = [];

/**
 * Initialize basket
 */
function initializeBasket() {
  updateBasketUI();
  
  // Show basket FAB only for users who can make bookings
  if (canMakeBookings()) {
    document.getElementById('basketFab').style.display = 'block';
  }
}

/**
 * Toggle basket panel open/closed
 */
function toggleBasket() {
  const panel = document.getElementById('basketPanel');
  panel.classList.toggle('open');
}

/**
 * Add a booking to the basket (or remove if already present)
 */
function addToBasket(room, date, time) {
  // Check if user can make bookings
  if (!canMakeBookings()) {
    showToast('Bookings not available at this time');
    return;
  }
  
  // Check if already in basket - toggle behavior
  const existingIndex = bookingBasket.findIndex(item => 
    item.room === room && item.date === date && item.time === time
  );
  
  if (existingIndex >= 0) {
    removeFromBasket(existingIndex);
    return;
  }
  
  // Calculate price
  const locationId = getRoomLocationId(room);
  const hour = parseInt(time.split(':')[0]);
  const priceResult = calculateBookingPrice(locationId, date, hour);
  
  // Check if bookable
  if (!priceResult.available) {
    showToast(priceResult.breakdown || 'This slot is not available');
    return;
  }
  
  // Calculate end time (1 hour later)
  const endHour = hour + 1;
  const endTime = `${String(endHour).padStart(2, '0')}:00`;
  
  // Get room provider ID for webhook
  const roomProviderId = getRoomProviderId(room);
  
  // Format date for display
  const displayDate = formatDisplayDate(date);
  
  // Create basket item
  const basketItem = {
    id: `${room}-${date}-${time}`,
    room: room,
    roomId: roomProviderId,
    date: date,
    displayDate: displayDate,
    time: time,
    endTime: endTime,
    locationId: locationId,
    locationName: getLocationName(locationId),
    price: priceResult.amount,
    priceBreakdown: priceResult.breakdown,
    isFree: priceResult.amount === 0
  };
  
  bookingBasket.push(basketItem);
  updateBasketUI();
  highlightBasketSlots();
  
  // Show confirmation
  const priceText = basketItem.isFree ? 'FREE' : `£${(basketItem.price / 100).toFixed(2)}`;
  showToast(`Added ${room} - ${priceText}`);
  
  // Auto-open basket on first item
  if (bookingBasket.length === 1) {
    toggleBasket();
  }
}

/**
 * Remove item from basket by index
 */
function removeFromBasket(index) {
  const item = bookingBasket[index];
  bookingBasket.splice(index, 1);
  updateBasketUI();
  highlightBasketSlots();
  
  if (item) {
    showToast(`Removed ${item.room}`);
  }
}

/**
 * Clear entire basket
 */
function clearBasket() {
  if (bookingBasket.length === 0) return;
  
  if (confirm('Clear all items from your basket?')) {
    bookingBasket = [];
    updateBasketUI();
    highlightBasketSlots();
  }
}

/**
 * Update basket UI
 */
function updateBasketUI() {
  const itemsContainer = document.getElementById('basketItems');
  const totalElement = document.getElementById('basketTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const badge = document.getElementById('basketBadge');
  
  // Update badge
  badge.textContent = bookingBasket.length > 0 ? bookingBasket.length : '';
  
  // Calculate total
  const total = bookingBasket.reduce((sum, item) => sum + item.price, 0);
  const allFree = bookingBasket.length > 0 && total === 0;
  
  totalElement.textContent = allFree ? 'FREE' : `£${(total / 100).toFixed(2)}`;
  
  // Update checkout button
  checkoutBtn.disabled = bookingBasket.length === 0;
  if (bookingBasket.length === 0) {
    checkoutBtn.textContent = 'Complete Booking';
  } else if (allFree) {
    checkoutBtn.textContent = `Book ${bookingBasket.length} Slot${bookingBasket.length > 1 ? 's' : ''} (Free)`;
  } else {
    checkoutBtn.textContent = `Pay £${(total / 100).toFixed(2)} & Book`;
  }
  
  // Render items or empty state
  if (bookingBasket.length === 0) {
    itemsContainer.innerHTML = `
      <div class="basket-empty">
        <div class="basket-empty-icon">🛒</div>
        <p>Your basket is empty</p>
        <p style="font-size: 12px;">Click on available time slots to add bookings</p>
      </div>
    `;
    return;
  }
  
  itemsContainer.innerHTML = bookingBasket.map((item, index) => `
    <div class="basket-item ${item.isFree ? 'free' : ''}">
      <button class="basket-item-remove" onclick="removeFromBasket(${index})">×</button>
      <div class="basket-item-header">
        <span class="basket-item-room">${item.room}</span>
        <span class="basket-item-price ${item.isFree ? 'free' : ''}">
          ${item.isFree ? 'FREE' : '£' + (item.price / 100).toFixed(2)}
        </span>
      </div>
      <div class="basket-item-details">
        📅 ${item.displayDate}<br>
        🕐 ${item.time} - ${item.endTime}<br>
        📍 ${item.locationName}
      </div>
    </div>
  `).join('');
}

/**
 * Highlight calendar slots that are in the basket
 */
function highlightBasketSlots() {
  // Remove all existing highlights
  document.querySelectorAll('.calendar-cell.in-basket').forEach(cell => {
    cell.classList.remove('in-basket');
  });
  
  // Add highlights for basket items on current date
  bookingBasket.forEach(item => {
    if (item.date === selectedDate) {
      const roomId = getRoomId(item.room);
      if (roomId) {
        const cellId = `cell-${roomId}-${item.time}`;
        const cell = document.getElementById(cellId);
        if (cell) {
          cell.classList.add('in-basket');
        }
      }
    }
  });
}

/**
 * Process checkout - send each booking as separate webhook
 */
async function processCheckout() {
  if (bookingBasket.length === 0) return;
  
  const total = bookingBasket.reduce((sum, item) => sum + item.price, 0);
  const allFree = total === 0;
  
  // Show processing overlay
  const processingDiv = document.getElementById('basketProcessing');
  const statusDiv = document.getElementById('processingStatus');
  const progressBar = document.getElementById('processingBar');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  processingDiv.style.display = 'flex';
  checkoutBtn.disabled = true;
  
  try {
    // If there are paid bookings, process payment first
    if (!allFree) {
      statusDiv.textContent = 'Processing payment...';
      progressBar.style.width = '10%';
      
      // TODO: Stripe payment integration
      console.log('Payment would be processed here for £' + (total / 100).toFixed(2));
      
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      statusDiv.textContent = 'Payment successful! Creating bookings...';
      progressBar.style.width = '20%';
    }
    
    // Process each booking as a separate webhook
    const results = [];
    const counsellorName = selectedCounsellor || sessionStorage.getItem('counsellorName');
    
    for (let i = 0; i < bookingBasket.length; i++) {
      const item = bookingBasket[i];
      const progress = 20 + ((i + 1) / bookingBasket.length) * 70;
      
      statusDiv.textContent = `Creating booking ${i + 1} of ${bookingBasket.length}...`;
      progressBar.style.width = `${progress}%`;
      
      // Build webhook payload
      const bookingPayload = {
        action: 'create',
        timestamp: new Date().toISOString(),
        client_id: clientId || window.clientId,
        counsellor_name: counsellorName,
        service_id: '2',
        provider_id: item.roomId,
        location_id: item.locationId,
        room_name: item.room,
        start_datetime: `${item.date}T${item.time}:00`,
        end_datetime: `${item.date}T${item.endTime}:00`,
        additional_fields: {
          comments: `Booked via counsellor calendar by ${counsellorName}`,
          basket_booking: true,
          basket_total_items: bookingBasket.length,
          basket_item_number: i + 1
        },
        payment: {
          paymentId: allFree ? null : 'BASKET_' + Date.now(),
          paymentAmount: item.price,
          paymentStatus: item.isFree ? 'free' : 'paid',
          paymentMethod: item.isFree ? 'none' : 'card'
        }
      };
      
      console.log(`Sending webhook ${i + 1}/${bookingBasket.length}:`, bookingPayload);
      
      try {
        const response = await fetch(WEBHOOKS.NEW_BOOKING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        results.push({ success: true, item: item });
        console.log(`✅ Booking ${i + 1} created successfully`);
        
      } catch (error) {
        console.error(`❌ Booking ${i + 1} failed:`, error);
        results.push({ success: false, item: item, error: error.message });
      }
      
      // Delay between webhooks
      if (i < bookingBasket.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Complete
    progressBar.style.width = '100%';
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (failCount === 0) {
      statusDiv.innerHTML = `
        <strong style="color: #4caf50;">✓ All ${successCount} booking${successCount > 1 ? 's' : ''} created!</strong><br>
        <small>The calendar will refresh shortly.</small>
      `;
    } else {
      statusDiv.innerHTML = `
        <strong style="color: #ff9800;">⚠ ${successCount} succeeded, ${failCount} failed</strong><br>
        <small>Please check the calendar and try again for failed bookings.</small>
      `;
    }
    
    // Clear basket and refresh
    setTimeout(() => {
      bookingBasket = [];
      updateBasketUI();
      processingDiv.style.display = 'none';
      toggleBasket();
      refreshData();
    }, 3000);
    
  } catch (error) {
    console.error('Checkout error:', error);
    statusDiv.innerHTML = `
      <strong style="color: #f44336;">Error: ${error.message}</strong><br>
      <small>Please try again or contact support.</small>
    `;
    
    setTimeout(() => {
      processingDiv.style.display = 'none';
      checkoutBtn.disabled = false;
    }, 3000);
  }
}

/**
 * Toast notification
 */
function showToast(message) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
