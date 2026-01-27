/**
 * BOOKING-ENHANCEMENTS.JS
 * =======================
 * Cherry Tree Centre - Booking System Enhancements
 *  
 * Features:
 * 1. Fixes £0 booking issue (greyed out button)
 * 2. Adds multi-booking basket functionality
 * 3. Changes button text based on price
 * 4. FIXED: Basket payment now works with Stripe and Credits
 * 5. FIXED: Comments/Car Registration now captured in basket
 * 6. NEW: Greys out slots that are in the basket (v2.3 - icon fix)
 * 
 * Version: 2.3 - January 2026
 * 
 * Installation: Add this line AFTER your main scripts in index.html:
 * <script src="js/booking-enhancements.js"></script>
 */

(function() {
  'use strict';
  console.log('🛒 booking-enhancements.js v2.3 loading...');

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
      .basket-item-comments {
        color: #667eea;
        font-size: 12px;
        margin-top: 5px;
        font-style: italic;
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
      
      /* Credit info in basket */
      .basket-credit-info {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #667eea;
        margin-bottom: 10px;
        padding: 8px 12px;
        background: #f0f0ff;
        border-radius: 6px;
      }
      
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

      /* ==========================================
         BASKET SLOT HIGHLIGHTING - v2.3 FIXED
         ========================================== */
      .in-basket {
        background: #9e9e9e !important;
        pointer-events: none !important;
        cursor: not-allowed !important;
        position: relative !important;
      }
      
      /* The icon overlay - injected as a real element */
      .basket-slot-icon {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        background: rgba(158, 158, 158, 0.9);
        z-index: 10;
        pointer-events: none;
      }
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
        <div id="basketCreditInfo" class="basket-credit-info" style="display: none;">
          <span>💳 Your Credit:</span>
          <span id="basketCreditAmount">£0.00</span>
        </div>
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
  // BASKET SLOT HIGHLIGHTING - v2.5 SIMPLE
  // ============================================
  
  /**
   * Convert room name to cell ID format
   */
  function getRoomIdForCell(roomName) {
    if (!roomName) return null;
    
    const normalized = roomName.trim();
    
    if (normalized === 'Car Park' || normalized === 'Car_Park') {
      return 'car-park';
    }
    if (normalized === 'Online') {
      return 'online';
    }
    
    // Extract number from "Room 1", "Room_1", "Room 6", etc.
    const match = normalized.match(/(\d+)/);
    if (match) {
      return match[1];
    }
    
    // Fallback
    return normalized.toLowerCase().replace(/[\s_]/g, '-');
  }
  
  window.updateBasketSlotHighlights = function() {
    // Remove existing highlights
    document.querySelectorAll('.in-basket').forEach(cell => {
      cell.classList.remove('in-basket');
    });
    
    // Get current basket items
    const basket = window.bookingBasket || [];
    if (basket.length === 0) return;
    
    // Get currently selected date
    const dateSelector = document.getElementById('dateSelector');
    const selectedDate = dateSelector ? dateSelector.value : null;
    
    // Highlight each basket item's slot
    basket.forEach(item => {
      // Only highlight if on the same date
      if (item.date !== selectedDate) return;
      
      // Get room ID for cell lookup
      const roomName = item.room || item.roomName;
      const roomId = getRoomIdForCell(roomName);
      const time = item.time || item.startTime || item.start_time;
      
      const cellId = `cell-${roomId}-${time}`;
      const cell = document.getElementById(cellId);
      
      if (cell) {
        cell.classList.add('in-basket');
      }
    });
  };

  // ============================================
  // BASKET FUNCTIONS
  // ============================================
  window.toggleBasketPanel = function() {
    const panel = document.getElementById('basketPanel');
    const overlay = document.getElementById('basketOverlay');
    panel.classList.toggle('open');
    overlay.classList.toggle('open');
    
    // Update credit display when opening
    if (panel.classList.contains('open')) {
      updateBasketCreditDisplay();
    }
  };

  window.addToBasket = function(booking) {
    console.log('🛒 addToBasket called with:', booking);
    
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
    
    // Update slot highlighting AFTER modal closes (small delay)
    setTimeout(function() {
      console.log('🛒 Updating highlights after add');
      updateBasketSlotHighlights();
    }, 100);
  };

  window.removeFromBasket = function(index) {
    window.bookingBasket.splice(index, 1);
    updateBasketUI();
    showBasketToast('🗑️ Removed from basket');
    
    // Update slot highlighting
    setTimeout(updateBasketSlotHighlights, 50);
  };

  window.clearBasket = function() {
    if (window.bookingBasket.length === 0) return;
    if (confirm('Clear all items from basket?')) {
      window.bookingBasket = [];
      updateBasketUI();
      showBasketToast('🗑️ Basket cleared');
      
      // Update slot highlighting
      setTimeout(updateBasketSlotHighlights, 50);
    }
  };

  function updateBasketCreditDisplay() {
    const creditInfoEl = document.getElementById('basketCreditInfo');
    const creditAmountEl = document.getElementById('basketCreditAmount');
    
    if (!creditInfoEl || !creditAmountEl) return;
    
    const credit = window.counsellorCreditBalance || 0;
    const total = window.bookingBasket.reduce((sum, b) => sum + (b.price || 0), 0);
    
    // Only show credit info if there's credit and the basket has paid items
    if (credit > 0 && total > 0) {
      creditInfoEl.style.display = 'flex';
      creditAmountEl.textContent = '£' + (credit / 100).toFixed(2);
    } else {
      creditInfoEl.style.display = 'none';
    }
  }

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
            ${b.comments ? `<div class="basket-item-comments">🚗 ${b.comments}</div>` : ''}
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
    
    // Update credit display
    updateBasketCreditDisplay();
  }

  function showBasketToast(message) {
    const toast = document.getElementById('basketToast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }
  }

  // ============================================
  // CHECKOUT - FIXED VERSION WITH COMMENTS
  // ============================================
  window.checkoutBasket = async function() {
    if (window.bookingBasket.length === 0) return;

    const total = window.bookingBasket.reduce((sum, b) => sum + (b.price || 0), 0);
    const checkoutBtn = document.getElementById('basketCheckout');
    
    if (total === 0) {
      // ========================================
      // FREE BOOKINGS - Process directly
      // ========================================
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
            client_id: window.clientId || sessionStorage.getItem('clientId') || '',
            counsellor_name: counsellorName,
            service_id: '2',
            provider_id: booking.roomId,
            location_id: booking.locationId,
            room_name: booking.room,
            start_datetime: `${booking.date}T${booking.time}:00`,
            end_datetime: `${booking.date}T${booking.endTime}:00`,
            additional_fields: {
              comments: booking.comments || `Basket booking by ${counsellorName}`
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
      updateBasketSlotHighlights(); // Clear highlights
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
      
    } else {
      // ========================================
      // PAID BOOKINGS - Use payment choice modal
      // ========================================
      const paymentDetails = {
        totalAmount: total,
        items: window.bookingBasket.map(b => ({
          room: b.room,
          date: b.date,
          time: b.time,
          endTime: b.endTime,
          formattedDate: b.formattedDate,
          price: b.price,
          roomId: b.roomId,
          locationId: b.locationId,
          comments: b.comments || null  // ✅ FIXED: Include comments
        }))
      };
      
      // Check if payment choice modal exists
      if (typeof showPaymentChoiceModal === 'function') {
        // Close basket panel first
        toggleBasketPanel();
        // Show payment options
        showPaymentChoiceModal(paymentDetails, true);
      } else {
        // Fallback: Direct to Stripe without credit option
        console.log('💳 Payment modal not available, using direct Stripe');
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Preparing payment...';
        
        try {
          await directStripeCheckout(paymentDetails);
        } catch (error) {
          console.error('Checkout error:', error);
          showBasketToast('❌ Payment error: ' + error.message);
          checkoutBtn.disabled = false;
          checkoutBtn.textContent = `Pay & Confirm (£${(total / 100).toFixed(2)})`;
        }
      }
    }
  };

  /**
   * Direct Stripe checkout (fallback if payment modal not available)
   */
  async function directStripeCheckout(paymentDetails) {
    const counsellorName = window.selectedCounsellor || sessionStorage.getItem('counsellorName');
    const total = paymentDetails.totalAmount;
    
    // Build description from items
    const itemDescriptions = paymentDetails.items.map(item => 
      `${item.room} ${item.formattedDate} ${item.time}`
    ).join(', ');
    
    const description = `Room bookings: ${itemDescriptions}`;
    
    // Store basket for after payment
    sessionStorage.setItem('pendingBasket', JSON.stringify(paymentDetails.items));
    
    const checkoutPayload = {
      counsellor_name: counsellorName,
      counsellor_id: window.clientId || '',
      client_id: window.clientId || '',
      room_name: 'Multiple Rooms',
      room_id: paymentDetails.items[0]?.roomId || '',
      location_id: paymentDetails.items[0]?.locationId || '2',
      location_name: 'Henley',
      date: paymentDetails.items[0]?.date || '',
      start_time: paymentDetails.items[0]?.time || '',
      end_time: paymentDetails.items[0]?.endTime || '',
      amount: total,
      description: description,
      is_basket: true,
      basket_items: JSON.stringify(paymentDetails.items),
      success_url: window.STRIPE_CONFIG?.successUrl || (window.location.href + '?payment=success'),
      cancel_url: window.STRIPE_CONFIG?.cancelUrl || (window.location.href + '?payment=cancelled')
    };
    
    console.log('💳 Creating Stripe checkout:', checkoutPayload);
    
    const webhookUrl = window.STRIPE_CONFIG?.createCheckoutWebhook || 
                       'https://hook.eu2.make.com/cpg4px3j3jcbj5k7ea7kniu3vfy3c7gq';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutPayload)
    });
    
    if (!response.ok) {
      throw new Error('Could not create checkout session');
    }
    
    const result = await response.json();
    
    if (result.checkout_url) {
      // Clear basket before redirect
      window.bookingBasket = [];
      updateBasketUI();
      updateBasketSlotHighlights(); // Clear highlights
      
      window.location.href = result.checkout_url;
    } else {
      throw new Error('No checkout URL returned');
    }
  }

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
            // ✅ FIXED: Check if Car Park and validate registration
            const isCarPark = (room === 'Car Park' || room === 'Car_Park');
            const commentsInput = document.getElementById('newBookingComments');
            const comments = commentsInput ? commentsInput.value.trim() : '';
            
            if (isCarPark && !comments) {
              alert('Please enter a car registration number for Car Park bookings');
              if (commentsInput) commentsInput.focus();
              return;
            }
            
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
              locationId: document.getElementById('newBookingLocationId')?.value || '',
              comments: comments || null  // ✅ FIXED: Include comments/registration
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
        
        // Update basket highlights after populating calendar
        console.log('🛒 populateDayView complete, updating highlights');
        setTimeout(updateBasketSlotHighlights, 50);
      };
    }
  }

  // ============================================
  // HOOK INTO CALENDAR DATE CHANGES
  // ============================================
  function hookDateChanges() {
    // Watch for date selector changes
    const dateSelector = document.getElementById('dateSelector');
    if (dateSelector) {
      dateSelector.addEventListener('change', function() {
        console.log('🛒 Date changed to:', this.value);
        // Delay to allow calendar to re-render
        setTimeout(updateBasketSlotHighlights, 200);
      });
    }
    
    // Also watch for navigation button clicks
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      const text = btn.textContent || '';
      const id = btn.id || '';
      
      // Check if it's a navigation button
      if (text.includes('Previous') || text.includes('Next') || text.includes('Today') ||
          id.includes('prev') || id.includes('next') || id.includes('today')) {
        console.log('🛒 Navigation button clicked');
        // Delay to allow calendar to re-render
        setTimeout(updateBasketSlotHighlights, 300);
      }
    });
  }

  // ============================================
  // INITIALIZE
  // ============================================
  function init() {
    injectBasketUI();
    enhanceBookingModal();
    fixEmptySlots();
    
    // Hook into date changes after a short delay to ensure DOM is ready
    setTimeout(hookDateChanges, 500);
    
    console.log('✅ booking-enhancements.js v2.3 loaded - £0 fix + basket + comments + slot highlighting (fixed)!');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


