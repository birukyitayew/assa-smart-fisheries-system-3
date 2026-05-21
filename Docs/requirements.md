# Requirements Document

## Introduction

The ASSA (Aquatic Sustainability and Supply Administration) Smart Fisheries System is a three-module digital platform designed to modernize fisheries management in Ethiopia. The system creates a complete, verifiable digital chain from the moment a fisher catches fish on Lake Tana to the moment a buyer purchases it in a market — with government oversight at every step.

The platform addresses three systemic failures in Ethiopia's current fisheries sector: invisible catch reporting, absent traceability, and disconnected ecosystem actors. The system consists of:

1. **ASSA Fisher App** — A mobile-first Progressive Web App for licensed fishers to submit daily catch reports for government verification
2. **ASSA Admin Dashboard** — A government-facing analytics and control platform for the Ministry of Fisheries to review, approve, and monitor all catch activity
3. **ASSA Fish Market** — A consumer marketplace where only government-verified catches are listed and sold

The modules share a single PostgreSQL database and communicate through a Node.js/Express API with real-time state propagation using Server-Sent Events (SSE).

## Glossary

- **Fisher_App**: The mobile-first Progressive Web App used by licensed fishers to submit catch reports
- **Admin_Dashboard**: The government-facing web application used by Ministry of Fisheries officers to review and approve catch submissions
- **Marketplace**: The consumer-facing web application where verified fish catches are listed and sold
- **System**: The complete ASSA platform including all three modules, backend API, and database
- **Backend_API**: The Node.js/Express REST API that serves all three frontend modules
- **Fisher**: A licensed individual registered with the Amhara Regional Fisheries Bureau who submits catch reports
- **Admin_User**: A government fisheries officer who reviews and approves catch submissions
- **Buyer**: A registered marketplace user who can browse and place orders for verified fish
- **Catch_Submission**: A digital report submitted by a fisher containing catch details, photos, and location
- **Catch_Record**: A database entry representing a submitted catch with approval status
- **Approval_Workflow**: The process by which an admin reviews and either approves or rejects a catch submission
- **Marketplace_Listing**: An automatically generated product listing created when a catch is approved
- **SSE_Channel**: Server-Sent Events communication channel for real-time state propagation between modules
- **Fishing_Zone**: A designated geographic area on Lake Tana with specific fishing regulations
- **Species_Quota**: A limit on the total weight of a specific fish species that can be caught within a time period
- **License_Record**: A fisher's government-issued fishing license with validity period
- **Notification_System**: The mechanism for delivering approval/rejection messages to fishers
- **Redis_Cache**: The Redis instance used for session management, caching, and SSE pub/sub
- **Cloudinary_Storage**: The cloud storage service for catch submission photos
- **JWT_Token**: JSON Web Token used for authentication across all modules
- **Refresh_Token**: Long-lived token stored in HttpOnly cookie for session renewal
- **Transaction**: An atomic database operation ensuring data consistency
- **Seed_Data**: Pre-populated database records for demonstration and testing purposes
- **Audit_Log**: A tamper-proof record of all system actions for compliance purposes

## Requirements

### Requirement 1: Fisher Authentication and Authorization

**User Story:** As a licensed fisher, I want to securely log in to the Fisher App using my credentials, so that I can submit catch reports and access my personal data.

#### Acceptance Criteria

1. THE Fisher_App SHALL provide a login form accepting license number and password
2. WHEN a fisher submits valid credentials, THE Backend_API SHALL generate a JWT_Token and Refresh_Token
3. THE Backend_API SHALL store the Refresh_Token in an HttpOnly cookie with secure and sameSite attributes
4. THE Backend_API SHALL return the JWT_Token in the response body with an expiration time of 15 minutes
5. WHEN a fisher submits invalid credentials, THE Backend_API SHALL return an HTTP 401 error with a generic error message
6. THE Fisher_App SHALL store the JWT_Token in memory and include it in the Authorization header for all subsequent requests
7. WHEN a JWT_Token expires, THE Fisher_App SHALL automatically request a new token using the Refresh_Token
8. THE Backend_API SHALL validate the fisher role before allowing access to fisher-specific endpoints
9. THE System SHALL enforce row-level security ensuring fishers can only access their own catch records
10. WHEN a fisher logs out, THE Backend_API SHALL invalidate the Refresh_Token and clear the HttpOnly cookie


### Requirement 2: Catch Submission Workflow

**User Story:** As a fisher, I want to submit my daily catch report in under 4 minutes using a simple step-by-step form, so that I can quickly return to my work and have my catch verified for market listing.

#### Acceptance Criteria

1. THE Fisher_App SHALL provide a 4-step catch submission wizard with steps: Basic Info, Photos, Location, Review
2. WHEN a fisher enters catch weight, THE Fisher_App SHALL validate that the weight is a positive number between 0.1 and 500 kilograms
3. WHEN a fisher selects a fish species, THE Fisher_App SHALL display only the 6 valid species from the reference data
4. WHEN a fisher selects a fishing zone, THE Fisher_App SHALL display only the 6 valid Lake Tana zones from the reference data
5. THE Fisher_App SHALL allow upload of 1 to 3 photos with a maximum file size of 5MB per photo
6. WHEN a fisher uploads a photo, THE Backend_API SHALL upload the photo to Cloudinary_Storage and return a secure URL
7. THE Fisher_App SHALL validate that at least 1 photo is uploaded before allowing submission
8. WHEN a fisher submits the catch form, THE Backend_API SHALL create a Catch_Record with status "pending" within a Transaction
9. THE Backend_API SHALL validate that the fisher's License_Record is valid and not expired before accepting the submission
10. WHEN a catch submission is successful, THE Backend_API SHALL return HTTP 201 with the created Catch_Record ID
11. THE Fisher_App SHALL display a success message and redirect to the My Catches page within 2 seconds of submission
12. IF the submission fails due to validation errors, THE Backend_API SHALL return HTTP 400 with specific field-level error messages
13. THE System SHALL complete the entire submission workflow in under 4 minutes for a fisher with stable 3G connectivity


