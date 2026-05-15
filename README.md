# Local Purchase MRN, GRN, and Invoice Attachment Management System

## Project Overview

This is a web-based internal company application for managing **local purchase** transactions. It provides a complete document management workflow covering Manual Material Receipt Notes (MRN), Goods Received Notes (GRN), and supplier invoice attachments.

**Important:** This system is designed exclusively for **local purchase items**. It does **not** include Purchase Requisition (PR) or Purchase Order (PO) features. There are no PR numbers, PO numbers, or purchase order workflows in this system. All purchases are handled through a simplified local purchase process that begins with a manual MRN document.

---

## Purpose of the System

The system serves as a centralized platform for:

- Tracking local purchase transactions from initiation to completion
- Managing manual MRN documents (handwritten or externally prepared)
- Recording goods receipt and store verification through GRN
- Attaching supplier invoices and supporting documents
- Maintaining a complete audit trail for all actions
- Enforcing approval workflows and business rules
- Generating printable MRN and GRN sheets in PDF format
- Providing search, reporting, and export capabilities

This application is intended for internal company use where items are purchased locally without going through formal PR/PO procurement processes.

---

## Local Purchase Workflow

The local purchase process follows a strict step-by-step workflow:

| Step | Action | Responsible |
|------|--------|-------------|
| 1 | Create a new local purchase record in the system | Requester |
| 2 | Upload photo or scanned copy of the manual MRN | Requester |
| 3 | Enter basic MRN details (supplier, item, quantity, etc.) | Requester |
| 4 | Purchase the item locally | Requester |
| 5 | Bring the received items to the stores department | Requester |
| 6 | Store team checks and verifies the received items | Store Keeper |
| 7 | Create or complete the GRN details | Store Keeper |
| 8 | Attach the supplier invoice to the record | Requester / Store Keeper |
| 9 | Upload signed GRN photo or scanned copy (if manually signed) | Store Keeper |
| 10 | Complete the local purchase record | Store Keeper |
| 11 | Approve or reject the record | Manager / Admin |
| 12 | All documents are retained for audit and record keeping | System |

### Process Flow Diagram

```
Manual MRN Created --> MRN Uploaded --> Item Purchased --> Goods Received at Stores
    --> GRN Pending --> Invoice Attached --> GRN Completed
    --> Pending Approval --> Approved / Rejected --> Completed
```

---

## Key Features

- **Local Purchase Record Management** - Create, view, edit, and track local purchase transactions
- **Manual MRN Upload** - Upload photos or scanned copies of handwritten/manual MRN documents
- **GRN Processing** - Complete GRN after goods are received and verified at stores
- **Invoice Attachment** - Attach supplier invoices linked to each local purchase record
- **Multiple Document Types** - Support for MRN, GRN, invoice, delivery note, quotation, payment proof, and other files
- **Printable MRN/GRN Sheets** - Generate downloadable PDF sheets with signature fields
- **Signed Document Upload** - Upload scanned signed MRN and GRN sheets after manual signing
- **Approval Workflow** - Multi-step approval with full audit trail
- **Role-Based Access Control** - Admin, Manager, Store Keeper, and Viewer roles
- **Audit Logging** - Every action is recorded with user, timestamp, and details
- **Search and Reporting** - Filter, search, and export reports in CSV and PDF formats
- **File Validation** - Enforced file type and size restrictions on uploads

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features, user management, system configuration |
| **Manager** | Approve/reject records, view all records, generate reports |
| **Store Keeper** | Create/edit local purchase records, upload documents, complete GRN, manage attachments |
| **Viewer** | Read-only access to records and reports |

---

## Main Modules

