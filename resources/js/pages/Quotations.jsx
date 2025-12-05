import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAPI } from '@/contexts/APIContext';
import { useCRUD } from '@/hooks/useCRUD';
import { useModal } from '@/hooks/useModal';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/common/PageHeader';
import { QuotationTable } from '@/components/transactions/QuotationTable';
import { QuotationForm } from '@/components/transactions/QuotationForm';
import { RejectModal } from '@/components/transactions/RejectModal';
import { QuotationDetailModal } from '@/components/transactions/QuotationDetailModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Quotations = () => {
  const { api } = useAPI();
  const {
    items: quotations,
    loading,
    pagination,
    fetchItems,
    create,
    update,
    remove,
    getById,
    setPage
  } = useCRUD('/quotations');

  const { showSuccess, showError } = useToast();

  // Modals
  const { isOpen: isFormOpen, open: openForm, close: closeForm } = useModal();
  const { isOpen: isRejectOpen, open: openReject, close: closeReject } = useModal();
  const { isOpen: isDeleteOpen, open: openDelete, close: closeDelete } = useModal();
  const { isOpen: isDetailOpen, open: openDetail, close: closeDetail } = useModal();

  // State
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dependenciesLoading, setDependenciesLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch dependencies
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        setDependenciesLoading(true);
        const [custRes, prodRes, whRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products'),
          api.get('/warehouses')
        ]);
        setCustomers(custRes.data || []);
        setProducts(prodRes.data.data || []);
        setWarehouses(whRes.data || []);
      } catch (err) {
        console.error('Failed to fetch dependencies:', err);
        showError('Failed to load necessary data');
      } finally {
        setDependenciesLoading(false);
      }
    };
    fetchDependencies();
  }, []);

  // Handlers
  const handleCreate = () => {
    setSelectedQuotation(null);
    openForm();
  };

  // Handle query params for auto-actions
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      handleCreate();
      // Clear the param so it doesn't reopen on refresh
      setSearchParams(params => {
        const newParams = new URLSearchParams(params);
        newParams.delete('action');
        return newParams;
      });
    }
  }, [searchParams]);

  const handleEdit = async (quotation) => {
    try {
      setFormLoading(true);
      const { success, data, error } = await getById(quotation.id);
      if (success) {
        // Unwrap data if it's wrapped in a 'data' property (Laravel Resource)
        const quotationData = data.data || data;

        // Transform data if needed to match form expectation
        const formData = {
          ...quotationData,
          customer_id: quotationData.customer?.id,
          warehouse_id: quotationData.warehouse?.id,
          items: quotationData.items || []
        };
        setSelectedQuotation(formData);
        openForm();
      } else {
        showError(error);
      }
    } catch (err) {
      showError('Failed to load quotation details');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      setFormLoading(true);
      let result;
      if (selectedQuotation) {
        result = await update(selectedQuotation.id, formData);
      } else {
        result = await create(formData);
      }

      if (result.success) {
        showSuccess(selectedQuotation ? 'Quotation updated successfully' : 'Quotation created successfully');
        closeForm();
      } else {
        showError(result.error);
      }
    } catch (err) {
      showError('An unexpected error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (quotation) => {
    setSelectedQuotation(quotation);
    openDelete();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuotation) return;
    const result = await remove(selectedQuotation.id);
    if (result.success) {
      showSuccess('Quotation deleted successfully');
      closeDelete();
    } else {
      showError(result.error);
    }
  };

  const handleApprove = async (quotation) => {
    if (window.confirm('Are you sure you want to approve this quotation?')) {
      try {
        await api.post(`/quotations/${quotation.id}/approve`, { notes: '' });
        showSuccess('Quotation approved successfully');
        fetchItems(pagination.current_page);
      } catch (err) {
        showError(err.response?.data?.message || 'Failed to approve quotation');
      }
    }
  };

  const handleRejectClick = (quotation) => {
    setSelectedQuotation(quotation);
    openReject();
  };

  const handleRejectConfirm = async ({ reason_type, notes }) => {
    if (!selectedQuotation) return;
    try {
      await api.post(`/quotations/${selectedQuotation.id}/reject`, {
        reason_type,
        notes
      });
      showSuccess('Quotation rejected successfully');
      closeReject();
      fetchItems(pagination.current_page);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reject quotation');
    }
  };

  const handleSubmitForApproval = async (quotation) => {
    if (window.confirm('Submit this quotation for approval?')) {
      try {
        await api.post(`/quotations/${quotation.id}/submit`, {
          notes: 'Please review this quotation for approval'
        });
        showSuccess('Quotation submitted for approval');
        fetchItems(pagination.current_page);
      } catch (err) {
        showError(err.response?.data?.message || 'Failed to submit quotation');
      }
    }
  };

  const handleConvertToSO = async (quotation) => {
    if (window.confirm('Convert this quotation to Sales Order? Stock will be reserved.')) {
      try {
        const response = await api.post(`/quotations/${quotation.id}/create-sales-order`, {
          notes: `Converted from Quotation ${quotation.quotation_number}`
        });
        showSuccess(response.data.stock_reserved ? 'Converted and stock reserved!' : 'Converted successfully!');
        fetchItems(pagination.current_page);
      } catch (err) {
        let msg = err.response?.data?.message || 'Failed to convert';
        if (err.response?.data?.can_convert === false) {
          msg += '. Check approval status or stock.';
        }
        showError(msg);
      }
    }
  };

  const handleView = async (quotation) => {
    try {
      // Fetch full details including items
      const { success, data, error } = await getById(quotation.id);
      if (success) {
        setSelectedQuotation(data.data || data);
        openDetail();
      } else {
        showError(error);
      }
    } catch (err) {
      showError('Failed to load quotation details');
    }
  };

  const handlePrint = async (quotation) => {
    try {
      const response = await api.get(`/quotations/${quotation.id}/print`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (blob.size < 1000) throw new Error('PDF corrupted');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation-${quotation.quotation_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError('Failed to print quotation');
    }
  };

  const handleSearchProducts = React.useCallback(async (query) => {
    try {
      const response = await api.get(`/products?search=${query}&per_page=20`);
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Failed to search products:', err);
    }
  }, [api]);

  if (isFormOpen) {
    return (
      <div className="container mx-auto p-6">
        <QuotationForm
          initialData={selectedQuotation}
          customers={customers}
          warehouses={warehouses}
          products={products}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          onSearchProducts={handleSearchProducts}
          loading={formLoading}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Quotation
          </Button>
        </div>
      </div>

      <div className="h-full flex-1 flex-col space-y-8 flex">
        <Card>
          <CardHeader>
            <CardTitle>Manage Quotations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create, view, and manage customer quotations.
            </p>
          </CardHeader>
          <CardContent>
            <QuotationTable
              data={quotations}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onApprove={handleApprove}
              onReject={handleRejectClick}
              onSubmit={handleSubmitForApproval}
              onConvert={handleConvertToSO}
              onPrint={handlePrint}
              onView={handleView}
            />
          </CardContent>
        </Card>
      </div>

      <RejectModal
        open={isRejectOpen}
        onOpenChange={closeReject}
        onConfirm={handleRejectConfirm}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={closeDelete}
        onConfirm={handleDeleteConfirm}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation ${selectedQuotation?.quotation_number}? This action cannot be undone.`}
        variant="destructive"
      />

      <QuotationDetailModal
        open={isDetailOpen}
        onOpenChange={closeDetail}
        quotation={selectedQuotation}
      />
    </div>
  );
};

export default Quotations;