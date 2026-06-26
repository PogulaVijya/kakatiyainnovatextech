let allApplicants = [];
let allInquiries = [];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verify Authentication Status
  checkAuth();

  // 2. Bind Sidebar Navigation
  document.querySelectorAll('.sidebar-menu .menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-menu .menu-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      const sectionId = link.getAttribute('data-section');
      navigateToSection(sectionId);
    });
  });

  // 3. Load default dashboard data
  loadOverviewStats();
});

// --- SESSION CHECK ---
async function checkAuth() {
  try {
    const res = await fetch('/auth/status');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/admin/login.html';
    } else {
      document.getElementById('adminUsername').innerText = data.username;
    }
  } catch (err) {
    window.location.href = '/admin/login.html';
  }
}

// --- LOG OUT ---
async function logout() {
  try {
    const res = await fetch('/auth/logout', { method: 'POST' });
    if (res.ok) {
      window.location.href = '/admin/login.html';
    }
  } catch (err) {
    alert('Logout failed');
  }
}

// --- SIDEBAR TOGGLE FOR RESPONSIVE ---
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

// --- TAB ROUTING ---
function navigateToSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
  
  // Show active section
  const targetSec = document.getElementById(`sect-${sectionId}`);
  if (targetSec) targetSec.classList.add('active');

  // Close sidebar on mobile after navigating
  document.getElementById('sidebar').classList.remove('active');

  // Update header title
  const titles = {
    overview: 'Dashboard Overview',
    services: 'Services Management',
    jobs: 'Job Openings',
    applicants: 'Candidate Applications',
    inquiries: 'Contact Lead Inquiries',
    testimonials: 'Client Testimonials',
    team: 'Executive Leadership Team',
    blogs: 'Insights & Publications',
    settings: 'Website Core Settings'
  };
  document.getElementById('currentSectionTitle').innerText = titles[sectionId] || 'Management Dashboard';

  // Load specific tab data
  if (sectionId === 'overview') loadOverviewStats();
  else if (sectionId === 'services') loadServices();
  else if (sectionId === 'jobs') loadJobs();
  else if (sectionId === 'applicants') loadApplicants();
  else if (sectionId === 'inquiries') loadInquiries();
  else if (sectionId === 'testimonials') loadTestimonials();
  else if (sectionId === 'team') loadTeam();
  else if (sectionId === 'blogs') loadBlogs();
  else if (sectionId === 'settings') loadSettings();
}

// --- IMAGE UPLOAD HELPER ---
async function uploadImageFile(input, targetInputId) {
  if (input.files.length === 0) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const targetInput = document.getElementById(targetInputId);
  const originalPlaceholder = targetInput.placeholder;
  targetInput.placeholder = "Uploading file... please wait";

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      targetInput.value = data.filePath;
      alert("Image uploaded successfully!");
    } else {
      throw new Error(data.error || "Upload failed");
    }
  } catch (err) {
    alert("Error uploading file: " + err.message);
  } finally {
    targetInput.placeholder = originalPlaceholder;
  }
}