### Requirement 3: Real-Time Catch Status Updates

**User Story:** As a fisher, I want to see the approval status of my catch submissions update in real-time without refreshing the page, so that I know immediately when my catch is approved and listed in the marketplace.

#### Acceptance Criteria

1. WHEN a fisher views the My Catches page, THE Fisher_App SHALL establish an SSE_Channel connection to the Backend_API
2. THE Backend_API SHALL maintain the SSE_Channel connection and send keep-alive messages every 30 seconds
3. WHEN an Admin_User approves or rejects a Catch_Record, THE Backend_API SHALL publish an event to the Redis_Cache pub/sub channel
4. THE Backend_API SHALL listen to the Redis_Cache pub/sub channel and forward catch status events to connected Fisher_App clients via SSE_Channel
5. WHEN a catch status event is received, THE Fisher_App SHALL update the catch status in the UI within 3 seconds without page refresh
6. THE Fisher_App SHALL display a visual indicator (badge color change) when a catch status changes from "pending" to "approved" or "rejected"
7. IF the SSE_Channel connection is lost, THE Fisher_App SHALL automatically attempt to reconnect every 5 seconds up to 3 times
8. THE Backend_API SHALL filter SSE events to ensure fishers only receive events for their own catch submissions
9. WHEN a fisher navigates away from the My Catches page, THE Fisher_App SHALL close the SSE_Channel connection
10. THE System SHALL deliver catch status updates via SSE_Channel with a latency of less than 3 seconds from admin action to fisher UI update


### Requirement 4: Fisher Notification System

**User Story:** As a fisher, I want to receive in-app notifications when my catch is approved or rejected, so that I am immediately informed of the outcome and can take appropriate action.

#### Acceptance Criteria

1. WHEN an Admin_User approves a Catch_Record, THE Backend_API SHALL create a notification record for the fisher with type "approval" within the same Transaction
2. WHEN an Admin_User rejects a Catch_Record, THE Backend_API SHALL create a notification record for the fisher with type "rejection" and include the rejection reason
3. THE Fisher_App SHALL display a notification badge on the notifications icon showing the count of unread notifications
4. WHEN a fisher opens the notifications panel, THE Fisher_App SHALL fetch all notifications from the Backend_API and display them in reverse chronological order
5. THE Fisher_App SHALL display approval notifications with a green success icon and rejection notifications with a red warning icon
6. WHEN a fisher views a notification, THE Fisher_App SHALL mark it as read by sending a PATCH request to the Backend_API
7. THE Backend_API SHALL update the notification read status within a Transaction and return HTTP 200
8. THE Fisher_App SHALL update the notification badge count in real-time when notifications are marked as read
9. WHEN a new notification is created, THE Backend_API SHALL publish an event to the SSE_Channel for the fisher
10. THE Fisher_App SHALL display a toast message when a new notification arrives via SSE_Channel


### Requirement 5: Admin Dashboard Authentication and Authorization

**User Story:** As a government fisheries officer, I want to securely log in to the Admin Dashboard with role-based access control, so that I can perform my assigned duties and access only the data I am authorized to view.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a login form accepting email and password
2. WHEN an admin user submits valid credentials, THE Backend_API SHALL verify the user role is "admin" or "super_admin"
3. THE Backend_API SHALL generate a JWT_Token containing the user role and regional assignment
4. THE Backend_API SHALL enforce role-based access control for all admin endpoints based on the JWT_Token claims
5. WHEN a user with role "field_officer" attempts to access approval endpoints, THE Backend_API SHALL return HTTP 403 Forbidden
6. THE Backend_API SHALL enforce row-level security for regional admins to only view catches from their assigned region
7. WHEN a user with role "super_admin" accesses the system, THE Backend_API SHALL grant access to all regions and all administrative functions
8. THE Admin_Dashboard SHALL display different navigation menus based on the user role retrieved from the JWT_Token
9. WHEN an admin session expires, THE Admin_Dashboard SHALL redirect to the login page and display a session timeout message
10. THE Backend_API SHALL log all admin authentication attempts to the Audit_Log with timestamp, user ID, and outcome


### Requirement 6: Catch Approval Workflow

**User Story:** As an admin user, I want to review pending catch submissions and approve or reject them with a reason, so that only verified catches enter the marketplace and fishers receive feedback on their submissions.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a list of all Catch_Records with status "pending" on the Daily Catches page
2. THE Admin_Dashboard SHALL provide filter controls for date range, species, zone, and fisher name
3. WHEN an admin clicks on a catch record, THE Admin_Dashboard SHALL display a detail view with all catch information including photos, weight, species, zone, and fisher details
4. THE Admin_Dashboard SHALL display the fisher's License_Record status and validity period in the catch detail view
5. THE Admin_Dashboard SHALL provide an "Approve" button and a "Reject" button in the catch detail view
6. WHEN an admin clicks "Approve", THE Admin_Dashboard SHALL send a PATCH request to the Backend_API to update the catch status to "approved"
7. WHEN an admin clicks "Reject", THE Admin_Dashboard SHALL display a modal requiring a rejection reason before submission
8. THE Backend_API SHALL validate that the rejection reason is at least 10 characters long
9. WHEN the Backend_API processes an approval, THE System SHALL execute the following within a single Transaction: update catch status to "approved", create a Marketplace_Listing, create a notification for the fisher, update the Species_Quota consumed amount
10. WHEN the Backend_API processes a rejection, THE System SHALL execute the following within a single Transaction: update catch status to "rejected", store the rejection reason, create a notification for the fisher
11. THE Backend_API SHALL publish an SSE event to all connected clients when a catch status changes
12. THE Admin_Dashboard SHALL remove the approved or rejected catch from the pending list in real-time via SSE_Channel
13. IF the Transaction fails at any step, THE Backend_API SHALL roll back all changes and return HTTP 500 with an error message
14. THE Backend_API SHALL log all approval and rejection actions to the Audit_Log with admin user ID, catch ID, action, and timestamp
15. THE Admin_Dashboard SHALL display a success toast message when an approval or rejection is processed successfully


