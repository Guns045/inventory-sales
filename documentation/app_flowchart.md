flowchart TD
  User[User] --> LoginPage[Login Page]
  LoginPage --> AuthCheck[Authenticate Credentials]
  AuthCheck -->|Success| RoleCheck[Role Permission Check]
  AuthCheck -->|Failure| LoginPage
  RoleCheck -->|Authorized| Dashboard[Dashboard]
  RoleCheck -->|Not Authorized| Unauthorized[Access Denied]
  Dashboard --> ProductModule[Product Management]
  Dashboard --> QuoteModule[Quotation Management]
  Dashboard --> OrderModule[Sales Order Processing]
  Dashboard --> InventoryModule[Inventory Control]
  Dashboard --> InvoiceModule[Invoice Management]
  Dashboard --> ReportModule[Reporting]
  
  ProductModule --> ManageProducts[Create Update Archive Products]
  QuoteModule --> CreateQuote[Create Quotation]
  CreateQuote --> ApprovalFlow[Approve Quotation]
  ApprovalFlow -->|Approved| OrderModule
  ApprovalFlow -->|Rejected| QuoteModule
  OrderModule --> CreateOrder[Create Sales Order]
  CreateOrder --> OrderFulfillment[Fulfill Order]
  OrderFulfillment --> InventoryModule
  OrderModule --> GenerateInvoice[Generate Invoice]
  GenerateInvoice --> InvoiceModule
  InvoiceModule --> GeneratePDFInvoice[Generate Invoice PDF]
  QuoteModule --> GeneratePDFQuote[Generate Quotation PDF]
  InventoryModule --> TrackMovement[Track Stock Movements]
  TrackMovement --> Alerts[Low Stock Alerts]
  ReportModule --> GenerateReport[Generate Reports]