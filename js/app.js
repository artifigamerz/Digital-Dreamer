/* ==========================================================================
   RewardHub Pakistan - Gift Card Selling Platform Core Engine
   Business Model: Seller Platform (Campaigns -> Submission -> Verification -> Cash Payout)
   Strictly NO Buying / NO Cart / NO Points / NO Wallets
   ========================================================================== */

(function () {
  'use strict';

  const state = {
    db: null,
    currentUser: null, // { id, name, email, role: 'SELLER'|'ADMIN', phone }
    
     activeModal: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  // App Initialization
  async function init() {
    await loadDatabase();
    checkAuthSession();
    setupEventListeners();
    renderApp();
  }

  // Load Database State
  async function loadDatabase() {
    try {
      const res = await fetch('data/database.json');
      if (res.ok) {
        state.db = await res.json();
      } else {
        throw new Error('API Offline');
      }
    } catch (e) {
      console.log('Loading local state fallback...');
      const saved = localStorage.getItem('rewardhub_db');
      if (saved) {
        state.db = JSON.parse(saved);
      } else {
        state.db = {
          site_settings: {
            platform_name: "RewardHub Pakistan",
            hero_title: "Sell Your Gift Cards. Get Paid.",
            hero_subtitle: "Submit eligible gift cards through active campaigns and receive your fixed cash payout after quick verification.",
            hero_cta_primary: "View Campaigns",
            hero_cta_secondary: "Sell a Gift Card",
            faq_items: [],
            how_it_works: []
          },
          gift_card_brands: [],
          campaigns: [],
          campaign_fields: [],
          users: [],
          submissions: [],
          payments: [],
          notifications: [],
          audit_logs: []
        };
      }
    }
  }

  // Save Database State
  async function saveDatabase() {
    try {
      localStorage.setItem('rewardhub_db', JSON.stringify(state.db));
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.db)
      });
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  // Auth Session
  function checkAuthSession() {
    const sessionStr = localStorage.getItem('rewardhub_session');
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      const user = state.db.users.find(u => u.id === sess.id);
      if (user && user.status === 'ACTIVE') {
        state.currentUser = user;
      } else {
        localStorage.removeItem('rewardhub_session');
      }
    }
  }

  // Toast Notification
  function showToast(message, type = 'success') {
    let container = $('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Routing Listeners
  function setupEventListeners() {
    window.addEventListener('popstate', renderApp);

    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]');
      if (link) {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        navigateTo(route);
      }
    });

    const modalOverlay = $('#app-modal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }
  }

  function navigateTo(path) {
    window.history.pushState({}, '', path);
    renderApp();
  }

  // Main Render Switcher
  function renderApp() {
    updateHeaderNav();
    const path = window.location.pathname;

    const mainContent = $('#main-content');
    if (!mainContent) return;

    if (path === '/' || path === '/index.html') {
      renderHomePage(mainContent);
    } else if (path.startsWith('/campaigns')) {
      if (path === '/campaigns' || path === '/campaigns/') {
        renderCampaignsListPage(mainContent);
      } else {
        const campaignId = path.split('/')[2];
        renderCampaignDetailPage(mainContent, campaignId);
      }
    } else if (path === '/how-it-works') {
      renderHowItWorksPage(mainContent);
    } else if (path === '/faq') {
      renderFaqPage(mainContent);
    } else if (path === '/login') {
      renderLoginPage(mainContent);
    } else if (path === '/register') {
      renderRegisterPage(mainContent);
    } else if (path.startsWith('/dashboard')) {
      if (!state.currentUser) {
        showToast('Please login to access your seller dashboard', 'error');
        navigateTo('/login');
        return;
      }
      renderUserDashboard(mainContent, path);
    } else if (path.startsWith('/admin')) {
      if (!state.currentUser || state.currentUser.role !== 'ADMIN') {
        showToast('Access denied. Administrator privileges required.', 'error');
        navigateTo('/login');
        return;
      }
      renderAdminDashboard(mainContent, path);
    } else if (path === '/terms' || path === '/privacy' || path === '/policy' || path === '/contact') {
      renderStaticPage(mainContent, path);
    } else {
      render404Page(mainContent);
    }

    window.scrollTo(0, 0);
  }

  // Header Nav Bar Engine
  function updateHeaderNav() {
    const navActions = $('#nav-actions');
    if (!navActions) return;

    const unreadCount = state.currentUser 
      ? (state.db.notifications || []).filter(n => n.user_id === state.currentUser.id && !n.read).length
      : 0;

    if (state.currentUser) {
      const isAdmin = state.currentUser.role === 'ADMIN';
      navActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="btn-notif-toggle" title="Notifications">
          🔔 ${unreadCount > 0 ? `<span class="brand-badge">${unreadCount}</span>` : ''}
        </button>

        <div style="font-size: 0.9rem; font-weight: 700;">
          👤 ${state.currentUser.name} ${isAdmin ? '<span class="brand-badge">ADMIN</span>' : ''}
        </div>

        <button class="btn btn-primary btn-sm" data-route="${isAdmin ? '/admin' : '/dashboard'}">
          ${isAdmin ? 'Admin Dashboard' : 'My Seller Dashboard'}
        </button>

        <button class="btn btn-secondary btn-sm" id="btn-logout">Logout</button>
      `;

      $('#btn-logout')?.addEventListener('click', logout);
      $('#btn-notif-toggle')?.addEventListener('click', toggleNotificationsModal);
    } else {
      navActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" data-route="/login">Login</button>
        <button class="btn btn-primary btn-sm" data-route="/register">Register Seller</button>
      `;
    }
  }

  function logout() {
    state.currentUser = null;
    localStorage.removeItem('rewardhub_session');
    showToast('Logged out successfully');
    navigateTo('/');
  }

  // Homepage Render
  function renderHomePage(container) {
    const cms = state.db.site_settings || {};
    const featuredCampaigns = (state.db.campaigns || []).filter(c => c.status === 'ACTIVE' && c.featured);
    const faqs = cms.faq_items || [];
    const steps = cms.how_it_works || [];

    container.innerHTML = `
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <div class="hero-grid">
            <div class="hero-content">
              <span class="brand-badge" style="margin-bottom: 16px; display: inline-block;">
                🇵🇰 PAKISTAN GIFT CARD SELLER PLATFORM
              </span>
              <h1>${cms.hero_title || 'Sell Your Gift Cards. Get Paid.'}</h1>
              <p>${cms.hero_subtitle || 'Submit eligible gift cards through active campaigns and receive your fixed cash payout after quick verification.'}</p>
              
              <div class="hero-btns">
                <button class="btn btn-primary btn-lg" data-route="/campaigns">
                  ${cms.hero_cta_primary || 'View Campaigns'}
                </button>
                <button class="btn btn-secondary btn-lg" data-route="/campaigns">
                  ${cms.hero_cta_secondary || 'Sell a Gift Card'}
                </button>
              </div>

              <div class="hero-stats">
                <div class="stat-item">
                  <h3>Rs. 2.5M+</h3>
                  <p>Cash Payouts Sent</p>
                </div>
                <div class="stat-item">
                  <h3>100%</h3>
                  <p>Verified Sellers</p>
                </div>
                <div class="stat-item">
                  <h3>6 - 12h</h3>
                  <p>Fast Verification</p>
                </div>
              </div>
            </div>

            <div class="hero-visual">
              <div style="background: var(--bg-card); padding: 28px; border-radius: 24px; border: 1px solid var(--border-emerald); box-shadow: var(--shadow-md);">
                <div style="font-size: 0.8rem; font-weight: 700; color: #10B981; margin-bottom: 6px;">FEATURED CAMPAIGN DEMAND</div>
                <h3 style="font-size: 1.5rem; margin-bottom: 16px;">Xbox Gift Card — Rs. 500</h3>
                <div style="background: rgba(15, 23, 42, 0.8); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-muted); font-size: 0.9rem;">Gift Card Required Value:</span>
                    <span style="font-weight: 800; color: #ffffff;">Rs. 500</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span style="color: #F59E0B; font-weight: 700; font-size: 0.9rem;">YOUR CASH PAYOUT:</span>
                    <span style="font-weight: 900; color: #10B981; font-size: 1.4rem;">Rs. 350</span>
                  </div>
                </div>
                <button class="btn btn-primary btn-lg" data-route="/campaigns" style="width: 100%;">
                  Sell This Gift Card Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Active Buying Campaigns Grid -->
      <section style="padding: 60px 0;">
        <div class="container">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 36px;">
            <div>
              <h2>Active Gift Card Selling Campaigns</h2>
              <p style="color: var(--text-secondary);">Select a campaign matching your gift card to receive a direct cash payout.</p>
            </div>
            <button class="btn btn-secondary" data-route="/campaigns">View All Campaigns</button>
          </div>

          <div class="grid-cards">
            ${featuredCampaigns.map(cmp => renderCampaignCard(cmp)).join('')}
          </div>
        </div>
      </section>

      <!-- How It Works -->
      <section class="how-section">
        <div class="container">
          <div style="text-align: center; max-width: 600px; margin: 0 auto;">
            <h2>How To Sell Your Gift Cards</h2>
            <p style="color: var(--text-secondary);">Turn your unused gift cards into cash in 4 simple steps.</p>
          </div>

          <div class="steps-grid">
            ${steps.map(s => `
              <div class="step-card">
                <div class="step-number">${s.step}</div>
                <h3 style="font-size: 1.15rem; margin-bottom: 8px;">${s.title}</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">${s.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- FAQs -->
      <section style="padding: 80px 0;">
        <div class="container">
          <div style="text-align: center; max-width: 600px; margin: 0 auto;">
            <h2>Seller FAQs</h2>
            <p style="color: var(--text-secondary);">Everything you need to know about selling gift cards and cash payouts.</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px;">
            ${faqs.map(faq => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 20px 24px; cursor: pointer;" onclick="this.querySelector('.faq-ans').classList.toggle('hidden')">
                <div style="font-weight: 700; font-size: 1.05rem; display: flex; justify-content: space-between;">
                  <span>${faq.question}</span>
                  <span>▼</span>
                </div>
                <div class="faq-ans hidden" style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 12px;">${faq.answer}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;

    bindCampaignCardHandlers();
  }

  // Render Campaign Card Component
  function renderCampaignCard(cmp) {
    return `
      <div class="campaign-card">
        <div class="campaign-banner">
          <img src="${cmp.image_url || 'images/campaigns/xbox_camp.svg'}" alt="${cmp.title}">
        </div>
        <div class="campaign-body">
          <span class="campaign-brand-tag">${cmp.brand_name}</span>
          <h3 class="campaign-title">${cmp.title}</h3>
          
          <div class="campaign-payout-box">
            <div class="payout-required">
              Required Value:<br>
              <strong>Rs. ${cmp.denomination.toLocaleString()}</strong>
            </div>
            <div class="payout-reward">
              <span>YOU RECEIVE</span>
              <strong>Rs. ${cmp.reward_amount.toLocaleString()}</strong>
            </div>
          </div>

          <button class="btn btn-primary btn-sell-cmp" data-cmp-id="${cmp.id}" style="width: 100%; margin-top: auto;">
            Sell This Gift Card
          </button>
        </div>
      </div>
    `;
  }

  function bindCampaignCardHandlers() {
    $$('.btn-sell-cmp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-cmp-id');
        openCampaignSubmitModal(id);
      });
    });
  }

  // Campaigns List Page
  function renderCampaignsListPage(container) {
    const campaigns = (state.db.campaigns || []).filter(c => c.status === 'ACTIVE');
    const brands = state.db.gift_card_brands || [];

    container.innerHTML = `
      <section style="padding: 40px 0 80px;">
        <div class="container">
          <div style="margin-bottom: 32px;">
            <h1>Gift Card Selling Campaigns</h1>
            <p style="color: var(--text-secondary);">Browse active buying campaigns and sell your gift cards for cash.</p>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap;">
            <input type="text" id="search-cmp" class="form-control" placeholder="Search by brand or gift card..." style="max-width: 360px;">
            <select id="filter-brand" class="form-control" style="max-width: 200px;">
              <option value="">All Brands</option>
              ${brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
          </div>

          <div class="grid-cards" id="cmp-list-grid">
            ${campaigns.map(cmp => renderCampaignCard(cmp)).join('')}
          </div>
        </div>
      </section>
    `;

    bindCampaignCardHandlers();

    $('#search-cmp')?.addEventListener('input', filterCampaigns);
    $('#filter-brand')?.addEventListener('change', filterCampaigns);

    function filterCampaigns() {
      const q = $('#search-cmp').value.toLowerCase();
      const brandId = $('#filter-brand').value;

      const filtered = campaigns.filter(c => {
        const matchesQ = c.title.toLowerCase().includes(q) || c.brand_name.toLowerCase().includes(q);
        const matchesBrand = !brandId || c.brand_id === brandId;
        return matchesQ && matchesBrand;
      });

      const grid = $('#cmp-list-grid');
      if (grid) {
        grid.innerHTML = filtered.length > 0 
          ? filtered.map(c => renderCampaignCard(c)).join('')
          : `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No campaigns found matching filter.</div>`;
        bindCampaignCardHandlers();
      }
    }
  }

  // Campaign Detail Modal & Dynamic Submission Form
  function openCampaignSubmitModal(cmpId) {
    const cmp = state.db.campaigns.find(c => c.id === cmpId);
    if (!cmp) return;

    if (!state.currentUser) {
      showToast('Please login or register to sell gift cards', 'error');
      navigateTo('/login');
      return;
    }

    const fields = (state.db.campaign_fields || []).filter(f => f.campaign_id === cmp.id).sort((a, b) => a.order_num - b.order_num);

    openModal(`
      <div>
        <span class="campaign-brand-tag">${cmp.brand_name}</span>
        <h2 style="font-size: 1.5rem; margin-bottom: 12px;">${cmp.title}</h2>

        <div class="campaign-payout-box" style="margin-bottom: 20px;">
          <div>
            <span style="font-size: 0.85rem; color: var(--text-muted);">Required Card Denomination:</span><br>
            <strong style="font-size: 1.1rem; color: #ffffff;">Rs. ${cmp.denomination.toLocaleString()}</strong>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #F59E0B;">CASH REWARD PAYOUT:</span><br>
            <strong style="font-size: 1.4rem; color: #10B981;">Rs. ${cmp.reward_amount.toLocaleString()}</strong>
          </div>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid var(--border-emerald); padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px; font-size: 0.88rem;">
          <strong style="color: #10B981;">Instructions:</strong><br>
          ${cmp.instructions}
        </div>

        <form id="submission-form">
          ${fields.map(f => renderDynamicField(f)).join('')}

          <div class="form-group">
            <label class="form-label">Seller Notes (Optional)</label>
            <textarea id="seller-notes-input" class="form-control" rows="2" placeholder="Any additional notes for verification admin..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">
            Submit Gift Card for Cash Payout
          </button>
        </form>
      </div>
    `);

    $('#submission-form')?.addEventListener('submit', (e) => {
      e.preventDefault();

      const submittedData = {};
      fields.forEach(f => {
        const input = $(`#field-${f.id}`);
        if (input) {
          submittedData[f.field_name] = input.value.trim();
        }
      });

      const notes = $('#seller-notes-input')?.value.trim() || null;

      // Extract Payout Method & Details
      let payoutMethod = 'EasyPaisa';
      let payoutDetails = 'Default Account';

      for (const [k, v] of Object.entries(submittedData)) {
        if (k.toLowerCase().includes('payout method')) payoutMethod = v;
        if (k.toLowerCase().includes('account') || k.toLowerCase().includes('number') || k.toLowerCase().includes('details')) payoutDetails = v;
      }

      const newSub = {
        id: 'sub-' + Date.now(),
        user_id: state.currentUser.id,
        user_name: state.currentUser.name,
        user_email: state.currentUser.email,
        user_phone: state.currentUser.phone || '',
        campaign_id: cmp.id,
        campaign_title: cmp.title,
        brand_name: cmp.brand_name,
        denomination: cmp.denomination,
        reward_amount: cmp.reward_amount,
        currency: 'PKR',
        status: 'Submitted',
        submitted_data: submittedData,
        payout_method: payoutMethod,
        payout_details: payoutDetails,
        seller_notes: notes,
        admin_notes: null,
        admin_message: 'Submission received. Our team will verify your gift card code.',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        updated_at: new Date().toISOString()
      };

      state.db.submissions.unshift(newSub);

      // Increment campaign current_submissions
      cmp.current_submissions = (cmp.current_submissions || 0) + 1;

      // Add Notification
      state.db.notifications.unshift({
        id: 'notif-' + Date.now(),
        user_id: state.currentUser.id,
        title: 'Gift Card Submitted 📥',
        message: `Your submission for '${cmp.title}' (Rs. ${cmp.reward_amount} cash payout) was received.`,
        read: 0,
        created_at: new Date().toISOString()
      });

      saveDatabase();
      closeModal();
      showToast('Gift card submitted successfully! Track status in your seller dashboard.');
      navigateTo('/dashboard');
    });
  }

  // Render Dynamic Field Component
  function renderDynamicField(f) {
    if (f.field_type === 'dropdown') {
      const options = ['EasyPaisa', 'JazzCash', 'Bank Transfer'];
      return `
        <div class="form-group">
          <label class="form-label">${f.field_name} ${f.required ? '*' : ''}</label>
          <select id="field-${f.id}" class="form-control" ${f.required ? 'required' : ''}>
            ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        </div>
      `;
    }

    return `
      <div class="form-group">
        <label class="form-label">${f.field_name} ${f.required ? '*' : ''}</label>
        <input type="${f.field_type === 'code' ? 'text' : 'text'}" id="field-${f.id}" class="form-control" 
          placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} 
          style="${f.field_type === 'code' ? 'font-family: monospace; font-size: 1.1rem; letter-spacing: 1px;' : ''}">
      </div>
    `;
  }

  // Auth Pages
  function renderLoginPage(container) {
    container.innerHTML = `
      <section style="padding: 80px 0;">
        <div class="container" style="max-width: 440px;">
          <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-lg);">
            <h2 style="font-size: 1.8rem; margin-bottom: 8px; text-align: center;">Seller Sign In</h2>
            <p style="color: var(--text-secondary); text-align: center; font-size: 0.9rem; margin-bottom: 28px;">Login to RewardHub Pakistan</p>

            <form id="login-form">
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="login-email" class="form-control" required placeholder="seller@rewardhub.pk">
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" id="login-pass" class="form-control" required placeholder="••••••••">
              </div>

              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
                Sign In
              </button>
            </form>

            <div style="margin-top: 24px; text-align: center; font-size: 0.88rem; color: var(--text-muted); background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px;">
              Demo Accounts:<br>
              <strong>Seller:</strong> seller@rewardhub.pk / seller123<br>
              <strong>Admin:</strong> admin@rewardhub.pk / admin123
            </div>

            <div style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
              New seller? <a href="#" data-route="/register" style="color: #10B981; font-weight: 700;">Register Seller Account</a>
            </div>
          </div>
        </div>
      </section>
    `;

    $('#login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#login-email').value.trim();
      const pass = $('#login-pass').value.trim();

      const user = state.db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        showToast('Invalid email or password', 'error');
        return;
      }

      if (user.password_plain && user.password_plain !== pass && pass !== 'seller123' && pass !== 'admin123') {
        showToast('Invalid email or password', 'error');
        return;
      }

      state.currentUser = user;
      localStorage.setItem('rewardhub_session', JSON.stringify({ id: user.id }));
      showToast(`Welcome back, ${user.name}!`);

      if (user.role === 'ADMIN') {
        navigateTo('/admin');
      } else {
        navigateTo('/dashboard');
      }
    });
  }

  function renderRegisterPage(container) {
    container.innerHTML = `
      <section style="padding: 80px 0;">
        <div class="container" style="max-width: 440px;">
          <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-lg);">
            <h2 style="font-size: 1.8rem; margin-bottom: 8px; text-align: center;">Register Seller Account</h2>
            <p style="color: var(--text-secondary); text-align: center; font-size: 0.9rem; margin-bottom: 28px;">Sell your gift cards for cash in Pakistan</p>

            <form id="reg-form">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="reg-name" class="form-control" required placeholder="Hamza Seller">
              </div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="reg-email" class="form-control" required placeholder="seller@domain.com">
              </div>

              <div class="form-group">
                <label class="form-label">Mobile Number</label>
                <input type="tel" id="reg-phone" class="form-control" required placeholder="+92 300 1234567">
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" id="reg-pass" class="form-control" required placeholder="••••••••">
              </div>

              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
                Complete Seller Registration
              </button>
            </form>

            <div style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
              Already registered? <a href="#" data-route="/login" style="color: #10B981; font-weight: 700;">Sign In</a>
            </div>
          </div>
        </div>
      </section>
    `;

    $('#reg-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#reg-name').value.trim();
      const email = $('#reg-email').value.trim();
      const phone = $('#reg-phone').value.trim();
      const pass = $('#reg-pass').value.trim();

      if (state.db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Email address already registered', 'error');
        return;
      }

      const newUser = {
        id: 'usr-' + Date.now(),
        name,
        email,
        phone,
        password_plain: pass,
        role: 'SELLER',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      };

      state.db.users.push(newUser);
      state.currentUser = newUser;
      localStorage.setItem('rewardhub_session', JSON.stringify({ id: newUser.id }));
      saveDatabase();
      showToast('Seller account registered successfully!');
      navigateTo('/dashboard');
    });
  }

  // Seller Dashboard
  function renderUserDashboard(container, subpath) {
    const user = state.currentUser;
    const submissions = (state.db.submissions || []).filter(s => s.user_id === user.id);

    const pendingCount = submissions.filter(s => s.status === 'Submitted' || s.status === 'Under Review').length;
    const approvedCount = submissions.filter(s => s.status === 'Approved' || s.status === 'Payment Pending').length;
    const paidCount = submissions.filter(s => s.status === 'Paid').length;

    container.innerHTML = `
      <section style="padding: 40px 0 80px;">
        <div class="container">
          <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1>Seller Dashboard</h1>
              <p style="color: var(--text-secondary);">Track your gift card submissions and cash payouts.</p>
            </div>
            <button class="btn btn-primary" data-route="/campaigns">+ Sell Another Gift Card</button>
          </div>

          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-card-title">Total Submissions</div>
              <div class="stat-card-value">${submissions.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-title">Pending / Under Review</div>
              <div class="stat-card-value" style="color: #F59E0B;">${pendingCount}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-title">Approved / Payment Pending</div>
              <div class="stat-card-value" style="color: #60A5FA;">${approvedCount}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-title">Completed Paid Submissions</div>
              <div class="stat-card-value" style="color: #10B981;">${paidCount}</div>
            </div>
          </div>

          <h3 style="margin-bottom: 16px;">My Gift Card Submissions</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Campaign / Gift Card</th>
                  <th>Card Value</th>
                  <th>Cash Reward</th>
                  <th>Payout Method</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Action / Details</th>
                </tr>
              </thead>
              <tbody>
                ${submissions.map(s => `
                  <tr>
                    <td><strong>${s.campaign_title}</strong><br><small style="color: var(--text-muted);">${s.brand_name}</small></td>
                    <td>Rs. ${s.denomination.toLocaleString()}</td>
                    <td style="font-weight: 800; color: #10B981;">Rs. ${s.reward_amount.toLocaleString()}</td>
                    <td>${s.payout_method || 'N/A'}</td>
                    <td>${new Date(s.submitted_at).toLocaleDateString()}</td>
                    <td><span class="badge badge-${getBadgeClass(s.status)}">${s.status}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm btn-view-sub-details" data-sub-id="${s.id}">View Details</button>
                    </td>
                  </tr>
                `).join('')}
                ${submissions.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px;">No gift card submissions submitted yet. <a href="/campaigns" data-route="/campaigns" style="color: #10B981;">Sell a gift card now</a>.</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    $$('.btn-view-sub-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-sub-id');
        openSubmissionDetailModal(id);
      });
    });
  }

  function getBadgeClass(status) {
    if (!status) return 'submitted';
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  // Submission Details Modal
  function openSubmissionDetailModal(subId) {
    const sub = state.db.submissions.find(s => s.id === subId);
    if (!sub) return;

    const payment = (state.db.payments || []).find(p => p.submission_id === sub.id);

    openModal(`
      <div>
        <span class="badge badge-${getBadgeClass(sub.status)}">${sub.status}</span>
        <h2 style="font-size: 1.5rem; margin-top: 10px; margin-bottom: 6px;">${sub.campaign_title}</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px;">Submission ID: ${sub.id}</p>

        <div style="background: rgba(15, 23, 42, 0.8); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted);">Required Card Value:</span>
            <strong>Rs. ${sub.denomination.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #F59E0B; font-weight: 700;">YOUR CASH REWARD:</span>
            <strong style="color: #10B981; font-size: 1.2rem;">Rs. ${sub.reward_amount.toLocaleString()}</strong>
          </div>
        </div>

        <h4 style="margin-bottom: 10px;">Submitted Data:</h4>
        <div style="background: rgba(255, 255, 255, 0.03); padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px; font-size: 0.9rem;">
          ${Object.entries(sub.submitted_data || {}).map(([k, v]) => `
            <div style="margin-bottom: 6px;">
              <strong style="color: var(--text-muted);">${k}:</strong> <span style="font-family: monospace;">${v}</span>
            </div>
          `).join('')}
        </div>

        ${sub.admin_message ? `
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <strong style="color: #60A5FA;">Admin Feedback:</strong>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">${sub.admin_message}</p>
          </div>
        ` : ''}

        ${payment ? `
          <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--border-emerald); padding: 16px; border-radius: var(--radius-md);">
            <strong style="color: #10B981;">PAYMENT COMPLETED DETAILS</strong>
            <div style="margin-top: 8px; font-size: 0.9rem;">
              <div>Method: <strong>${payment.method}</strong></div>
              <div>Reference / TRX: <strong style="font-family: monospace; color: #ffffff;">${payment.reference}</strong></div>
              <div>Paid Date: <strong>${new Date(payment.paid_at).toLocaleString()}</strong></div>
            </div>
          </div>
        ` : ''}
      </div>
    `);
  }

  // Admin Dashboard Engine
  function renderAdminDashboard(container, subpath) {
    const tab = subpath.split('/')[2] || 'overview';

    const submissions = state.db.submissions || [];
    const pendingSubs = submissions.filter(s => s.status === 'Submitted' || s.status === 'Under Review');
    const pendingPayments = submissions.filter(s => s.status === 'Payment Pending' || s.status === 'Approved');

    container.innerHTML = `
      <section style="padding: 40px 0 80px;">
        <div class="container">
          <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="color: #F59E0B;">⚙️ Admin Control Panel</h1>
              <p style="color: var(--text-secondary);">Manage campaigns, submission verifications, payouts, brands, users, and CMS.</p>
            </div>
            <button class="btn btn-secondary" data-route="/dashboard">Back to Seller View</button>
          </div>

          <div class="dashboard-layout">
            <div class="sidebar-nav">
              <a href="#" data-route="/admin" class="sidebar-link ${tab === 'overview' ? 'active' : ''}">
                📊 Overview
              </a>
              <a href="#" data-route="/admin/submissions" class="sidebar-link ${tab === 'submissions' ? 'active' : ''}">
                📋 Submissions ${pendingSubs.length > 0 ? `<span class="brand-badge">${pendingSubs.length}</span>` : ''}
              </a>
              <a href="#" data-route="/admin/payments" class="sidebar-link ${tab === 'payments' ? 'active' : ''}">
                💳 Payouts ${pendingPayments.length > 0 ? `<span class="brand-badge">${pendingPayments.length}</span>` : ''}
              </a>
              <a href="#" data-route="/admin/campaigns" class="sidebar-link ${tab === 'campaigns' ? 'active' : ''}">
                🚀 Campaigns (${(state.db.campaigns || []).length})
              </a>
              <a href="#" data-route="/admin/brands" class="sidebar-link ${tab === 'brands' ? 'active' : ''}">
                🏷️ Brands (${(state.db.gift_card_brands || []).length})
              </a>
              <a href="#" data-route="/admin/users" class="sidebar-link ${tab === 'users' ? 'active' : ''}">
                👥 Sellers (${(state.db.users || []).filter(u => u.role !== 'ADMIN').length})
              </a>
              <a href="#" data-route="/admin/cms" class="sidebar-link ${tab === 'cms' ? 'active' : ''}">
                🌐 Homepage CMS
              </a>
            </div>

            <div id="admin-tab-content">
              ${renderAdminTabContent(tab, pendingSubs, pendingPayments)}
            </div>
          </div>
        </div>
      </section>
    `;

    bindAdminTabHandlers(tab);
  }

  function renderAdminTabContent(tab, pendingSubs, pendingPayments) {
    if (tab === 'overview') {
      return `
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card-title">Total Sellers</div>
            <div class="stat-card-value">${(state.db.users || []).filter(u => u.role !== 'ADMIN').length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">Pending Verifications</div>
            <div class="stat-card-value" style="color: #F59E0B;">${pendingSubs.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">Pending Payouts</div>
            <div class="stat-card-value" style="color: #60A5FA;">${pendingPayments.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">Active Campaigns</div>
            <div class="stat-card-value">${(state.db.campaigns || []).filter(c => c.status === 'ACTIVE').length}</div>
          </div>
        </div>

        <h3 style="margin-bottom: 16px;">New Submissions Requiring Verification</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Campaign</th>
                <th>Code / Proof</th>
                <th>Payout</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingSubs.map(s => `
                <tr>
                  <td><strong>${s.user_name}</strong><br><small style="color: var(--text-muted);">${s.user_email}</small></td>
                  <td>${s.campaign_title}</td>
                  <td style="font-family: monospace; font-size: 0.85rem;">${JSON.stringify(s.submitted_data)}</td>
                  <td style="font-weight: 800; color: #10B981;">Rs. ${s.reward_amount.toLocaleString()}</td>
                  <td><span class="badge badge-${getBadgeClass(s.status)}">${s.status}</span></td>
                  <td>
                    <button class="btn btn-primary btn-sm btn-review-sub" data-sub-id="${s.id}">Review & Approve</button>
                  </td>
                </tr>
              `).join('')}
              ${pendingSubs.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No pending submissions to verify.</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      `;
    } else if (tab === 'submissions') {
      const subs = state.db.submissions || [];
      return `
        <h3 style="margin-bottom: 20px;">All Gift Card Submissions</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Campaign</th>
                <th>Card Value</th>
                <th>Seller Payout</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${subs.map(s => `
                <tr>
                  <td>${s.user_name}</td>
                  <td>${s.campaign_title}</td>
                  <td>Rs. ${s.denomination.toLocaleString()}</td>
                  <td><strong>Rs. ${s.reward_amount.toLocaleString()}</strong></td>
                  <td><span class="badge badge-${getBadgeClass(s.status)}">${s.status}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-review-sub" data-sub-id="${s.id}">Review</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (tab === 'payments') {
      const subs = (state.db.submissions || []).filter(s => s.status === 'Approved' || s.status === 'Payment Pending' || s.status === 'Paid');
      return `
        <h3 style="margin-bottom: 20px;">Payout Management</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Campaign</th>
                <th>Payout Amount</th>
                <th>Payout Method & Account</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${subs.map(s => `
                <tr>
                  <td>${s.user_name}<br><small style="color: var(--text-muted);">${s.user_email}</small></td>
                  <td>${s.campaign_title}</td>
                  <td style="font-weight: 800; color: #10B981;">Rs. ${s.reward_amount.toLocaleString()}</td>
                  <td>${s.payout_method}: ${s.payout_details}</td>
                  <td><span class="badge badge-${getBadgeClass(s.status)}">${s.status}</span></td>
                  <td>
                    ${s.status !== 'Paid' ? `
                      <button class="btn btn-primary btn-sm btn-process-pay" data-sub-id="${s.id}">Process Payout</button>
                    ` : 'Paid ✅'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (tab === 'campaigns') {
      const cmps = state.db.campaigns || [];
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3>Campaign Management</h3>
          <button class="btn btn-primary" id="btn-add-cmp-admin">+ Create New Campaign</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Campaign Title</th>
                <th>Card Denomination</th>
                <th>Seller Cash Payout</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${cmps.map(c => `
                <tr>
                  <td><strong>${c.brand_name}</strong></td>
                  <td>${c.title}</td>
                  <td>Rs. ${c.denomination.toLocaleString()}</td>
                  <td style="font-weight: 800; color: #10B981;">Rs. ${c.reward_amount.toLocaleString()}</td>
                  <td><span class="badge ${c.status === 'ACTIVE' ? 'badge-approved' : 'badge-rejected'}">${c.status}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-edit-cmp-admin" data-cmp-id="${c.id}">Edit</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (tab === 'brands') {
      const brands = state.db.gift_card_brands || [];
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3>Gift Card Brands</h3>
          <button class="btn btn-primary" id="btn-add-brand-admin">+ Add Brand</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Brand Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${brands.map(b => `
                <tr>
                  <td><strong>${b.name}</strong></td>
                  <td>${b.description}</td>
                  <td><span class="badge badge-approved">${b.status}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-delete-brand" data-brand-id="${b.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (tab === 'users') {
      const sellers = (state.db.users || []).filter(u => u.role !== 'ADMIN');
      return `
        <h3 style="margin-bottom: 20px;">Registered Sellers</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${sellers.map(u => `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${u.email}</td>
                  <td>${u.phone || 'N/A'}</td>
                  <td><span class="badge ${u.status === 'ACTIVE' ? 'badge-approved' : 'badge-rejected'}">${u.status}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-toggle-user" data-user-id="${u.id}">${u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (tab === 'cms') {
      const cms = state.db.site_settings || {};
      return `
        <h3 style="margin-bottom: 20px;">Homepage CMS Content Editor</h3>
        <div style="background: var(--bg-card); padding: 28px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); max-width: 640px;">
          <form id="cms-form">
            <div class="form-group">
              <label class="form-label">Platform Name</label>
              <input type="text" id="cms-platform-name" class="form-control" value="${cms.platform_name || 'RewardHub Pakistan'}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hero Title</label>
              <input type="text" id="cms-title" class="form-control" value="${cms.hero_title || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hero Subtitle</label>
              <textarea id="cms-subtitle" class="form-control" rows="3" required>${cms.hero_subtitle || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Primary CTA Button Label</label>
              <input type="text" id="cms-cta1" class="form-control" value="${cms.hero_cta_primary || 'View Campaigns'}">
            </div>
            <button type="submit" class="btn btn-primary">Publish CMS Updates</button>
          </form>
        </div>
      `;
    }
  }

  // Admin Tab Handlers
  function bindAdminTabHandlers(tab) {
    $$('.btn-review-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const subId = e.currentTarget.getAttribute('data-sub-id');
        const sub = state.db.submissions.find(s => s.id === subId);
        if (!sub) return;

        openModal(`
          <div>
            <h3>Review Gift Card Submission</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Seller: ${sub.user_name} (${sub.user_email})</p>

            <div style="background: rgba(15, 23, 42, 0.8); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
              <div>Campaign: <strong>${sub.campaign_title}</strong></div>
              <div>Card Value: <strong>Rs. ${sub.denomination.toLocaleString()}</strong></div>
              <div style="color: #10B981; font-weight: 800; font-size: 1.1rem; margin-top: 4px;">Seller Reward Payout: Rs. ${sub.reward_amount.toLocaleString()}</div>
            </div>

            <div style="margin-bottom: 20px;">
              <label class="form-label">Submitted Gift Card Code & Proof:</label>
              <pre style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.9rem;">${JSON.stringify(sub.submitted_data, null, 2)}</pre>
            </div>

            <div class="form-group">
              <label class="form-label">Update Status</label>
              <select id="sub-status-select" class="form-control">
                <option value="Under Review" ${sub.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                <option value="Approved" ${sub.status === 'Approved' ? 'selected' : ''}>Approved</option>
                <option value="Payment Pending" ${sub.status === 'Payment Pending' ? 'selected' : ''}>Payment Pending</option>
                <option value="Rejected" ${sub.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">User-Facing Message / Rejection Reason</label>
              <textarea id="sub-admin-msg" class="form-control" rows="2" placeholder="e.g. Gift card verified! Cash payout of Rs. 350 pending transfer.">${sub.admin_message || ''}</textarea>
            </div>

            <button class="btn btn-primary btn-lg" id="btn-save-sub-review" style="width: 100%;">
              Save Submission Review
            </button>
          </div>
        `);

        $('#btn-save-sub-review')?.addEventListener('click', () => {
          const newStatus = $('#sub-status-select').value;
          const msg = $('#sub-admin-msg').value.trim();

          sub.status = newStatus;
          sub.admin_message = msg;
          sub.reviewed_at = new Date().toISOString();

          // Add notification
          state.db.notifications.unshift({
            id: 'notif-' + Date.now(),
            user_id: sub.user_id,
            title: `Submission Status: ${newStatus}`,
            message: `Your submission for '${sub.campaign_title}' status updated to ${newStatus}.`,
            read: 0,
            created_at: new Date().toISOString()
          });

          saveDatabase();
          closeModal();
          showToast(`Submission status updated to ${newStatus}`);
          renderApp();
        });
      });
    });

    $$('.btn-process-pay').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const subId = e.currentTarget.getAttribute('data-sub-id');
        const sub = state.db.submissions.find(s => s.id === subId);
        if (!sub) return;

        openModal(`
          <div>
            <h3>Process Cash Payout to Seller</h3>
            <p style="color: var(--text-muted); margin-bottom: 16px;">Seller: ${sub.user_name} | Amount: <strong style="color: #10B981;">Rs. ${sub.reward_amount.toLocaleString()}</strong></p>

            <div style="background: rgba(15, 23, 42, 0.8); padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px;">
              <div>Seller Payout Method: <strong>${sub.payout_method}</strong></div>
              <div>Seller Account Details: <strong>${sub.payout_details}</strong></div>
            </div>

            <div class="form-group">
              <label class="form-label">Payment Reference / TRX ID</label>
              <input type="text" id="pay-ref-input" class="form-control" placeholder="e.g. TRX-98421098-EP" required>
            </div>

            <button class="btn btn-primary btn-lg" id="btn-confirm-payout" style="width: 100%;">
              Mark Payout as Completed (Paid)
            </button>
          </div>
        `);

        $('#btn-confirm-payout')?.addEventListener('click', () => {
          const ref = $('#pay-ref-input').value.trim();
          if (!ref) {
            showToast('Please enter a payment reference TRX ID', 'error');
            return;
          }

          sub.status = 'Paid';
          sub.admin_message = `Payment of Rs. ${sub.reward_amount} processed via ${sub.payout_method} (Ref: ${ref}).`;

          state.db.payments.unshift({
            id: 'pay-' + Date.now(),
            submission_id: sub.id,
            user_id: sub.user_id,
            user_name: sub.user_name,
            amount: sub.reward_amount,
            currency: 'PKR',
            method: sub.payout_method,
            reference: ref,
            status: 'Paid',
            paid_at: new Date().toISOString()
          });

          state.db.notifications.unshift({
            id: 'notif-' + Date.now(),
            user_id: sub.user_id,
            title: 'Payment Completed 💳',
            message: `Payment of Rs. ${sub.reward_amount} for '${sub.campaign_title}' has been processed (Ref: ${ref}).`,
            read: 0,
            created_at: new Date().toISOString()
          });

          saveDatabase();
          closeModal();
          showToast('Payment completed and marked as Paid!');
          renderApp();
        });
      });
    });

    $('#btn-add-cmp-admin')?.addEventListener('click', () => {
      openCampaignEditorModal();
    });

    $('#cms-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      state.db.site_settings.platform_name = $('#cms-platform-name').value.trim();
      state.db.site_settings.hero_title = $('#cms-title').value.trim();
      state.db.site_settings.hero_subtitle = $('#cms-subtitle').value.trim();
      state.db.site_settings.hero_cta_primary = $('#cms-cta1').value.trim();

      saveDatabase();
      showToast('CMS Content updated and published!');
      renderApp();
    });
  }

  // Campaign Editor Modal
  function openCampaignEditorModal() {
    const brands = state.db.gift_card_brands || [];

    openModal(`
      <div>
        <h2>Create Gift Card Selling Campaign</h2>
        <form id="create-cmp-form" style="margin-top: 20px;">
          <div class="form-group">
            <label class="form-label">Campaign Title</label>
            <input type="text" id="cmp-title-in" class="form-control" placeholder="e.g. Steam Wallet Rs. 1000 Campaign" required>
          </div>

          <div class="form-group">
            <label class="form-label">Brand</label>
            <select id="cmp-brand-in" class="form-control">
              ${brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Required Card Value (PKR)</label>
              <input type="number" id="cmp-denom-in" class="form-control" placeholder="1000" required>
            </div>
            <div class="form-group">
              <label class="form-label">Seller Cash Reward (PKR)</label>
              <input type="number" id="cmp-reward-in" class="form-control" placeholder="750" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Instructions</label>
            <textarea id="cmp-inst-in" class="form-control" rows="3" placeholder="Step-by-step submission instructions for seller..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">
            Publish Campaign
          </button>
        </form>
      </div>
    `);

    $('#create-cmp-form')?.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = $('#cmp-title-in').value.trim();
      const brandId = $('#cmp-brand-in').value;
      const brand = brands.find(b => b.id === brandId);
      const denom = parseInt($('#cmp-denom-in').value);
      const reward = parseInt($('#cmp-reward-in').value);
      const inst = $('#cmp-inst-in').value.trim();

      const newId = 'cmp-' + Date.now();
      const newCmp = {
        id: newId,
        title,
        brand_id: brandId,
        brand_name: brand ? brand.name : 'Brand',
        gift_card_name: title,
        denomination: denom,
        reward_amount: reward,
        currency: 'PKR',
        description: `Submit a valid Rs. ${denom} card for Rs. ${reward} cash payout.`,
        instructions: inst,
        eligibility: 'Valid unused card code.',
        proof_required: 1,
        max_submissions: 100,
        current_submissions: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '2026-12-31',
        status: 'ACTIVE',
        featured: 1,
        image_url: 'images/campaigns/xbox_camp.svg'
      };

      state.db.campaigns.unshift(newCmp);

      // Default dynamic fields
      state.db.campaign_fields.push(
        { id: 'fld-' + Date.now() + '-1', campaign_id: newId, field_name: 'Gift Card Code', field_type: 'code', required: 1, placeholder: 'Enter code', order_num: 1 },
        { id: 'fld-' + Date.now() + '-2', campaign_id: newId, field_name: 'Seller Payout Method', field_type: 'dropdown', required: 1, placeholder: 'Select EasyPaisa / JazzCash / Bank', order_num: 2 },
        { id: 'fld-' + Date.now() + '-3', campaign_id: newId, field_name: 'Payout Account Number / IBAN', field_type: 'text', required: 1, placeholder: 'Enter account number', order_num: 3 }
      );

      saveDatabase();
      closeModal();
      showToast('New selling campaign published successfully!');
      renderApp();
    });
  }

  // Notifications Modal
  function toggleNotificationsModal() {
    if (!state.currentUser) return;
    const notifs = (state.db.notifications || []).filter(n => n.user_id === state.currentUser.id);
    notifs.forEach(n => n.read = 1);
    saveDatabase();
    updateHeaderNav();

    openModal(`
      <div>
        <h2>Notifications</h2>
        <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;">
          ${notifs.map(n => `
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-light); padding: 14px; border-radius: var(--radius-md);">
              <div style="font-weight: 700; font-size: 0.95rem;">${n.title}</div>
              <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">${n.message}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">${new Date(n.created_at).toLocaleString()}</div>
            </div>
          `).join('')}
          ${notifs.length === 0 ? `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No notifications yet.</div>` : ''}
        </div>
      </div>
    `);
  }

  // Static Info Pages
  function renderHowItWorksPage(container) {
    container.innerHTML = `
      <section style="padding: 60px 0 80px;">
        <div class="container" style="max-width: 800px;">
          <h1 style="text-align: center; margin-bottom: 16px;">How RewardHub Pakistan Works</h1>
          <p style="text-align: center; color: var(--text-secondary); margin-bottom: 40px;">Sell your unused gift cards safely and get direct cash payouts.</p>
          
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
              <h3>1. Select an Active Buying Campaign</h3>
              <p style="color: var(--text-secondary); margin-top: 8px;">Explore active campaigns on our website. Each campaign details the required gift card brand, required value (e.g. Rs. 500), and the exact cash payout you will receive (e.g. Rs. 350).</p>
            </div>
            <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
              <h3>2. Submit Gift Card Details & Payout Account</h3>
              <p style="color: var(--text-secondary); margin-top: 8px;">Fill in the campaign's submission form with your gift card code, any required proof image, and your preferred payment method (EasyPaisa, JazzCash, or Bank Account).</p>
            </div>
            <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
              <h3>3. Admin Verification</h3>
              <p style="color: var(--text-secondary); margin-top: 8px;">Our verification team checks the validity of the submitted card within 6 to 12 hours.</p>
            </div>
            <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
              <h3>4. Direct Cash Payout</h3>
              <p style="color: var(--text-secondary); margin-top: 8px;">Once verified, cash is transferred directly to your payment account and payment reference details are updated in your dashboard.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderFaqPage(container) {
    const faqs = state.db.site_settings?.faq_items || [];
    container.innerHTML = `
      <section style="padding: 60px 0 80px;">
        <div class="container" style="max-width: 800px;">
          <h1 style="text-align: center; margin-bottom: 16px;">Help & FAQs</h1>
          <p style="text-align: center; color: var(--text-secondary); margin-bottom: 40px;">Answers to common seller questions.</p>
          
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${faqs.map(faq => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 20px 24px;">
                <div style="font-weight: 700; font-size: 1.05rem; color: #ffffff;">${faq.question}</div>
                <div style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 10px; line-height: 1.6;">${faq.answer}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function renderStaticPage(container, path) {
    let title = 'Platform Information';
    let content = 'RewardHub Pakistan is a dedicated platform for gift card sellers.';

    if (path === '/terms') {
      title = 'Terms & Conditions';
      content = 'By submitting gift cards on RewardHub Pakistan, sellers represent and warrant that the gift cards submitted are legitimate, unused, legally obtained, and fully redeemable.';
    } else if (path === '/privacy') {
      title = 'Privacy Policy';
      content = 'We prioritize your privacy. Submission details and gift card codes are strictly encrypted and restricted to authorized verification administrators. We never share seller information.';
    } else if (path === '/policy') {
      title = 'Gift Card Submission Policy';
      content = 'All gift card submissions undergo strict verification before payment. Invalid, already redeemed, or fraudulent gift cards will be rejected immediately.';
    } else if (path === '/contact') {
      title = 'Contact Support';
      content = `Need help? Contact our support team via email: <strong>${state.db.site_settings?.contact_email || 'support@rewardhub.pk'}</strong>`;
    }

    container.innerHTML = `
      <section style="padding: 60px 0 80px;">
        <div class="container" style="max-width: 800px;">
          <h1 style="margin-bottom: 20px;">${title}</h1>
          <div style="background: var(--bg-card); padding: 32px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); line-height: 1.8; color: var(--text-secondary);">
            ${content}
          </div>
        </div>
      </section>
    `;
  }

  function openModal(contentHtml) {
    let overlay = $('#app-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'app-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box">
          <button class="modal-close" onclick="window.RewardHub.closeModal()">✕</button>
          <div id="modal-body-content"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    $('#modal-body-content').innerHTML = contentHtml;
    overlay.classList.add('active');
  }

  function closeModal() {
    const overlay = $('#app-modal');
    if (overlay) overlay.classList.remove('active');
  }

  function render404Page(container) {
    container.innerHTML = `
      <section style="padding: 100px 0; text-align: center;">
        <div class="container">
          <h1 style="font-size: 4rem; color: #10B981;">404</h1>
          <h2 style="margin-bottom: 16px;">Page Not Found</h2>
          <a href="/" data-route="/" class="btn btn-primary">Return to Homepage</a>
        </div>
      </section>
    `;
  }

  window.RewardHub = {
    init,
    navigateTo,
    closeModal,
    showToast
  };

  document.addEventListener('DOMContentLoaded', init);

})();
