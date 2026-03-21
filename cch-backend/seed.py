"""Seed script — populates the CCH database with comprehensive demo data.

Source of truth: PHASE_1 Seed Data Spec, core.md §8.1, §14
Run: cd cch-backend && python seed.py
"""
import sys
import os
import random
import math
from uuid import uuid4
from datetime import datetime, date, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.database import engine, SessionLocal, Base
from app.models.tables import (
    User, Request, Location, MaterialsCatalog, ServiceAreaZip, NotificationLog,
)
from app.auth import hash_password


def uid():
    return str(uuid4())


# ═══════════════════════════════════════════════════════════════
#  Helper functions
# ═══════════════════════════════════════════════════════════════

def haversine(lat1, lon1, lat2, lon2):
    """Distance in miles between two lat/lng points."""
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def find_nearest_location(lat, lng, locations):
    """Return the location dict nearest to the given lat/lng."""
    return min(locations, key=lambda loc: haversine(lat, lng, loc["lat"], loc["lng"]))


def mock_priority(days_out, attendees, fulfillment):
    """Generate a believable priority score 0–100. core.md §7.1"""
    score = 0
    # Time urgency (35%)
    if days_out <= 0:
        score += 35
    elif days_out < 7:
        score += 30
    elif days_out < 14:
        score += 22
    elif days_out < 30:
        score += 15
    else:
        score += 8
    # Attendance (20%)
    att = attendees or 50
    if att >= 500:
        score += 20
    elif att >= 200:
        score += 15
    elif att >= 50:
        score += 10
    else:
        score += 5
    # Fulfillment complexity (10%)
    if fulfillment == "staff":
        score += 10
    elif fulfillment == "mail":
        score += 5
    else:
        score += 3
    # Equity + history + flags randomized (35%)
    score += random.randint(5, 30)
    return min(score, 100)


# ═══════════════════════════════════════════════════════════════
#  Static data — core.md §14.3, PHASE_1 Seed Data Spec
# ═══════════════════════════════════════════════════════════════

LOCATIONS_DATA = [
    {"name": "CCH Salt Lake City", "address": "123 State Street",
     "city": "Salt Lake City", "zip_code": "84101",
     "lat": 40.7608, "lng": -111.8910,
     "service_radius_miles": 30.0,
     "phone": "801-555-0101", "on_duty_admin_phone": "801-555-0100"},
    {"name": "CCH Provo", "address": "456 University Avenue",
     "city": "Provo", "zip_code": "84601",
     "lat": 40.2338, "lng": -111.6585,
     "service_radius_miles": 25.0,
     "phone": "801-555-0201", "on_duty_admin_phone": "801-555-0200"},
    {"name": "CCH Ogden", "address": "789 Washington Boulevard",
     "city": "Ogden", "zip_code": "84401",
     "lat": 41.2230, "lng": -111.9738,
     "service_radius_miles": 20.0,
     "phone": "801-555-0301", "on_duty_admin_phone": "801-555-0300"},
    {"name": "CCH St. George", "address": "321 Main Street",
     "city": "St. George", "zip_code": "84770",
     "lat": 37.0965, "lng": -113.5684,
     "service_radius_miles": 35.0,
     "phone": "435-555-0401", "on_duty_admin_phone": "435-555-0400"},
    {"name": "CCH Logan", "address": "654 Center Street",
     "city": "Logan", "zip_code": "84321",
     "lat": 41.7370, "lng": -111.8338,
     "service_radius_miles": 25.0,
     "phone": "435-555-0501", "on_duty_admin_phone": "435-555-0500"},
    {"name": "CCH Park City", "address": "987 Main Street",
     "city": "Park City", "zip_code": "84060",
     "lat": 40.6461, "lng": -111.4980,
     "service_radius_miles": 15.0,
     "phone": "435-555-0601", "on_duty_admin_phone": "435-555-0600"},
    {"name": "CCH Cedar City", "address": "147 Center Street",
     "city": "Cedar City", "zip_code": "84720",
     "lat": 37.6775, "lng": -113.0619,
     "service_radius_miles": 30.0,
     "phone": "435-555-0701", "on_duty_admin_phone": "435-555-0700"},
]

