# Local Purchase MRN, GRN, and Invoice Attachment Management System

## Project Overview

This is a web-based internal company application designed to manage local purchase documents including Material Receipt Notes (MRN), Goods Received Notes (GRN), and invoice attachments. The system provides a centralized platform for creating local purchase records and attaching all related supporting documents for audit, tracking, and approval purposes.

> **Important:** This system is built exclusively for local purchase items. It does not include or use Purchase Requisition (PR), Purchase Order (PO), PR numbers, PO numbers, or any purchase order workflows. All records are managed through a simplified local purchase process without PR/PO dependencies.

## Purpose of the System

The purpose of this system is to:

- Provide a centralized document management solution for local purchases
- Eliminate paper-based tracking and reduce lost or misplaced documents
- Enable digital record-keeping of MRN, GRN, invoices, and supporting files
- Generate printable MRN and GRN sheets for manual signing and verification
- Support approval workflows for local purchase records
- Maintain a complete audit trail for all local purchase transactions
- Improve accountability and transparency in the local procurement process

## Key Features

- Create, view, edit, and manage local purchase records
- Upload and organize multiple document types per record
- Generate downloadable MRN and GRN sheets in PDF format
- Upload signed copies of MRN and GRN sheets after manual signing
- Multi-level approval workflow (Pending, Approved, Rejected, Completed)
- Role-based access control for different user types
- Search and filter records by various criteria
- Audit trail and record history tracking
- Secure file storage with format validation

## User Roles

| Role | Permissions |
|------|------------|
| Admin | Full system access, user management, configuration |
| Manager | Approve or reject records, view all records and reports |
| Store Keeper | Create records, upload attachments, generate MRN/GRN sheets |
| Viewer | View records and attachments (read-only access) |

## Main Modules

1. **Local Purchase Record Management** - Create and manage local purchase entries
2. **Document Attachment Module** - Upload and organize supporting documents
3. **MRN/GRN Sheet Generation** - Generate printable PDF sheets for signing
4. **Approval Workflow Module** - Submit, approve, reject, and complete records
5. **User Management** - Manage users and assign roles
6. **Search and Reporting** - Find records and generate reports
7. **Audit Trail** - Track all changes and actions on records

## Local Purchase Record Fields

Each local purchase record contains the following information:

| Field | Description |
|-------|-------------|
| Supplier Name | Name of the local supplier |
| Purchase Category | Category of the purchased item |
| Item Name or Description | Name or detailed description of the item |
| Quantity | Number of items purchased |
| Unit Price | Price per unit |
| Total Amount | Total cost (Quantity x Unit Price) |
| MRN Number | Material Receipt Note reference number |
| GRN Number | Goods Received Note reference number |
| Invoice Number | Supplier invoice reference number |
| Invoice Date | Date on the supplier invoice |
| Received Date | Date the goods were received |
| Status | Current approval status of the record |
| Remarks | Additional notes or comments |
| Created By | User who created the record |
| Created Date | Date and time the record was created |

## Attachment Types

The system supports the following document attachment categories for each local purchase record:

- **MRN** - Material Receipt Note document
- **GRN** - Goods Received Note document
- **Invoice** - Supplier invoice
- **Delivery Note** - Delivery note from supplier
- **Quotation** - Price quotation from supplier
- **Payment Proof** - Proof of payment (receipt, bank transfer confirmation)
- **Signed MRN Sheet** - Scanned copy of manually signed MRN sheet
- **Signed GRN Sheet** - Scanned copy of manually signed GRN sheet
- **Other Supporting Documents** - Any other relevant documents

## Printable / Downloadable MRN and GRN Sheets

### MRN Sheet (Material Receipt Note)

- Users can generate and download an MRN sheet from each local purchase record
- The MRN sheet is generated in **PDF format**
- MRN sheet contents include:
  - Supplier details (name, category)
  - Item details (name/description, quantity, unit price, total amount)
  - Received quantity
  - Received date
  - Remarks
  - Signature fields

### GRN Sheet (Goods Received Note)

- Users can generate and download a GRN sheet from each local purchase record
- The GRN sheet is generated in **PDF format**
- GRN sheet contents include:
  - Goods received details
  - Checked quantity
  - Accepted quantity
  - Rejected quantity
  - Remarks
  - Signature fields

### Signature Fields on Both Sheets

Both MRN and GRN sheets include the following signature fields for manual signing:

| Signature Field | Purpose |
|----------------|---------|
| Prepared By | Person who prepared the document |
| Checked By | Person who verified the details |
| Approved By | Person who authorized the receipt |
| Received By | Person who physically received the goods |

### Signed Sheet Upload Workflow

1. Generate and download the MRN or GRN sheet (PDF)
2. Print the sheet
3. Obtain required signatures manually
4. Scan the signed sheet
5. Upload the signed copy back to the system as an attachment

The system retains both the originally generated PDF sheet and the signed uploaded copy for complete audit and record-keeping purposes.

