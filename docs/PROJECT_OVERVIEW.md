# Project Overview — CCH Ordering & Dispatch System

> **Source of truth:** [core.md](core.md) | Sections 1, 2, 16, 19
> This is a living document. Update it as the project evolves.

---

## What Is This?

Children's Community Health (CCH) manages educational materials, behavioral reinforcement tools, and programming resources for community events and partner organizations across **Utah**. Partners (schools, nonprofits, community groups) request health education materials and event staffing.

### The Problem

Currently, all requests go through a **Microsoft Form that routes to email**. Staff manually read every request, figure out what's needed, and track everything in a spreadsheet. It doesn't scale.

### The Solution

A web application with three interfaces that replaces the manual workflow with intelligent routing, automated dispatch, and AI-powered operations.

---

## Three Interfaces

### 1. Partner Request Form (`/request`)
Public-facing. No login required. Partners submit requests through a smart form with an **AI chatbot** that auto-fills fields as they answer questions conversationally. After submission, they get a unique status tracking URL.

Two primary request pathways:
- **(A) Staff at Event** — CCH staff attend to provide in-person health education and distribute materials
- **(B) Mail Materials** — Educational materials and toolkits mailed for self-facilitated events
- **(C) Pickup** — Partner picks up materials from a CCH location

### 2. Admin Dashboard (`/admin`)
Role-restricted (JWT, role=admin). Managers review, approve, and dispatch staff. Features:
- Master request queue with AI classification, priority scores, and justifications
- One-click dispatch powered by geo-clustering (groups nearby requests for efficient multi-stop routes)
- Full Google Map with staff positions, request pins, service coverage
- Staff management, schedule editing, analytics, settings
- 9 simulated enterprise connector cards (ADP, QuickBooks, etc.)

### 3. Staff Dashboard (`/staff`)
Role-restricted (JWT, role=staff). Dispatched employees receive:
- **Job Briefs** with Google Maps travel time, departure countdown, materials checklist, and AI-generated mission briefing
- Personal queue sorted by priority
- Check-in page for location updates
- Calendar with travel time blocks

---

## Three User Roles

| Role | Login | Primary Interface | Purpose |
|------|-------|-------------------|---------|
| **Partner** | None — public | Request Form + Status Tracker | Submit requests for staffed events or mailed materials |
| **Employee** | JWT (role=staff) | Staff Dashboard + Job Briefs | Execute assignments, check in, manage schedule |
| **Admin** | JWT (role=admin) | Admin Dashboard | Dispatch, approve, manage employees, analytics |

See [ROLE_PERMISSIONS.md](ROLE_PERMISSIONS.md) for the complete feature × view matrix.

---

## Core Design Principle

> **This is NOT a chatbot with forecasting. It is a real-time dispatch and operations platform.**

The AI chatbot on the form is a guided intake assistant that feeds structured data into the routing engine. The dispatch engine routes. The Job Brief system informs. The map visualizes.

**Build routing and job briefs first. Layer AI on top.**

---

## Utah Region Lock

Every geographic feature is bounded to Utah:
- Map center: 39.3210, -111.0937 (zoom 7)
- Max bounds: SW (36.99, -114.05) to NE (42.00, -109.04)
- Zip codes must be 84xxx
- Geocoding bounded to Utah
- Staff can only check in from Utah

---

## End-to-End Data Flow (Summary)

1. Partner opens form → chats with AI or fills manually → submits
2. Backend validates Utah zip → geocodes → assigns nearest CCH location
3. AI classifies: urgency, priority score (0-100) + justification, tags, summary, flags
4. Dispatch engine ranks candidates by schedule, classification, proximity, workload
5. Admin reviews, clicks Dispatch → Job Brief generated → staff notified (schedule-aware)
6. Staff opens Job Brief → travels → marks arrived → completes → fulfilled
7. Analytics update, equity scores recalculate nightly

See core.md Section 16 for the full 17-step flow.

---

## Hackathon Context

- **Event**: University hackathon competition
- **Presentation**: 10-minute demo
- **Goal**: Working prototype demonstrating the full request → dispatch → fulfill pipeline
- **Key demo moments**: AI chatbot auto-filling form, priority scoring with justification, one-click dispatch, Job Brief with travel countdown, Utah-locked Google Map

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
