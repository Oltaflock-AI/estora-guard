# Cybersecurity Specification: Agreement of Sale Platform

**Version 1.0 | Real Estate Transaction Platform**

-----

## 1. Threat Model

Before prescribing controls, understand who attacks this system and why.

### 1.1 Asset Inventory (What We’re Protecting)

|Asset                                         |Sensitivity|Why It’s a Target                         |
|----------------------------------------------|-----------|------------------------------------------|
|Social Security / Federal ID Numbers          |Critical   |Identity theft, fraud                     |
|Purchase prices & financial terms             |High       |Competitive intelligence, wire fraud setup|
|Buyer/Seller PII (name, address, phone, email)|High       |Phishing, social engineering              |
|Executed agreements (signed PDFs)             |High       |Forgery, title fraud                      |
|Earnest money / escrow routing info           |Critical   |Wire fraud ($1B+ industry loss annually)  |
|Agent credentials                             |High       |Account takeover, impersonation           |
|Audit trail records                           |High       |Legal tampering, cover-up                 |
|Brokerage deal pipeline                       |Medium     |Competitive espionage                     |

### 1.2 Threat Actors

|Actor               |Motivation                         |Likely Attack Vector                                      |
|--------------------|-----------------------------------|----------------------------------------------------------|
|Wire fraud criminals|Steal earnest money / closing funds|Phishing agents, man-in-the-middle on payment instructions|
|Identity thieves    |Harvest SSNs, PII                  |Data breach, credential stuffing                          |
|Competing brokerages|Deal poaching, intelligence        |Credential theft, insider threat                          |
|Disgruntled insiders|Sabotage, data leak                |Privilege abuse, exfiltration                             |
|Ransomware operators|Extortion                          |Phishing, unpatched vulnerabilities                       |
|Title fraud actors  |Forge/alter agreements             |Document tampering, unauthorized edits                    |

### 1.3 Top 5 Real Estate-Specific Threats

1. **Wire Fraud / Business Email Compromise (BEC)** — The #1 financial cybercrime in real estate. Attackers intercept or spoof closing instructions to redirect funds.
1. **Credential Stuffing** — Reused passwords from other breaches used to log into agent accounts.
1. **Unauthorized Agreement Modification** — Tampering with executed documents or mid-transaction data.
1. **Insider Data Exfiltration** — Agents leaving a brokerage downloading deal data.
1. **Ransomware** — Encrypting active deal files during high-stakes closing windows.

-----

## 2. Authentication & Identity

### 2.1 Multi-Factor Authentication (MFA)

- MFA is **mandatory** for all users. No exceptions.
- Supported second factors (in order of preference):
1. TOTP authenticator app (Google Authenticator, Authy, 1Password)
1. Hardware security key (FIDO2/WebAuthn — YubiKey, Passkey)
1. SMS OTP (permitted but discouraged — SIM swap risk)
- MFA is required on every new device and every session older than 24 hours
- MFA bypass codes are single-use, stored hashed, and expire in 15 minutes

### 2.2 Passkey Support

- Implement **WebAuthn / Passkey** login as the primary auth path for modern devices
- Passkeys are phishing-resistant by design (bound to the origin domain)
- Fall back to password + MFA for unsupported devices

### 2.3 Password Policy

- Minimum 14 characters
- Check against HaveIBeenPwned API on registration and password change
- No forced periodic rotation (NIST 800-63B guidance — rotation causes weaker passwords)
- Force reset only on confirmed breach or suspicious activity
- Bcrypt (cost factor ≥ 12) or Argon2id for storage

### 2.4 Session Management

- Session tokens: cryptographically random, minimum 256-bit entropy
- Session lifetime: 8 hours with activity; 20-minute idle timeout
- Idle timeout shows a 2-minute countdown warning (per design spec §13)
- Re-authentication required before:
  - Exporting any document
  - Revealing masked PII (SSN/Fed ID)
  - Executing/signing an agreement
  - Changing payment or banking details
- Concurrent session limit: 3 active sessions per agent
- On password change: all other sessions are immediately invalidated
- Tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies — never `localStorage`

