import collections
import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
import os

# Define color palette
BG_COLOR = RGBColor(30, 30, 36)        # Deep Charcoal (#1E1E24)
CARD_COLOR = RGBColor(42, 44, 53)      # Dark Slate Grey (#2A2C35)
TEXT_WHITE = RGBColor(255, 255, 255)  # Pure White (#FFFFFF)
TEXT_MUTED = RGBColor(180, 184, 196)  # Muted Slate (#B4B8C4)
ACCENT_CYAN = RGBColor(0, 242, 254)   # Bright Cyan (#00F2FE)
ACCENT_BLUE = RGBColor(79, 172, 254)  # Electric Blue (#4FACFE)

OUTPUT_FILE = '/home/iron/Desktop/INTERNSHIP PROJECT/assa-smart-fisheries-system 3/ASSA_Internship_Presentation.pptx'
SCREENSHOTS_DIR = '/home/iron/.gemini/antigravity-ide/brain/7b50ec06-136b-4c69-90aa-6bcf94bd0955'

def set_slide_background(slide, rgb_color):
    """Sets a solid color background on a slide."""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = rgb_color

def create_title(slide, text):
    """Creates a standardized slide title."""
    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.4), Inches(12.333), Inches(0.8))
    tf = title_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.name = 'Arial'
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    return title_box

def add_speaker_notes(slide, notes_text):
    """Adds speaker notes to a slide."""
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_text

def format_bullet_points(tf, points, start_size=15, muted=False):
    """Recursively formats a list of bullet points/dictionaries into a text frame."""
    for idx, pt in enumerate(points):
        if idx == 0 and len(tf.paragraphs) == 1 and tf.paragraphs[0].text == "":
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        
        p.space_after = Pt(6)
        if isinstance(pt, dict):
            # Nested bullets or key-value structures
            title = pt.get("title", "")
            desc = pt.get("desc", "")
            subpoints = pt.get("bullets", [])
            
            p.text = title
            p.font.name = 'Arial'
            p.font.size = Pt(start_size)
            p.font.bold = True
            p.font.color.rgb = ACCENT_CYAN if not muted else TEXT_MUTED
            
            if desc:
                p_desc = tf.add_paragraph()
                p_desc.text = "   " + desc
                p_desc.font.name = 'Arial'
                p_desc.font.size = Pt(start_size - 1)
                p_desc.font.color.rgb = TEXT_WHITE
                p_desc.space_after = Pt(6)
                
            if subpoints:
                for sub in subpoints:
                    p_sub = tf.add_paragraph()
                    p_sub.text = "     • " + sub
                    p_sub.font.name = 'Arial'
                    p_sub.font.size = Pt(start_size - 2)
                    p_sub.font.color.rgb = TEXT_MUTED
                    p_sub.space_after = Pt(4)
        else:
            p.text = "• " + str(pt)
            p.font.name = 'Arial'
            p.font.size = Pt(start_size)
            p.font.color.rgb = TEXT_WHITE