// ================= SECTION: OVERVIEW =================
async function loadOverviewStats() {
  try {
    const [inqRes, appRes, servRes, blogRes, testRes] = await Promise.all([
      fetch('/api/inquiries'),
      fetch('/api/applicants'),
      fetch('/api/services'),
      fetch('/api/blogs'),
      fetch('/api/testimonials')
    ]);

    const inquiries = await inqRes.json();
    const applicants = await appRes.json();
    const services = await servRes.json();
    const blogs = await blogRes.json();
    const testimonials = await testRes.json();

    // Populate counts
    document.getElementById('stat-inquiries').innerText = inquiries.length;
    document.getElementById('stat-applicants').innerText = applicants.length;
    document.getElementById('stat-services').innerText = services.length;
    document.getElementById('stat-blogs').innerText = blogs.length;

    // Show new applicants badge in sidebar
    const newApplicants = applicants.filter(a => a.status === 'New');
    const badge = document.getElementById('newApplicantsCount');
    if (newApplicants.length > 0) {
      badge.innerText = newApplicants.length;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }

    // Populate Recent Inquiries (Limit to 5)
    const recentInquiriesTbody = document.getElementById('recent-inquiries-tbody');
    recentInquiriesTbody.innerHTML = '';
    if (inquiries.length === 0) {
      recentInquiriesTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No inquiries logged yet</td></tr>';
    } else {
      inquiries.slice(0, 5).forEach(inq => {
        const row = `
          <tr>
            <td><strong>${inq.name}</strong></td>
            <td>${inq.subject}</td>
            <td>${new Date(inq.created_at).toLocaleDateString()}</td>
          </tr>
        `;
        recentInquiriesTbody.insertAdjacentHTML('beforeend', row);
      });
    }

    // Populate Recent Applicants (Limit to 5)
    const recentApplicantsTbody = document.getElementById('recent-applicants-tbody');
    recentApplicantsTbody.innerHTML = '';
    if (applicants.length === 0) {
      recentApplicantsTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No applicants submitted yet</td></tr>';
    } else {
      applicants.slice(0, 5).forEach(app => {
        const row = `
          <tr>
            <td><strong>${app.name}</strong></td>
            <td>${app.job_title || 'General Application'}</td>
            <td><span class="badge-status ${getBadgeClass(app.status)}">${app.status}</span></td>
          </tr>
        `;
        recentApplicantsTbody.insertAdjacentHTML('beforeend', row);
      });
    }

  } catch (err) {
    console.error("Error loading dashboard metrics:", err);
  }
}

function getBadgeClass(status) {
  const mapping = {
    'New': 'badge-new',
    'Under Review': 'badge-review',
    'Shortlisted': 'badge-shortlist',
    'Rejected': 'badge-rejected',
    'Hired': 'badge-hired'
  };
  return mapping[status] || 'badge-new';
}


// ================= SECTION: SERVICES =================
async function loadServices() {
  const tbody = document.getElementById('services-table-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading...</td></tr>';
  
  try {
    const res = await fetch('/api/services');
    const services = await res.json();
    
    tbody.innerHTML = '';
    if (services.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No services created yet.</td></tr>';
      return;
    }
    
    services.forEach(service => {
      const row = `
        <tr>
          <td><strong>${service.name}</strong></td>
          <td><code>${service.icon}</code></td>
          <td><span class="text-truncate d-inline-block" style="max-width: 250px;">${service.description}</span></td>
          <td>
            <button class="btn btn-outline-warning btn-sm me-2" onclick="editService(${JSON.stringify(service).replace(/"/g, '&quot;')})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteService(${service.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading services data</td></tr>';
  }
}

function openAddServiceModal() {
  document.getElementById('serviceForm').reset();
  document.getElementById('service-id-input').value = '';
  document.getElementById('serviceModalTitle').innerText = 'Add Service';
  new bootstrap.Modal(document.getElementById('serviceModal')).show();
}

function editService(service) {
  document.getElementById('service-id-input').value = service.id;
  document.getElementById('service-name-input').value = service.name;
  document.getElementById('service-icon-input').value = service.icon;
  document.getElementById('service-desc-input').value = service.description;
  document.getElementById('serviceModalTitle').innerText = 'Edit Service';
  new bootstrap.Modal(document.getElementById('serviceModal')).show();
}

async function submitServiceForm(e) {
  e.preventDefault();
  const id = document.getElementById('service-id-input').value;
  const name = document.getElementById('service-name-input').value.trim();
  const icon = document.getElementById('service-icon-input').value.trim();
  const description = document.getElementById('service-desc-input').value.trim();

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/services/${id}` : '/api/services';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, description })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('serviceModal')).hide();
      loadServices();
    } else {
      alert("Error saving service");
    }
  } catch (err) {
    alert("API Request failure");
  }
}

