/**
 * AutoRent - Vehicle Rental Management System
 * Plain Vanilla JavaScript Application
 */

const API_BASE = '/api';

const app = {
  activeSection: 'dashboard',
  categories: [],
  branches: [],
  availableVehicles: [],
  pendingAction: null,

  // Initialize application
  init() {
    this.setupDateDisplay();
    this.setupNavigation();
    this.setupSearchAndFilters();
    this.loadMetadata();
    this.switchSection('dashboard');
  },

  // Display current date nicely in header
  setupDateDisplay() {
    const dateEl = document.getElementById('current-date-display');
    if (dateEl) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('en-IN', options);
    }
  },

  // Setup sidebar navigation clicks
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const section = btn.getAttribute('data-section');
        this.switchSection(section);
      });
    });
  },

  // Switch between sections (SPA feel)
  switchSection(sectionName) {
    this.activeSection = sectionName;

    // Update nav active classes
    document.querySelectorAll('.nav-item').forEach((btn) => {
      if (btn.getAttribute('data-section') === sectionName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update section visibility
    document.querySelectorAll('.content-section').forEach((sec) => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update Header Titles and Quick Action button
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    const quickBtn = document.getElementById('quick-action-btn');

    switch (sectionName) {
      case 'dashboard':
        titleEl.textContent = 'Dashboard Overview';
        subtitleEl.textContent = 'Real-time statistics & vehicle fleet performance';
        quickBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>New Booking</span>
        `;
        quickBtn.onclick = () => this.openBookingModal();
        this.loadDashboardData();
        break;

      case 'vehicles':
        titleEl.textContent = 'Vehicle Inventory';
        subtitleEl.textContent = 'Manage vehicle fleet, daily rates, and availability';
        quickBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Add Vehicle</span>
        `;
        quickBtn.onclick = () => this.openVehicleModal();
        this.loadVehicles();
        break;

      case 'customers':
        titleEl.textContent = 'Customer Directory';
        subtitleEl.textContent = 'Manage registered clients and driving license details';
        quickBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Add Customer</span>
        `;
        quickBtn.onclick = () => this.openCustomerModal();
        this.loadCustomers();
        break;

      case 'bookings':
        titleEl.textContent = 'Rental Bookings';
        subtitleEl.textContent = 'Create rentals, monitor active trips, and process returns';
        quickBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Create Booking</span>
        `;
        quickBtn.onclick = () => this.openBookingModal();
        this.loadBookings();
        break;

      case 'payments':
        titleEl.textContent = 'Payments & Invoicing';
        subtitleEl.textContent = 'Track payments, transaction methods, and receipts';
        quickBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Record Payment</span>
        `;
        quickBtn.onclick = () => this.openPaymentModal();
        this.loadPayments();
        break;
    }
  },

  // Setup live filter / search event listeners
  setupSearchAndFilters() {
    // Vehicles
    const vehicleSearch = document.getElementById('vehicle-search');
    const vehicleCat = document.getElementById('vehicle-category-filter');
    const vehicleStatus = document.getElementById('vehicle-status-filter');

    let debounceTimer;
    if (vehicleSearch) {
      vehicleSearch.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.loadVehicles(), 300);
      });
    }
    if (vehicleCat) vehicleCat.addEventListener('change', () => this.loadVehicles());
    if (vehicleStatus) vehicleStatus.addEventListener('change', () => this.loadVehicles());

    // Customers
    const customerSearch = document.getElementById('customer-search');
    if (customerSearch) {
      customerSearch.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.loadCustomers(), 300);
      });
    }

    // Bookings
    const bookingStatus = document.getElementById('booking-status-filter');
    if (bookingStatus) bookingStatus.addEventListener('change', () => this.loadBookings());

    // Payments
    const paymentStatus = document.getElementById('payment-status-filter');
    if (paymentStatus) paymentStatus.addEventListener('change', () => this.loadPayments());
  },

  // Preload categories and branches for dropdowns
  async loadMetadata() {
    try {
      const res = await fetch(`${API_BASE}/vehicles/meta/lookup`);
      const data = await res.json();
      if (data.success) {
        this.categories = data.data.categories || [];
        this.branches = data.data.branches || [];

        // Populate vehicle category filter
        const catFilter = document.getElementById('vehicle-category-filter');
        if (catFilter) {
          catFilter.innerHTML = '<option value="all">All Categories</option>';
          this.categories.forEach((cat) => {
            const opt = document.createElement('option');
            opt.value = cat.category_id;
            opt.textContent = cat.category_name;
            catFilter.appendChild(opt);
          });
        }

        // Populate vehicle modal category dropdown
        const modalCat = document.getElementById('vehicle-category');
        if (modalCat) {
          modalCat.innerHTML = '<option value="">Select Category</option>';
          this.categories.forEach((cat) => {
            const opt = document.createElement('option');
            opt.value = cat.category_id;
            opt.textContent = cat.category_name;
            modalCat.appendChild(opt);
          });
        }

        // Populate vehicle modal branch dropdown
        const modalBranch = document.getElementById('vehicle-branch');
        if (modalBranch) {
          modalBranch.innerHTML = '<option value="">Select Branch</option>';
          this.branches.forEach((br) => {
            const opt = document.createElement('option');
            opt.value = br.branch_id;
            opt.textContent = br.branch_name;
            modalBranch.appendChild(opt);
          });
        }
      }
    } catch (err) {
      console.error('Failed to load lookup metadata', err);
    }
  },

  // ================= 1. DASHBOARD =================
  async loadDashboardData() {
    try {
      // 1. Load Stats KPIs
      const statsRes = await fetch(`${API_BASE}/dashboard/stats`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        const { totalVehicles, availableVehicles, activeRentals, totalCustomers, totalRevenue } = statsData.data;
        document.getElementById('kpi-total-vehicles').textContent = totalVehicles;
        document.getElementById('kpi-available-vehicles').textContent = availableVehicles;
        document.getElementById('kpi-active-rentals').textContent = activeRentals;
        document.getElementById('kpi-total-customers').textContent = totalCustomers;
        document.getElementById('kpi-total-revenue').textContent = `₹${Number(totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      }

      // 2. Load Recent Activity
      const activityRes = await fetch(`${API_BASE}/dashboard/recent-activity`);
      const activityData = await activityRes.json();
      if (activityData.success) {
        const recentBody = document.getElementById('dashboard-recent-bookings-body');
        const recentList = activityData.data.recentBookings || [];

        if (recentList.length === 0) {
          recentBody.innerHTML = '<tr><td colspan="7" class="empty-cell">No bookings found yet.</td></tr>';
        } else {
          recentBody.innerHTML = recentList.map((b) => `
            <tr>
              <td><strong>#BK-${b.booking_id}</strong></td>
              <td>${this.escapeHtml(b.customer_name)}</td>
              <td>
                <strong>${this.escapeHtml(b.vehicle_model)}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${this.escapeHtml(b.reg_no)}</div>
              </td>
              <td>${b.start_date.slice(0, 10)} to ${b.end_date.slice(0, 10)}</td>
              <td><strong>₹${Number(b.total_amount).toLocaleString('en-IN')}</strong></td>
              <td>${this.getBookingBadge(b.booking_status)}</td>
              <td>${this.getPaymentBadge(b.payment_status)}</td>
            </tr>
          `).join('');
        }

        // Fleet Category Breakdown
        const catListEl = document.getElementById('fleet-category-list');
        const catBreakdown = activityData.data.categoryBreakdown || [];
        if (catBreakdown.length === 0) {
          catListEl.innerHTML = '<div class="empty-cell">No category data.</div>';
        } else {
          catListEl.innerHTML = catBreakdown.map((item) => `
            <div class="category-item">
              <span class="category-name">${this.escapeHtml(item.category_name)}</span>
              <span class="category-badge">${item.count} vehicle${item.count === 1 ? '' : 's'}</span>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      this.showToast('Could not load dashboard statistics.', 'error');
    }
  },

  // ================= 2. VEHICLES =================
  async loadVehicles() {
    const tableBody = document.getElementById('vehicles-table-body');
    tableBody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading vehicles...</td></tr>';

    const search = document.getElementById('vehicle-search')?.value || '';
    const cat = document.getElementById('vehicle-category-filter')?.value || 'all';
    const status = document.getElementById('vehicle-status-filter')?.value || 'all';

    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (cat !== 'all') params.append('category_id', cat);
    if (status !== 'all') params.append('status', status);

    try {
      const res = await fetch(`${API_BASE}/vehicles?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">No vehicles matching your criteria.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map((v) => `
        <tr>
          <td>#${v.vehicle_id}</td>
          <td>
            <strong>${this.escapeHtml(v.model)}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">
              ${v.color ? this.escapeHtml(v.color) + ' • ' : ''}${v.fuel_type || 'Fuel'} • ${v.seats ? v.seats + ' Seats' : 'N/A'}
            </div>
          </td>
          <td><code>${this.escapeHtml(v.reg_no)}</code></td>
          <td><span class="badge" style="background:#e0e7ff; color:#3730a3;">${this.escapeHtml(v.category_name)}</span></td>
          <td>${this.escapeHtml(v.branch_name)}</td>
          <td><strong>₹${Number(v.daily_rate).toLocaleString('en-IN')}/day</strong></td>
          <td>${this.getVehicleBadge(v.status)}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn edit" onclick="app.editVehicle(${v.vehicle_id})">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Edit</span>
              </button>
              <button class="action-btn delete" onclick="app.confirmDeleteVehicle(${v.vehicle_id}, '${this.escapeHtml(v.model)}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Delete</span>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      tableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">Failed to load vehicles from server.</td></tr>';
      this.showToast('Could not load vehicle inventory.', 'error');
    }
  },

  openVehicleModal(isEdit = false) {
    document.getElementById('vehicle-modal-title').textContent = isEdit ? 'Edit Vehicle Details' : 'Add New Vehicle';
    document.getElementById('vehicle-submit-btn').textContent = isEdit ? 'Update Vehicle' : 'Save Vehicle';
    if (!isEdit) {
      document.getElementById('vehicle-form').reset();
      document.getElementById('vehicle-id').value = '';
    }
    this.openModal('vehicleModal');
  },

  async editVehicle(id) {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${id}`);
      const data = await res.json();
      if (!data.success) {
        this.showToast(data.message || 'Vehicle not found', 'error');
        return;
      }
      const v = data.data;
      document.getElementById('vehicle-id').value = v.vehicle_id;
      document.getElementById('vehicle-reg-no').value = v.reg_no;
      document.getElementById('vehicle-model').value = v.model;
      document.getElementById('vehicle-rate').value = v.daily_rate;
      document.getElementById('vehicle-category').value = v.category_id;
      document.getElementById('vehicle-branch').value = v.branch_id;
      document.getElementById('vehicle-status').value = v.status;
      document.getElementById('vehicle-color').value = v.color || '';
      document.getElementById('vehicle-fuel').value = v.fuel_type || 'Petrol';
      document.getElementById('vehicle-seats').value = v.seats || '';
      document.getElementById('vehicle-image').value = v.image_url || '';

      this.openVehicleModal(true);
    } catch (err) {
      console.error(err);
      this.showToast('Failed to load vehicle details for editing.', 'error');
    }
  },

  async handleVehicleSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('vehicle-id').value;
    const payload = {
      reg_no: document.getElementById('vehicle-reg-no').value.trim(),
      model: document.getElementById('vehicle-model').value.trim(),
      category_id: parseInt(document.getElementById('vehicle-category').value, 10),
      branch_id: parseInt(document.getElementById('vehicle-branch').value, 10),
      daily_rate: parseFloat(document.getElementById('vehicle-rate').value),
      status: document.getElementById('vehicle-status').value,
      color: document.getElementById('vehicle-color').value.trim() || null,
      fuel_type: document.getElementById('vehicle-fuel').value || null,
      seats: document.getElementById('vehicle-seats').value ? parseInt(document.getElementById('vehicle-seats').value, 10) : null,
      image_url: document.getElementById('vehicle-image').value.trim() || null,
    };

    const isEdit = Boolean(id);
    const url = isEdit ? `${API_BASE}/vehicles/${id}` : `${API_BASE}/vehicles`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        this.showToast(data.message || 'Operation failed', 'error');
        return;
      }

      this.showToast(isEdit ? 'Vehicle updated successfully!' : 'Vehicle added successfully!', 'success');
      this.closeModal('vehicleModal');
      this.loadVehicles();
      if (this.activeSection === 'dashboard') this.loadDashboardData();
    } catch (err) {
      console.error(err);
      this.showToast('Network error while saving vehicle.', 'error');
    }
  },

  confirmDeleteVehicle(id, model) {
    this.openConfirmModal({
      title: 'Delete Vehicle',
      message: `Are you sure you want to delete vehicle "${model}" (#${id})? If it has past bookings, consider setting its status to Inactive instead.`,
      btnText: 'Delete Vehicle',
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!data.success) {
            this.showToast(data.message || 'Could not delete vehicle.', 'error');
            return;
          }
          this.showToast('Vehicle deleted successfully.', 'success');
          this.loadVehicles();
        } catch (err) {
          console.error(err);
          this.showToast('Failed to delete vehicle.', 'error');
        }
      },
    });
  },

  // ================= 3. CUSTOMERS =================
  async loadCustomers() {
    const tableBody = document.getElementById('customers-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading customers...</td></tr>';

    const search = document.getElementById('customer-search')?.value || '';
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());

    try {
      const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-cell">No customers found.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map((c) => `
        <tr>
          <td>#${c.user_id}</td>
          <td><strong>${this.escapeHtml(c.name)}</strong></td>
          <td>${this.escapeHtml(c.email)}</td>
          <td>${this.escapeHtml(c.phone)}</td>
          <td><code>${c.license_no ? this.escapeHtml(c.license_no) : 'Not Provided'}</code></td>
          <td>${c.address ? this.escapeHtml(c.address) : '<span style="color:var(--text-light);">N/A</span>'}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn edit" onclick="app.editCustomer(${c.user_id})">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Edit</span>
              </button>
              <button class="action-btn delete" onclick="app.confirmDeleteCustomer(${c.user_id}, '${this.escapeHtml(c.name)}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Delete</span>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="7" class="empty-cell">Failed to load customer list.</td></tr>';
      this.showToast('Could not load customers.', 'error');
    }
  },

  openCustomerModal(isEdit = false) {
    document.getElementById('customer-modal-title').textContent = isEdit ? 'Edit Customer' : 'Add New Customer';
    document.getElementById('customer-submit-btn').textContent = isEdit ? 'Update Customer' : 'Save Customer';
    if (!isEdit) {
      document.getElementById('customer-form').reset();
      document.getElementById('customer-id').value = '';
    }
    this.openModal('customerModal');
  },

  async editCustomer(id) {
    try {
      const res = await fetch(`${API_BASE}/customers/${id}`);
      const data = await res.json();
      if (!data.success) {
        this.showToast(data.message || 'Customer not found', 'error');
        return;
      }
      const c = data.data;
      document.getElementById('customer-id').value = c.user_id;
      document.getElementById('customer-name').value = c.name;
      document.getElementById('customer-email').value = c.email;
      document.getElementById('customer-phone').value = c.phone;
      document.getElementById('customer-license').value = c.license_no || '';
      document.getElementById('customer-address').value = c.address || '';

      this.openCustomerModal(true);
    } catch (err) {
      console.error(err);
      this.showToast('Failed to load customer for editing.', 'error');
    }
  },

  async handleCustomerSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('customer-id').value;
    const payload = {
      name: document.getElementById('customer-name').value.trim(),
      email: document.getElementById('customer-email').value.trim(),
      phone: document.getElementById('customer-phone').value.trim(),
      license_no: document.getElementById('customer-license').value.trim() || null,
      address: document.getElementById('customer-address').value.trim() || null,
    };

    const isEdit = Boolean(id);
    const url = isEdit ? `${API_BASE}/customers/${id}` : `${API_BASE}/customers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        this.showToast(data.message || 'Failed to save customer.', 'error');
        return;
      }

      this.showToast(isEdit ? 'Customer updated successfully!' : 'Customer created successfully!', 'success');
      this.closeModal('customerModal');
      this.loadCustomers();
      if (this.activeSection === 'dashboard') this.loadDashboardData();
    } catch (err) {
      console.error(err);
      this.showToast('Network error while saving customer.', 'error');
    }
  },

  confirmDeleteCustomer(id, name) {
    this.openConfirmModal({
      title: 'Delete Customer',
      message: `Are you sure you want to delete customer "${name}" (#${id})?`,
      btnText: 'Delete Customer',
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!data.success) {
            this.showToast(data.message || 'Could not delete customer.', 'error');
            return;
          }
          this.showToast('Customer deleted successfully.', 'success');
          this.loadCustomers();
        } catch (err) {
          console.error(err);
          this.showToast('Failed to delete customer.', 'error');
        }
      },
    });
  },

  // ================= 4. BOOKINGS / RENTALS =================
  async loadBookings() {
    const tableBody = document.getElementById('bookings-table-body');
    tableBody.innerHTML = '<tr><td colspan="10" class="loading-cell">Loading bookings...</td></tr>';

    const status = document.getElementById('booking-status-filter')?.value || 'all';
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);

    try {
      const res = await fetch(`${API_BASE}/bookings?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="empty-cell">No bookings found.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map((b) => {
        const canReturn = b.booking_status === 'Confirmed';
        const canCancel = b.booking_status === 'Confirmed';
        const needsPay = b.payment_status !== 'Paid';

        return `
          <tr>
            <td><strong>#BK-${b.booking_id}</strong></td>
            <td>
              <strong>${this.escapeHtml(b.customer_name)}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${this.escapeHtml(b.customer_phone)}</div>
            </td>
            <td>
              <strong>${this.escapeHtml(b.vehicle_model)}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${this.escapeHtml(b.vehicle_reg_no)}</div>
            </td>
            <td>${b.start_date}</td>
            <td>${b.end_date}</td>
            <td>₹${Number(b.daily_rate).toLocaleString('en-IN')}/day</td>
            <td><strong>₹${Number(b.total_amount).toLocaleString('en-IN')}</strong></td>
            <td>${this.getBookingBadge(b.booking_status)}</td>
            <td>${this.getPaymentBadge(b.payment_status)}</td>
            <td>
              <div class="table-actions">
                ${canReturn ? `
                  <button class="action-btn return" title="Vehicle returned by customer" onclick="app.confirmReturnBooking(${b.booking_id}, '${this.escapeHtml(b.vehicle_model)}')">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    <span>Return</span>
                  </button>
                ` : ''}

                ${needsPay ? `
                  <button class="action-btn edit" title="Record Payment" onclick="app.openPaymentModalForBooking(${b.booking_id}, ${b.total_amount})">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    <span>Pay</span>
                  </button>
                ` : ''}

                ${canCancel ? `
                  <button class="action-btn delete" title="Cancel Booking" onclick="app.confirmCancelBooking(${b.booking_id})">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    <span>Cancel</span>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="10" class="empty-cell">Failed to load bookings list.</td></tr>';
      this.showToast('Could not load bookings.', 'error');
    }
  },

  async openBookingModal() {
    try {
      // 1. Fetch customers
      const custRes = await fetch(`${API_BASE}/customers`);
      const custData = await custRes.json();
      const custSelect = document.getElementById('booking-customer');
      custSelect.innerHTML = '<option value="">-- Choose Customer --</option>';
      if (custData.success && custData.data) {
        custData.data.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.user_id;
          opt.textContent = `${c.name} (${c.phone})`;
          custSelect.appendChild(opt);
        });
      }

      // 2. Fetch available vehicles
      const vehRes = await fetch(`${API_BASE}/vehicles?status=Available`);
      const vehData = await vehRes.json();
      const vehSelect = document.getElementById('booking-vehicle');
      vehSelect.innerHTML = '<option value="">-- Choose Available Vehicle --</option>';
      this.availableVehicles = vehData.success ? (vehData.data || []) : [];

      if (this.availableVehicles.length === 0) {
        vehSelect.innerHTML = '<option value="">No vehicles currently available</option>';
      } else {
        this.availableVehicles.forEach((v) => {
          const opt = document.createElement('option');
          opt.value = v.vehicle_id;
          opt.setAttribute('data-rate', v.daily_rate);
          opt.textContent = `${v.model} (${v.reg_no}) - ₹${v.daily_rate}/day`;
          vehSelect.appendChild(opt);
        });
      }

      // 3. Set default dates: Start today, End tomorrow
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const toISO = (d) => d.toISOString().split('T')[0];
      document.getElementById('booking-start-date').value = toISO(today);
      document.getElementById('booking-end-date').value = toISO(tomorrow);
      document.getElementById('booking-start-date').min = toISO(today);
      document.getElementById('booking-end-date').min = toISO(tomorrow);

      this.calculateBookingEstimate();
      this.openModal('bookingModal');
    } catch (err) {
      console.error(err);
      this.showToast('Failed to prepare booking form.', 'error');
    }
  },

  calculateBookingEstimate() {
    const vehSelect = document.getElementById('booking-vehicle');
    const selectedOpt = vehSelect.options[vehSelect.selectedIndex];
    const rate = selectedOpt && selectedOpt.getAttribute('data-rate') ? parseFloat(selectedOpt.getAttribute('data-rate')) : 0;

    const startDateStr = document.getElementById('booking-start-date').value;
    const endDateStr = document.getElementById('booking-end-date').value;

    let days = 0;
    if (startDateStr && endDateStr) {
      const s = new Date(startDateStr);
      const e = new Date(endDateStr);
      if (e > s) {
        const diff = e.getTime() - s.getTime();
        days = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
      }
    }

    const total = (days * rate).toFixed(2);
    document.getElementById('estimate-daily-rate').textContent = `₹${rate.toLocaleString('en-IN')} / day`;
    document.getElementById('estimate-days').textContent = `${days} day(s)`;
    document.getElementById('estimate-total-cost').textContent = `₹${Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  },

  async handleBookingSubmit(event) {
    event.preventDefault();
    const userId = document.getElementById('booking-customer').value;
    const vehicleId = document.getElementById('booking-vehicle').value;
    const startDate = document.getElementById('booking-start-date').value;
    const endDate = document.getElementById('booking-end-date').value;

    if (!userId || !vehicleId || !startDate || !endDate) {
      this.showToast('Please select all required booking fields.', 'error');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      this.showToast('End date must be after start date.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId, 10),
          vehicle_id: parseInt(vehicleId, 10),
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        this.showToast(data.message || 'Failed to create booking.', 'error');
        return;
      }

      this.showToast('Booking confirmed! Vehicle marked unavailable.', 'success');
      this.closeModal('bookingModal');
      this.loadBookings();
      this.loadVehicles();
      this.loadDashboardData();
    } catch (err) {
      console.error(err);
      this.showToast('Network error while processing booking.', 'error');
    }
  },

  confirmReturnBooking(bookingId, model) {
    this.openConfirmModal({
      title: 'Return Vehicle',
      message: `Complete rental for vehicle "${model}"? This marks the booking as Completed and returns the vehicle to Available status.`,
      btnText: 'Confirm Return',
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/bookings/${bookingId}/return`, { method: 'POST' });
          const data = await res.json();
          if (!data.success) {
            this.showToast(data.message || 'Could not return vehicle.', 'error');
            return;
          }
          this.showToast('Vehicle returned and marked Available!', 'success');
          this.loadBookings();
          this.loadVehicles();
          this.loadDashboardData();
        } catch (err) {
          console.error(err);
          this.showToast('Failed to process vehicle return.', 'error');
        }
      },
    });
  },

  confirmCancelBooking(bookingId) {
    this.openConfirmModal({
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel booking #BK-${bookingId}? The vehicle will be restored to Available.`,
      btnText: 'Cancel Booking',
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, { method: 'POST' });
          const data = await res.json();
          if (!data.success) {
            this.showToast(data.message || 'Could not cancel booking.', 'error');
            return;
          }
          this.showToast('Booking cancelled and vehicle released.', 'success');
          this.loadBookings();
          this.loadVehicles();
          this.loadDashboardData();
        } catch (err) {
          console.error(err);
          this.showToast('Failed to cancel booking.', 'error');
        }
      },
    });
  },

  // ================= 5. PAYMENTS =================
  async loadPayments() {
    const tableBody = document.getElementById('payments-table-body');
    tableBody.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading payment records...</td></tr>';

    const status = document.getElementById('payment-status-filter')?.value || 'all';
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);

    try {
      const res = await fetch(`${API_BASE}/payments?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="empty-cell">No payment records found.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map((p) => {
        const isPending = p.payment_status === 'Pending';
        return `
          <tr>
            <td><strong>#PAY-${p.payment_id}</strong></td>
            <td>#BK-${p.booking_id}</td>
            <td>${this.escapeHtml(p.customer_name)}</td>
            <td>${this.escapeHtml(p.vehicle_model)}</td>
            <td>${p.payment_date}</td>
            <td><span class="badge" style="background:#f1f5f9; color:#334155;">${this.escapeHtml(p.payment_method || 'N/A')}</span></td>
            <td><strong>₹${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
            <td>${this.getPaymentBadge(p.payment_status)}</td>
            <td>
              <div class="table-actions">
                ${isPending ? `
                  <button class="action-btn return" onclick="app.quickMarkPaid(${p.payment_id})">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Mark Paid</span>
                  </button>
                ` : `
                  <span style="font-size:0.75rem; color:var(--text-muted);">Completed</span>
                `}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="9" class="empty-cell">Failed to load payments.</td></tr>';
      this.showToast('Could not load payment history.', 'error');
    }
  },

  async openPaymentModal() {
    try {
      const res = await fetch(`${API_BASE}/payments/pending-bookings`);
      const data = await res.json();
      const select = document.getElementById('payment-booking-select');
      select.innerHTML = '<option value="">-- Choose Booking to Pay --</option>';

      if (data.success && data.data) {
        data.data.forEach((b) => {
          const opt = document.createElement('option');
          opt.value = b.booking_id;
          opt.setAttribute('data-amount', b.total_amount);
          opt.textContent = `#BK-${b.booking_id} | ${b.customer_name} - ${b.vehicle_model} (₹${b.total_amount})`;
          select.appendChild(opt);
        });
      }

      document.getElementById('payment-amount').value = '';
      document.getElementById('payment-status').value = 'Paid';
      document.getElementById('payment-method').value = 'UPI';

      this.openModal('paymentModal');
    } catch (err) {
      console.error(err);
      this.showToast('Failed to open payment dialog.', 'error');
    }
  },

  async openPaymentModalForBooking(bookingId, amount) {
    await this.openPaymentModal();
    const select = document.getElementById('payment-booking-select');
    select.value = bookingId;
    document.getElementById('payment-amount').value = amount;
  },

  handlePaymentBookingChange() {
    const select = document.getElementById('payment-booking-select');
    const opt = select.options[select.selectedIndex];
    if (opt && opt.getAttribute('data-amount')) {
      document.getElementById('payment-amount').value = opt.getAttribute('data-amount');
    }
  },

  async handlePaymentSubmit(event) {
    event.preventDefault();
    const bookingId = document.getElementById('payment-booking-select').value;
    const amount = document.getElementById('payment-amount').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const status = document.getElementById('payment-status').value;

    if (!bookingId || amount === '' || !paymentMethod) {
      this.showToast('Please fill all required payment fields.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: parseInt(bookingId, 10),
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          status,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        this.showToast(data.message || 'Could not record payment.', 'error');
        return;
      }

      this.showToast('Payment recorded successfully!', 'success');
      this.closeModal('paymentModal');
      this.loadPayments();
      this.loadBookings();
      this.loadDashboardData();
    } catch (err) {
      console.error(err);
      this.showToast('Network error while saving payment.', 'error');
    }
  },

  async quickMarkPaid(paymentId) {
    try {
      const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' }),
      });
      const data = await res.json();
      if (!data.success) {
        this.showToast(data.message || 'Failed to update payment.', 'error');
        return;
      }
      this.showToast('Payment marked as Paid!', 'success');
      this.loadPayments();
      this.loadBookings();
      this.loadDashboardData();
    } catch (err) {
      console.error(err);
      this.showToast('Failed to update payment status.', 'error');
    }
  },

  // ================= UI HELPERS & MODALS =================
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  openConfirmModal({ title, message, btnText, action }) {
    document.getElementById('confirm-modal-title').textContent = title || 'Confirm';
    document.getElementById('confirm-modal-message').textContent = message || 'Are you sure?';
    const actionBtn = document.getElementById('confirm-modal-action-btn');
    actionBtn.textContent = btnText || 'Confirm';

    actionBtn.onclick = async () => {
      this.closeModal('confirmModal');
      if (typeof action === 'function') {
        await action();
      }
    };

    this.openModal('confirmModal');
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-msg">${this.escapeHtml(message)}</span>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  },

  // Badges
  getVehicleBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'available') {
      return '<span class="badge badge-available"><span class="badge-dot"></span>Available</span>';
    } else if (s === 'maintenance') {
      return '<span class="badge badge-maintenance"><span class="badge-dot"></span>Maintenance</span>';
    } else {
      return '<span class="badge badge-inactive"><span class="badge-dot"></span>Unavailable</span>';
    }
  },

  getBookingBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') {
      return '<span class="badge badge-confirmed"><span class="badge-dot"></span>Active</span>';
    } else if (s === 'completed') {
      return '<span class="badge badge-completed"><span class="badge-dot"></span>Returned</span>';
    } else {
      return '<span class="badge badge-cancelled"><span class="badge-dot"></span>Cancelled</span>';
    }
  },

  getPaymentBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return '<span class="badge badge-paid"><span class="badge-dot"></span>Paid</span>';
    } else if (s === 'pending') {
      return '<span class="badge badge-pending"><span class="badge-dot"></span>Pending</span>';
    } else if (s === 'refunded') {
      return '<span class="badge badge-refunded">Refunded</span>';
    } else {
      return '<span class="badge badge-failed"><span class="badge-dot"></span>Failed</span>';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
};

// Global click outside modal handler to close
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ESC key closes modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach((modal) => {
      modal.classList.remove('active');
    });
  }
});

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