MATERIALS_DATA = [
    # Health Education (5)
    {"name": "Nutrition Guide Kit", "category": "Health Education",
     "description": "Comprehensive nutrition education materials including food group charts, meal planning guides, and healthy recipe cards."},
    {"name": "Oral Health Toolkit", "category": "Health Education",
     "description": "Dental hygiene education set with brushing guides, flossing demonstrations, and tooth decay prevention materials."},
    {"name": "Mental Health Awareness Pack", "category": "Health Education",
     "description": "Mental health awareness resources including stress management guides, mindfulness exercises, and resource directories."},
    {"name": "Physical Activity Program", "category": "Health Education",
     "description": "Physical activity and exercise program materials with activity cards, fitness tracking sheets, and movement games."},
    {"name": "Substance Prevention Materials", "category": "Health Education",
     "description": "Age-appropriate substance abuse prevention curriculum including discussion guides and informational pamphlets."},
    # Behavioral Tools (5)
    {"name": "Positive Reinforcement Cards", "category": "Behavioral Tools",
     "description": "Reward and recognition card system for positive behavior reinforcement in classroom and community settings."},
    {"name": "Emotion Regulation Toolkit", "category": "Behavioral Tools",
     "description": "Tools for teaching emotional regulation including feeling wheels, coping strategy cards, and calm-down techniques."},
    {"name": "Social Skills Board Game", "category": "Behavioral Tools",
     "description": "Interactive board game designed to teach social skills, empathy, and cooperative behavior through play."},
    {"name": "Mindfulness Activity Set", "category": "Behavioral Tools",
     "description": "Guided mindfulness activities for children including breathing exercises, body scan scripts, and meditation guides."},
    {"name": "Conflict Resolution Guide", "category": "Behavioral Tools",
     "description": "Step-by-step conflict resolution framework with role-playing scenarios and de-escalation techniques."},
    # Programming Resources (5)
    {"name": "STEM Activity Kit", "category": "Programming Resources",
     "description": "Hands-on STEM activities with experiment guides, materials lists, and learning objectives for K-8 students."},
    {"name": "Reading Program Bundle", "category": "Programming Resources",
     "description": "Literacy program materials including book sets, reading logs, comprehension worksheets, and discussion prompts."},
    {"name": "Art Therapy Supplies", "category": "Programming Resources",
     "description": "Expressive art therapy materials with guided activities, journaling prompts, and creative expression tools."},
    {"name": "Music Education Pack", "category": "Programming Resources",
     "description": "Music education resources including rhythm instruments, song sheets, and music appreciation activities."},
    {"name": "Digital Literacy Toolkit", "category": "Programming Resources",
     "description": "Digital citizenship and online safety curriculum with interactive lessons and parent guides."},
    # Event Supplies (5)
    {"name": "Event Banner Set", "category": "Event Supplies",
     "description": "Professional CCH-branded banners, tablecloths, and signage for community events and health fairs."},
    {"name": "Registration Table Kit", "category": "Event Supplies",
     "description": "Complete registration setup including sign-in sheets, name badges, pens, and welcome packets."},
    {"name": "Promotional Materials Pack", "category": "Event Supplies",
     "description": "CCH promotional items including brochures, business cards, stickers, and informational flyers."},
    {"name": "Feedback Survey Bundle", "category": "Event Supplies",
     "description": "Post-event feedback collection tools including printed surveys, QR codes, and data collection forms."},
    {"name": "First Aid Supply Kit", "category": "Event Supplies",
     "description": "Basic first aid supplies for community events including bandages, antiseptic wipes, and emergency contact forms."},
]