async function deleteService(id) {
  if (!confirm("Are you sure you want to delete this service?")) return;
  try {
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
    if (res.ok) loadServices();
  } catch (err) {
    alert("Delete failed");
  }
}


// ================= SECTION: JOBS =================
async function loadJobs() {
  const tbody = document.getElementById('jobs-table-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>';

  try {
    const res = await fetch('/api/jobs');
    const jobs = await res.json();
    
    tbody.innerHTML = '';
    if (jobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No open job positions created.</td></tr>';
      return;
    }

    jobs.forEach(job => {
      const row = `
        <tr>
          <td><strong>${job.title}</strong></td>
          <td>${job.location}</td>
          <td>${job.experience}</td>
          <td><code>${job.skills}</code></td>
          <td><span class="badge ${job.status === 'open' ? 'bg-success' : 'bg-secondary'}">${job.status.toUpperCase()}</span></td>
          <td>
            <button class="btn btn-outline-warning btn-sm me-2" onclick="editJob(${JSON.stringify(job).replace(/"/g, '&quot;')})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteJob(${job.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading job records</td></tr>';
  }
}

function openAddJobModal() {
  document.getElementById('jobForm').reset();
  document.getElementById('job-id-input').value = '';
  document.getElementById('jobModalTitle').innerText = 'Add Open Position';
  new bootstrap.Modal(document.getElementById('jobModal')).show();
}

function editJob(job) {
  document.getElementById('job-id-input').value = job.id;
  document.getElementById('job-title-input').value = job.title;
  document.getElementById('job-location-input').value = job.location;
  document.getElementById('job-experience-input').value = job.experience;
  document.getElementById('job-skills-input').value = job.skills;
  document.getElementById('job-status-input').value = job.status;
  document.getElementById('job-desc-input').value = job.description || '';
  document.getElementById('jobModalTitle').innerText = 'Edit Position Details';
  new bootstrap.Modal(document.getElementById('jobModal')).show();
}

async function submitJobForm(e) {
  e.preventDefault();
  const id = document.getElementById('job-id-input').value;
  const title = document.getElementById('job-title-input').value.trim();
  const location = document.getElementById('job-location-input').value.trim();
  const experience = document.getElementById('job-experience-input').value.trim();
  const skills = document.getElementById('job-skills-input').value.trim();
  const status = document.getElementById('job-status-input').value;
  const description = document.getElementById('job-desc-input').value.trim();

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/jobs/${id}` : '/api/jobs';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, location, experience, skills, status, description })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('jobModal')).hide();
      loadJobs();
    }
  } catch (err) {
    alert("Failed saving job posting");
  }
}

async function deleteJob(id) {
  if (!confirm("Are you sure you want to delete this job position?")) return;
  try {
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    if (res.ok) loadJobs();
  } catch (err) {
    alert("Delete failed");
  }
}