## Approval Workflow

Each local purchase record goes through the following approval statuses:

```
Pending --> Approved --> Completed
   |
   +--> Rejected
```

| Status | Description |
|--------|-------------|
| Pending | Record has been created and is awaiting review |
| Approved | Record has been reviewed and approved by a manager |
| Rejected | Record has been reviewed and rejected (with remarks) |
| Completed | All documents are attached and the record is finalized |

## Search and Reporting

The system provides the following search and reporting capabilities:

- Search by supplier name
- Search by MRN number or GRN number
- Search by invoice number
- Filter by date range (invoice date, received date, created date)
- Filter by status (Pending, Approved, Rejected, Completed)
- Filter by purchase category
- Filter by created user
- Export search results to Excel or PDF

## File Upload Rules

| Rule | Details |
|------|---------|
| Allowed Formats | PDF, JPG, PNG, DOCX, XLSX, ZIP |
| Maximum File Size | 10 MB per file (configurable) |
| Multiple Files | Multiple attachments allowed per record |
| File Naming | System auto-generates file names with record reference |
| Storage | Files stored in a secure server directory or cloud storage |

## Security Features

- Role-based access control (RBAC)
- User authentication with secure password hashing
- Session management with timeout
- File type validation on upload (whitelist approach)
- Input sanitization to prevent injection attacks
- Audit logging for all user actions
- HTTPS enforcement for data in transit
- Secure file storage with access control

## Suggested Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js or Vue.js |
| Backend | Node.js (Express) or PHP (Laravel) |
| Database | MySQL or PostgreSQL |
| PDF Generation | PDFKit, Puppeteer, or dompdf |
| File Storage | Local server storage or AWS S3 |
| Authentication | JWT or session-based authentication |
| API | RESTful API |

## Database Overview

The system uses a relational database with the following main tables:

- **users** - User accounts and roles
- **local_purchases** - Local purchase records with all fields
- **attachments** - Uploaded document files linked to purchase records
- **approval_history** - Approval status changes and remarks
- **audit_logs** - System activity and change tracking

### Entity Relationship Summary

```
users (1) -----> (many) local_purchases
local_purchases (1) -----> (many) attachments
local_purchases (1) -----> (many) approval_history
users (1) -----> (many) audit_logs
```

## Installation Steps

### Prerequisites

- Node.js (v16 or higher) or PHP (v8.0 or higher)
- MySQL (v8.0 or higher) or PostgreSQL (v13 or higher)
- npm or yarn (for Node.js) / Composer (for PHP)
- Git

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd item-request-and-grn
```

2. Install dependencies:

```bash
# For Node.js
npm install

# For PHP/Laravel
composer install
```

3. Set up the database:

```bash
# Create the database
mysql -u root -p -e "CREATE DATABASE local_purchase_db;"

# Run migrations
npm run migrate
# or
php artisan migrate
```

4. Configure environment variables (see Environment Configuration below)

5. Start the application (see How to Run the Project below)

## Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# Application
APP_NAME=Local Purchase Management System
APP_PORT=3000
APP_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=local_purchase_db
DB_USER=root
DB_PASSWORD=your_password

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Authentication
JWT_SECRET=your_secret_key
SESSION_TIMEOUT=3600

# PDF Generation
PDF_TEMPLATE_DIR=./templates
```

## How to Run the Project

### Development Mode

```bash
# For Node.js
npm run dev

# For PHP/Laravel
php artisan serve
```

### Production Mode

```bash
# For Node.js
npm run build
npm start

# For PHP/Laravel
php artisan config:cache
php artisan serve --env=production
```

The application will be accessible at `http://localhost:3000` (default port).

## Folder Structure

```
item-request-and-grn/
├── src/
│   ├── controllers/        # Request handlers
│   ├── models/             # Database models
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic
│   ├── middleware/         # Authentication and validation
│   ├── utils/              # Utility functions
│   └── templates/          # PDF templates for MRN/GRN sheets
├── public/                 # Static assets
├── uploads/                # Uploaded attachments (gitignored)
├── migrations/             # Database migration files
├── tests/                  # Unit and integration tests
├── config/                 # Configuration files
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore rules
├── package.json            # Project dependencies
└── README.md               # Project documentation
```

## Future Improvements

- Email notifications on approval status changes
- Dashboard with summary statistics and charts
- Bulk upload of attachments via ZIP extraction
- Integration with accounting or ERP systems
- Mobile-responsive design for on-site use
- Barcode or QR code generation for MRN/GRN tracking
- Digital signature support to replace manual signing
- Automated report generation on schedule
- Multi-language support
- Advanced analytics and spending reports by category or supplier

## License

This project is licensed under the [MIT License](LICENSE).

---

*This system is designed for internal company use to manage local purchase documents. It does not include Purchase Requisition (PR) or Purchase Order (PO) workflows. All records are handled through a direct local purchase process.*