SERVICE_ZIPS_DATA = [
    {"zip_code": "84101", "city": "Salt Lake City", "region_name": "Salt Lake City Downtown",
     "is_staffable": True, "equity_score": 65.0, "total_requests": 45, "total_staff_visits": 38},
    {"zip_code": "84104", "city": "Salt Lake City", "region_name": "Salt Lake City West",
     "is_staffable": True, "equity_score": 28.0, "total_requests": 62, "total_staff_visits": 15},
    {"zip_code": "84116", "city": "Salt Lake City", "region_name": "Salt Lake City North",
     "is_staffable": True, "equity_score": 35.0, "total_requests": 38, "total_staff_visits": 12},
    {"zip_code": "84119", "city": "Salt Lake City", "region_name": "West Valley City",
     "is_staffable": True, "equity_score": 22.0, "total_requests": 71, "total_staff_visits": 18},
    {"zip_code": "84601", "city": "Provo", "region_name": "Provo Central",
     "is_staffable": True, "equity_score": 55.0, "total_requests": 33, "total_staff_visits": 28},
    {"zip_code": "84604", "city": "Provo", "region_name": "Provo East",
     "is_staffable": True, "equity_score": 72.0, "total_requests": 20, "total_staff_visits": 18},
    {"zip_code": "84401", "city": "Ogden", "region_name": "Ogden Central",
     "is_staffable": True, "equity_score": 30.0, "total_requests": 55, "total_staff_visits": 20},
    {"zip_code": "84770", "city": "St. George", "region_name": "St. George",
     "is_staffable": True, "equity_score": 48.0, "total_requests": 28, "total_staff_visits": 22},
    {"zip_code": "84321", "city": "Logan", "region_name": "Logan",
     "is_staffable": True, "equity_score": 40.0, "total_requests": 25, "total_staff_visits": 15},
    {"zip_code": "84060", "city": "Park City", "region_name": "Park City",
     "is_staffable": True, "equity_score": 85.0, "total_requests": 12, "total_staff_visits": 10},
    {"zip_code": "84720", "city": "Cedar City", "region_name": "Cedar City",
     "is_staffable": True, "equity_score": 38.0, "total_requests": 18, "total_staff_visits": 8},
    {"zip_code": "84041", "city": "Ogden", "region_name": "Layton",
     "is_staffable": True, "equity_score": 60.0, "total_requests": 15, "total_staff_visits": 12},
    {"zip_code": "84070", "city": "Salt Lake City", "region_name": "Sandy",
     "is_staffable": True, "equity_score": 75.0, "total_requests": 22, "total_staff_visits": 20},
    {"zip_code": "84532", "city": "St. George", "region_name": "Moab",
     "is_staffable": False, "equity_score": 15.0, "total_requests": 8, "total_staff_visits": 2},
    {"zip_code": "84078", "city": "Logan", "region_name": "Vernal",
     "is_staffable": False, "equity_score": 12.0, "total_requests": 5, "total_staff_visits": 1},
]

# ── Request generation pools ────────────────────────────────

SCHOOLS = [
    "Mountain View Elementary", "Sunset Ridge Middle School", "Canyon View High",
    "Liberty Elementary", "Maple Hills Academy", "Desert Springs Elementary",
    "Valley Crest Middle School", "Horizon High School", "Pioneer Elementary",
    "Cedar Ridge Academy", "Lakeview Elementary", "Summit Middle School",
    "Wasatch High", "Foothill Elementary", "Granite Park Junior High",
]

ORGS = [
    "United Way", "Boys & Girls Club", "YMCA", "Rotary Club",
    "Community Action Services", "Utah Food Bank", "Junior League",
    "Habitat for Humanity", "Big Brothers Big Sisters", "American Red Cross",
    "Family Support Center", "Neighborworks", "Catholic Community Services",
]

VENUES = [
    "Community Center", "Public Library", "Recreation Center",
    "City Hall", "Senior Center", "Family Resource Center",
    "Wellness Center", "Civic Center", "Cultural Center",
]

EVENT_TEMPLATES_STAFF = [
    "Health Fair at {school}",
    "Community Wellness Night — {city}",
    "{org} Annual Health Education Day",
    "Youth Mental Health Workshop at {venue}",
    "Nutrition Education Program at {school}",
    "Family Health Day at {venue}",
    "Substance Prevention Assembly at {school}",
    "Dental Health Screening at {school}",
    "Community Health Outreach — {city}",
    "Wellness Workshop at {org}",
    "Health Education Seminar at {venue}",
    "After-School Health Program at {school}",
]

EVENT_TEMPLATES_MAIL = [
    "Health Materials for {school}",
    "Wellness Toolkit Order — {org}",
    "Mental Health Resources for {org}",
    "Nutrition Program Materials — {school}",
    "Community Health Package — {city}",
    "Educational Materials for {venue}",
]

EVENT_TEMPLATES_PICKUP = [
    "Material Pickup — {org}",
    "Event Supply Pickup for {school}",
    "Resource Kit Pickup — {city}",
]

REQUESTOR_NAMES = [
    "Jennifer Smith", "Carlos Mendoza", "Lisa Chang", "Robert Williams",
    "Amanda Foster", "Mohammed Ali", "Patricia Nguyen", "Thomas Brown",
    "Sarah Johnson", "Daniel Martinez", "Rachel Kim", "Kevin O'Brien",
    "Michelle Davis", "Andrew Wilson", "Laura Garcia", "Christopher Lee",
    "Stephanie Moore", "Brian Taylor", "Nicole Anderson", "Jason White",
    "Heather Thomas", "Mark Jackson", "Susan Harris", "Paul Martin",
    "Kimberly Robinson", "Steven Clark", "Angela Lewis", "Jeffrey Walker",
    "Megan Young", "Eric Hall",
]