1. **Authentication Module** - User login, registration, password management with JWT tokens
2. **Local Purchase Module** - CRUD operations for local purchase records with status tracking
3. **Attachment Module** - File upload, download, and management for all document types
4. **GRN Module** - Goods receipt processing with quantity verification
5. **Approval Module** - Approval/rejection workflow with remarks and history
6. **PDF Generation Module** - Generate printable MRN and GRN sheets
7. **Audit Log Module** - Complete activity logging and audit trail
8. **Reporting Module** - Search, filter, and export data in CSV/PDF formats
9. **User Management Module** - Admin controls for user accounts and roles

---

## Local Purchase Record Fields

Each local purchase record contains the following information:

| Field | Description |
|-------|-------------|
| Supplier Name | Name of the local supplier |
| Purchase Category | Category of the purchased item |
| Item Name / Description | Name or description of the item being purchased |
| Quantity | Number of units purchased |
| Unit Price | Price per unit |
| Total Amount | Calculated total (quantity x unit price) |
| MRN Number | Unique Material Receipt Note reference number |
| Manual MRN Upload | Uploaded photo/scan of the manual MRN document |
| GRN Number | Unique Goods Received Note reference number |
| Invoice Number | Supplier invoice reference number |
| Invoice Date | Date on the supplier invoice |
| Received Date | Date goods were received at stores |
| Store Received Status | Whether stores has confirmed receipt |
| Invoice Attached Status | Whether the supplier invoice has been uploaded |
| GRN Completion Status | Whether the GRN has been completed |
| Final Status | Current workflow status of the record |
| Remarks | Additional notes or comments |
| Created By | User who created the record |
| Created Date | Date and time the record was created |

---

## Manual MRN Upload Process

The MRN is the starting document for every local purchase. It is created manually (handwritten or prepared outside the system) before any purchase is made.

### Process Steps:

1. The user prepares a manual MRN document (handwritten or typed externally)
2. The user creates a new local purchase record in the system
3. The user uploads a photo or scanned copy of the manual MRN
4. The uploaded MRN is attached to the local purchase record
5. The system updates the record status to "MRN Uploaded"
6. The MRN serves as the authorization document for the local purchase

### Accepted Upload Formats:

- Photograph of the handwritten MRN (JPG, JPEG, PNG)
- Scanned copy of the MRN (PDF, PNG, JPG)

### Important Notes:

- A local purchase record cannot be completed without an MRN attachment
- The MRN number must be unique across all records
- The original manual MRN should be retained for physical audit

---

## GRN Completion Process

The GRN is completed only after purchased goods arrive at the stores department and are verified.

### Process Steps:

1. Items are delivered to the stores department
2. Store Keeper inspects and counts the received goods
3. Store Keeper records the following in the GRN:
   - Received Quantity
   - Checked Quantity
   - Accepted Quantity
   - Rejected Quantity
   - Remarks (condition, discrepancies, etc.)
   - Store Confirmation
4. If quantities match and goods are acceptable, the GRN is completed
5. If there are discrepancies or rejections, remarks are recorded
6. The user may upload a signed GRN photo or scanned copy

### Business Rules:

- The GRN cannot be marked as completed until the invoice is attached
- The GRN cannot be completed until goods are physically checked
- Quantity mismatches must be documented with remarks
- Rejected items must be noted with a reason

---

## Invoice Attachment Process

The supplier invoice is received after the local purchase is made and must be attached to the corresponding record.

### Process Steps:

1. The supplier provides an invoice after the purchase
2. The user uploads the invoice document to the local purchase record
3. The system links the invoice to the record and updates the status
4. Invoice details (number, date) are recorded in the local purchase record
5. The GRN can now be completed (invoice attachment is a prerequisite)

### Business Rules:

- The invoice must be attached before the GRN can be marked as completed
- Each invoice should be linked to one local purchase record
- The invoice number and date are mandatory fields once attached
- A local purchase record cannot reach "Completed" status without an invoice

---

## Attachment Types

The system supports the following document attachment types:

