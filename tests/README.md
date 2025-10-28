# Test Files and Utilities

This directory contains test files and utility scripts used during development and testing of the Inventory Management System.

## Test Files

### API Tests
- `test_api_endpoints.php` - Tests various API endpoints for functionality
- `test_rbac_api.php` - Tests Role-Based Access Control API endpoints
- `test_rbac_complete.php` - Comprehensive RBAC system test

### Approval System Tests
- `test_approval_functions.php` - Tests quotation approval functionality

### Database and Data Tests
- `check_products.php` - Checks product data integrity
- `debug_product_price.php` - Debugs product pricing issues

### Test Data Creation
- `create_test_quotations.php` - Creates test quotation data
- `create_test_quotations_fixed.php` - Fixed version of test quotation creation
- `create_admin_user.php` - Creates admin user for testing
- `cleanup_problematic_quotations.php` - Cleans up problematic quotation data

### Database Fixes
- `fix_all_products.php` - Fixes product data issues
- `reset_admin_password.php` - Resets admin password to default

### Debug and Analysis
- `comprehensive_debug.php` - Comprehensive debugging script
- `debug_product_price.php` - Specific debugging for product pricing

## Test Outputs
- `quotation-test.pdf` - Sample PDF output from quotation testing
- `quotation-test.xlsx` - Sample Excel output from quotation testing

## Usage

All test files should be run from the project root directory:

```bash
php tests/test_rbac_complete.php
```

⚠️ **Warning**: These files are for development and testing purposes only. Do not run in production environments.