SPECIAL_INSTRUCTIONS_POOL = [
    "Please bring extra materials for teachers who want to continue the program.",
    "This is an outdoor event. Please plan accordingly for weather.",
    "We have a large number of Spanish-speaking families attending. Bilingual materials preferred.",
    "URGENT: This was scheduled last minute and we need support ASAP.",
    "Please coordinate with the school principal upon arrival.",
    "The venue has limited parking — please arrive 15 minutes early.",
    "First time hosting this type of event — would appreciate extra guidance.",
    "Need setup assistance 30 minutes before the event starts.",
    "Emergency request — our original provider cancelled last minute.",
    "Please include materials suitable for ages 5-12.",
    "Attendees include families with visual impairments — large print materials needed.",
    "This is part of a larger community health initiative running through spring.",
    "Would like to discuss scheduling a follow-up event.",
    "Materials should be appropriate for a faith-based community setting.",
    "We anticipate media coverage — please bring CCH promotional materials.",
    None, None, None, None, None, None, None, None, None, None,
]

AI_TAGS_OPTIONS = [
    ["health-education", "school-event", "large-audience"],
    ["mental-health", "youth", "workshop"],
    ["nutrition", "community", "family-event"],
    ["substance-prevention", "school", "assembly"],
    ["wellness", "community-outreach", "recurring"],
    ["dental-health", "screening", "children"],
    ["physical-activity", "outdoor", "family"],
    ["behavioral-health", "toolkit", "training"],
    ["health-fair", "multi-partner", "high-visibility"],
    ["materials-distribution", "mail-order", "standard"],
]

# Event locations across Utah (city, zip, lat, lng)
UTAH_EVENT_CITIES = [
    ("Salt Lake City", "84101", 40.7608, -111.8910),
    ("Salt Lake City", "84104", 40.7765, -111.9305),
    ("West Valley City", "84119", 40.6916, -111.9391),
    ("Provo", "84601", 40.2338, -111.6585),
    ("Orem", "84057", 40.2969, -111.6946),
    ("Ogden", "84401", 41.2230, -111.9738),
    ("St. George", "84770", 37.0965, -113.5684),
    ("Logan", "84321", 41.7370, -111.8338),
    ("Layton", "84041", 41.0602, -111.9710),
    ("Sandy", "84070", 40.5650, -111.8389),
    ("Draper", "84020", 40.5247, -111.8638),
    ("Lehi", "84043", 40.3916, -111.8508),
    ("Murray", "84107", 40.6669, -111.8879),
    ("Bountiful", "84010", 40.8894, -111.8808),
    ("Cedar City", "84720", 37.6775, -113.0619),
    ("Park City", "84060", 40.6461, -111.4980),
    ("Spanish Fork", "84660", 40.1150, -111.6547),
    ("Tooele", "84074", 40.5308, -112.2983),
    ("American Fork", "84003", 40.3769, -111.7952),
    ("Riverton", "84065", 40.5219, -111.9391),
]


# ═══════════════════════════════════════════════════════════════
#  Seed functions
# ═══════════════════════════════════════════════════════════════

def seed_locations(db):
    """Create 7 CCH office locations across Utah."""
    location_map = {}
    for ld in LOCATIONS_DATA:
        loc_id = uid()
        db.add(Location(
            id=loc_id,
            name=ld["name"], address=ld["address"],
            city=ld["city"], state="UT", zip_code=ld["zip_code"],
            lat=ld["lat"], lng=ld["lng"],
            service_radius_miles=ld["service_radius_miles"],
            is_active=True,
            phone=ld["phone"], on_duty_admin_phone=ld["on_duty_admin_phone"],
            created_at=datetime.now(timezone.utc),
        ))
        location_map[ld["city"]] = {"id": loc_id, "lat": ld["lat"], "lng": ld["lng"]}
    db.flush()
    return location_map


def seed_materials(db):
    """Create 20 materials across 4 categories."""
    material_ids = []
    for md in MATERIALS_DATA:
        mat_id = uid()
        db.add(MaterialsCatalog(
            id=mat_id,
            name=md["name"], category=md["category"],
            description=md["description"], in_stock=True,
        ))
        material_ids.append(mat_id)
    db.flush()
    return material_ids