### Requirement 7: Species Quota Monitoring and Enforcement

**User Story:** As an admin user, I want to monitor species quotas in real-time and receive alerts when quotas approach or exceed limits, so that I can prevent overfishing and enforce sustainable catch limits.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a quota monitoring section showing all 6 fish species with current consumption and limit
2. THE Admin_Dashboard SHALL display quota consumption as a percentage bar with color coding: green (0-70%), yellow (71-90%), red (91-100%)
3. WHEN a catch is approved, THE Backend_API SHALL increment the Species_Quota consumed amount by the catch weight within the same Transaction
4. THE Backend_API SHALL calculate the quota percentage after each approval and check against threshold values
5. WHEN a Species_Quota reaches 80% consumption, THE Backend_API SHALL create an alert record with severity "warning"
6. WHEN a Species_Quota reaches 95% consumption, THE Backend_API SHALL create an alert record with severity "critical"
7. WHEN a Species_Quota exceeds 100% consumption, THE Backend_API SHALL create an alert record with severity "exceeded"
8. THE Backend_API SHALL publish an SSE event to all connected Admin_Dashboard clients when a new alert is created
9. THE Admin_Dashboard SHALL display a notification badge on the alerts icon showing the count of unread alerts
10. THE Admin_Dashboard SHALL update the quota bars in real-time via SSE_Channel when catches are approved
11. THE Admin_Dashboard SHALL provide an alerts page displaying all alerts in reverse chronological order with severity indicators
12. WHEN an admin views an alert, THE Admin_Dashboard SHALL mark it as read by sending a PATCH request to the Backend_API
13. WHERE a Species_Quota is exceeded, THE Admin_Dashboard SHALL display a prominent warning banner on the dashboard overview
14. THE Backend_API SHALL cache quota calculations in Redis_Cache with a TTL of 60 seconds to optimize performance


### Requirement 8: Admin Dashboard KPI Overview

**User Story:** As an admin user, I want to see key performance indicators and analytics on the dashboard overview, so that I can quickly assess system activity and make informed decisions.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a KPI overview section with the following metrics: total catches today, pending approvals, approved catches today, rejected catches today
2. THE Admin_Dashboard SHALL display a chart showing catch submissions by species for the current week
3. THE Admin_Dashboard SHALL display a chart showing catch submissions by zone for the current week
4. THE Admin_Dashboard SHALL display a list of recent catch submissions with status indicators
5. THE Backend_API SHALL calculate KPI metrics by querying the database with date filters for the current day
6. THE Backend_API SHALL cache KPI calculations in Redis_Cache with a TTL of 300 seconds
7. THE Admin_Dashboard SHALL refresh KPI metrics automatically every 5 minutes without page reload
8. THE Admin_Dashboard SHALL update KPI metrics in real-time via SSE_Channel when catches are submitted, approved, or rejected
9. THE Admin_Dashboard SHALL display loading skeletons while KPI data is being fetched
10. IF the Backend_API fails to return KPI data, THE Admin_Dashboard SHALL display an error message and a retry button
11. THE Admin_Dashboard SHALL provide a date range selector to view historical KPI data for the past 7, 30, or 90 days
12. THE Backend_API SHALL return KPI data within 400 milliseconds at the 95th percentile


### Requirement 9: Marketplace Listing Auto-Creation

**User Story:** As a system, I want to automatically create a marketplace listing when a catch is approved, so that verified fish immediately becomes available for buyers without manual intervention.

#### Acceptance Criteria

1. WHEN a Catch_Record status changes to "approved", THE Backend_API SHALL create a Marketplace_Listing within the same Transaction
2. THE Backend_API SHALL populate the Marketplace_Listing with the following data from the Catch_Record: species, weight, catch date, zone, photos, fisher ID
3. THE Backend_API SHALL calculate the listing price based on the species reference price with a 10% markup
4. THE Backend_API SHALL set the Marketplace_Listing status to "available" and available quantity to the catch weight
5. THE Backend_API SHALL generate a unique listing ID and creation timestamp
6. THE Backend_API SHALL link the Marketplace_Listing to the Catch_Record via a foreign key relationship
7. IF the Marketplace_Listing creation fails, THE Backend_API SHALL roll back the catch approval within the Transaction
8. THE Backend_API SHALL publish an SSE event to all connected Marketplace clients when a new listing is created
9. THE Marketplace SHALL display the new listing in the browse page within 3 seconds of approval via SSE_Channel
10. THE Backend_API SHALL ensure that one Catch_Record creates exactly one Marketplace_Listing
11. THE Backend_API SHALL log the listing creation to the Audit_Log with catch ID, listing ID, and timestamp


### Requirement 10: Marketplace Browse and Filter

**User Story:** As a buyer, I want to browse verified fish listings with filtering and search capabilities, so that I can find the specific fish I need based on species, zone, price, and freshness.

#### Acceptance Criteria

