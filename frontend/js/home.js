/**
 * BusGo — Homepage Controller (Search Widget, Popular Routes & Image Persistence)
 */

const ROUTE_IMAGE_MAP = {
  'madurai-chennai': {
    src: 'assets/images/route-madurai-chennai.jpg',
    alt: 'Madurai to Chennai Express Highway Bus Route'
  },
  'chennai-madurai': {
    src: 'assets/images/route-chennai-madurai.jpg',
    alt: 'Chennai to Madurai Luxury Coach Route'
  },
  'coimbatore-madurai': {
    src: 'assets/images/route-coimbatore-madurai.jpg',
    alt: 'Coimbatore to Madurai Western Ghats Express Route'
  }
};

function getRouteImageMeta(origin, destination) {
  const key = `${String(origin || '').trim().toLowerCase()}-${String(destination || '').trim().toLowerCase()}`;
  if (ROUTE_IMAGE_MAP[key]) {
    return ROUTE_IMAGE_MAP[key];
  }
  return {
    src: 'assets/images/hero-bus.jpg',
    alt: `${origin || 'Origin'} to ${destination || 'Destination'} Express Bus Route`
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const searchForm = document.getElementById('homeSearchForm');
  const originSelect = document.getElementById('originCity');
  const destSelect = document.getElementById('destinationCity');
  const dateInput = document.getElementById('journeyDate');
  const swapBtn = document.getElementById('swapCitiesBtn');
  const popularGrid = document.getElementById('popularRoutesGrid');

  const today = UI.getTodayIso();
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }

  // Swap Origin & Destination
  if (swapBtn && originSelect && destSelect) {
    swapBtn.addEventListener('click', () => {
      const temp = originSelect.value;
      originSelect.value = destSelect.value;
      destSelect.value = temp;
    });
  }

  // Bind click & keyboard navigation on route cards
  const bindRouteCardNavigation = (container) => {
    if (!container) return;
    container.querySelectorAll('.route-card').forEach(card => {
      if (card.dataset.navBound === 'true') return;
      card.dataset.navBound = 'true';

      const navigateToRoute = () => {
        const origin = card.dataset.origin;
        const dest = card.dataset.dest;
        const selectedDate = (dateInput && dateInput.value) ? dateInput.value : today;
        if (origin && dest) {
          window.location.href = `search.html?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${encodeURIComponent(selectedDate)}`;
        }
      };

      card.addEventListener('click', navigateToRoute);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToRoute();
        }
      });
    });
  };

  bindRouteCardNavigation(popularGrid);

  // Dynamically hydrate popular routes & genuine fares from backend without removing images
  if (popularGrid) {
    try {
      const routes = await TripApi.getPopularRoutes();
      if (Array.isArray(routes) && routes.length > 0) {
        const topRoutes = routes.slice(0, 6);

        // Update matching cards in place if they already exist so loaded images never flicker or vanish,
        // and append any additional routes with full image markup.
        const existingCards = Array.from(popularGrid.querySelectorAll('.route-card'));
        const usedCards = new Set();

        topRoutes.forEach((r) => {
          const origin = r.originCity || '';
          const dest = r.destinationCity || '';
          const formattedFare = UI.formatRouteFare(r.baseFare);
          const fareText = formattedFare || 'Check fare';
          const isUnavailable = !formattedFare;
          const busTypeTag = r.busType || 'Express Coach';
          const durationText = r.estimatedDurationMinutes ? UI.formatDuration(r.estimatedDurationMinutes) : '';
          const boardingPoint = r.boardingPoint || `${origin} Bus Stand`;
          const droppingPoint = r.droppingPoint || r.dropPoint || `${dest} Terminus`;
          const distanceText = r.distanceKm ? `${r.distanceKm} km • Daily Express` : 'Daily Express';

          // Find matching card in DOM
          const existingCard = existingCards.find(c =>
            !usedCards.has(c) &&
            String(c.dataset.origin || '').toLowerCase() === origin.toLowerCase() &&
            String(c.dataset.dest || '').toLowerCase() === dest.toLowerCase()
          );

          if (existingCard) {
            usedCards.add(existingCard);
            // Update text & genuine fare in-place without touching or removing the <img> element!
            const tagEl = existingCard.querySelector('.route-card-tag');
            if (tagEl && r.busType) tagEl.textContent = busTypeTag;

            const descEl = existingCard.querySelector('.route-card-body p');
            if (descEl) {
              descEl.textContent = `${boardingPoint} → ${droppingPoint}${durationText ? ' • ' + durationText : ''}`;
            }

            const metaSpans = existingCard.querySelectorAll('.route-meta span');
            if (metaSpans.length >= 1) {
              metaSpans[0].textContent = distanceText;
            }

            const fareEl = existingCard.querySelector('[data-route-fare], .route-price');
            if (fareEl) {
              fareEl.textContent = fareText;
              fareEl.classList.toggle('price-unavailable', isUnavailable);
            }
          } else {
            // Create new card with complete image wrapper and fallback handler
            const imgMeta = getRouteImageMeta(origin, dest);
            const card = document.createElement('article');
            card.className = 'route-card';
            card.dataset.origin = origin;
            card.dataset.dest = dest;
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Search buses from ${origin} to ${dest}`);

            card.innerHTML = `
              <div class="route-card-image-wrap">
                <img src="${UI.escapeHtml(imgMeta.src)}" alt="${UI.escapeHtml(imgMeta.alt)}" onerror="this.onerror=null;this.src='assets/images/hero-bus.jpg';" />
                <span class="route-card-tag">${UI.escapeHtml(busTypeTag)}</span>
              </div>
              <div class="route-card-body">
                <div class="route-cities">
                  <span>${UI.escapeHtml(origin)}</span>
                  <span style="color:var(--color-text-secondary);">→</span>
                  <span>${UI.escapeHtml(dest)}</span>
                </div>
                <p style="font-size:0.84rem; color:var(--color-text-secondary);">
                  ${UI.escapeHtml(boardingPoint)} → ${UI.escapeHtml(droppingPoint)}${durationText ? ' • ' + UI.escapeHtml(durationText) : ''}
                </p>
                <div class="route-meta">
                  <span>${UI.escapeHtml(distanceText)}</span>
                  <span class="route-price ${isUnavailable ? 'price-unavailable' : ''}" data-route-fare>${UI.escapeHtml(fareText)}</span>
                </div>
              </div>
            `;
            popularGrid.appendChild(card);
          }
        });

        bindRouteCardNavigation(popularGrid);
      }
    } catch (_) {
      // Keep default route cards with their images and "Check fare" state
      popularGrid.querySelectorAll('[data-route-fare], .route-price').forEach(el => {
        el.textContent = 'Check fare';
        el.classList.add('price-unavailable');
      });
    }
  }

  // Handle Search Submission
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const origin = originSelect.value.trim();
      const destination = destSelect.value.trim();
      const date = dateInput.value;

      if (!origin || !destination) {
        UI.showAlertModal({
          title: 'Select Cities',
          message: 'Please select both Origin and Destination cities to search buses.',
          type: 'warning'
        });
        return;
      }

      if (origin.toLowerCase() === destination.toLowerCase()) {
        UI.showAlertModal({
          title: 'Invalid Route',
          message: 'Origin and Destination cities cannot be the same. Please select two different cities.',
          type: 'warning'
        });
        return;
      }

      if (!date) {
        UI.showAlertModal({
          title: 'Select Journey Date',
          message: 'Please select a valid journey date.',
          type: 'warning'
        });
        return;
      }

      window.location.href = `search.html?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`;
    });
  }
});