def seed_zips(db, location_map):
    """Create 15 service area zip codes with equity scores."""
    for zd in SERVICE_ZIPS_DATA:
        loc_id = location_map[zd["city"]]["id"]
        db.add(ServiceAreaZip(
            zip_code=zd["zip_code"], location_id=loc_id,
            region_name=zd["region_name"], is_staffable=zd["is_staffable"],
            equity_score=zd["equity_score"],
            total_requests=zd["total_requests"],
            total_staff_visits=zd["total_staff_visits"],
        ))
    db.flush()


def seed_users(db, location_map):
    """Create 2 admins + 6 staff (one per classification type)."""
    hashed_pw = hash_password("password123")
    now = datetime.now(timezone.utc)

    slc = location_map["Salt Lake City"]
    provo = location_map["Provo"]
    ogden = location_map["Ogden"]
    stg = location_map["St. George"]
    logan = location_map["Logan"]
    pc = location_map["Park City"]
    cedar = location_map["Cedar City"]

    dev_pw = hash_password("1234")

    users_raw = [
        # ── Dev master login (all portals) ──
        {
            "email": "dev@dev.com", "full_name": "Dev Account",
            "role": "admin", "phone": "000-000-0000",
            "assigned_location_ids": [slc["id"]],
            "schedule": [{"day": d, "start": "00:00", "end": "23:59",
                          "location_id": slc["id"]}
                         for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]],
            "current_lat": 40.7608, "current_lng": -111.8910,
            "max_workload": 99, "hire_date": date(2020, 1, 1),
            "certifications": ["ALL"],
            "_password": dev_pw,
        },

        # ── Admins ──
        {
            "email": "admin@cch.org", "full_name": "Sarah Chen",
            "role": "admin", "phone": "801-555-0001",
            "assigned_location_ids": [slc["id"]],
            "schedule": [{"day": d, "start": "08:00", "end": "17:00",
                          "location_id": slc["id"]}
                         for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]],
            "current_lat": 40.7608, "current_lng": -111.8910,
            "max_workload": 10, "hire_date": date(2022, 1, 15),
            "certifications": ["CPR", "Health Education Specialist", "Program Management"],
        },
        {
            "email": "manager@cch.org", "full_name": "Michael Torres",
            "role": "admin", "phone": "801-555-0002",
            "assigned_location_ids": [provo["id"]],
            "schedule": [{"day": d, "start": "08:00", "end": "17:00",
                          "location_id": provo["id"]}
                         for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]],
            "current_lat": 40.2338, "current_lng": -111.6585,
            "max_workload": 10, "hire_date": date(2023, 3, 1),
            "certifications": ["CPR", "Program Management"],
        },

        # ── Staff — one per classification (core.md §8.1) ──
        {
            "email": "emily.r@cch.org", "full_name": "Emily Rodriguez",
            "role": "staff",
            "classification": "FT_W2", "classification_display": "Full-Time W-2",
            "phone": "801-555-1001",
            "assigned_location_ids": [slc["id"], provo["id"]],
            "schedule": [{"day": d, "start": "08:00", "end": "17:00",
                          "location_id": slc["id"]}
                         for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]],
            "current_lat": 40.7508, "current_lng": -111.8810,
            "current_workload": 3, "max_workload": 8,
            "hire_date": date(2023, 6, 15),
            "certifications": ["CPR", "Health Education Specialist", "Mental Health First Aid"],
        },
        {
            "email": "james.p@cch.org", "full_name": "James Park",
            "role": "staff",
            "classification": "PT_W2", "classification_display": "Part-Time W-2",
            "phone": "801-555-1002",
            "assigned_location_ids": [provo["id"]],
            "schedule": [{"day": d, "start": "09:00", "end": "14:00",
                          "location_id": provo["id"]}
                         for d in ["Monday", "Wednesday", "Friday"]],
            "current_lat": 40.2438, "current_lng": -111.6685,
            "current_workload": 1, "max_workload": 4,
            "hire_date": date(2024, 1, 10),
            "certifications": ["CPR", "Nutrition Educator"],
        },
        {
            "email": "maria.s@cch.org", "full_name": "Maria Santos",
            "role": "staff",
            "classification": "ON_CALL", "classification_display": "On-Call",
            "phone": "801-555-1003",
            "assigned_location_ids": [ogden["id"], slc["id"]],
            "schedule": [{"day": d, "start": "10:00", "end": "16:00",
                          "location_id": ogden["id"]}
                         for d in ["Tuesday", "Thursday"]],
            "on_call_schedule": [
                {"start_date": "2026-03-01", "end_date": "2026-04-30",
                 "start_time": "18:00", "end_time": "06:00"},
            ],
            "current_lat": 41.2130, "current_lng": -111.9638,
            "current_workload": 2, "max_workload": 6,
            "hire_date": date(2023, 9, 1),
            "certifications": ["CPR", "Emergency Response", "Crisis Intervention"],
        },
        {
            "email": "david.k@cch.org", "full_name": "David Kim",
            "role": "staff",
            "classification": "CONTRACTOR_1099",
            "classification_display": "Contractor (1099)",
            "phone": "435-555-1004",
            "assigned_location_ids": [stg["id"]],
            "schedule": [{"day": d, "start": "08:00", "end": "16:00",
                          "location_id": stg["id"]}
                         for d in ["Monday", "Tuesday", "Wednesday"]],
            "current_lat": 37.1065, "current_lng": -113.5784,
            "current_workload": 1, "max_workload": 5,
            "hire_date": date(2025, 3, 1),
            "certifications": ["Health Education Specialist"],
        },
        {
            "email": "ashley.j@cch.org", "full_name": "Ashley Johnson",
            "role": "staff",
            "classification": "VOLUNTEER", "classification_display": "Volunteer",
            "phone": "435-555-1005",
            "assigned_location_ids": [logan["id"]],
            "schedule": [{"day": "Saturday", "start": "09:00", "end": "13:00",
                          "location_id": logan["id"]}],
            "current_lat": 41.7270, "current_lng": -111.8238,
            "current_workload": 0, "max_workload": 2,
            "hire_date": date(2025, 9, 1),
            "certifications": ["CPR"],
        },
        {
            "email": "ryan.m@cch.org", "full_name": "Ryan Mitchell",
            "role": "staff",
            "classification": "OUTSIDE_HELP", "classification_display": "Outside Help",
            "phone": "435-555-1006",
            "assigned_location_ids": [pc["id"]],
            "schedule": [],
            "current_lat": 40.6561, "current_lng": -111.5080,
            "current_workload": 0, "max_workload": 1,
            "hire_date": date(2026, 1, 15),
            "certifications": [],
        },
    ]

    staff_list = []
    for u in users_raw:
        user_id = uid()
        db.add(User(
            id=user_id,
            email=u["email"], hashed_password=u.get("_password", hashed_pw),
            full_name=u["full_name"], role=u["role"],
            classification=u.get("classification"),
            classification_display=u.get("classification_display"),
            phone=u["phone"],
            assigned_location_ids=u["assigned_location_ids"],
            schedule=u["schedule"],
            schedule_exceptions=[],
            on_call_schedule=u.get("on_call_schedule", []),
            current_lat=u.get("current_lat"),
            current_lng=u.get("current_lng"),
            last_checkin_at=now - timedelta(hours=random.randint(1, 48)),
            current_workload=u.get("current_workload", 0),
            max_workload=u.get("max_workload", 5),
            is_on_duty=True, is_active=True,
            hire_date=u.get("hire_date"),
            certifications=u.get("certifications", []),
            notification_queue=[],
            created_at=now,
        ))
        if u["role"] == "staff":
            staff_list.append({
                "id": user_id,
                "classification": u["classification"],
                "classification_display": u["classification_display"],
            })
    db.flush()
    return staff_list