1. THE Marketplace SHALL display a browse page showing all Marketplace_Listings with status "available"
2. THE Marketplace SHALL display each listing with a card showing: species name, weight, price per kg, total price, catch date, zone, fisher first name, verified badge, and primary photo
3. THE Marketplace SHALL provide filter controls for species, zone, price range, and catch date
4. WHEN a buyer selects a species filter, THE Marketplace SHALL send a GET request to the Backend_API with the species query parameter
5. THE Backend_API SHALL return only listings matching the filter criteria within 400 milliseconds at the 95th percentile
6. THE Marketplace SHALL provide a search input that filters listings by species name or zone name
7. THE Marketplace SHALL display a "No listings found" message when no listings match the filter criteria
8. THE Marketplace SHALL sort listings by catch date in descending order by default
9. THE Marketplace SHALL provide sort options for: newest first, oldest first, lowest price, highest price
10. THE Marketplace SHALL display a loading skeleton while listings are being fetched
11. THE Marketplace SHALL update the listing grid in real-time via SSE_Channel when new listings are created
12. THE Backend_API SHALL cache listing queries in Redis_Cache with a TTL of 120 seconds
13. THE Marketplace SHALL display a "Verified Fisher" badge on all listings to indicate government approval


### Requirement 11: Marketplace Order Placement

**User Story:** As a registered buyer, I want to place an order for a verified fish listing by specifying quantity, so that I can purchase fish directly from fishers with government-verified traceability.

#### Acceptance Criteria

1. WHEN a buyer clicks on a listing, THE Marketplace SHALL display a detail page with full listing information and an order form
2. THE Marketplace SHALL display the listing detail page with: all photos in a gallery, species details, catch date, zone, weight available, price per kg, total price, fisher first name, verified badge
3. THE Marketplace SHALL provide a quantity input field with validation for minimum 0.5 kg and maximum equal to available weight
4. WHEN a buyer enters a quantity, THE Marketplace SHALL calculate and display the total price in real-time
5. THE Marketplace SHALL provide a "Place Order" button that is disabled if the buyer is not authenticated
6. WHEN an unauthenticated buyer clicks "Place Order", THE Marketplace SHALL redirect to the login page
7. WHEN an authenticated buyer clicks "Place Order", THE Marketplace SHALL send a POST request to the Backend_API with listing ID, quantity, and buyer ID
8. THE Backend_API SHALL validate that the requested quantity does not exceed the available quantity
9. THE Backend_API SHALL validate that the buyer is authenticated and has role "buyer"
10. WHEN the Backend_API processes an order, THE System SHALL execute the following within a single Transaction: create an order record, update the listing available quantity, create a notification for the fisher, update the listing status to "sold" if quantity reaches zero
11. THE Backend_API SHALL return HTTP 201 with the created order ID and confirmation details
12. THE Marketplace SHALL display a success message and redirect to the order confirmation page
13. IF the order creation fails due to insufficient quantity, THE Backend_API SHALL return HTTP 409 Conflict with an error message
14. THE Backend_API SHALL publish an SSE event to update listing availability in real-time for all connected clients
15. THE Backend_API SHALL log all order placements to the Audit_Log with buyer ID, listing ID, quantity, and timestamp


### Requirement 12: Marketplace Real-Time Statistics

**User Story:** As a marketplace visitor, I want to see real-time statistics about marketplace activity, so that I can understand the platform's activity level and trust the marketplace ecosystem.

#### Acceptance Criteria

1. THE Marketplace SHALL display a statistics sidebar with the following metrics: total active listings, total orders today, total weight sold today, average price per kg
2. THE Backend_API SHALL calculate marketplace statistics by querying the database with appropriate filters
3. THE Backend_API SHALL cache marketplace statistics in Redis_Cache with a TTL of 180 seconds
4. THE Marketplace SHALL update statistics in real-time via SSE_Channel when orders are placed or listings are created
5. THE Marketplace SHALL display statistics with appropriate units: count for listings and orders, kg for weight, ETB for price
6. THE Marketplace SHALL display loading skeletons while statistics are being fetched
7. IF the Backend_API fails to return statistics, THE Marketplace SHALL display placeholder values with an error indicator
8. THE Marketplace SHALL refresh statistics automatically every 3 minutes without page reload
9. THE Backend_API SHALL return statistics data within 400 milliseconds at the 95th percentile


### Requirement 13: Marketplace Activity Feed

**User Story:** As a marketplace visitor, I want to see a live activity feed of recent orders and listings, so that I can observe marketplace activity and feel confident in the platform's vibrancy.

#### Acceptance Criteria

1. THE Marketplace SHALL display an activity feed sidebar showing the 10 most recent marketplace events
2. THE Marketplace SHALL display activity events for: new listings created, orders placed
3. THE Marketplace SHALL display each activity event with: event type icon, event description, relative timestamp, species name
4. THE Backend_API SHALL return activity events sorted by timestamp in descending order
5. THE Marketplace SHALL update the activity feed in real-time via SSE_Channel when new events occur
6. THE Marketplace SHALL display relative timestamps using format: "2 minutes ago", "1 hour ago", "3 days ago"
7. THE Marketplace SHALL limit the activity feed to 10 events and remove the oldest event when a new event arrives
8. THE Marketplace SHALL display a loading skeleton while activity feed data is being fetched
9. THE Backend_API SHALL cache activity feed data in Redis_Cache with a TTL of 60 seconds
10. THE Backend_API SHALL return activity feed data within 400 milliseconds at the 95th percentile


### Requirement 14: Buyer Order History

**User Story:** As a registered buyer, I want to view my complete order history with details and status, so that I can track my purchases and reference past transactions.

#### Acceptance Criteria