// ================= SECTION: APPLICANTS =================
async function loadApplicants() {
  const tbody = document.getElementById('applicants-table-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>';

  try {
    const res = await fetch('/api/applicants');
    allApplicants = await res.json();
    renderApplicantsTable(allApplicants);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error fetching applicants</td></tr>';
  }
}

function renderApplicantsTable(list) {
  const tbody = document.getElementById('applicants-table-tbody');
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No applicants match criteria</td></tr>';
    return;
  }

  list.forEach(app => {
    const submissionDate = new Date(app.created_at).toLocaleDateString();
    const row = `
      <tr>
        <td><strong>${app.name}</strong></td>
        <td>${app.email}</td>
        <td>${app.job_title || 'General Application'}</td>
        <td>${submissionDate}</td>
        <td><span class="badge-status ${getBadgeClass(app.status)}">${app.status}</span></td>
        <td>
          <button class="btn btn-gold-custom btn-sm me-2" onclick="viewApplicantDetails(${JSON.stringify(app).replace(/"/g, '&quot;')})"><i class="bi bi-eye"></i> View Profile</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteApplicant(${app.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function filterApplicantsTable() {
  const q = document.getElementById('applicant-search').value.toLowerCase();
  const status = document.getElementById('applicant-filter-status').value;

  const filtered = allApplicants.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(q) || app.email.toLowerCase().includes(q) || (app.job_title && app.job_title.toLowerCase().includes(q)) || app.skills.toLowerCase().includes(q);
    const matchesStatus = status === 'all' || app.status === status;
    return matchesSearch && matchesStatus;
  });

  renderApplicantsTable(filtered);
}

let activeApplicantId = null;
function viewApplicantDetails(app) {
  activeApplicantId = app.id;
  document.getElementById('view-app-name').innerText = app.name;
  document.getElementById('view-app-email').innerText = app.email;
  document.getElementById('view-app-email').href = `mailto:${app.email}`;
  document.getElementById('view-app-role').innerText = app.job_title || 'General Application';
  document.getElementById('view-app-date').innerText = new Date(app.created_at).toLocaleString();
  document.getElementById('view-app-skills').innerText = app.skills;
  document.getElementById('view-app-message').innerText = app.message;

  const resumeBtn = document.getElementById('view-app-resume');
  if (app.resume_url.startsWith('/uploads')) {
    resumeBtn.href = app.resume_url;
    resumeBtn.classList.remove('disabled');
  } else if (app.resume_url && app.resume_url !== 'Not Provided') {
    resumeBtn.href = app.resume_url.startsWith('http') ? app.resume_url : `http://${app.resume_url}`;
    resumeBtn.classList.remove('disabled');
  } else {
    resumeBtn.href = '#';
    resumeBtn.classList.add('disabled');
  }

  document.getElementById('view-app-status-select').value = app.status;
  new bootstrap.Modal(document.getElementById('applicantDetailsModal')).show();
}

async function updateApplicantStatus() {
  const status = document.getElementById('view-app-status-select').value;
  if (!activeApplicantId) return;

  try {
    const res = await fetch(`/api/applicants/${activeApplicantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      loadApplicants();
    }
  } catch (err) {
    alert("Failed to update status");
  }
}

async function deleteApplicant(id) {
  if (!confirm("Are you sure you want to delete this applicant file?")) return;
  try {
    const res = await fetch(`/api/applicants/${id}`, { method: 'DELETE' });
    if (res.ok) loadApplicants();
  } catch (err) {
    alert("Delete failed");
  }
}


// ================= SECTION: INQUIRIES =================
async function loadInquiries() {
  const tbody = document.getElementById('inquiries-table-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>';

  try {
    const res = await fetch('/api/inquiries');
    allInquiries = await res.json();
    renderInquiriesTable(allInquiries);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading inquiries</td></tr>';
  }
}

function renderInquiriesTable(list) {
  const tbody = document.getElementById('inquiries-table-tbody');
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No inquiries logged.</td></tr>';
    return;
  }

  list.forEach(inq => {
    const submitDate = new Date(inq.created_at).toLocaleDateString();
    const row = `
      <tr>
        <td><strong>${inq.name}</strong></td>
        <td>${inq.email}</td>
        <td>${inq.subject}</td>
        <td>${submitDate}</td>
        <td><span class="badge ${inq.status === 'Contacted' ? 'bg-success' : 'bg-warning'}">${inq.status}</span></td>
        <td>
          <button class="btn btn-gold-custom btn-sm me-2" onclick="viewInquiryDetails(${JSON.stringify(inq).replace(/"/g, '&quot;')})"><i class="bi bi-eye"></i> View Lead</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteInquiry(${inq.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

function filterInquiriesTable() {
  const q = document.getElementById('inquiry-search').value.toLowerCase();
  const filtered = allInquiries.filter(inq => {
    return inq.name.toLowerCase().includes(q) || inq.email.toLowerCase().includes(q) || inq.subject.toLowerCase().includes(q) || inq.message.toLowerCase().includes(q);
  });
  renderInquiriesTable(filtered);
}

let activeInquiryId = null;
function viewInquiryDetails(inq) {
  activeInquiryId = inq.id;
  document.getElementById('view-inq-name').innerText = inq.name;
  document.getElementById('view-inq-email').innerText = inq.email;
  document.getElementById('view-inq-email').href = `mailto:${inq.email}`;
  document.getElementById('view-inq-subject').innerText = inq.subject;
  document.getElementById('view-inq-message').innerText = inq.message;
  document.getElementById('view-inq-status').value = inq.status;
  document.getElementById('view-inq-notes').value = inq.notes || '';

  new bootstrap.Modal(document.getElementById('inquiryDetailsModal')).show();
}

async function updateInquiryStatus() {
  const status = document.getElementById('view-inq-status').value;
  if (!activeInquiryId) return;

  try {
    await fetch(`/api/inquiries/${activeInquiryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadInquiries();
  } catch (err) {
    console.error(err);
  }
}

async function saveInquiryNotes() {
  const status = document.getElementById('view-inq-status').value;
  const notes = document.getElementById('view-inq-notes').value.trim();
  if (!activeInquiryId) return;

  try {
    const res = await fetch(`/api/inquiries/${activeInquiryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('inquiryDetailsModal')).hide();
      loadInquiries();
    }
  } catch (err) {
    alert("Notes save failed");
  }
}

async function deleteInquiry(id) {
  if (!confirm("Are you sure you want to delete this inquiry lead?")) return;
  try {
    const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
    if (res.ok) loadInquiries();
  } catch (err) {
    alert("Delete failed");
  }
}


// ================= SECTION: TESTIMONIALS =================
async function loadTestimonials() {
  const tbody = document.getElementById('testimonials-table-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>';

  try {
    const res = await fetch('/api/testimonials');
    const list = await res.json();
    
    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No testimonials added</td></tr>';
      return;
    }

    list.forEach(t => {
      const row = `
        <tr>
          <td><strong>${t.client_name}</strong></td>
          <td>${t.client_designation}</td>
          <td><span class="text-truncate d-inline-block" style="max-width: 250px;">${t.message}</span></td>
          <td><span class="badge ${t.is_ticker === 1 ? 'bg-info' : 'bg-primary'}">${t.is_ticker === 1 ? 'Ticker Banner' : 'Carousel Slide'}</span></td>
          <td>
            <button class="btn btn-outline-warning btn-sm me-2" onclick="editTestimonial(${JSON.stringify(t).replace(/"/g, '&quot;')})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteTestimonial(${t.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading testimonials</td></tr>';
  }
}

function openAddTestimonialModal() {
  document.getElementById('testimonialForm').reset();
  document.getElementById('testimonial-id-input').value = '';
  document.getElementById('testimonialModalTitle').innerText = 'Add Testimonial';
  new bootstrap.Modal(document.getElementById('testimonialModal')).show();
}

function editTestimonial(t) {
  document.getElementById('testimonial-id-input').value = t.id;
  document.getElementById('testimonial-name-input').value = t.client_name;
  document.getElementById('testimonial-company-input').value = t.client_designation;
  document.getElementById('testimonial-rating-input').value = t.rating;
  document.getElementById('testimonial-layout-input').value = t.is_ticker;
  document.getElementById('testimonial-message-input').value = t.message;
  document.getElementById('testimonialModalTitle').innerText = 'Edit Testimonial';
  new bootstrap.Modal(document.getElementById('testimonialModal')).show();
}

async function submitTestimonialForm(e) {
  e.preventDefault();
  const id = document.getElementById('testimonial-id-input').value;
  const client_name = document.getElementById('testimonial-name-input').value.trim();
  const client_designation = document.getElementById('testimonial-company-input').value.trim();
  const rating = parseInt(document.getElementById('testimonial-rating-input').value);
  const is_ticker = parseInt(document.getElementById('testimonial-layout-input').value);
  const message = document.getElementById('testimonial-message-input').value.trim();

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/testimonials/${id}` : '/api/testimonials';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name, client_designation, rating, is_ticker, message })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('testimonialModal')).hide();
      loadTestimonials();
    }
  } catch (err) {
    alert("Saving testimonial failed");
  }
}

