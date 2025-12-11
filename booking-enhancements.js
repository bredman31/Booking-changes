/**
 * BOOKING-ENHANCEMENTS.JS
 * =======================
 * Cherry Tree Centre - Booking System Enhancements
 * 
 * Features:
 * 1. Fixes £0 booking issue (greyed out button)
 * 2. Adds multi-booking basket functionality
 * 3. Changes button text based on price
 * 
 * Installation: Add this line AFTER your main scripts in index.html:
 * <script src="booking-enhancements.js"></script>
 */

(function() {
  'use strict';
  console.log('🛒 booking-enhancements.js loading...');

  // ============================================
  // BASKET STATE
  // ============================================
  window.bookingBasket = window.bookingBasket || [];

  // ============================================
  // INJECT BASKET UI (CSS + HTML)
  // ============================================
  function injectBasketUI() {
    // Add CSS styles
    const styles = document.createElement('style');
    styles.textContent = `
      /* Basket Button - Fixed Position */
      .basket-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 15px 25px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
      }
      .basket-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }
      .basket-btn.hidden { display: none; }
      .basket-count {
        background: #ff4757;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
      }

      /* Basket Panel */
      .basket-panel {
        position: fixed;
        top: 0;
        right: -400px;
        width: 380px;
        max-width: 90vw;
        height: 100vh;
        background: white;
        box-shadow: -5px 0 30px rgba(0,0,0,0.2);
        z-index: 1001;
        transition: right 0.3s ease;
        display: flex;
        flex-direction: column;
      }
      .basket-panel.open { right: 0; }

      .basket-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .basket-header h3 { margin: 0; font-size: 20px; }
      .basket-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .basket-close:hover { background: rgba(255,255,255,0.3); }

      .basket-items {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
      }
      .basket-item {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 10px;
        position: relative;
        border-left: 4px solid #667eea;
      }
      .basket-item-room { font-weight: 600; color: #333; font-size: 16px; }
      .basket-item-date { color: #666; font-size: 14px; margin-top: 5px; }
      .basket-item-time { color: #888; font-size: 13px; }
      .basket-item-price { 
        font-weight: 600; 
        color: #4caf50; 
        font-size: 15px;
        margin-top: 8px;
      }
      .basket-item-remove {
        position: absolute;
        top: 10px;
        right: 10px;
        background: #ff4757;
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
      }
      .basket-item-remove:hover { background: #e84141; }

      .basket-empty {
        text-align: center;
        color: #999;
        padding: 40px 20px;
      }
      .basket-empty-icon { font-size: 48px; margin-bottom: 15px; }

      .basket-footer {
        border-top: 1px solid #eee;
        padding: 20px;
        background: #f8f9fa;
      }
      .basket-total {
        display: flex;
        justify-content: space-between;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
      }
      .basket-total-amount { color: #4caf50; }
      
      .basket-actions { display: flex; gap: 10px; }
      .basket-clear {
        flex: 1;
        padding: 12px;
        border: 2px solid #667eea;
        background: white;
        color: #667eea;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .basket-clear:hover { background: #f0f0ff; }
      .basket-checkout {
        flex: 2;
        padding: 12px;
        border: none;
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        color: white;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .basket-checkout:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(76,175,80,0.3); }
      .basket-checkout:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

      /* Basket overlay */
      .basket-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.4);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s;
      }
      .basket-overlay.open { opacity: 1; visibility: visible; }

      /* Add to basket button in modal */
      .add-to-basket-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        margin-right: 10px;
        transition: all 0.2s;
      }
      .add-to-basket-btn:hover { transform: translateY(-1px); }

      /* Toast for basket actions */
      .basket-toast {
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1002;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s;
      }
      .basket-toast.show { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(styles);

    // Add basket button (fixed position)
    const basketBtn = document.createElement('button');
    basketBtn.className = 'basket-btn hidden';
    basketBtn.id = 'basketBtn';
    basketBtn.innerHTML = '🛒 Basket <span class="basket-count" id="basketCount">0</span>';
    basketBtn.onclick = toggleBasketPanel;
    document.body.appendChild(basketBtn);

    // Add basket overlay
    const overlay = document.createElement('div');
    overlay.className = 'basket-overlay';
    overlay.id = 'basketOverlay';
    overlay.onclick = toggleBasketPanel;
    document.body.appendChild(overlay);

    // Add basket panel
    const panel = document.createElement('div');
    panel.className = 'basket-panel';
    panel.id = 'basketPanel';
    panel.innerHTML = `
      <div class="basket-header">
        <h3>🛒 Booking Basket</h3>
        <button class="basket-close" onclick="toggleBasketPanel()">×</button>
      </div>
      <div class="basket-items" id="basketItems">
        <div class="basket-empty">
          <div class="basket-empty-icon">🛒</div>
          <p>Your basket is empty</p>
          <p style="font-size: 13px;">Click on available slots to add bookings</p>
        </div>
      </div>
      <div class="basket-footer">
        <div class="basket-total">
          <span>Total:</span>
          <span class="basket-total-amount" id="basketTotal">£0.00</span>
        </div>
        <div class="basket-actions">
          <button class="basket-clear" onclick="clearBasket()">Clear All</button>
          <button class="basket-checkout" id="basketCheckout" onclick="checkoutBasket()">Confirm All Bookings</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Add toast container
    const toast = document.createElement('div');
    toast.className = 'basket-toast';
    toast.id = 'basketToast';
    document.body.appendChild(toast);

    console.log('✅ Basket UI injected');
  }

  // ============================================
  // BASKET FUNCTIONS
  // ============================================
  window.toggleBasketPanel = function() {
    const panel = document.getElementById('basketPanel');
    const overlay = document.getElementById('basketOverlay');
    panel.classList.toggle('open');
    overlay.classList.toggle('open');
  };

  window.addToBasket = function(booking) {
    // Check for duplicates
    const exists = window.bookingBasket.some(b => 
      b.room === booking.room && 
      b.date === booking.date && 
      b.time === booking.time
    );
    
    if (exists) {
      showBasketToast('⚠️ This slot is already in your basket');
      return;
    }

    window.bookingBasket.push(booking);
    updateBasketUI();
    showBasketToast('✅ Added to basket');
    
    // Close modal if open
    const modal = document.getElementById('newBookingModal');
    if (modal) modal.classList.remove('active');
  };

  window.removeFromBasket = function(index) {
    window.bookingBasket.splice(index, 1);
    updateBasketUI();
    showBasketToast('🗑️ Removed from basket');
  };

  window.clearBasket = function() {
    if (window.bookingBasket.length === 0) return;
    if (confirm('Clear all items from basket?')) {
      window.bookingBasket = [];
      updateBasketUI();
      showBasketToast('🗑️ Basket cleared');
    }
  };

  function updateBasketUI() {
    const count = window.bookingBasket.length;
    const countEl = document.getElementById('basketCount');
    const btnEl = document.getElementById('basketBtn');
    const itemsEl = document.getElementById('basketItems');
    const totalEl = document.getElementById('basketTotal');
    const checkoutBtn = document.getElementById('basketCheckout');

    // Update count
    if (countEl) countEl.textContent = count;
    if (btnEl) btnEl.classList.toggle('hidden', count === 0);

    // Update items list
    if (itemsEl) {
      if (count === 0) {
        itemsEl.innerHTML = `
          <div class="basket-empty">
            <div class="basket-empty-icon">🛒</div>
            <p>Your basket is empty</p>
            <p style="font-size: 13px;">Click on available slots to add bookings</p>
          </div>
        `;
      } else {
        itemsEl.innerHTML = window.bookingBasket.map((b, i) => `
          <div class="basket-item">
            <button class="basket-item-remove" onclick="removeFromBasket(${i})">×</button>
            <div class="basket-item-room">${b.room}</div>
            <div class="basket-item-date">📅 ${b.formattedDate}</div>
            <div class="basket-item-time">🕐 ${b.time} - ${b.endTime}</div>
            <div class="basket-item-price">${b.price > 0 ? '£' + (b.price / 100).toFixed(2) : 'FREE'}</div>
          </div>
        `).join('');
      }
    }

    // Update total
    const total = window.bookingBasket.reduce((sum, b) => sum + (b.price || 0), 0);
    if (totalEl) totalEl.textContent = total > 0 ? `£${(total / 100).toFixed(2)}` : 'FREE';

    // Update checkout button text
    if (checkoutBtn) {
      if (total > 0) {
        checkoutBtn.textContent = `Pay & Confirm (£${(total / 100).toFixed(2)})`;
      } else {
        checkoutBtn.textContent = 'Confirm All Bookings';
      }
    }
  }

  function showBasketToast(message) {
    const toast = document.getElementById('basketToast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }
  }

  window.checkoutBasket = async function() {
    if (window.bookingBasket.length === 0) return;

    const total = window.bookingBasket.reduce((sum, b) => sum + (b.price || 0), 0);
    const checkoutBtn = document.getElementById('basketCheckout');
    
    if (total > 0) {
      // Paid bookings - Stripe integration needed
      showBasketToast('💳 Stripe payment integration coming soon');
      console.log('Basket checkout - payment required:', window.bookingBasket);
      return;
    }

    // Free bookings - process all
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';

    const webhookUrl = 'https://hook.eu2.make.com/eq57vfwrpkw2rtozjeiy71j88e5sw1kr';
    const counsellorName = window.selectedCounsellor || sessionStorage.getItem('counsellorName');
    let successCount = 0;
    let failCount = 0;

    for (const booking of window.bookingBasket) {
      try {
        const payload = {
          action: 'create',
          timestamp: new Date().toISOString(),
          client_id: window.clientId,
          counsellor_name: counsellorName,
          service_id: '2',
          provider_id: booking.roomId,
          location_id: booking.locationId,
          room_name: booking.room,
          start_datetime: `${booking.date}T${booking.time}:00`,
          end_datetime: `${booking.date}T${booking.endTime}:00`,
          additional_fields: {
            comments: `Basket booking by ${counsellorName}`
          },
          payment: {
            paymentId: null,
            paymentAmount: 0,
            paymentStatus: 'free',
            paymentMethod: 'none'
          }
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          console.error('Booking failed:', booking, await response.text());
        }
      } catch (error) {
        failCount++;
        console.error('Booking error:', booking, error);
      }
    }

    // Clear basket and show result
    window.bookingBasket = [];
    updateBasketUI();
    toggleBasketPanel();

    if (failCount === 0) {
      showBasketToast(`✅ ${successCount} booking(s) confirmed!`);
    } else {
      showBasketToast(`⚠️ ${successCount} confirmed, ${failCount} failed`);
    }

    // Refresh calendar
    setTimeout(() => {
      if (typeof refreshData === 'function') refreshData();
    }, 2000);

    checkoutBtn.disabled = false;
  };

  // ============================================
  // FIX: OVERRIDE MODAL TO ADD BASKET OPTION
  // ============================================
  function enhanceBookingModal() {
    // Store reference to original function
    const originalOpenModal = window.openNewBookingModal;

    window.openNewBookingModal = function(room, date, time) {
      // Call original to populate modal
      if (originalOpenModal) {
        originalOpenModal.call(this, room, date, time);
      }

      // Now enhance it
      setTimeout(() => {
        const confirmBtn = document.getElementById('confirmBookingBtn');
        const priceValue = parseInt(document.getElementById('newBookingPrice')?.value) || 0;
        
        if (confirmBtn) {
          // CRITICAL FIX: Always enable the button
          confirmBtn.disabled = false;
          
          // Update button text based on price
          if (priceValue > 0) {
            confirmBtn.textContent = 'Proceed to Payment';
          } else {
            confirmBtn.textContent = 'Confirm Booking';
          }

          // Add "Add to Basket" button if not already present
          let basketBtn = document.getElementById('addToBasketBtn');
          if (!basketBtn) {
            basketBtn = document.createElement('button');
            basketBtn.id = 'addToBasketBtn';
            basketBtn.className = 'add-to-basket-btn';
            basketBtn.type = 'button';
            confirmBtn.parentNode.insertBefore(basketBtn, confirmBtn);
          }
          
          basketBtn.textContent = '🛒 Add to Basket';
          basketBtn.onclick = function() {
            const dateObj = new Date(date + 'T12:00:00');
            const formattedDate = dateObj.toLocaleDateString('en-GB', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            });
            
            const hour = parseInt(time.split(':')[0]);
            const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
            
            addToBasket({
              room: room,
              date: date,
              time: time,
              endTime: endTime,
              formattedDate: formattedDate,
              price: priceValue,
              roomId: document.getElementById('newBookingRoomId')?.value || '',
              locationId: document.getElementById('newBookingLocationId')?.value || ''
            });
          };
        }
      }, 50);
    };
  }

  // ============================================
  // FIX: MAKE ALL EMPTY SLOTS CLICKABLE
  // ============================================
  function fixEmptySlots() {
    // Override populateDayView to allow all empty slots
    const originalPopulateDayView = window.populateDayView;
    
    if (originalPopulateDayView) {
      window.populateDayView = function(filteredBookings) {
        // Call original
        originalPopulateDayView.call(this, filteredBookings);
        
        // Then fix: make sure all empty cells are clickable
        const hasValidToken = !!sessionStorage.getItem('accessToken');
        if (!hasValidToken) return;
        
        const selectedDate = document.getElementById('dateSelector')?.value;
        if (!selectedDate) return;
        
        const now = new Date();
        const isPastDate = new Date(selectedDate + 'T23:59:59') < now;
        if (isPastDate) return;
        
        const roomIds = {
          'Room 1': '1', 'Room 2': '2', 'Room 4': '4', 
          'Room 5': '5', 'Room 6': '6', 'Room 7': '7', 'Online': 'online'
        };
        const businessHours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
        
        Object.entries(roomIds).forEach(([roomName, roomId]) => {
          businessHours.forEach(time => {
            const cellId = `cell-${roomId}-${time}`;
            const cell = document.getElementById(cellId);
            
            if (!cell || cell.classList.contains('booked')) return;
            
            // Check if slot is in the past
            const slotDateTime = new Date(`${selectedDate}T${time}:00`);
            if (slotDateTime < now) return;
            
            // Make clickable if not already
            if (!cell.classList.contains('available-slot')) {
              cell.classList.add('available-slot');
              cell.title = `Book ${roomName} at ${time}`;
              cell.addEventListener('click', function(e) {
                if (e.target.closest('.booked')) return;
                openNewBookingModal(roomName, selectedDate, time);
              });
            }
          });
        });
      };
    }
  }

  // ============================================
  // INITIALIZE
  // ============================================
  function init() {
    injectBasketUI();
    enhanceBookingModal();
    fixEmptySlots();
    console.log('✅ booking-enhancements.js loaded - £0 fix + basket ready!');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