1. THE Marketplace SHALL provide a "My Orders" page accessible only to authenticated buyers
2. THE Marketplace SHALL display all orders placed by the authenticated buyer in reverse chronological order
3. THE Marketplace SHALL display each order with: order ID, species name, quantity, total price, order date, status, fisher first name
4. THE Backend_API SHALL enforce row-level security to ensure buyers can only view their own orders
5. WHEN a buyer clicks on an order, THE Marketplace SHALL display a detail view with full order information including listing photos
6. THE Marketplace SHALL display order status with color-coded badges: "pending" (yellow), "confirmed" (green), "completed" (blue)
7. THE Marketplace SHALL provide filter controls for date range and species
8. THE Marketplace SHALL display a "No orders found" message when the buyer has no order history
9. THE Backend_API SHALL return order history within 400 milliseconds at the 95th percentile
10. THE Marketplace SHALL display loading skeletons while order history is being fetched


### Requirement 15: Database Schema and Data Integrity

**User Story:** As a system, I want to maintain a normalized PostgreSQL database schema with referential integrity and constraints, so that data consistency is guaranteed and business rules are enforced at the database level.

#### Acceptance Criteria

1. THE System SHALL use PostgreSQL as the primary relational database
2. THE System SHALL define the following core tables: users, fishers, catches, listings, orders, quotas, zones, species, alerts, notifications, audit_logs
3. THE System SHALL enforce foreign key constraints for all relationships between tables
4. THE System SHALL define NOT NULL constraints for all required fields
5. THE System SHALL define CHECK constraints for: catch weight > 0, quota limit > 0, listing price > 0, order quantity > 0
6. THE System SHALL define UNIQUE constraints for: user email, fisher license number, listing catch_id
7. THE System SHALL use ENUM types for: user role, catch status, listing status, order status, alert severity
8. THE System SHALL define indexes on frequently queried columns: catches.fisher_id, catches.status, listings.status, orders.buyer_id, catches.created_at
9. THE System SHALL use TIMESTAMP WITH TIME ZONE for all datetime fields
10. THE System SHALL define a composite index on (species_id, zone_id) for quota queries
11. THE System SHALL use CASCADE DELETE for: fisher → catches, catch → listing, user → orders
12. THE System SHALL use RESTRICT DELETE for: species → catches, zones → catches to prevent accidental reference data deletion
13. THE System SHALL define a trigger to automatically update updated_at timestamp on all tables when records are modified
14. THE System SHALL enforce that catch.catch_date cannot be in the future using a CHECK constraint


### Requirement 16: Transaction Atomicity for Critical Operations

**User Story:** As a system, I want to execute all critical multi-step operations within database transactions, so that data consistency is maintained and partial states never occur.

#### Acceptance Criteria

1. WHEN a catch is approved, THE Backend_API SHALL execute all related operations within a single Transaction: update catch status, create listing, create notification, update quota
2. WHEN a catch is rejected, THE Backend_API SHALL execute all related operations within a single Transaction: update catch status, create notification
3. WHEN an order is placed, THE Backend_API SHALL execute all related operations within a single Transaction: create order, update listing quantity, update listing status if sold out, create notification
4. IF any operation within a Transaction fails, THE Backend_API SHALL roll back all changes and return an error
5. THE Backend_API SHALL use isolation level READ COMMITTED for all transactions
6. THE Backend_API SHALL acquire row-level locks using SELECT FOR UPDATE when updating quota values to prevent race conditions
7. THE Backend_API SHALL set a transaction timeout of 5 seconds to prevent long-running transactions
8. IF a transaction times out, THE Backend_API SHALL roll back all changes and return HTTP 500 with a timeout error message
9. THE Backend_API SHALL log all transaction failures to the error log with full stack trace
10. THE Backend_API SHALL ensure that no catch can be approved twice by checking the current status within the transaction


### Requirement 17: Photo Storage and Management

**User Story:** As a fisher, I want to upload catch photos that are securely stored and efficiently delivered, so that my catch submissions include visual proof for admin verification.

#### Acceptance Criteria

1. THE Fisher_App SHALL allow upload of JPEG, PNG, and WebP image formats
2. THE Fisher_App SHALL validate that each photo file size does not exceed 5MB before upload
3. THE Fisher_App SHALL display a preview of uploaded photos before submission
4. WHEN a fisher uploads a photo, THE Backend_API SHALL upload the file to Cloudinary_Storage using the Cloudinary SDK
5. THE Backend_API SHALL configure Cloudinary to automatically optimize images for web delivery
6. THE Backend_API SHALL store the Cloudinary secure URL in the database, not the raw file
7. THE Backend_API SHALL validate that at least 1 photo and at most 3 photos are uploaded per catch submission
8. THE Backend_API SHALL return HTTP 400 if photo validation fails with a specific error message
9. THE Marketplace SHALL display listing photos using Cloudinary transformation URLs for responsive image delivery
10. THE Admin_Dashboard SHALL display catch photos in a gallery view with zoom capability
11. THE System SHALL serve optimized images with WebP format for browsers that support it
12. IF Cloudinary upload fails, THE Backend_API SHALL return HTTP 500 and not create the catch submission


### Requirement 18: Redis Caching Strategy

**User Story:** As a system, I want to cache frequently accessed data in Redis, so that API response times are optimized and database load is reduced.

#### Acceptance Criteria

1. THE Backend_API SHALL use Redis_Cache for session storage with a TTL of 7 days
2. THE Backend_API SHALL cache KPI metrics with a TTL of 300 seconds
3. THE Backend_API SHALL cache marketplace statistics with a TTL of 180 seconds
4. THE Backend_API SHALL cache marketplace listings with a TTL of 120 seconds
5. THE Backend_API SHALL cache quota calculations with a TTL of 60 seconds
6. THE Backend_API SHALL cache activity feed data with a TTL of 60 seconds
7. THE Backend_API SHALL invalidate relevant cache entries when data is modified
8. WHEN a catch is approved, THE Backend_API SHALL invalidate cache entries for: KPI metrics, marketplace statistics, marketplace listings, quota calculations
9. WHEN an order is placed, THE Backend_API SHALL invalidate cache entries for: marketplace statistics, marketplace listings, activity feed
10. THE Backend_API SHALL use Redis pub/sub channels for SSE event distribution across multiple server instances
11. THE Backend_API SHALL implement cache-aside pattern: check cache first, query database on miss, populate cache with result
12. THE Backend_API SHALL serialize cache values as JSON strings
13. THE Backend_API SHALL handle Redis connection failures gracefully by falling back to direct database queries
14. THE Backend_API SHALL log cache hit/miss metrics for monitoring