| Attachment Type | Description |
|-----------------|-------------|
| Manual MRN Photo | Photograph of the handwritten MRN |
| Manual MRN Scanned Copy | Scanned PDF/image of the manual MRN |
| GRN Photo | Photograph of the completed GRN form |
| GRN Scanned Copy | Scanned PDF/image of the completed GRN |
| Invoice | Supplier invoice document |
| Delivery Note | Supplier delivery note |
| Quotation | Price quotation from supplier |
| Payment Proof | Receipt or proof of payment |
| Signed MRN Sheet | Scanned copy of the signed printable MRN sheet |
| Signed GRN Sheet | Scanned copy of the signed printable GRN sheet |
| Other Supporting Documents | Any other relevant documentation |

---

## Printable / Downloadable MRN and GRN Sheets

The system generates professional PDF sheets that can be printed, signed manually, and re-uploaded as signed copies.

### MRN Sheet

Users can generate and download an MRN sheet from each local purchase record. The MRN sheet includes:

- Supplier details (name, contact)
- Item details (name, description, category)
- Required quantity
- Purchase reason / justification
- Remarks
- Signature fields:
  - Prepared By
  - Checked By
  - Approved By
  - Received By

### GRN Sheet

Users can generate and download a GRN sheet from each local purchase record. The GRN sheet includes:

- Goods received details (item, supplier, date)
- Checked quantity
- Accepted quantity
- Rejected quantity
- Condition remarks
- Signature fields:
  - Prepared By
  - Checked By
  - Approved By
  - Received By

### Sheet Workflow:

1. User generates the PDF sheet from the system
2. Sheet is printed and signed manually by relevant parties
3. Signed sheet is scanned or photographed
4. Signed copy is uploaded back to the system as an attachment
5. Both the generated PDF and signed uploaded copy are retained for audit

### Format:

- All downloadable sheets are generated in **PDF format** using PDFKit

---

## Approval Workflow

### Status Progression:

| Status | Description |
|--------|-------------|
| MRN Created | Local purchase record initiated |
| MRN Uploaded | Manual MRN document uploaded to the system |
| Item Purchased | Item has been purchased from the local supplier |
| Goods Received at Stores | Items delivered to the stores department |
| GRN Pending | Awaiting goods verification and GRN completion |
| Invoice Attached | Supplier invoice has been uploaded |
| GRN Completed | Goods verified and GRN finalized |
| Pending Approval | Record submitted for management approval |
| Approved | Record approved by Manager/Admin |
| Rejected | Record rejected with remarks |
| Completed | All steps finalized and record closed |

### Approval Rules:

- A record **cannot** be completed without an MRN attachment
- A record **cannot** be completed without an invoice attachment
- A record **cannot** be completed without GRN completion
- If goods are rejected or quantity is mismatched, the system allows remarks and rejection status
- All approvals, rejections, uploads, and edits are recorded in the audit log
- Only users with Manager or Admin roles can approve or reject records

---

## Search and Reporting

The system provides comprehensive search and reporting capabilities:

### Search Features:

- Search by supplier name, item name, MRN number, GRN number, or invoice number
- Filter by status, date range, purchase category, or created by user
- Sort by any column (date, amount, status, etc.)
- Pagination for large result sets

### Report Exports:

- **CSV Export** - Download filtered results as CSV files
- **PDF Export** - Generate formatted PDF reports
- **Summary Reports** - Totals by category, supplier, status, or date range
- **Audit Reports** - Complete history of actions on records

---

## File Upload Rules

| Rule | Value |
|------|-------|
| Maximum file size | 10 MB per file |
| Allowed formats | PDF, JPG, JPEG, PNG, DOCX, XLSX, ZIP |
| Storage location | Server-side `uploads/` directory |
| Naming convention | UUID-based unique filenames |
| Virus scanning | Recommended for production deployment |

### Allowed File Extensions:

- `.pdf` - PDF documents
- `.jpg` / `.jpeg` - JPEG images
- `.png` - PNG images
- `.docx` - Microsoft Word documents
- `.xlsx` - Microsoft Excel spreadsheets
- `.zip` - Compressed archives

---

## Security Features