async function deleteTestimonial(id) {
  if (!confirm("Are you sure you want to delete this testimonial?")) return;
  try {
    const res = await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
    if (res.ok) loadTestimonials();
  } catch (err) {
    alert("Delete failed");
  }
}


// ================= SECTION: TEAM =================
async function loadTeam() {
  const tbody = document.getElementById('team-table-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>';

  try {
    const res = await fetch('/api/team');
    const team = await res.json();

    tbody.innerHTML = '';
    if (team.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No team members added.</td></tr>';
      return;
    }

    team.forEach(member => {
      const row = `
        <tr>
          <td><img src="${member.image_url}" width="40" height="40" class="rounded-circle" style="object-fit: cover;"></td>
          <td><strong>${member.name}</strong></td>
          <td>${member.designation}</td>
          <td><a href="${member.linkedin_url}" target="_blank" class="text-info text-decoration-none">${member.linkedin_url || 'N/A'}</a></td>
          <td>
            <button class="btn btn-outline-warning btn-sm me-2" onclick="editTeamMember(${JSON.stringify(member).replace(/"/g, '&quot;')})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteTeamMember(${member.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading team profiles</td></tr>';
  }
}

function openAddTeamModal() {
  document.getElementById('teamForm').reset();
  document.getElementById('team-id-input').value = '';
  document.getElementById('teamModalTitle').innerText = 'Add Executive Member';
  new bootstrap.Modal(document.getElementById('teamModal')).show();
}

function editTeamMember(member) {
  document.getElementById('team-id-input').value = member.id;
  document.getElementById('team-name-input').value = member.name;
  document.getElementById('team-designation-input').value = member.designation;
  document.getElementById('team-linkedin-input').value = member.linkedin_url || '';
  document.getElementById('team-photo-input').value = member.image_url;
  document.getElementById('teamModalTitle').innerText = 'Edit Executive Member';
  new bootstrap.Modal(document.getElementById('teamModal')).show();
}

async function submitTeamForm(e) {
  e.preventDefault();
  const id = document.getElementById('team-id-input').value;
  const name = document.getElementById('team-name-input').value.trim();
  const designation = document.getElementById('team-designation-input').value.trim();
  const linkedin_url = document.getElementById('team-linkedin-input').value.trim();
  const image_url = document.getElementById('team-photo-input').value.trim();

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/team/${id}` : '/api/team';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, designation, linkedin_url, image_url })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('teamModal')).hide();
      loadTeam();
    }
  } catch (err) {
    alert("Saving team member failed");
  }
}

