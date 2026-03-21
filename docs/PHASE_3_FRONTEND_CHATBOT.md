# Phase 3: Frontend + Chatbot

> **Source of truth:** [core.md](core.md) | Sections 5, 6, 18.1, 19
> This is a living document. Update it as the project evolves.

React scaffold with all pages, routing, auth context, the public request form with AI chatbot auto-fill, and core layout components.

---

## Prerequisites

- Phase 2 complete (API endpoints exist to connect to)

---

## What Gets Built

### Project Setup
- Vite + React 18 + TypeScript scaffold
- Tailwind CSS + shadcn/ui component setup
- React Router with all routes
- API client with JWT header injection

### Layout
- **Sidebar** — nav for admin/staff views
- **Header** — user info, role badge, logout
- **ProtectedRoute** — redirects unauthenticated users
- **RoleGate** — shows/hides content based on role

### Pages
- **RequestForm** (`/request`) — public, 3 fulfillment type cards, conditional fields, AI chatbot panel
- **StatusTracker** (`/request/status/:token`) — public, status pipeline visualization
- **Login** (`/login`) — email/password, JWT storage
- **StaffCheckin** (`/staff/checkin`) — zip code input, map pin
- **StaffDashboard** (`/staff`) — My Queue, My Briefs, My Calendar tabs

### Chatbot (core.md Section 5)
- **ChatbotPanel** — collapsible right panel (desktop), full-screen overlay (mobile)
- **MessageBubble** — user/assistant message styling
- **TypingIndicator** — loading animation while AI responds
- Auto-fill animation: fields highlight with 0.3s CSS transition when chatbot fills them
- Bidirectional: manual edits sync back to chatbot context

### Request Form (core.md Section 6)
- **Three fulfillment cards** — Staff at Event, Mail Materials, Pick Up (large, visually distinct)
- **Conditional fields** — show/hide based on fulfillment type
- **Utah zip validation** — inline, real-time
- **Mini-map** — on zip blur, shows nearest CCH location
- **Materials multi-select** — grouped by category with search
- **Date picker** — future dates only

### Hooks
- **useAuth** — JWT context, login/logout, role checks
- **useChatbot** — conversation state, API calls, field update application
- **useRequests** — request CRUD, status tracking

### Utilities
- **apiClient** — fetch/axios wrapper with JWT
- **utahZipValidator** — 84xxx regex + error messages
- **urgencyColor** — urgency level → hex color
- **classificationColor** — classification code → color

---

## Files to Create

| File Path | Purpose |
|-----------|---------|
| `cch-frontend/package.json` | Dependencies |
| `cch-frontend/vite.config.ts` | Vite config |
| `cch-frontend/tsconfig.json` | TypeScript config |
| `cch-frontend/tailwind.config.js` | Tailwind config |
| `cch-frontend/postcss.config.js` | PostCSS for Tailwind |
| `cch-frontend/index.html` | Entry HTML |
| `cch-frontend/src/main.tsx` | React entry point |
| `cch-frontend/src/App.tsx` | Router setup |
| `cch-frontend/src/components/layout/*` | Sidebar, Header, ProtectedRoute, RoleGate |
| `cch-frontend/src/components/chatbot/*` | ChatbotPanel, MessageBubble, TypingIndicator |
| `cch-frontend/src/components/forms/*` | RequestForm components |
| `cch-frontend/src/pages/*` | All page components |
| `cch-frontend/src/hooks/*` | useAuth, useChatbot, useRequests |
| `cch-frontend/src/lib/apiClient.ts` | API wrapper |
| `cch-frontend/src/lib/constants.ts` | Utah bounds, colors, codes |
| `cch-frontend/src/types/index.ts` | TypeScript interfaces |
| `cch-frontend/src/utils/*` | Validators, color mappers |

---

## Chatbot Interaction Flow

```
Partner types message
  → POST /api/chatbot {messages[], current_form_state}
  → Backend calls OpenRouter with system prompt + conversation
  → Returns {reply, field_updates}
  → Frontend applies field_updates to form state
  → Updated fields animate (background highlight → fade)
  → Chat continues until all required fields filled
```

---

## Success Criteria

- [ ] `npm run dev` starts without errors
- [ ] `/request` renders form with 3 fulfillment cards
- [ ] Selecting a card reveals correct conditional fields
- [ ] Chatbot panel opens/closes, sends messages, receives AI replies
- [ ] Chatbot auto-fills form fields with visible animation
- [ ] Manual field edits work alongside chatbot
- [ ] Utah zip validation shows error for non-84xxx
- [ ] `/login` authenticates and stores JWT
- [ ] Protected routes redirect unauthenticated users
- [ ] `/staff` shows dashboard for staff role
- [ ] Status tracker loads and displays pipeline

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-21 | Scaffold | Initial creation |