- **JWT Authentication** - Secure token-based authentication for all API endpoints
- **Role-Based Access Control (RBAC)** - Permissions enforced based on user roles
- **Password Hashing** - Bcrypt hashing for all stored passwords
- **Helmet.js** - HTTP security headers for protection against common attacks
- **CORS Configuration** - Cross-origin request restrictions
- **Input Validation** - Server-side validation using express-validator
- **File Type Validation** - Only allowed file types can be uploaded
- **File Size Limits** - Maximum upload size enforced
- **Audit Trail** - Complete logging of all user actions with IP address tracking
- **Soft Deletes** - Records are deactivated rather than permanently deleted

---

## Suggested Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js with Express.js |
| **Frontend** | React 18 with React Router |
| **Build Tool** | Vite |
| **ORM** | Sequelize |
| **Database** | SQLite (development) / PostgreSQL (production) |
| **Authentication** | JSON Web Tokens (JWT) |
| **PDF Generation** | PDFKit |
| **File Uploads** | Multer |
| **Validation** | express-validator |
| **Security** | Helmet, bcryptjs, CORS |
| **Testing** | Jest with Supertest |
| **Process Manager** | Nodemon (development) |

---

## Database Overview

The system uses five main database tables:

### Tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles and authentication data |
| `local_purchases` | Main records for each local purchase transaction |
| `attachments` | Uploaded file metadata linked to local purchase records |
| `approval_histories` | Approval/rejection actions with remarks |
| `audit_logs` | Complete log of all system actions |

### Relationships:

- A **User** can create many **Local Purchase** records
- A **Local Purchase** can have many **Attachments**
- A **Local Purchase** can have many **Approval History** entries
- A **User** can generate many **Audit Log** entries

### Key Indexes:

- Unique index on `mrn_number`
- Unique index on `grn_number`
- Unique index on `username` and `email`
- Foreign keys linking attachments and approvals to local purchase records

---

## Installation Steps

### Prerequisites:

- Node.js v18 or higher (v22 recommended)
- npm (included with Node.js)
- Git

### Steps:

```bash
# 1. Clone the repository
git clone <repository-url>
cd item-request-and-grn

# 2. Install dependencies
npm install

# 3. Create environment configuration
cp .env.example .env

# 4. Edit the .env file with your settings
# Update JWT_SECRET, database credentials, and other settings as needed

# 5. Run database migrations
npm run migrate

# 6. (Optional) Seed default admin user
npm run seed

# 7. Build the frontend
npm run build

# 8. Start the application
npm start
```

---

## Environment Configuration

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Application
APP_NAME=Local Purchase Management System
APP_PORT=3000
APP_ENV=development

# Database (PostgreSQL for production)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=local_purchase_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_DIALECT=sqlite

# SQLite (for development/testing)
DB_STORAGE=./database.sqlite

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Authentication
JWT_SECRET=your_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# PDF Generation
PDF_TEMPLATE_DIR=./src/templates
```

### Configuration Notes:

- Set `DB_DIALECT=postgres` and configure PostgreSQL credentials for production
- Use `DB_DIALECT=sqlite` with `DB_STORAGE` path for development/testing
- Change `JWT_SECRET` to a strong random string in production
- `MAX_FILE_SIZE` is in bytes (default: 10 MB = 10485760)

---

## How to Run the Project

### Development Mode (Backend + Frontend):

```bash
# Start the backend server with auto-reload
npm run dev

# In a separate terminal, start the frontend dev server
npm run dev:frontend
```

### Production Mode:

```bash
# Build the frontend
npm run build