### 2.5 Account Lockout & Brute Force Protection

- Lock account after 10 failed login attempts within 15 minutes
- Exponential backoff on failed attempts (1s → 2s → 4s → 8s…)
- Lockout is account-level, not IP-level (IP-level is trivially bypassed)
- Locked accounts receive email notification; unlock via email verification
- CAPTCHA triggered after 3 failed attempts

-----

## 3. Authorization & Access Control

### 3.1 Role-Based Access Control (RBAC)

|Role                       |Capabilities                                       |
|---------------------------|---------------------------------------------------|
|**Agent**                  |Create, edit, submit own deals; view own contacts  |
|**Transaction Coordinator**|Edit assigned deals; no delete; no PII export      |
|**Broker / Supervisor**    |View all brokerage deals; edit any; access reports |
|**Attorney (External)**    |Read-only on explicitly shared deals; no PII fields|
|**System Admin**           |User management; no access to deal content         |
|**Auditor**                |Read-only audit trail access; no PII               |

### 3.2 Principle of Least Privilege

- Agents can only access their own deals by default
- Deal sharing must be explicit — no “all agents see all deals” defaults
- Field-level permissions: SSN/Fed ID fields require a separate “View PII” permission
- Bulk export requires an elevated “Export” permission, granted by broker
- Roles are additive — no role inherits permissions from another role implicitly

### 3.3 Deal-Level Permissions

Each deal has an explicit ACL:

```
Deal #2024-1142
  ├── Owner: Agent Sarah Chen (read/write/delete)
  ├── Collaborator: TC Maria Lopez (read/write)
  ├── Reviewer: Attorney J. Park (read-only, expires 2024-12-01)
  └── Supervisor: Broker D. Williams (read/write/delete)
```

- Sharing a deal generates a time-limited, permission-scoped link
- External reviewers (attorneys) access via tokenized link, not platform accounts

### 3.4 Executed Agreement Lockdown

- Once marked “Executed,” all fields are immutable at the database level — not just the UI
- Write operations to executed records are rejected by the API regardless of client state
- Any amendment creates a new versioned record; the original is never modified
- Deletion of executed agreements requires two-factor confirmation by broker + audit log entry

-----

## 4. Data Protection

### 4.1 Encryption at Rest

- All deal data encrypted at rest using AES-256-GCM
- SSNs and Federal ID numbers encrypted with a **separate KMS key** from general deal data (envelope encryption)
- Database encryption keys stored in a dedicated KMS (AWS KMS, Azure Key Vault, or HashiCorp Vault) — never in application config files or environment variables
- Encryption keys rotated annually; re-encryption of data on rotation
- Backups encrypted with the same scheme before leaving the application environment

### 4.2 Encryption in Transit

- TLS 1.3 minimum; TLS 1.0 and 1.1 disabled
- HSTS enforced with `max-age=31536000; includeSubDomains; preload`
- Certificate pinning for mobile clients
- Cipher suite: prefer ECDHE key exchange + AES-GCM + SHA-256/384
- Internal service-to-service communication also requires mutual TLS (mTLS)

### 4.3 PII Handling

- SSN / Fed ID fields:
  - Masked in UI by default (`***-**-1234`)
  - Reveal requires “hold to show” interaction (300ms hold) + logged reveal event
  - Never appear in logs, error messages, or URLs
  - Tokenized for storage — the SSN itself is never stored in the deals table, only a reference token to the encrypted vault record
- PII fields are excluded from full-text search indexes
- Audit log entries redact field values for SSN, banking details — log the change event, not the value

### 4.4 Data Residency & Retention

- Specify data residency region (relevant for state-specific compliance)
- Active deal data retained for 7 years post-closing (standard real estate record-keeping requirement)
- Soft-delete with 30-day recovery window; hard-delete after 30 days
- Right-to-deletion requests: honor for non-executed agreements; executed agreements retained for legal compliance period
- Audit trail records are **never deleted** for the retention period

### 4.5 Sensitive Field Masking in Exports