def main():
    prs = Presentation()
    # Set slide dimensions to widescreen (16:9)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6] # Blank layout

    # ==========================================
    # SLIDE 1: Title Slide
    # ==========================================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, BG_COLOR)
    
    # Large centered text frame
    title_box = slide1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.333), Inches(4.0))
    tf = title_box.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "ASSA SYSTEM"
    p.alignment = PP_ALIGN.CENTER
    p.font.name = 'Arial'
    p.font.size = Pt(56)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    
    p2 = tf.add_paragraph()
    p2.text = "Smart Fisheries Monitoring & Digital Fish Market System"
    p2.alignment = PP_ALIGN.CENTER
    p2.font.name = 'Arial'
    p2.font.size = Pt(22)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(14)
    
    p3 = tf.add_paragraph()
    p3.text = "A Unified Relational Platform for Resource Enforcement and Digital Fish Commerce"
    p3.alignment = PP_ALIGN.CENTER
    p3.font.name = 'Arial'
    p3.font.size = Pt(14)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(8)

    p4 = tf.add_paragraph()
    p4.text = "\nSoftware Engineering Internship Presentation\nPresenter: Software Engineering Intern\nScope: Lake Tana, Lake Ziway, and Lake Hawassa, Ethiopia"
    p4.alignment = PP_ALIGN.CENTER
    p4.font.name = 'Arial'
    p4.font.size = Pt(13)
    p4.font.color.rgb = ACCENT_BLUE
    p4.space_before = Pt(28)

    add_speaker_notes(slide1, (
        "Good morning, members of the jury and supervisors. Today, I am presenting my internship project, ASSA. "
        "ASSA is an integrated, three-module software ecosystem built to automate ecological regulation, fleet tracking, "
        "and seafood trading across three of Ethiopia's primary lakes. During my time, I focused on bringing "
        "production-grade security, database reliability, geospatial check validations, and real-time monitoring streams into "
        "this platform. Today, I will walk you through the architecture, the technical decisions behind it, my specific "
        "contributions, and the real-world engineering challenges I addressed."
    ))

    # ==========================================
    # SLIDE 2: Project & Context Overview (Split Text + Screenshot)
    # ==========================================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2, BG_COLOR)
    create_title(slide2, "Project & Context Overview")
    
    # Left Text Frame
    tb = slide2.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(6.0), Inches(5.5))
    tf2 = tb.text_frame
    tf2.word_wrap = True
    
    overview_bullets = [
        {"title": "Unified Operations Scope", "desc": "Coordinating commercial and regulatory monitoring across Lake Tana, Lake Ziway, and Lake Hawassa in Ethiopia."},
        {"title": "Admin Command Center (Port 3001)", "desc": "Central dashboard displaying live telemetry, catches, market metrics, zone rules configuration, and user onboarding."},
        {"title": "Fisher Mobile App (Port 3002)", "desc": "Mobile-first portal for fishers to activate boat trips, log catches with GPS markers, and display license QR keys."},
        {"title": "Digital Fish Market (Port 3003)", "desc": "E-commerce marketplace display showing species listings, price trends, and order bookings."},
        {"title": "Modular Express Backend (Port 4000)", "desc": "REST API and in-memory Server-Sent Events (SSE) broadcaster connecting to a relational datastore."}
    ]
    format_bullet_points(tf2, overview_bullets, 13)

    # Right Screenshot
    screenshot1 = os.path.join(SCREENSHOTS_DIR, "login_ui.png")
    if os.path.exists(screenshot1):
        slide2.shapes.add_picture(screenshot1, Inches(6.8), Inches(1.8), Inches(6.0), Inches(4.2))

    add_speaker_notes(slide2, (
        "Let's begin with the overall context. The ASSA system consists of three frontend React modules communicating with "
        "a central Express API backend. The Admin Dashboard acts as the Command Center for government supervisors. "
        "The Fisher Mobile App acts as the field registration portal for fishers on the lake. The Fish Market acts as a "
        "transparent, buyer-facing retail system. This architecture ensures that every single stakeholder in the "
        "fisheries ecosystem—from the local fisher on a boat to the regional administrator in Bahir Dar—shares a "
        "single source of truth in real-time."
    ))

    # ==========================================
    # SLIDE 3: Problem Statement (Horizontal Cards)
    # ==========================================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3, CARD_COLOR)
    create_title(slide3, "Problem Statement")

    tb = slide3.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(12.333), Inches(5.2))
    tf3 = tb.text_frame
    tf3.word_wrap = True

    problems = [
        {"title": "1. Ecological Depletion Risks", "desc": "Lack of real-time monitoring on species take. Regulatory bodies previously had zero visibility into aggregate monthly limits, risking overfishing of key endemic species."},
        {"title": "2. Enforcement Blindspots", "desc": "Inspectors had no automated means to check if catches were logged in allowed fishing zones or illegally hauled inside protected breeding and ecotourism grounds."},
        {"title": "3. Commercial Friction & Price Opacity", "desc": "Fishers faced highly volatile prices and lacked direct market access, causing delay and inventory loss for their highly perishable catches."},
        {"title": "4. Prototype Database & Tracing limits", "desc": "Early application iterations suffered from SQLite write-locking bottlenecks under high-concurrency loads and lacked trace request correlation for operational debugging."}
    ]
    format_bullet_points(tf3, problems, 14)

    add_speaker_notes(slide3, (
        "The project addresses four primary problems. First, is ecological overfishing. Without direct catch-limits monitoring, "
        "regulatory bodies cannot enforce species quotas effectively. Second, are enforcement blindspots. Inspectors could "
        "not verify if a vessel logged its catches from allowed or prohibited breeding zones. Third, is market friction. "
        "Fishers lack transparent market access, causing delay and loss of fresh inventory. Fourth, from a systems engineering "
        "perspective, early prototypes suffered from database locking, session vulnerability, and lacked logging correlation."
    ))

    # ==========================================
    # SLIDE 4: System Objectives (2x2 Grid)
    # ==========================================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4, BG_COLOR)
    create_title(slide4, "System Objectives")

    # Left Column
    tb_left = slide4.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(6.0), Inches(5.0))
    tf_left = tb_left.text_frame
    tf_left.word_wrap = True
    left_objectives = [
        {"title": "Automate Telemetry & Tracking", "desc": "Log active boat trips and accumulate continuous coordinate coordinates to trace vessel paths on interactive maps."},
        {"title": "Geospatial Boundary Verification", "desc": "Implement mathematical polygon checks on incoming catch submissions to enforce protected zones automatically."}
    ]
    format_bullet_points(tf_left, left_objectives, 14)

    # Right Column
    tb_right = slide4.shapes.add_textbox(Inches(6.8), Inches(1.5), Inches(6.0), Inches(5.0))
    tf_right = tb_right.text_frame
    tf_right.word_wrap = True
    right_objectives = [
        {"title": "Enforce Active Species Quotas", "desc": "Halt catches approval at the application level inside database write transactions if monthly limits are breached."},
        {"title": "Production Hardening", "desc": "Deploy request trace correlation, session capping, failed login lockouts, and deep detailed diagnostic heartbeats."}
    ]
    format_bullet_points(tf_right, right_objectives, 14)

    add_speaker_notes(slide4, (
        "Based on the problem statement, our architectural objectives were clear. We aimed to: build automated "
        "fleet telemetry to monitor boats during active trips; develop geospatial validation to verify that catches "
        "are logged in allowed coordinates; enforce species limits at the application level to prevent ecological depletion; "
        "and secure the entire codebase with correlation log tracing, rate-limit boundaries, and comprehensive "
        "uptime diagnostics."
    ))

    # ==========================================
    # SLIDE 5: Tech Stack & System Layers (Layered Grid)
    # ==========================================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5, BG_COLOR)
    create_title(slide5, "Tech Stack & System Layers")

    tb = slide5.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(12.333), Inches(5.5))
    tf5 = tb.text_frame
    tf5.word_wrap = True

    layers = [
        {"title": "1. UI Presentation Layer", "desc": "React.js Single Page Applications built on Vite for rapid compilation. Styled with custom modular CSS and Leaflet maps layers.", "bullets": ["Leaflet & OpenStreetMap for telemetry", "i18n Amharic + English localizations"]},
        {"title": "2. Web Server & Connection Layer", "desc": "Node.js and Express.js backend handling REST JSON communications and persistent SSE (Server-Sent Events) unidirectional data pipelines.", "bullets": ["Pino-HTTP correlation requests tracing", "Helmet production security headers"]},
        {"title": "3. Business Service & Security Layer", "desc": "Independent service modules managing cryptographic locks, mathematical coordinates checks, and schema transactions.", "bullets": ["Bcryptjs with 12 salt rounds", "HS256 access JWT + SHA-256 rotated refresh tokens"]},
        {"title": "4. Relational Database Tier", "desc": "PostgreSQL database accessed exclusively through the type-safe Prisma ORM Client, utilizing connection poolers and Cloudinary media buckets.", "bullets": ["Neon/Render serverless PostgreSQL", "Prisma Client atomic transactions"]}
    ]
    format_bullet_points(tf5, layers, 11)

    add_speaker_notes(slide5, (
        "The tech stack was selected for modularity and modern production standards. On the frontend, we use React.js "
        "built with Vite for quick, optimized bundles, alongside Leaflet for command map rendering. The backend "
        "runs on Node.js and Express.js, utilizing a PostgreSQL database connected through the Prisma ORM Client. "
        "Security is handled by Bcryptjs, jsonwebtoken, and express-rate-limit. For media assets, such as physical "
        "catch pictures, we integrate the Cloudinary API with local disk uploads as a safe fallback."
    ))

    # ==========================================
    # SLIDE 6: System Data Flow (Split Text + Screenshot)
    # ==========================================
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide6, BG_COLOR)
    create_title(slide6, "System Data Flow Architecture")

    tb = slide6.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(6.0), Inches(5.5))
    tf6 = tb.text_frame
    tf6.word_wrap = True

    flow = [
        {"title": "Step 1: Active Trip Activation", "desc": "Fisher registers and activates a boat trip, launching telemetry trackers."},
        {"title": "Step 2: Catch logging & Coordinates verification", "desc": "Fisher submits catch weight, species, and gear. Lat/Lng checked by server before setting status to 'PENDING'."},
        {"title": "Step 3: Administrative transaction review", "desc": "Admin audits details. System runs species quota verification; if allowed, catch is updated to 'VERIFIED' in a single transaction."},
        {"title": "Step 4: Real-time listings publishing", "desc": "Listing is automatically generated. The server broadcasts a 'listing.created' payload instantly to buyers via SSE."},
        {"title": "Step 5: E-commerce order checkout", "desc": "Buyer logs in, places order, decrements listing quantity available, and triggers audit log tracking."}
    ]
    format_bullet_points(tf6, flow, 11)

    screenshot2 = os.path.join(SCREENSHOTS_DIR, "command_center_home.png")
    if os.path.exists(screenshot2):
        slide6.shapes.add_picture(screenshot2, Inches(6.8), Inches(1.6), Inches(6.0), Inches(4.5))

    add_speaker_notes(slide6, (
        "This slide illustrates the primary data flow architecture—what we call the 'Catch Lifecycle'. It begins when a fisher "
        "initiates a trip. GPS coordinates are logged. Once the catch is captured and logged, the backend evaluates the "
        "coordinates in real-time. If clean, it sits as 'PENDING' in the admin's queue. When approved, a database transaction "
        "validates the quota, updates the status to 'VERIFIED', creates a marketplace listing, and broadcasts a lightweight "
        "Server-Sent Event to all active buyer clients immediately."
    ))

    # ==========================================
    # SLIDE 7: Geospatial Enforcement (Split Text + Screenshot)
    # ==========================================
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide7, BG_COLOR)
    create_title(slide7, "Geospatial Compliance Verification")

    tb = slide7.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(6.0), Inches(5.5))
    tf7 = tb.text_frame
    tf7.word_wrap = True

    geo = [
        {"title": "Ray-Casting Point-in-Polygon Check", "desc": "Verifies if the submitted device GPS coordinates fall inside designated allowed, restricted, or prohibited zone boundary polygons."},
        {"title": "Haversine Trigonometric Fallback", "desc": "If polygon vectors are absent, checks distance to center coordinates:\n  d = 2R * arcsin( sqrt( sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlng/2) ) )"},
        {"title": "Mismatch & Violation Thresholds", "desc": "Deviations >3 km trigger a 'GPS_MISMATCH' alert. Catch coordinates logged inside restricted or prohibited zones spawn immediate system alarms."}
    ]
    format_bullet_points(tf7, geo, 12)

    screenshot3 = os.path.join(SCREENSHOTS_DIR, "geospatial_map.png")
    if os.path.exists(screenshot3):
        slide7.shapes.add_picture(screenshot3, Inches(6.8), Inches(1.6), Inches(6.0), Inches(4.5))

    add_speaker_notes(slide7, (
        "A core technical component of the system is our geospatial compliance verification, located in `geo.service.js`. "
        "When a fisher submits a catch, the backend retrieves the zone coordinates. If a polygon is stored in the database, "
        "it applies a ray-casting Point-in-Polygon check. If the coordinates fall outside, or if a polygon is missing and "
        "the coordinate deviates more than 3 km from the zone center using the Haversine formula, the catch is flagged "
        "with a GPS mismatch warning, notifying inspectors of potential illegal boundary violations."
    ))

    # ==========================================
    # SLIDE 8: Quota & Closed Seasons (Split Text + Screenshot)
    # ==========================================
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide8, BG_COLOR)
    create_title(slide8, "Quota Preservation & Closed Seasons")

    tb = slide8.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(6.0), Inches(5.5))
    tf8 = tb.text_frame
    tf8.word_wrap = True

    quota = [
        {"title": "ACID transactional limits checking", "desc": "Catches approvals are blocked ('HTTP 409 Conflict') before database commits if aggregate monthly species limit is breached."},
        {"title": "Automated species warnings", "desc": "Emits warnings and broadcasts events once catch weight reaches 90% of the species monthly limit."},
        {"title": "Ecological closed-seasons rules", "desc": "Dynamic zone season rules block approvals of protected species during spawning calendar ranges (e.g. Mecha closed zone rules)."}
    ]
    format_bullet_points(tf8, quota, 13)

    screenshot4 = os.path.join(SCREENSHOTS_DIR, "quota_approval.png")
    if os.path.exists(screenshot4):
        slide8.shapes.add_picture(screenshot4, Inches(6.8), Inches(1.6), Inches(6.0), Inches(4.5))

    add_speaker_notes(slide8, (
        "To prevent ecological collapse, I implemented application-level quota enforcement. When an admin attempts to "
        "approve a catch, the backend runs a projected weight check inside a database write transaction. If approving the "
        "catch exceeds the monthly quota limit, the API rejects the request with an HTTP 409 Conflict. Uptime safeguards also "
        "trigger warning alerts when a species' take reaches 90%, and lock out further approvals when it hits 100%."
    ))

    # ==========================================
    # SLIDE 9: My Contributions (Split Text + Screenshot)
    # ==========================================
    slide9 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide9, BG_COLOR)
    create_title(slide9, "My Personal Contributions")

    tb = slide9.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(6.0), Inches(5.5))
    tf9 = tb.text_frame
    tf9.word_wrap = True

    contributions = [
        {"title": "Relational PostgreSQL Schema Migration", "desc": "Designed, mapped, and executed complete migrations from SQLite to PostgreSQL database tables via Prisma ORM."},
        {"title": "Token Rotation & Lockout Security", "desc": "Coded HS256 JWT access controls and SHA-256 hashed refresh-token rotations, enforcing a cap of 5 active sessions per user and failed attempt lockouts."},
        {"title": "Mathematical Geospatial Engine", "desc": "Developed Point-in-Polygon calculations and Haversine center checking in 'geo.service.js' to identify border mismatch warnings."},
        {"title": "Diagnostics endpoint implementation", "desc": "Wrote '/api/health/detailed' assessing memory footprint, host uptime, server storage directories, and database pings."}
    ]
    format_bullet_points(tf9, contributions, 11)

    screenshot5 = os.path.join(SCREENSHOTS_DIR, "detailed_health.png")
    if os.path.exists(screenshot5):
        slide9.shapes.add_picture(screenshot5, Inches(6.8), Inches(1.8), Inches(6.0), Inches(3.8))

    add_speaker_notes(slide9, (
        "Here, I have summarized my specific contributions. I designed the PostgreSQL relational schema and handled "
        "migrations using Prisma ORM. I implemented the Refresh Token Rotation security pipeline, including brute-force login "
        "lockout guards. I coded the math behind the geospatial validation engine in `geo.service.js`. I engineered the ACID "
        "database transaction blocks that ensure quota check integrity, and I wrote the deep diagnostic health checks that "
        "allow operations teams to monitor memory and databases in real-time."
    ))

    # ==========================================
    # SLIDE 10: Technical Challenges Faced (Vertical timeline list)
    # ==========================================
    slide10 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide10, CARD_COLOR)
    create_title(slide10, "Technical Challenges Faced")

    tb = slide10.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(12.333), Inches(5.2))
    tf10 = tb.text_frame
    tf10.word_wrap = True

    challenges = [
        {"title": "1. Concurrency bottlenecks on SQLite", "desc": "During live concurrent testing with automated seed inputs, SQLite's single-write locks caused API transaction failures and timeout errors."},
        {"title": "2. Unbounded Session token storage footprint", "desc": "Issuing a refresh token on every login created storage bloat risks over time, calling for a secure session-cap limit."},
        {"title": "3. Unstable SSE connection streams", "desc": "Fishers operating in remote Rift Valley regions faced frequent network drops, triggering client connection resets and missing real-time event alerts."},
        {"title": "4. High GIS Database Overhead", "desc": "Setting up complete PostGIS extensions was heavy and complex for localized lake boundary validation, demanding lightweight computational math."}
    ]
    format_bullet_points(tf10, challenges, 13)

    add_speaker_notes(slide10, (
        "During development, I faced several key engineering challenges. First, our initial SQLite engine suffered from "
        "concurrency limits during high-volume testing. Second, issuing infinite refresh tokens created database storage bloat "
        "risks. Third, unstable network connections on Rift Valley lakes caused persistent SSE stream drops. Finally, we "
        "needed a lightweight method to check coordinate polygons without relying on high-overhead geospatial GIS database "
        "extensions."
    ))

    # ==========================================
    # SLIDE 11: Solutions Implemented (Grid)
    # ==========================================
    slide11 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide11, BG_COLOR)
    create_title(slide11, "Solutions Implemented")

    tb = slide11.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(12.333), Inches(5.2))
    tf11 = tb.text_frame
    tf11.word_wrap = True

    solutions = [
        {"title": " ACID-compliant PostgreSQL via Prisma", "desc": "Migrated backend database services to PostgreSQL utilizing Prisma Client connection poolers and transactional write isolations to resolve concurrent timeouts."},
        {"title": " Token session capping & lockout rules", "desc": "Seeded a strict threshold of 5 active sessions per user; newer logins revoke oldest tokens. Lockouts trigger for 15 minutes after 5 failed login attempts."},
        {"title": " Self-healing 'Last-Event-ID' stream recovery", "desc": "Configured SSE stream clients to send a connection header query containing their last processed event ID. Upon reconnection, server queries the database and restream only missed events chronologically."},
        {"title": " Runtime Point-in-Polygon check computations", "desc": "Coded Ray-Casting algorithm directly inside the Node runtime context ('geo.service.js'), allowing lightweight zone validation without PostGIS database dependencies."}
    ]
    format_bullet_points(tf11, solutions, 13)

    add_speaker_notes(slide11, (
        "To resolve these issues, we took four actions. We migrated to PostgreSQL using Prisma Client database transactions. "
        "We capped active refresh tokens to 5 per user to limit DB footprint, revoking the oldest ones upon a new login. "
        "We resolved SSE network drops by building a self-healing replay registry: if a client reconnects, it sends the last "
        "event ID, and the server restreams only the missed events. Finally, we wrote our own point-in-polygon math, "
        "eliminating the need for expensive GIS database extensions."
    ))

    # ==========================================
    # SLIDE 12: Demonstration Workflow (Multiple Screenshots Montage)
    # ==========================================
    slide12 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide12, BG_COLOR)
    create_title(slide12, "Demonstration Workflow")

    # Workflow description on the left
    tb = slide12.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(4.5), Inches(5.5))
    tf12 = tb.text_frame
    tf12.word_wrap = True
    wf_bullets = [
        {"title": "1. secure Mobile Login", "desc": "Fisher logs into mobile application using VALID license parameters."},
        {"title": "2. Boat trip activation", "desc": "Active trip is started on the vessel, initiating coordinates loggers."},
        {"title": "3. Catch registration", "desc": "Submit Tilapia catch from Gorgora Allowed zone; Lng/Lat validated."},
        {"title": "4. Central Audit & Market", "desc": "Admin approves catches; digital marketplace listing updates instantly."}
    ]
    format_bullet_points(tf12, wf_bullets, 11)

    # Screenshots montage on the right
    scr_w, scr_h = Inches(1.8), Inches(3.9)
    y_offset = Inches(1.8)

    scr_login = os.path.join(SCREENSHOTS_DIR, "fisher_login.png")
    if os.path.exists(scr_login):
        slide12.shapes.add_picture(scr_login, Inches(5.3), y_offset, scr_w, scr_h)

    scr_home = os.path.join(SCREENSHOTS_DIR, "fisher_app_home.png")
    if os.path.exists(scr_home):
        slide12.shapes.add_picture(scr_home, Inches(7.3), y_offset, scr_w, scr_h)

    scr_log = os.path.join(SCREENSHOTS_DIR, "fisher_catch_logging.png")
    if os.path.exists(scr_log):
        slide12.shapes.add_picture(scr_log, Inches(9.3), y_offset, scr_w, scr_h)

    scr_mkt = os.path.join(SCREENSHOTS_DIR, "marketplace_listings.png")
    if os.path.exists(scr_mkt):
        slide12.shapes.add_picture(scr_mkt, Inches(11.3), Inches(2.2), Inches(1.8), Inches(3.1))

    add_speaker_notes(slide12, (
        "This slide outlines our standard demonstration workflow. We log in as the fisher to start a trip and log a catch. "
        "Instantly, the admin command center alerts update via SSE. The admin reviews the catch, verifies that coordinates "
        "match Gorgora allowed zones, and clicks approve. The catch is immediately listed in the marketplace, where a buyer "
        "completes an order, triggering the quota deductions and updating our audit trail."
    ))

    # ==========================================
    # SLIDE 13: Technical Lessons Learned (Key Centered Blocks)
    # ==========================================
    slide13 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide13, BG_COLOR)
    create_title(slide13, "Technical Lessons Learned")

    tb = slide13.shapes.add_textbox(Inches(1.0), Inches(1.5), Inches(11.333), Inches(5.0))
    tf13 = tb.text_frame
    tf13.word_wrap = True

    lessons = [
        {"title": " Database Concurrency & ACID transaction isolations", "desc": "Discovered the necessity of absolute write isolation when coordinating multi-row quota balances and listing states simultaneously."},
        {"title": " Stateful Connections Management over SSE pipelines", "desc": "Learned the performance and architectural trade-offs between full duplex WebSockets and lightweight, unidirectional Server-Sent Events (SSE)."},
        {"title": " Translating Mathematical models into Server code", "desc": "Implemented geometry polygon containment checks directly inside standard server modules, keeping runtime lightweight."},
        {"title": " session limits & hashing best practices", "desc": "Engineered strict refresh token session caps to prevent unmanaged database growths while protecting sessions using secure SHA-256 hashes."}
    ]
    format_bullet_points(tf13, lessons, 14)

    add_speaker_notes(slide13, (
        "Through this project, I gained invaluable software engineering experience. I learned the critical importance of ACID "
        "database transactions when coordinating multiple related writes. I developed a deep appreciation for stateful connection "
        "management over unidirectional SSE pipelines, and I learned to write lightweight mathematical engines directly in the "
        "server runtime to minimize database overhead."
    ))

    # ==========================================
    # SLIDE 14: System Limitations & Future Work (Split Text + Screenshot)
    # ==========================================
    slide14 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide14, BG_COLOR)
    create_title(slide14, "System Limitations & Future Work")

    tb = slide14.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(6.0), Inches(5.5))
    tf14 = tb.text_frame
    tf14.word_wrap = True

    limits = [
        {"title": "Current Limitations (Transparent & Honest)", "desc": "  - In-Memory SSE Registry: Active sockets list runs in-memory; horizontal scaling requires Redis.\n  - Network-Dependent Submissions: Catch logs require active cellular network connections to complete.\n  - In-App Alerts Scope: Quota and mismatch warnings are in-app only, lacking external SMS gateways."},
        {"title": "Future Roadmap & Enhancements", "desc": "  - Redis Pub/Sub integration to support multi-instance horizontal scaling.\n  - SQLite offline caching database on the fisher device to support offline synchronization.\n  - Twilio or cellular SMS gateways integration to push alerts directly to inspectors."}
    ]
    format_bullet_points(tf14, limits, 12)

    screenshot6 = os.path.join(SCREENSHOTS_DIR, "fleet_telemetry.png")
    if os.path.exists(screenshot6):
        slide14.shapes.add_picture(screenshot6, Inches(6.8), Inches(1.6), Inches(6.0), Inches(4.5))

    add_speaker_notes(slide14, (
        "In the spirit of engineering transparency, I want to highlight the current system limitations. First, our SSE "
        "client registry runs in-memory on a single node instance; horizontal scaling across multiple instances would require "
        "migrating to a Redis Pub/Sub cluster. Second, fishers currently require network access to submit catches. In the "
        "future, I plan to integrate local SQLite buffering on the device for offline sync. Finally, alerts are currently "
        "in-app only, and integrating an SMS gateway is a logical next step."
    ))

    # ==========================================
    # SLIDE 15: Conclusion & Q&A
    # ==========================================
    slide15 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide15, BG_COLOR)
    
    tb = slide15.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(11.333), Inches(3.5))
    tf15 = tb.text_frame
    tf15.word_wrap = True
    
    p = tf15.paragraphs[0]
    p.text = "ASSA SYSTEM"
    p.alignment = PP_ALIGN.CENTER
    p.font.name = 'Arial'
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    
    p2 = tf15.add_paragraph()
    p2.text = "Unified Resource Preservation and Digital Fish Commerce"
    p2.alignment = PP_ALIGN.CENTER
    p2.font.name = 'Arial'
    p2.font.size = Pt(18)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(12)
    
    p3 = tf15.add_paragraph()
    p3.text = "\nThank you for your time. I am open to any questions."
    p3.alignment = PP_ALIGN.CENTER
    p3.font.name = 'Arial'
    p3.font.size = Pt(20)
    p3.font.bold = True
    p3.font.color.rgb = ACCENT_BLUE
    p3.space_before = Pt(24)

    add_speaker_notes(slide15, (
        "In conclusion, the ASSA system successfully demonstrates how modern web technologies can automate resource "
        "enforcement, secure transactional pipelines, and provide transparent commerce for Rift Valley fisheries. "
        "I would like to thank my supervisors and instructors for their guidance throughout this internship. "
        "I am now open to any questions you may have about the architecture or implementation details of the project."
    ))

    # Save presentation
    prs.save(OUTPUT_FILE)
    print(f"🎉 Presentation saved successfully to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