# Start the server (serves both API and frontend)
npm start
```

### Running Tests:

```bash
# Run all tests
npm test
```

### Default Admin Credentials:

On first startup, the system creates a default admin user:

- **Username:** admin
- **Password:** admin123

> Change the default password immediately after first login.

---

## Folder Structure

```
item-request-and-grn/
|-- config/
|   |-- database.js              # Database configuration (Sequelize)
|-- migrations/
|   |-- 001-initial-schema.js    # Database migration scripts
|-- public/
|   |-- dist/                    # Built frontend assets (generated)
|-- src/
|   |-- controllers/
|   |   |-- approvalController.js
|   |   |-- attachmentController.js
|   |   |-- auditLogController.js
|   |   |-- authController.js
|   |   |-- localPurchaseController.js
|   |   |-- pdfController.js
|   |   |-- reportController.js
|   |   |-- userController.js
|   |-- frontend/
|   |   |-- components/
|   |   |   |-- Layout.jsx
|   |   |   |-- PrivateRoute.jsx
|   |   |-- context/
|   |   |   |-- AuthContext.jsx
|   |   |-- pages/
|   |   |   |-- AttachmentUploadModal.jsx
|   |   |   |-- AuditLogsPage.jsx
|   |   |   |-- DashboardPage.jsx
|   |   |   |-- LocalPurchaseDetailPage.jsx
|   |   |   |-- LocalPurchaseFormPage.jsx
|   |   |   |-- LocalPurchasesPage.jsx
|   |   |   |-- LoginPage.jsx
|   |   |   |-- ReportsPage.jsx
|   |   |   |-- UsersPage.jsx
|   |   |-- services/
|   |   |   |-- api.js
|   |   |-- App.jsx
|   |   |-- index.css
|   |   |-- index.html
|   |   |-- main.jsx
|   |-- middleware/
|   |   |-- auth.js              # JWT authentication middleware
|   |   |-- errorHandler.js      # Global error handler
|   |   |-- rbac.js              # Role-based access control
|   |   |-- upload.js            # Multer file upload configuration
|   |   |-- validate.js          # Request validation
|   |-- models/
|   |   |-- ApprovalHistory.js
|   |   |-- Attachment.js
|   |   |-- AuditLog.js
|   |   |-- index.js             # Model initialization and associations
|   |   |-- LocalPurchase.js
|   |   |-- User.js
|   |-- routes/
|   |   |-- approvalRoutes.js
|   |   |-- attachmentRoutes.js
|   |   |-- auditLogRoutes.js
|   |   |-- authRoutes.js
|   |   |-- index.js             # Central route mounting
|   |   |-- localPurchaseRoutes.js
|   |   |-- pdfRoutes.js
|   |   |-- reportRoutes.js
|   |   |-- userRoutes.js
|   |-- services/
|   |   |-- approvalService.js
|   |   |-- authService.js
|   |   |-- localPurchaseService.js
|   |   |-- pdfService.js
|   |   |-- reportService.js
|   |-- templates/               # PDF templates
|   |-- utils/
|   |   |-- auditLogger.js
|   |   |-- seed.js
|   |-- app.js                   # Express app configuration
|   |-- server.js                # Server entry point
|-- tests/
|   |-- approval.test.js
|   |-- attachments.test.js
|   |-- auditLogs.test.js
|   |-- auth.test.js
|   |-- localPurchases.test.js
|   |-- pdf.test.js
|   |-- reports.test.js
|   |-- setup.js                 # Test configuration
|   |-- users.test.js
|-- uploads/                     # Uploaded files (gitignored)
|-- .env.example                 # Environment variable template
|-- .gitignore
|-- package.json
|-- vite.config.js               # Vite frontend build configuration
```

---

## Future Improvements

- Email notifications for approval requests and status changes
- Dashboard analytics with charts and graphs
- Mobile-responsive progressive web app (PWA) support
- Barcode/QR code generation for MRN and GRN tracking
- Integration with accounting systems for invoice reconciliation
- Bulk upload support for multiple attachments
- Digital signature support (eliminating the need for manual signing)
- Supplier database with contact management
- Budget tracking and spending limits per category
- Multi-language support for international teams
- Automated backup and disaster recovery
- API rate limiting and throttling for production deployment
- OCR support for extracting data from scanned documents

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