- PDF exports of draft agreements: watermarked “DRAFT — [Agent Name] — [Timestamp]”
- SSN/Fed ID fields redacted in all exports unless agent has explicit “Export PII” permission
- Bulk CSV exports (pipeline, contacts) exclude SSN, banking details entirely
- Export events logged to audit trail with file hash for integrity verification

-----

## 5. Application Security

### 5.1 Input Validation & Injection Prevention

- All inputs validated server-side — client-side validation is UX only, never a security control
- Parameterized queries / prepared statements everywhere — no string-concatenated SQL
- ORM-level protections enabled; raw query execution prohibited in application code
- Currency fields: server enforces numeric type, positive value, reasonable maximum ($999,999,999)
- Date fields: server validates ISO 8601 format and logical ranges
- Free-text fields (riders, conditions): strip HTML tags server-side; render as plain text or sanitized markdown — no raw HTML injection

### 5.2 Cross-Site Scripting (XSS)

- Content Security Policy (CSP) header configured:
  
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'
  ```
- All user-generated content rendered through a sanitization library (DOMPurify) before display
- React / framework-native escaping as baseline — no `dangerouslySetInnerHTML` without explicit security review

### 5.3 Cross-Site Request Forgery (CSRF)

- CSRF tokens on all state-changing requests (POST, PUT, PATCH, DELETE)
- `SameSite=Strict` cookie attribute provides secondary CSRF defense
- Double-submit cookie pattern as fallback for API endpoints

### 5.4 API Security

- All API endpoints require authentication — no unauthenticated endpoints except login/forgot-password
- Rate limiting per user and per IP:
  - Login: 10 attempts / 15 minutes
  - API general: 300 requests / minute per user
  - Export: 10 exports / hour per user
  - PII reveal: 20 reveals / hour per user (anomaly threshold)
- API responses never include more data than the requesting role is permitted to see
- Avoid IDOR (Insecure Direct Object References): deal IDs in URLs must be validated against the requesting user’s ACL — never trust the client-supplied ID alone
- GraphQL (if used): query depth limiting, query cost analysis, introspection disabled in production

### 5.5 File Upload Security

- Only PDF, DOCX, and image files accepted for rider/addendum attachments
- File type validated by MIME type inspection (magic bytes), not file extension
- Maximum file size: 25MB
- All uploads scanned with antivirus/antimalware before storage
- Uploaded files stored in isolated object storage (S3/GCS) with no public access
- Served via signed time-limited URLs — never directly accessible paths
- Filename sanitized before storage (strip path traversal characters: `../`, `%2e%2e`)

### 5.6 Dependency & Supply Chain Security

- Lock file committed (`package-lock.json`, `yarn.lock`, `Pipfile.lock`)
- Automated dependency scanning: Dependabot or Snyk on every PR
- No dependency with a known critical CVE ships to production
- Software Bill of Materials (SBOM) generated on each release
- Third-party scripts (analytics, etc.) loaded from self-hosted copies or subresource integrity (SRI) hashes — no unchecked CDN scripts

-----

## 6. Wire Fraud Prevention (Real Estate-Specific Critical Control)

Wire fraud is the single highest-dollar cybercrime targeting real estate transactions. The platform must treat payment instruction data as a special threat surface.

### 6.1 No Payment Instructions in the Platform

- The agreement of sale platform must **never** be the authoritative source of wire transfer or ACH routing instructions
- Display a persistent banner on any field near banking/escrow data: *“Never verify wire instructions solely from this platform. Always confirm by phone using a number independently verified — not one provided by email.”*

### 6.2 Change Notification for Sensitive Fields

- Any change to escrow holder name, attorney name, or closing agent triggers an immediate out-of-band notification:
  - Push notification to the agent’s mobile app
  - Email to the agent’s registered address
  - Email to the broker
  - Notification contains: who made the change, when, old value, new value
- These notifications cannot be disabled by the agent who made the change

### 6.3 Identity Verification on Critical Actions

- “Send for Signature” requires re-authentication (password + MFA)
- Any change to the designated escrow holder requires broker approval before taking effect
- Changes made within 72 hours of closing date trigger an elevated review flag visible to broker

### 6.4 Agent Email Domain Validation

- Agent accounts must be registered with a verified brokerage email domain
- Free email providers (gmail.com, yahoo.com, etc.) are permitted only if explicitly whitelisted by broker admin
- Outbound notifications reference the agent’s verified platform identity, not a spoofable display name

-----

## 7. Infrastructure & Network Security

### 7.1 Architecture Principles

- **Defense in depth:** no single control failure should lead to a breach
- **Zero trust:** no implicit trust based on network location; every request authenticated and authorized
- **Immutable infrastructure:** servers replaced rather than patched in place where possible

### 7.2 Network Controls

- Web application firewall (WAF) in front of all public endpoints
- DDoS protection (Cloudflare, AWS Shield, or equivalent)
- API gateway enforces rate limits, IP reputation filtering, and geo-restrictions if applicable
- Database servers not accessible from the public internet — only from application tier via private network
- Bastion / jump host required for any direct infrastructure access; no direct SSH from public internet
- All outbound traffic from application servers restricted by egress firewall — allowlist only

### 7.3 Environment Separation

- Strict separation: Production / Staging / Development are isolated environments with separate credentials
- Production data never copied to lower environments
- Synthetic or anonymized data used in development and testing
- Separate AWS accounts (or equivalent) for each environment

### 7.4 Secrets Management

- Zero secrets in source code, config files, or environment variable files committed to source control
- All secrets (API keys, DB credentials, encryption keys) stored in a secrets manager (HashiCorp Vault, AWS Secrets Manager)
- Secrets rotated automatically on a schedule; rotation event logged
- Pre-commit hooks scan for accidentally committed secrets (truffleHog, gitleaks)

### 7.5 Vulnerability Management

- Penetration test by a qualified third party annually and after major architecture changes
- Automated DAST scanning (OWASP ZAP, Burp Suite) on every staging deployment
- SAST scanning (Semgrep, CodeQL) in CI/CD pipeline — build fails on critical findings
- CVE monitoring for all infrastructure components (OS, DB, runtime)
- Patch SLA: Critical CVE ≤ 24 hours; High ≤ 7 days; Medium ≤ 30 days

-----

## 8. Monitoring, Logging & Incident Response

### 8.1 Security Logging Requirements

Log the following events to an immutable, append-only security log (separate from the audit trail):

- All authentication events (success, failure, MFA, lockout)
- All authorization failures (403 responses)
- All PII access events (SSN reveals, PII exports)
- All admin actions (user creation, role changes, permission grants)
- All executed agreement modifications (should be zero — these are alerts)
- All bulk data exports
- All API rate limit violations
- All WAF rule triggers
- Session creation and termination

**Log fields must include:** timestamp (UTC), user ID, IP address, user agent, action, resource ID, outcome, session ID.

**Logs must never contain:** SSNs, passwords, full card numbers, or other sensitive field values.

### 8.2 Anomaly Detection & Alerting

Trigger security alerts for:

|Event                           |Threshold                        |Alert To                       |
|--------------------------------|---------------------------------|-------------------------------|
|Failed logins                   |5+ in 10 min for one account     |Security team + account owner  |
|PII reveals                     |20+ in 1 hour for one agent      |Broker + security team         |
|Bulk export                     |Any export > 50 records          |Broker + security team         |
|Off-hours login                 |Login between 11pm–5am local time|Account owner (email)          |
|New device login                |First time from device/location  |Account owner (email + push)   |
|Executed agreement write attempt|Any                              |Immediate page to security team|
|Admin privilege granted         |Any                              |Security team + senior broker  |

### 8.3 Incident Response Plan

**Severity Levels:**

- **P0 (Critical):** Active data breach, wire fraud in progress, ransomware — respond in < 1 hour
- **P1 (High):** Unauthorized account access, PII exposure, executed doc tampering — respond in < 4 hours
- **P2 (Medium):** Credential compromise (no active abuse), policy violation — respond in < 24 hours
- **P3 (Low):** Anomaly with no confirmed harm — respond in < 72 hours

**Response Steps (P0/P1):**

1. Contain — isolate affected accounts/systems; revoke active sessions
1. Assess — determine scope of exposure (what data, how many records, what timeframe)
1. Notify — internal: security team, broker, legal; external: affected users, regulators if required
1. Eradicate — remove attacker access, patch the exploited vulnerability
1. Recover — restore from clean backup if needed; verify integrity
1. Post-mortem — document root cause, timeline, and controls changes within 5 business days

**Regulatory Notification:**

- State data breach notification laws apply (varies by state — most require notification within 30–72 hours of discovery)
- If SSNs or financial data exposed: follow GLBA/FTC Safeguards Rule notification requirements
- NAR and state real estate commission reporting obligations should be documented by legal counsel

-----

## 9. Compliance Framework Alignment

|Framework / Regulation       |Applicability                                         |Key Controls                                                                                        |
|-----------------------------|------------------------------------------------------|----------------------------------------------------------------------------------------------------|
|**FTC Safeguards Rule**      |Applies — agents handle consumer financial data       |Written information security program, risk assessment, employee training, service provider oversight|
|**GLBA (Gramm-Leach-Bliley)**|Applies if affiliated with mortgage/financial services|Data security, privacy notices, opt-out rights                                                      |
|**State Data Breach Laws**   |Applies in all 50 states (varying)                    |Breach notification timelines, scope definitions                                                    |
|**RESPA**                    |Governs settlement procedures                         |Audit trail for escrow, anti-kickback                                                               |
|**FIRPTA**                   |Foreign seller withholding                            |Certification capture, 10% withholding flag                                                         |
|**CCPA / CPRA**              |California deals or CA-resident parties               |Data subject rights (access, delete, opt-out of sale)                                               |
|**SOC 2 Type II**            |Recommended for SaaS platform                         |Trust service criteria: Security, Availability, Confidentiality                                     |
|**OWASP ASVS Level 2**       |Application security baseline                         |Full ASVS Level 2 compliance target                                                                 |

-----

## 10. Security UX — Where Security Meets the Interface

Security controls that create too much friction get circumvented. These UX principles keep security usable:

- **MFA enrollment during onboarding** — not optional, not deferrable, framed as “protecting your deals and your clients”
- **Idle timeout warning** — show a 2-minute countdown with a single “Stay logged in” button; don’t silently log out mid-edit
- **Re-auth flows** — use a lightweight re-auth modal (password only, skip MFA for low-risk re-auth within the same session) rather than a full logout/login cycle
- **Wire fraud warnings** — persistent, non-dismissible banner on closing/escrow fields; don’t bury it in a tooltip
- **PII reveal UX** — “hold to reveal” (300ms) is friction that is meaningful and quick; it prevents accidental reveals without blocking legitimate use
- **Security notifications** — use push notifications, not just email; email is a compromised channel in BEC attacks
- **Password manager friendly** — never block paste into password fields; autocomplete attributes set correctly (`autocomplete="current-password"`, `autocomplete="new-password"`)
- **Security settings visibility** — “Security” section in agent profile shows: active sessions, recent login history, MFA status, connected devices — all in one place, always accessible

-----

## 11. Third-Party & Integration Security

|Integration                          |Risk                                  |Control                                                                                    |
|-------------------------------------|--------------------------------------|-------------------------------------------------------------------------------------------|
|MLS data import                      |Malformed data, injection             |Validate and sanitize all imported data; never execute imported content                    |
|E-signature provider (DocuSign, etc.)|Webhook spoofing, token theft         |Verify webhook signatures; store OAuth tokens in secrets manager; use narrowest OAuth scope|
|Title company API                    |Data exposure                         |Mutual TLS; field-level encryption for transmitted PII; data sharing agreement             |
|Lender rate feeds                    |Data integrity                        |Signed responses; validate against expected schema; rate feeds are read-only               |
|Email provider (SendGrid, etc.)      |Email spoofing, phishing amplification|SPF + DKIM + DMARC configured; email provider API key scoped to send-only                  |
|Analytics (if any)                   |PII leakage                           |Analytics must never receive PII; strip identifiers before any event tracking              |

-----

*This document should be reviewed quarterly and updated after any security incident, major architecture change, or applicable regulatory change. Pair with a penetration test report, a risk register, and a data flow diagram for a complete security program.*
