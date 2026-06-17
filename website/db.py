import os
import sqlite3
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()

DB_DIR = os.path.join(os.path.dirname(__file__), 'database')
DB_PATH = os.path.join(DB_DIR, 'db.sqlite')

def init_db():
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create Tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        experience TEXT NOT NULL,
        skills TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS applicants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        skills TEXT NOT NULL,
        resume_url TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'New',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE SET NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_designation TEXT NOT NULL,
        message TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        image_url TEXT,
        is_ticker INTEGER DEFAULT 0
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        linkedin_url TEXT,
        image_url TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT NOT NULL,
        status TEXT DEFAULT 'published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    ''')

    # Database initialized without default admin credentials for secure dynamic setup.

    # Seed Services
    cursor.execute("SELECT COUNT(*) FROM services")
    if cursor.fetchone()[0] == 0:
        services_data = [
            ("IT Services", "bi bi-cpu", "We deliver premium, enterprise-grade software architectures, customized app ecosystems, and robust cloud configurations that scale dynamically with your business needs.\n\nBespoke Software Dev: Custom backend architectures, React/Node integrations, and API engineering built for maximum throughput.\n\nCloud Architectures: AWS/Azure migration, container automation, and secure serverless computing pipelines.\n\nCybersecurity & Compliance: End-to-end vulnerability auditing, active threat detection systems, and strict data privacy compliance checks.\n\nAI & Machine Learning: Integrating generative AI architectures, predictive data pipelines, and automation bots into legacy systems."),
            ("IT Staffing", "bi bi-people", "We source, screen, and deploy elite technical talent globally. From project-based engineers to permanent C-level technology leaders, we accelerate your onboarding pipelines.\n\nContract Hiring: Rapid deployment of vetted technical experts for short-term and project-based scale-ups.\n\nPermanent Placement: Executive recruiting and full-time talent sourcing matching your corporate cultural and skill sets.\n\nRemote Tech Hubs: Setting up and operating dedicated, high-performance remote developer teams in tech centers globally.\n\nWorkforce Solutions: On-demand recruitment process outsourcing (RPO) and strategic HR talent analytics."),
            ("Healthcare Services", "bi bi-heart-pulse", "We integrate clinical operations, medical billing automation, telemedicine portals, and specialized medical staffing to support hospitals and private care facilities.\n\nMedical Staffing: Placing qualified nurses, clinical support agents, and healthcare experts on flexible schedules.\n\nTelemedicine portals: Building secure, HIPAA-compliant digital patient consulting apps and video integration platforms.\n\nEHR & Clinical Support: Modernizing Electronic Health Records architectures and setting up clinical helpdesks.\n\nMedical Billing & Coding: Fast, compliant claim processing algorithms and automated coding systems to maximize clinic ROI."),
            ("Digital Marketing", "bi bi-megaphone", "We scale your inbound pipeline using targeted B2B SEO authority optimization, high-converting Google Ads campaigns, and elite brand positioning strategies.\n\nSEO & SEM Growth: Organic search visibility, high-intent keywords targeting, and backlink authority campaigns.\n\nPPC & Paid Campaigns: Google Search/Display Ads, retargeting funnels, and optimized landing pages to lower cost-per-lead.\n\nBranding & Design: Formulating premium visual styles, taglines, corporate slide decks, and digital identity structures.\n\nLead Generation Funnels: B2B email copy marketing, CRM automation setup, and conversion rate optimization audits.")
        ]
        cursor.executemany("INSERT INTO services (name, icon, description) VALUES (?, ?, ?)", services_data)

    # Seed Team Members
    cursor.execute("SELECT COUNT(*) FROM team_members")
    if cursor.fetchone()[0] == 0:
        team_data = [
            ("Vijay Pogula", "Founder & CEO", "https://www.linkedin.com/in/vijju-pogula-a95b412ba", "vijay_pogula.jpg"),
            ("Nithin Mogulla", "Operations Manager", "https://www.linkedin.com/in/nithinmogulla1918", "nithin_mogulla.jpg")
        ]
        cursor.executemany("INSERT INTO team_members (name, designation, linkedin_url, image_url) VALUES (?, ?, ?, ?)", team_data)

    # Seed Blog Posts
    cursor.execute("SELECT COUNT(*) FROM blogs")
    if cursor.fetchone()[0] == 0:
        blogs_data = [
            ("Enterprise AI Integration: Strategies for Success", "tech", "Discover key frameworks for embedding AI models into legacy systems securely and scaling workflow throughput.", "Discover key frameworks for embedding AI models into legacy systems securely and scaling workflow throughput. Modern AI applications require robust data ingestion pipelines, careful model quantization for edge deployment, and fine-tuning parameters to align with specialized domain terminology.", "blog_ai.png", "published"),
            ("The Future of Remote Workforce Pipelines", "staffing", "Navigating talent retention, compliance, and onboarding dynamics in global remote technical recruitment.", "Navigating talent retention, compliance, and onboarding dynamics in global remote technical recruitment. As organizations pivot to distributed engineering structures, the key to success lies in automated continuous integration systems, cultural alignment workshops, and digital trust infrastructures.", "blog_remote.png", "published"),
            ("EHR Support and Regulatory Compliance", "healthcare", "Ensuring data accuracy and continuous operational support within modern clinical and hospital databases.", "Ensuring data accuracy and continuous operational support within modern clinical and hospital databases. Electronic Health Records (EHR) demand strict adherence to HIPAA standards, reliable daily backup intervals, and user access authorization auditing protocols.", "blog_compliance.png", "published")
        ]
        cursor.executemany("INSERT INTO blogs (title, category, excerpt, content, image_url, status) VALUES (?, ?, ?, ?, ?, ?)", blogs_data)

    # Seed Testimonials
    cursor.execute("SELECT COUNT(*) FROM testimonials")
    if cursor.fetchone()[0] == 0:
        testimonials_data = [
            # Main Testimonials
            ("Director of Enterprise Architecture", "Global Supply Logistics", "Kakatiya InnovateX Technologies revolutionized our legacy logistics stack. Their cloud migration and software development team worked around the clock to deliver a seamless architecture.", 5, "", 0),
            ("VP of Engineering", "FinTech Pioneers Group", "Their IT staffing service is peerless. We secured five top-tier React & Node.js engineers in record time, accelerating our platform deployment roadmap significantly.", 5, "", 0),
            # Ticker Testimonials
            ("CTO", "HealthCare Solutions Inc", "Exceptional delivery quality and high technical competence.", 5, "", 1),
            ("Director", "EduGlobal Hub", "Their SEO & digital marketing strategy tripled our organic web inbound.", 5, "", 1),
            ("HR Head", "RetailForce Corp", "Remarkable speed in hiring executive tech profiles globally.", 5, "", 1)
        ]
        cursor.executemany("INSERT INTO testimonials (client_name, client_designation, message, rating, image_url, is_ticker) VALUES (?, ?, ?, ?, ?, ?)", testimonials_data)

    # Seed Settings
    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        settings_data = [
            ("company_name", "Kakatiya InnovateX Technologies"),
            ("phone", "+91 63050 34803"),
            ("email", "info@kakatiyainnovatextechnologies.com"),
            ("hr_email", "hr.support@kakatiyainnovatextechnologies.com"),
            ("address", "Warangal, Telangana, India / Remote"),
            ("linkedin", "https://www.linkedin.com/company/kakatiya-innovatex-solutions/"),
            ("instagram", "https://www.instagram.com/kakatiya_innovatextechnologies?igsh=MTZoMDdmZ3l0ZWN3Nw=="),
            ("twitter", "https://twitter.com"),
            ("footer_text", "© 2026 Kakatiya InnovateX Technologies. All Rights Reserved. Tagline: Innovate • Integrate • Elevate")
        ]
        cursor.executemany("INSERT INTO settings (key, value) VALUES (?, ?)", settings_data)

    conn.commit()
    conn.close()
    print("Database initialized and seeded successfully.")

if __name__ == '__main__':
    init_db()
