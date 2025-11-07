<?php

namespace App\Traits;

use App\Models\DocumentCounter;
use App\Models\Warehouse;

trait DocumentNumberHelper
{
    /**
     * Generate document number with format: [PREFIX]-[SEQUENCE]/[WAREHOUSE]/[MM-YYYY]
     *
     * @param string $documentType Document type (QUOTATION, SALES_ORDER, etc.)
     * @param int|null $warehouseId Warehouse ID for warehouse-specific numbering
     * @return string Generated document number
     */
    public function generateDocumentNumber($documentType, $warehouseId = null)
    {
        return DocumentCounter::getNextNumber($documentType, $warehouseId);
    }

    /**
     * Generate quotation number
     *
     * @param int|null $warehouseId
     * @return string
     */
    public function generateQuotationNumber($warehouseId = null)
    {
        return $this->generateDocumentNumber('QUOTATION', $warehouseId);
    }

    /**
     * Generate picking list number
     *
     * @param int|null $warehouseId
     * @return string
     */
    public function generatePickingListNumber($warehouseId = null)
    {
        return $this->generateDocumentNumber('PICKING_LIST', $warehouseId);
    }

    /**
     * Generate delivery order number
     *
     * @param int|null $warehouseId
     * @return string
     */
    public function generateDeliveryOrderNumber($warehouseId = null)
    {
        return $this->generateDocumentNumber('DELIVERY_ORDER', $warehouseId);
    }

    /**
     * Generate sales order number
     *
     * @param int|null $warehouseId
     * @return string
     */
    public function generateSalesOrderNumber($warehouseId = null)
    {
        return $this->generateDocumentNumber('SALES_ORDER', $warehouseId);
    }

    /**
     * Generate invoice number
     *
     * @param int|null $warehouseId
     * @return string
     */
    public function generateInvoiceNumber($warehouseId = null)
    {
        return $this->generateDocumentNumber('INVOICE', $warehouseId);
    }

    /**
     * Validate document number format
     *
     * @param string $documentNumber
     * @param string $expectedCode
     * @return bool
     */
    public function validateDocumentNumber($documentNumber, $expectedCode = null)
    {
        $pattern = '/^[A-Z]{2}-\d{3}\/[A-Z]{3,4}\/\d{2}-\d{4}$/';

        if (!preg_match($pattern, $documentNumber)) {
            return false;
        }

        if ($expectedCode && !str_starts_with($documentNumber, $expectedCode . '-')) {
            return false;
        }

        return true;
    }

    /**
     * Extract information from document number
     *
     * @param string $documentNumber
     * @return array
     */
    public function parseDocumentNumber($documentNumber)
    {
        if (!$this->validateDocumentNumber($documentNumber)) {
            return null;
        }

        // Parse format: CODE-SEQUENCE/WAREHOUSE/MM-YYYY
        $parts = explode('-', $documentNumber);
        if (count($parts) < 2) {
            return null;
        }

        $code = $parts[0];
        $remaining = $parts[1] ?? '';

        $sequenceParts = explode('/', $remaining);
        if (count($sequenceParts) < 3) {
            return null;
        }

        $sequence = $sequenceParts[0] ?? '0';
        $warehouse = $sequenceParts[1] ?? '';
        $dateParts = explode('-', $sequenceParts[2] ?? '');

        if (count($dateParts) < 2) {
            return null;
        }

        $month = $dateParts[0] ?? '01';
        $year = $dateParts[1] ?? '2024';

        return [
            'code' => $code,
            'sequence' => intval($sequence),
            'warehouse' => $warehouse,
            'month' => $month,
            'year' => $year,
            'full_date' => \Carbon\Carbon::createFromFormat('m-Y', $month . '-' . $year)
        ];
    }
}