def make_event_name(fulfillment, city):
    """Generate a realistic event name based on fulfillment type."""
    if fulfillment == "staff":
        template = random.choice(EVENT_TEMPLATES_STAFF)
    elif fulfillment == "mail":
        template = random.choice(EVENT_TEMPLATES_MAIL)
    else:
        template = random.choice(EVENT_TEMPLATES_PICKUP)
    return template.format(
        school=random.choice(SCHOOLS),
        org=random.choice(ORGS),
        venue=random.choice(VENUES),
        city=city,
    )


def seed_requests(db, location_map, staff_list, material_ids):
    """Create 55 requests across all statuses, urgency levels, and fulfillment types."""
    today = date.today()
    now = datetime.now(timezone.utc)

    # Build flat list of locations for nearest-location lookup
    loc_list = [{"city": c, **v} for c, v in location_map.items()]

    # Status distribution: (status, count, min_days_offset, max_days_offset)
    status_groups = [
        ("submitted",    15,  14,  56),    # 2–8 weeks out
        ("in_review",    10,   7,  42),    # 1–6 weeks out
        ("approved",      8,   7,  28),    # 1–4 weeks out
        ("dispatched",    7,   3,  14),    # 3–14 days out
        ("in_progress",   5,  -1,   1),    # today ± 1 day
        ("fulfilled",     8, -30,  -1),    # 1–30 days ago
        ("cancelled",     2,   7,  30),    # various
    ]

    requestor_idx = 0
    request_count = 0

    for req_status, count, min_days, max_days in status_groups:
        for _ in range(count):
            # ── Fulfillment type (~60% staff, ~30% mail, ~10% pickup) ──
            r = random.random()
            fulfillment = "staff" if r < 0.60 else ("mail" if r < 0.90 else "pickup")

            # ── Urgency (~30/30/25/15) ──
            r = random.random()
            if r < 0.30:
                urgency = "low"
            elif r < 0.60:
                urgency = "medium"
            elif r < 0.85:
                urgency = "high"
            else:
                urgency = "critical"

            # ── Event location ──
            city, zip_code, base_lat, base_lng = random.choice(UTAH_EVENT_CITIES)
            lat = base_lat + random.uniform(-0.02, 0.02)
            lng = base_lng + random.uniform(-0.02, 0.02)

            # ── Event date ──
            days_offset = random.randint(min_days, max_days)
            event_date = today + timedelta(days=days_offset)

            # ── Requestor (cycle through pool) ──
            requestor = REQUESTOR_NAMES[requestor_idx % len(REQUESTOR_NAMES)]
            requestor_idx += 1

            attendees = (random.choice([25, 50, 75, 100, 150, 200, 300, 500])
                         if fulfillment == "staff" else None)

            # ── Nearest CCH location ──
            nearest = find_nearest_location(lat, lng, loc_list)

            # ── Base request ──
            req = dict(
                id=uid(),
                status=req_status,
                fulfillment_type=fulfillment,
                urgency_level=urgency,
                requestor_name=requestor,
                requestor_email=f"{requestor.lower().replace(' ', '.')}@email.com",
                requestor_phone=f"801-555-{random.randint(2000, 9999)}",
                event_name=make_event_name(fulfillment, city),
                event_date=event_date,
                event_time=(f"{random.randint(8, 18):02d}:00"
                            if fulfillment == "staff" else None),
                event_city=city,
                event_zip=zip_code,
                event_lat=lat,
                event_lng=lng,
                mailing_address=(f"{random.randint(100, 9999)} Main St, {city}, UT {zip_code}"
                                 if fulfillment == "mail" else None),
                estimated_attendees=attendees,
                materials_requested=[
                    {"material_id": mid, "quantity": random.randint(1, 10)}
                    for mid in random.sample(material_ids, random.randint(1, 5))
                ],
                special_instructions=random.choice(SPECIAL_INSTRUCTIONS_POOL),
                assigned_location_id=nearest["id"],
                status_tracker_token=uid(),
                chatbot_used=random.random() < 0.4,
                created_at=now - timedelta(days=random.randint(1, max(1, abs(min_days) + 7))),
                updated_at=now,
            )

            # ── AI data for approved+ ──
            if req_status in ("approved", "dispatched", "in_progress", "fulfilled"):
                score = mock_priority(days_offset, attendees, fulfillment)
                att_str = str(attendees) if attendees else "an unspecified number of"
                req.update(
                    ai_priority_score=score,
                    priority_justification=(
                        f"Priority score {score}/100. "
                        f"{'Urgent timeline — event within 2 weeks.' if days_offset < 14 else 'Standard timeline.'} "
                        f"{'Large expected attendance of ' + str(attendees) + '.' if attendees and attendees >= 200 else ''} "
                        f"{'Equity factor elevated for underserved area.' if random.random() < 0.3 else 'Standard service area coverage.'}"
                    ).strip(),
                    ai_tags=random.choice(AI_TAGS_OPTIONS),
                    ai_summary=(
                        f"Request for {fulfillment} fulfillment: {req['event_name']} in {city} "
                        f"on {event_date.strftime('%B %d, %Y')}. "
                        + (f"Staff attendance requested for {att_str} expected attendees."
                           if fulfillment == "staff"
                           else f"Materials to be {'mailed to requestor.' if fulfillment == 'mail' else 'picked up from nearest location.'}")
                    ),
                    ai_classification={
                        "fulfillment_type": fulfillment,
                        "confidence": round(random.uniform(0.85, 0.99), 2),
                        "category": "community_health_education",
                    },
                    ai_urgency={
                        "level": urgency,
                        "reasons": [f"Event in {days_offset} days"]
                                   + (["Large attendance expected"] if attendees and attendees >= 200 else [])
                                   + (["Underserved zip code"] if random.random() < 0.25 else []),
                        "auto_escalated": urgency == "critical",
                    },
                    ai_flags={
                        "incomplete": False, "inconsistent": False,
                        "duplicate": False, "details": None,
                    },
                )

            # ── Dispatch data for dispatched+ ──
            if req_status in ("dispatched", "in_progress", "fulfilled"):
                staff = random.choice(staff_list)
                travel_min = random.randint(15, 55)
                req.update(
                    assigned_staff_id=staff["id"],
                    dispatch_recommendation={
                        "staff_id": staff["id"],
                        "travel_time": f"{travel_min} minutes",
                        "distance": f"{random.uniform(5, 45):.1f} miles",
                        "classification": staff["classification"],
                        "rationale": f"Nearest available {staff['classification_display']} with capacity.",
                    },
                    job_brief={
                        "urgency_sentence": f"{urgency.upper()} PRIORITY — Event on {event_date.strftime('%B %d')}.",
                        "briefing": (
                            f"Support {req['event_name']} in {city}. "
                            f"Coordinate with {requestor} upon arrival. "
                            f"{'Prepare materials for ' + str(attendees) + ' attendees.' if attendees else 'Confirm materials list before departure.'}"
                        ),
                        "weather_note": "Check forecast closer to event date.",
                        "traffic_tip": "Standard traffic patterns expected for this route.",
                    },
                )

            # ── Travel info for in_progress/fulfilled ──
            if req_status in ("in_progress", "fulfilled"):
                travel_min = random.randint(15, 55)
                req.update(
                    twilio_notified=True,
                    travel_info={
                        "duration_sec": travel_min * 60,
                        "duration_text": f"{travel_min} mins",
                        "distance_m": int(random.uniform(8000, 72000)),
                        "distance_text": f"{random.uniform(5, 45):.1f} mi",
                        "traffic_text": random.choice([
                            "Light traffic expected",
                            "Moderate traffic — allow extra time",
                            "Normal conditions",
                        ]),
                    },
                )

            db.add(Request(**req))
            request_count += 1

    db.flush()
    return request_count


