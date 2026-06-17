import os
import sqlite3
import csv
import io
from flask import Flask, request, jsonify, session, redirect, send_from_directory, make_response, render_template
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

from db import init_db
init_db()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'kakatiyainnovatexsecretkey2026')

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'db.sqlite')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')

import requests

def sync_to_google_sheet(payload):
    webhook_url = os.getenv('GOOGLE_SHEET_WEBHOOK_URL')
    if not webhook_url:
        print("GOOGLE_SHEET_WEBHOOK_URL is not set. Skipping live sync.")
        return False
    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        if response.status_code == 200:
            print("Successfully synced submission to Google Sheet.")
            return True
        else:
            print(f"Google Sheet sync failed with status code: {response.status_code}")
    except Exception as e:
        print(f"Error syncing to Google Sheet: {e}")
    return False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Decorator to check authentication
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- STATIC CONTENT ROUTING FOR PUBLIC SITE ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/admin/')
@app.route('/admin/dashboard.html')
def admin_dashboard():
    if not session.get('logged_in'):
        return redirect('/admin/login.html')
    return render_template('admin/dashboard.html')

@app.route('/admin/login.html')
def admin_login():
    if session.get('logged_in'):
        return redirect('/admin/dashboard.html')
    return render_template('admin/login.html')

@app.route('/admin/setup.html')
def admin_setup():
    return render_template('admin/setup.html')

# Serve uploads folder static files
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- SETUP CHECK & SIGNUP APIS (FIRST TIME ONLY) ---
@app.route('/auth/setup-required', methods=['GET'])
def auth_setup_required():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM admins").fetchone()[0]
    conn.close()
    return jsonify({"setup_required": count == 0})

@app.route('/auth/setup', methods=['POST'])
def auth_setup():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM admins").fetchone()[0]
    if count > 0:
        conn.close()
        return jsonify({"error": "Administrative setup already completed"}), 403

    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password or len(password) < 6:
        conn.close()
        return jsonify({"error": "Username and a secure password (min 6 chars) are required"}), 400

    from werkzeug.security import generate_password_hash
    hashed_pass = generate_password_hash(password)
    
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO admins (username, password_hash) VALUES (?, ?)", (username, hashed_pass))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Username already exists"}), 400

    conn.close()
    return jsonify({"success": True, "message": "Administrator account created successfully"})