async function deleteTeamMember(id) {
  if (!confirm("Are you sure you want to delete this team member profile?")) return;
  try {
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    if (res.ok) loadTeam();
  } catch (err) {
    alert("Delete failed");
  }
}


// ================= SECTION: BLOGS =================
async function loadBlogs() {
  const tbody = document.getElementById('blogs-table-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>';

  try {
    const res = await fetch('/api/blogs');
    const blogs = await res.json();

    tbody.innerHTML = '';
    if (blogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No insights published yet</td></tr>';
      return;
    }

    blogs.forEach(blog => {
      const dateStr = new Date(blog.created_at).toLocaleDateString();
      const row = `
        <tr>
          <td><img src="${blog.image_url}" width="50" height="35" class="rounded" style="object-fit: cover;"></td>
          <td><strong>${blog.title}</strong></td>
          <td><span class="badge bg-secondary text-uppercase">${blog.category}</span></td>
          <td><span class="badge ${blog.status === 'published' ? 'bg-success' : 'bg-warning'}">${blog.status.toUpperCase()}</span></td>
          <td>${dateStr}</td>
          <td>
            <button class="btn btn-outline-warning btn-sm me-2" onclick="editBlog(${JSON.stringify(blog).replace(/"/g, '&quot;')})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteBlog(${blog.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading blog articles</td></tr>';
  }
}

function openAddBlogModal() {
  document.getElementById('blogForm').reset();
  document.getElementById('blog-id-input').value = '';
  document.getElementById('blogModalTitle').innerText = 'Write New Article';
  new bootstrap.Modal(document.getElementById('blogModal')).show();
}

function editBlog(blog) {
  document.getElementById('blog-id-input').value = blog.id;
  document.getElementById('blog-title-input').value = blog.title;
  document.getElementById('blog-category-input').value = blog.category;
  document.getElementById('blog-status-input').value = blog.status;
  document.getElementById('blog-image-input').value = blog.image_url;
  document.getElementById('blog-excerpt-input').value = blog.excerpt;
  document.getElementById('blog-content-input').value = blog.content;
  document.getElementById('blogModalTitle').innerText = 'Edit Blog Post';
  new bootstrap.Modal(document.getElementById('blogModal')).show();
}

async function submitBlogForm(e) {
  e.preventDefault();
  const id = document.getElementById('blog-id-input').value;
  const title = document.getElementById('blog-title-input').value.trim();
  const category = document.getElementById('blog-category-input').value;
  const status = document.getElementById('blog-status-input').value;
  const image_url = document.getElementById('blog-image-input').value.trim();
  const excerpt = document.getElementById('blog-excerpt-input').value.trim();
  const content = document.getElementById('blog-content-input').value.trim();

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/blogs/${id}` : '/api/blogs';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, status, image_url, excerpt, content })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('blogModal')).hide();
      loadBlogs();
    }
  } catch (err) {
    alert("Saving blog failed");
  }
}