### Requirement 19: API Performance Requirements

**User Story:** As a system, I want to deliver API responses within strict performance thresholds, so that all three modules provide a responsive user experience.

#### Acceptance Criteria

1. THE Backend_API SHALL respond to GET requests at the 95th percentile within 400 milliseconds
2. THE Backend_API SHALL respond to POST requests at the 95th percentile within 600 milliseconds
3. THE Backend_API SHALL respond to PATCH requests at the 95th percentile within 500 milliseconds
4. THE Backend_API SHALL deliver SSE events within 3 seconds of the triggering action
5. THE Backend_API SHALL handle at least 100 concurrent requests without degradation
6. THE Backend_API SHALL implement request timeout of 30 seconds for all endpoints
7. THE Backend_API SHALL return HTTP 503 Service Unavailable if the database connection pool is exhausted
8. THE Backend_API SHALL use connection pooling with a minimum of 10 and maximum of 50 connections
9. THE Backend_API SHALL implement query optimization using appropriate indexes and EXPLAIN ANALYZE
10. THE Backend_API SHALL log slow queries exceeding 1 second to the performance log
11. THE Backend_API SHALL implement pagination for list endpoints with a default page size of 20 and maximum of 100
12. THE Backend_API SHALL return total count in pagination responses for client-side pagination controls


### Requirement 20: Input Validation and Error Handling

**User Story:** As a system, I want to validate all user inputs and provide clear error messages, so that data integrity is maintained and users understand validation failures.

#### Acceptance Criteria

1. THE Backend_API SHALL validate all request bodies using Zod schema validation
2. THE Backend_API SHALL return HTTP 400 Bad Request for validation failures with field-level error messages
3. THE Backend_API SHALL validate email format using RFC 5322 standard
4. THE Backend_API SHALL validate password strength requiring minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
5. THE Backend_API SHALL validate catch weight as a positive number between 0.1 and 500
6. THE Backend_API SHALL validate that species_id and zone_id reference existing records
7. THE Backend_API SHALL validate that catch_date is not in the future
8. THE Backend_API SHALL sanitize all string inputs to prevent SQL injection and XSS attacks
9. THE Backend_API SHALL return HTTP 401 Unauthorized for authentication failures with a generic error message
10. THE Backend_API SHALL return HTTP 403 Forbidden for authorization failures with a descriptive error message
11. THE Backend_API SHALL return HTTP 404 Not Found for non-existent resources
12. THE Backend_API SHALL return HTTP 409 Conflict for duplicate resource creation attempts
13. THE Backend_API SHALL return HTTP 500 Internal Server Error for unexpected errors with a generic message
14. THE Backend_API SHALL log all 500 errors with full stack trace and request context
15. THE Backend_API SHALL not expose sensitive information in error messages


### Requirement 21: Security and Authentication

**User Story:** As a system, I want to implement secure authentication and authorization mechanisms, so that user data is protected and access is properly controlled.

#### Acceptance Criteria

1. THE Backend_API SHALL hash all passwords using bcrypt with a cost factor of 12
2. THE Backend_API SHALL generate JWT_Tokens with HS256 algorithm using a secret key from environment variables
3. THE Backend_API SHALL include user ID, role, and expiration in JWT_Token claims
4. THE Backend_API SHALL set JWT_Token expiration to 15 minutes
5. THE Backend_API SHALL generate Refresh_Tokens as random 64-character strings
6. THE Backend_API SHALL store Refresh_Tokens in the database with user association and expiration timestamp
7. THE Backend_API SHALL set Refresh_Token expiration to 7 days
8. THE Backend_API SHALL store Refresh_Tokens in HttpOnly cookies with Secure and SameSite=Strict attributes
9. THE Backend_API SHALL validate JWT_Token signature and expiration on every protected endpoint request
10. THE Backend_API SHALL implement rate limiting of 100 requests per 15 minutes per IP address
11. THE Backend_API SHALL implement CORS policy allowing only configured frontend origins
12. THE Backend_API SHALL set security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security
13. THE Backend_API SHALL log all authentication attempts with IP address, user agent, and outcome
14. THE Backend_API SHALL implement account lockout after 5 failed login attempts within 15 minutes
15. THE Backend_API SHALL require re-authentication for sensitive operations like quota modification


### Requirement 22: Audit Logging and Compliance

**User Story:** As a system, I want to maintain comprehensive audit logs of all critical operations, so that compliance requirements are met and system activity can be traced for accountability.

#### Acceptance Criteria

1. THE Backend_API SHALL log all authentication events to the Audit_Log table
2. THE Backend_API SHALL log all catch approval and rejection events with admin user ID, catch ID, action, and timestamp
3. THE Backend_API SHALL log all order placement events with buyer ID, listing ID, quantity, and timestamp
4. THE Backend_API SHALL log all quota modification events with admin user ID, species ID, old value, new value, and timestamp
5. THE Backend_API SHALL log all user creation and modification events
6. THE Audit_Log SHALL include the following fields: id, user_id, action, resource_type, resource_id, details (JSON), ip_address, user_agent, timestamp
7. THE Backend_API SHALL ensure Audit_Log records are immutable and cannot be deleted or modified
8. THE Backend_API SHALL implement database triggers to prevent UPDATE and DELETE operations on the Audit_Log table
9. THE Backend_API SHALL retain Audit_Log records for a minimum of 5 years for regulatory compliance
10. THE Backend_API SHALL provide an audit log export endpoint accessible only to super_admin users
11. THE Backend_API SHALL export audit logs in CSV format with all fields
12. THE Backend_API SHALL implement audit log search and filter by date range, user, action type, and resource type