# --- AUTHENTICATION APIS ---
@app.route('/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admins WHERE username = ?", (username,))
    admin = cursor.fetchone()
    conn.close()

    if admin and check_password_hash(admin['password_hash'], password):
        session['logged_in'] = True
        session['username'] = username
        return jsonify({"success": True, "message": "Logged in successfully"})
    
    return jsonify({"error": "Invalid username or password"}), 401

@app.route('/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route('/auth/status', methods=['GET'])
def auth_status():
    if session.get('logged_in'):
        return jsonify({"authenticated": True, "username": session.get('username')})
    return jsonify({"authenticated": False})


# --- FILE UPLOAD API ---
@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Append unique prefix to prevent overwriting
        import time
        unique_filename = f"{int(time.time())}_{filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
        return jsonify({"success": True, "filePath": f"/uploads/{unique_filename}"})
    return jsonify({"error": "File extension not allowed"}), 400


# --- SERVICES API ---
@app.route('/api/services', methods=['GET'])
def api_services():
    conn = get_db()
    services = [dict(row) for row in conn.execute("SELECT * FROM services").fetchall()]
    conn.close()
    return jsonify(services)

@app.route('/api/services', methods=['POST'])
@login_required
def api_add_service():
    data = request.get_json() or {}
    name = data.get('name')
    icon = data.get('icon', 'bi bi-cpu')
    description = data.get('description')

    if not name or not description:
        return jsonify({"error": "Missing service name or description"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO services (name, icon, description) VALUES (?, ?, ?)", (name, icon, description))
    conn.commit()
    service_id = cursor.lastrowid
    conn.close()
    return jsonify({"success": True, "id": service_id})

@app.route('/api/services/<int:service_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_service(service_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM services WHERE id = ?", (service_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    data = request.get_json() or {}
    name = data.get('name')
    icon = data.get('icon')
    description = data.get('description')

    cursor.execute(
        "UPDATE services SET name = COALESCE(?, name), icon = COALESCE(?, icon), description = COALESCE(?, description) WHERE id = ?",
        (name, icon, description, service_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- JOBS API ---
@app.route('/api/jobs', methods=['GET'])
def api_jobs():
    conn = get_db()
    jobs = [dict(row) for row in conn.execute("SELECT * FROM jobs").fetchall()]
    conn.close()
    return jsonify(jobs)

@app.route('/api/jobs', methods=['POST'])
@login_required
def api_add_job():
    data = request.get_json() or {}
    title = data.get('title')
    location = data.get('location')
    experience = data.get('experience')
    skills = data.get('skills')
    description = data.get('description', '')
    status = data.get('status', 'open')

    if not title or not location or not experience or not skills:
        return jsonify({"error": "Required job fields missing"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO jobs (title, location, experience, skills, status, description) VALUES (?, ?, ?, ?, ?, ?)",
        (title, location, experience, skills, status, description)
    )
    conn.commit()
    job_id = cursor.lastrowid
    conn.close()
    return jsonify({"success": True, "id": job_id})

@app.route('/api/jobs/<int:job_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_job(job_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    data = request.get_json() or {}
    title = data.get('title')
    location = data.get('location')
    experience = data.get('experience')
    skills = data.get('skills')
    status = data.get('status')
    description = data.get('description')

    cursor.execute(
        "UPDATE jobs SET title = COALESCE(?, title), location = COALESCE(?, location), experience = COALESCE(?, experience), skills = COALESCE(?, skills), status = COALESCE(?, status), description = COALESCE(?, description) WHERE id = ?",
        (title, location, experience, skills, status, description, job_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- APPLICANTS API ---
@app.route('/api/applicants', methods=['GET'])
@login_required
def api_applicants():
    conn = get_db()
    # Join with jobs table to get job title
    query = """
        SELECT a.*, j.title as job_title 
        FROM applicants a 
        LEFT JOIN jobs j ON a.job_id = j.id
        ORDER BY a.created_at DESC
    """
    applicants = [dict(row) for row in conn.execute(query).fetchall()]
    conn.close()
    return jsonify(applicants)

@app.route('/api/applicants', methods=['POST'])
def api_add_applicant():
    # Supports JSON submission or multipart form file uploads
    name = request.form.get('name') or request.json.get('name') if request.is_json else request.form.get('name')
    email = request.form.get('email') or request.json.get('email') if request.is_json else request.form.get('email')
    skills = request.form.get('skills') or request.json.get('skills') if request.is_json else request.form.get('skills')
    message = request.form.get('message') or request.json.get('message') if request.is_json else request.form.get('message')
    job_id = request.form.get('job_id') or request.json.get('job_id') if request.is_json else request.form.get('job_id')
    resume_url = request.form.get('resume_url') or request.json.get('resume_url') if request.is_json else request.form.get('resume_url')

    if not name or not email or not skills or not message:
        return jsonify({"error": "Required fields missing"}), 400

    # Handle file upload if present
    if 'resume_file' in request.files:
        file = request.files['resume_file']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            import time
            unique_filename = f"{int(time.time())}_{filename}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
            resume_url = f"/uploads/{unique_filename}"

    if not resume_url:
        resume_url = "Not Provided"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO applicants (job_id, name, email, skills, resume_url, message) VALUES (?, ?, ?, ?, ?, ?)",
        (job_id, name, email, skills, resume_url, message)
    )
    conn.commit()
    app_id = cursor.lastrowid
    conn.close()

    # Sync to Google Sheets if configured
    sync_to_google_sheet({
        "form_type": "Job Application",
        "name": name,
        "email": email,
        "subject_or_role": "Talent Pool" if not job_id else f"Job ID: {job_id}",
        "skills_or_resume": f"Skills: {skills} | Resume: {resume_url}",
        "message": message
    })

    return jsonify({"success": True, "id": app_id})

@app.route('/api/applicants/<int:applicant_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_applicant(applicant_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM applicants WHERE id = ?", (applicant_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    data = request.get_json() or {}
    status = data.get('status')

    cursor.execute("UPDATE applicants SET status = COALESCE(?, status) WHERE id = ?", (status, applicant_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- INQUIRIES API ---
@app.route('/api/inquiries', methods=['GET'])
@login_required
def api_inquiries():
    conn = get_db()
    inquiries = [dict(row) for row in conn.execute("SELECT * FROM inquiries ORDER BY created_at DESC").fetchall()]
    conn.close()
    return jsonify(inquiries)

@app.route('/api/inquiries/export', methods=['GET'])
@login_required
def api_inquiries_export():
    conn = get_db()
    inquiries = conn.execute("SELECT name, email, phone, subject, message, status, created_at, notes FROM inquiries ORDER BY created_at DESC").fetchall()
    conn.close()

    si = io.StringIO()
    cw = csv.writer(si)
    # Header
    cw.writerow(['Name', 'Email', 'Phone', 'Subject', 'Message', 'Status', 'Date Submitted', 'Admin Notes'])
    for row in inquiries:
        cw.writerow(list(row))

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=contact_inquiries_export.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/api/inquiries', methods=['POST'])
def api_add_inquiry():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone', '')
    subject = data.get('subject')
    message = data.get('message')

    if not name or not email or not subject or not message:
        return jsonify({"error": "Required inquiries fields missing"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO inquiries (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)",
        (name, email, phone, subject, message)
    )
    conn.commit()
    inquiry_id = cursor.lastrowid
    conn.close()

    # Sync to Google Sheets if configured
    sync_to_google_sheet({
        "form_type": "Consultation Inquiry",
        "name": name,
        "email": email,
        "subject_or_role": subject,
        "skills_or_resume": f"Phone: {phone}" if phone else "Not Provided",
        "message": message
    })

    return jsonify({"success": True, "id": inquiry_id})

@app.route('/api/inquiries/<int:inquiry_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_inquiry(inquiry_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM inquiries WHERE id = ?", (inquiry_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    data = request.get_json() or {}
    status = data.get('status')
    notes = data.get('notes')

    cursor.execute(
        "UPDATE inquiries SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?",
        (status, notes, inquiry_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- TESTIMONIALS API ---
@app.route('/api/testimonials', methods=['GET'])
def api_testimonials():
    conn = get_db()
    testimonials = [dict(row) for row in conn.execute("SELECT * FROM testimonials").fetchall()]
    conn.close()
    return jsonify(testimonials)

@app.route('/api/testimonials', methods=['POST'])
@login_required
def api_add_testimonial():
    data = request.get_json() or {}
    client_name = data.get('client_name')
    client_designation = data.get('client_designation')
    message = data.get('message')
    rating = data.get('rating', 5)
    image_url = data.get('image_url', '')
    is_ticker = data.get('is_ticker', 0)

    if not client_name or not client_designation or not message:
        return jsonify({"error": "Missing key testimonial fields"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO testimonials (client_name, client_designation, message, rating, image_url, is_ticker) VALUES (?, ?, ?, ?, ?, ?)",
        (client_name, client_designation, message, rating, image_url, is_ticker)
    )
    conn.commit()
    test_id = cursor.lastrowid
    conn.close()
    return jsonify({"success": True, "id": test_id})

@app.route('/api/testimonials/<int:test_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_testimonial(test_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM testimonials WHERE id = ?", (test_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    data = request.get_json() or {}
    client_name = data.get('client_name')
    client_designation = data.get('client_designation')
    message = data.get('message')
    rating = data.get('rating')
    image_url = data.get('image_url')
    is_ticker = data.get('is_ticker')

    cursor.execute(
        "UPDATE testimonials SET client_name = COALESCE(?, client_name), client_designation = COALESCE(?, client_designation), message = COALESCE(?, message), rating = COALESCE(?, rating), image_url = COALESCE(?, image_url), is_ticker = COALESCE(?, is_ticker) WHERE id = ?",
        (client_name, client_designation, message, rating, image_url, is_ticker, test_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- TEAM MEMBERS API ---
@app.route('/api/team', methods=['GET'])
def api_team():
    conn = get_db()
    team = [dict(row) for row in conn.execute("SELECT * FROM team_members").fetchall()]
    conn.close()
    return jsonify(team)

@app.route('/api/team', methods=['POST'])
@login_required
def api_add_team():
    data = request.get_json() or {}
    name = data.get('name')
    designation = data.get('designation')
    linkedin_url = data.get('linkedin_url', '')
    image_url = data.get('image_url')

    if not name or not designation or not image_url:
        return jsonify({"error": "Missing key team fields"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO team_members (name, designation, linkedin_url, image_url) VALUES (?, ?, ?, ?)",
        (name, designation, linkedin_url, image_url)
    )
    conn.commit()
    member_id = cursor.lastrowid
    conn.close()
    return jsonify({"success": True, "id": member_id})

@app.route('/api/team/<int:member_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_team(member_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM team_members WHERE id = ?", (member_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    data = request.get_json() or {}
    name = data.get('name')
    designation = data.get('designation')
    linkedin_url = data.get('linkedin_url')
    image_url = data.get('image_url')

    cursor.execute(
        "UPDATE team_members SET name = COALESCE(?, name), designation = COALESCE(?, designation), linkedin_url = COALESCE(?, linkedin_url), image_url = COALESCE(?, image_url) WHERE id = ?",
        (name, designation, linkedin_url, image_url, member_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- BLOGS API ---
@app.route('/api/blogs', methods=['GET'])
def api_blogs():
    conn = get_db()
    blogs = [dict(row) for row in conn.execute("SELECT * FROM blogs ORDER BY created_at DESC").fetchall()]
    conn.close()
    return jsonify(blogs)

@app.route('/api/blogs', methods=['POST'])
@login_required
def api_add_blog():
    data = request.get_json() or {}
    title = data.get('title')
    category = data.get('category')
    excerpt = data.get('excerpt')
    content = data.get('content')
    image_url = data.get('image_url')
    status = data.get('status', 'published')

    if not title or not category or not excerpt or not content or not image_url:
        return jsonify({"error": "Missing key blog fields"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO blogs (title, category, excerpt, content, image_url, status) VALUES (?, ?, ?, ?, ?, ?)",
        (title, category, excerpt, content, image_url, status)
    )
    conn.commit()
    blog_id = cursor.lastrowid
    conn.close()
    return jsonify({"success": True, "id": blog_id})

@app.route('/api/blogs/<int:blog_id>', methods=['PUT', 'DELETE'])
@login_required
def api_modify_blog(blog_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM blogs WHERE id = ?", (blog_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    data = request.get_json() or {}
    title = data.get('title')
    category = data.get('category')
    excerpt = data.get('excerpt')
    content = data.get('content')
    image_url = data.get('image_url')
    status = data.get('status')

    cursor.execute(
        "UPDATE blogs SET title = COALESCE(?, title), category = COALESCE(?, category), excerpt = COALESCE(?, excerpt), content = COALESCE(?, content), image_url = COALESCE(?, image_url), status = COALESCE(?, status) WHERE id = ?",
        (title, category, excerpt, content, image_url, status, blog_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- SETTINGS API ---
@app.route('/api/settings', methods=['GET'])
def api_get_settings():
    conn = get_db()
    settings_rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    settings_dict = {row['key']: row['value'] for row in settings_rows}
    return jsonify(settings_dict)

@app.route('/api/settings', methods=['PUT'])
@login_required
def api_update_settings():
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    for key, value in data.items():
        cursor.execute(
            "INSERT INTO settings (key, value) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, str(value))
        )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