async function deleteBlog(id) {
  if (!confirm("Are you sure you want to delete this insight article?")) return;
  try {
    const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
    if (res.ok) loadBlogs();
  } catch (err) {
    alert("Delete failed");
  }
}


// ================= SECTION: SETTINGS =================
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();

    document.getElementById('set-company-name').value = settings.company_name || '';
    document.getElementById('set-email').value = settings.email || '';
    document.getElementById('set-hr-email').value = settings.hr_email || '';
    document.getElementById('set-phone').value = settings.phone || '';
    document.getElementById('set-address').value = settings.address || '';
    document.getElementById('set-linkedin').value = settings.linkedin || '';
    document.getElementById('set-instagram').value = settings.instagram || '';
    document.getElementById('set-twitter').value = settings.twitter || '';
    document.getElementById('set-footer').value = settings.footer_text || '';

  } catch (err) {
    alert("Error loading core website configurations");
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('settings-save-btn');
  btn.disabled = true;
  btn.innerText = "Saving...";

  const payload = {
    company_name: document.getElementById('set-company-name').value.trim(),
    email: document.getElementById('set-email').value.trim(),
    hr_email: document.getElementById('set-hr-email').value.trim(),
    phone: document.getElementById('set-phone').value.trim(),
    address: document.getElementById('set-address').value.trim(),
    linkedin: document.getElementById('set-linkedin').value.trim(),
    instagram: document.getElementById('set-instagram').value.trim(),
    twitter: document.getElementById('set-twitter').value.trim(),
    footer_text: document.getElementById('set-footer').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert("Settings saved successfully!");
    } else {
      alert("Failed saving configurations");
    }
  } catch (err) {
    alert("Settings save failed");
  } finally {
    btn.disabled = false;
    btn.innerText = "Save Configurations";
  }
}