### Requirement 23: Data Privacy and PDPP Compliance

**User Story:** As a system, I want to comply with Ethiopia's Personal Data Protection Proclamation 2024, so that fisher and buyer personal data is handled lawfully and user privacy rights are respected.

#### Acceptance Criteria

1. THE System SHALL collect only the minimum personal data necessary for fisheries management: name, license number, phone number, email
2. THE System SHALL obtain explicit consent from fishers and buyers during registration
3. THE System SHALL provide a privacy policy page explaining data collection, usage, and retention
4. THE System SHALL allow fishers to view all their personal data via the Profile page
5. THE System SHALL provide a data export endpoint allowing users to download their personal data in JSON format
6. THE System SHALL implement a data deletion request workflow accessible via the Profile page
7. WHEN a user requests data deletion, THE Backend_API SHALL anonymize the user record while retaining catch records for regulatory purposes
8. THE Backend_API SHALL retain catch records for 5 years after creation for regulatory compliance
9. THE Backend_API SHALL not share fisher personal data with marketplace buyers beyond: first name and verified badge status
10. THE Backend_API SHALL not use personal data for marketing purposes without separate explicit consent
11. THE Backend_API SHALL encrypt sensitive personal data at rest using AES-256 encryption
12. THE Backend_API SHALL implement data breach detection and notification procedures
13. THE Backend_API SHALL notify the Ethiopian Data Protection Authority within 72 hours of a confirmed data breach
14. THE Backend_API SHALL log all personal data access events to the Audit_Log


### Requirement 24: Seed Data for Development and Demo

**User Story:** As a developer, I want comprehensive seed data that represents realistic production scenarios, so that the system can be demonstrated and tested with meaningful data.

#### Acceptance Criteria

1. THE System SHALL provide a seed data script that populates the database with production-like data
2. THE seed data script SHALL create 6 fish species records: Tilapia, Catfish, Barbus, Labeobarbus, Clarias, Oreochromis
3. THE seed data script SHALL create 6 fishing zone records for Lake Tana: North Zone, South Zone, East Zone, West Zone, Central Zone, Bahir Dar Bay
4. THE seed data script SHALL create default quota records for each species with realistic limits
5. THE seed data script SHALL create 3 admin users with roles: admin, super_admin, field_officer
6. THE seed data script SHALL create 50 fisher users with Ethiopian names, valid license numbers, and boat names
7. THE seed data script SHALL create 200 catch records with varied statuses: 150 approved, 30 pending, 20 rejected
8. THE seed data script SHALL create 30 marketplace listings linked to approved catches
9. THE seed data script SHALL create 50 order records with varied statuses and buyers
10. THE seed data script SHALL create 100 notification records for fishers
11. THE seed data script SHALL create 20 alert records with varied severity levels
12. THE seed data script SHALL use realistic Ethiopian names, Lake Tana zone names, and contextually appropriate data
13. THE seed data script SHALL be idempotent and can be run multiple times without creating duplicate data
14. THE seed data script SHALL complete execution within 30 seconds


### Requirement 25: Logging and Monitoring

**User Story:** As a system administrator, I want structured logging and monitoring capabilities, so that I can troubleshoot issues, monitor system health, and analyze usage patterns.

#### Acceptance Criteria

1. THE Backend_API SHALL use Winston for structured logging with JSON format
2. THE Backend_API SHALL log to both console and file with daily rotation
3. THE Backend_API SHALL implement log levels: error, warn, info, debug
4. THE Backend_API SHALL log all HTTP requests with: method, path, status code, response time, user ID, IP address
5. THE Backend_API SHALL log all database queries exceeding 1 second with query text and execution time
6. THE Backend_API SHALL log all errors with: error message, stack trace, request context, user ID
7. THE Backend_API SHALL log all SSE connection events: connect, disconnect, error
8. THE Backend_API SHALL log all cache operations with: operation type, key, hit/miss status
9. THE Backend_API SHALL implement log file rotation with maximum file size of 20MB and retention of 14 days
10. THE Backend_API SHALL provide a health check endpoint at /api/v1/health returning database and Redis connection status
11. THE Backend_API SHALL provide a metrics endpoint at /api/v1/metrics returning: uptime, request count, error count, average response time
12. THE Backend_API SHALL not log sensitive information: passwords, tokens, personal data


### Requirement 26: Development Environment Setup

**User Story:** As a developer, I want a Docker Compose configuration that sets up the complete development environment with one command, so that I can start development quickly without manual configuration.

#### Acceptance Criteria

1. THE System SHALL provide a docker-compose.yml file that defines all required services
2. THE docker-compose.yml SHALL define the following services: postgres, redis, backend, fisher-app, admin-dashboard, marketplace
3. THE postgres service SHALL use PostgreSQL 15 with persistent volume for data storage
4. THE redis service SHALL use Redis 7 with persistent volume for data storage
5. THE backend service SHALL expose port 5000 and connect to postgres and redis services
6. THE fisher-app service SHALL expose port 3002 and proxy API requests to the backend service
7. THE admin-dashboard service SHALL expose port 3001 and proxy API requests to the backend service
8. THE marketplace service SHALL expose port 3003 and proxy API requests to the backend service
9. THE docker-compose.yml SHALL define environment variables for all services using a .env file
10. THE System SHALL provide a .env.example file with all required environment variables and example values
11. THE System SHALL provide a README.md with setup instructions and prerequisites
12. WHEN a developer runs "docker-compose up", THE System SHALL start all services and run database migrations automatically
13. THE System SHALL provide a seed data command that can be run after initial setup
14. THE docker-compose.yml SHALL define health checks for postgres and redis services


