/**
 * BusGo - Home Page Controller
 */
import { AuthService } from './auth.js';
import { TripApi } from './api.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Sync user state and render navbar
  await AuthService.syncUserState();
  AuthService.renderNavAuth();

  const searchForm = document.getElementById('heroSearchForm');
  const originInput = document.getElementById('originInput');
  const destInput = document.getElementById('destinationInput');
  const dateInput = document.getElementById('dateInput');
  const swapBtn = document.getElementById('swapBtn');
  const popularGrid = document.getElementById('popularRoutesGrid');

  // Format today's date in local YYYY-MM-DD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (dateInput) {
    dateInput.min = todayStr;
    dateInput.value = todayStr;
  }

  // Swap origin and destination
  if (swapBtn && originInput && destInput) {
    swapBtn.addEventListener('click', () => {
      const temp = originInput.value;
      originInput.value = destInput.value;
      destInput.value = temp;
    });
  }

  // Handle Search Submission
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const origin = originInput.value.trim();
      const dest = destInput.value.trim();
      const date = dateInput.value;

      if (!origin || !dest) {
        UI.showToast('Please select both origin and destination cities', 'warning');
        return;
      }

      if (origin.toLowerCase() === dest.toLowerCase()) {
        UI.showToast('Origin and Destination cannot be identical', 'warning');
        return;
      }

      if (date < todayStr) {
        UI.showToast('Journey date cannot be in the past', 'warning');
        return;
      }

      // Navigate to search results
      const params = new URLSearchParams({
        origin,
        destination: dest,
        date
      });
      window.location.href = `search.html?${params.toString()}`;
    });
  }

  // Load backend popular routes dynamically
  try {
    const res = await TripApi.getPopularRoutes();
    if (res && Array.isArray(res) && res.length > 0 && popularGrid) {
      popularGrid.innerHTML = '';
      res.forEach(route => {
        const card = document.createElement('div');
        card.className = 'route-card';
        card.innerHTML = `
          <div class="route-card-header">
            <div class="route-card-title">${route.originCity} &rarr; ${route.destinationCity}</div>
            <div class="route-card-fare">From ${UI.formatCurrency(route.baseFare)}</div>
          </div>
          <p class="route-card-details">Daily Express &bull; Est. ${UI.formatDuration(route.estimatedDurationMinutes)}</p>
        `;
        card.addEventListener('click', () => {
          const params = new URLSearchParams({
            origin: route.originCity,
            destination: route.destinationCity,
            date: dateInput ? dateInput.value : todayStr
          });
          window.location.href = `search.html?${params.toString()}`;
        });
        popularGrid.appendChild(card);
      });
    } else {
      // Add click handler to static fallback cards
      document.querySelectorAll('.route-card').forEach(card => {
        card.addEventListener('click', () => {
          const origin = card.dataset.origin;
          const dest = card.dataset.dest;
          const params = new URLSearchParams({
            origin,
            destination: dest,
            date: dateInput ? dateInput.value : todayStr
          });
          window.location.href = `search.html?${params.toString()}`;
        });
      });
    }
  } catch (err) {
    // If backend isn't reachable yet, fallback cards remain functional
    document.querySelectorAll('.route-card').forEach(card => {
      card.addEventListener('click', () => {
        const origin = card.dataset.origin;
        const dest = card.dataset.dest;
        const params = new URLSearchParams({
          origin,
          destination: dest,
          date: dateInput ? dateInput.value : todayStr
        });
        window.location.href = `search.html?${params.toString()}`;
      });
    });
  }
});