# ═══════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════

def seed():
    random.seed(42)  # Reproducible demo data

    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding locations...")
        location_map = seed_locations(db)

        print("Seeding materials...")
        material_ids = seed_materials(db)

        print("Seeding service area zips...")
        seed_zips(db, location_map)

        print("Seeding users...")
        staff_list = seed_users(db, location_map)

        print("Seeding requests...")
        request_count = seed_requests(db, location_map, staff_list, material_ids)

        db.commit()

        # ── Summary ──
        from app.models.tables import Location as Loc, MaterialsCatalog as Mat
        loc_count = db.query(Loc).count()
        mat_count = db.query(Mat).count()
        zip_count = db.query(ServiceAreaZip).count()
        user_count = db.query(User).count()
        staff_count = db.query(User).filter(User.role == "staff").count()
        admin_count = db.query(User).filter(User.role == "admin").count()
        req_count = db.query(Request).count()
        classifications = (
            db.query(User.classification)
            .filter(User.role == "staff")
            .distinct()
            .all()
        )

        print(f"\n{'=' * 55}")
        print(f"  SEED COMPLETE")
        print(f"{'=' * 55}")
        print(f"  Locations:          {loc_count}")
        print(f"  Materials:          {mat_count}")
        print(f"  Service Area Zips:  {zip_count}")
        print(f"  Users:              {user_count} ({admin_count} admins + {staff_count} staff)")
        print(f"  Requests:           {req_count}")
        print(f"  Classifications:    {', '.join(c[0] for c in classifications)}")
        print(f"{'=' * 55}")
        print(f"  Database:  cch.db")
        print(f"  Admin:     admin@cch.org / password123")
        print(f"  Staff:     emily.r@cch.org / password123")
        print(f"{'=' * 55}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