### Requirement 27: Fisher App Mobile Responsiveness

**User Story:** As a fisher using a mobile device, I want the Fisher App to be fully responsive and optimized for small screens, so that I can easily submit catches on my smartphone.

#### Acceptance Criteria

1. THE Fisher_App SHALL be fully responsive and functional on screen sizes from 320px to 768px width
2. THE Fisher_App SHALL use a mobile-first design approach with touch-friendly controls
3. THE Fisher_App SHALL provide touch targets of at least 44x44 pixels for all interactive elements
4. THE Fisher_App SHALL optimize the catch submission form for single-column layout on mobile devices
5. THE Fisher_App SHALL use native mobile input types: type="number" for weight, type="date" for catch date
6. THE Fisher_App SHALL display photos in a responsive grid that adapts to screen size
7. THE Fisher_App SHALL implement swipe gestures for photo gallery navigation
8. THE Fisher_App SHALL optimize font sizes for mobile readability: minimum 16px for body text
9. THE Fisher_App SHALL achieve a First Contentful Paint (FCP) of less than 2 seconds on 3G networks
10. THE Fisher_App SHALL achieve a Lighthouse mobile performance score of at least 80
11. THE Fisher_App SHALL implement lazy loading for images to optimize initial page load
12. THE Fisher_App SHALL provide a mobile-optimized navigation menu with hamburger icon


### Requirement 28: Admin Dashboard Desktop Optimization

**User Story:** As an admin user working on a desktop computer, I want the Admin Dashboard to be optimized for large screens with efficient data visualization, so that I can process submissions quickly and monitor system activity effectively.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL be optimized for screen sizes from 1280px to 1920px width
2. THE Admin_Dashboard SHALL use a multi-column layout to maximize screen real estate
3. THE Admin_Dashboard SHALL display the KPI overview in a 4-column grid on desktop screens
4. THE Admin_Dashboard SHALL display the catch list in a data table with sortable columns
5. THE Admin_Dashboard SHALL provide keyboard shortcuts for common actions: "A" for approve, "R" for reject, "/" for search focus
6. THE Admin_Dashboard SHALL implement infinite scroll or pagination for long lists
7. THE Admin_Dashboard SHALL display charts using a responsive charting library (Chart.js or Recharts)
8. THE Admin_Dashboard SHALL provide a split-view layout for catch detail: list on left, detail on right
9. THE Admin_Dashboard SHALL optimize for mouse and keyboard navigation
10. THE Admin_Dashboard SHALL achieve a Lighthouse desktop performance score of at least 90
11. THE Admin_Dashboard SHALL implement data table virtualization for lists exceeding 100 items
12. THE Admin_Dashboard SHALL provide export functionality for reports in CSV and PDF formats


### Requirement 29: Marketplace Hybrid Responsiveness

**User Story:** As a marketplace user, I want the Marketplace to work seamlessly on both desktop and mobile devices, so that I can browse and order fish from any device.

#### Acceptance Criteria

1. THE Marketplace SHALL be fully responsive and functional on screen sizes from 375px to 1920px width
2. THE Marketplace SHALL use a responsive grid layout: 1 column on mobile, 2 columns on tablet, 3 columns on desktop
3. THE Marketplace SHALL provide a mobile-optimized filter panel that slides in from the side
4. THE Marketplace SHALL display the statistics sidebar on desktop and collapse it into a dropdown on mobile
5. THE Marketplace SHALL optimize listing cards for touch interaction on mobile devices
6. THE Marketplace SHALL implement responsive images using srcset for different screen densities
7. THE Marketplace SHALL provide a mobile-optimized order form with large touch targets
8. THE Marketplace SHALL achieve a First Contentful Paint (FCP) of less than 2 seconds on both mobile and desktop
9. THE Marketplace SHALL achieve a Lighthouse performance score of at least 85 on mobile and 90 on desktop
10. THE Marketplace SHALL implement progressive enhancement for advanced features
11. THE Marketplace SHALL provide a responsive navigation menu that adapts to screen size
12. THE Marketplace SHALL optimize typography for readability across all screen sizes


### Requirement 30: System Reliability and Uptime

**User Story:** As a system stakeholder, I want the system to maintain high availability and reliability, so that fishers, admins, and buyers can depend on the platform for critical operations.

#### Acceptance Criteria

1. THE System SHALL achieve 99.5% uptime measured over a 30-day period
2. THE System SHALL implement graceful degradation when Redis is unavailable by falling back to direct database queries
3. THE System SHALL implement automatic reconnection for SSE connections with exponential backoff
4. THE System SHALL implement database connection pooling with automatic reconnection on connection loss
5. THE System SHALL implement health checks for all critical dependencies: database, Redis, Cloudinary
6. THE System SHALL return HTTP 503 Service Unavailable when critical dependencies are unavailable
7. THE System SHALL implement request retry logic with exponential backoff for transient failures
8. THE System SHALL implement circuit breaker pattern for external service calls (Cloudinary)
9. THE System SHALL log all service degradation events with severity level "error"
10. THE System SHALL provide a status page showing the health of all system components
11. THE System SHALL implement automated database backups every 24 hours with 30-day retention
12. THE System SHALL implement point-in-time recovery capability for the database
13. THE System SHALL ensure zero data loss for all committed transactions
14. THE System SHALL implement graceful shutdown procedures that complete in-flight requests before terminating
