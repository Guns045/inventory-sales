import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAPI } from '@/contexts/APIContext';

const ImportStockModal = ({ isOpen, onClose, onSuccess }) => {
    const { api } = useAPI();
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchWarehouses();
            resetForm();
        }
    }, [isOpen]);

    const fetchWarehouses = async () => {
        try {
            const response = await api.get('/warehouses');
            // Check if response.data is the array directly or if it's wrapped in data
            const warehouseData = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setWarehouses(warehouseData);
        } catch (err) {
            console.error("Failed to fetch warehouses:", err);
            setError("Failed to load warehouses. Please try again.");
        }
    };

    const resetForm = () => {
        setSelectedWarehouse('');
        setFile(null);
        setError(null);
        setSuccess(null);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                selectedFile.type === "application/vnd.ms-excel") {
                setFile(selectedFile);
                setError(null);
            } else {
                setFile(null);
                setError("Please upload a valid Excel file (.xlsx or .xls)");
            }
        }
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedWarehouse || !file) {
            setError("Please select a warehouse and upload a file.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('warehouse_id', selectedWarehouse);
        formData.append('file', file);

        try {
            const response = await api.post('/product-stock/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess(response.data.message || "Stock imported successfully!");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err) {
            console.error("Import failed:", err);
            setError(err.response?.data?.error || "Failed to import stock. Please check your file and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Stock</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label>1. Select Warehouse</Label>
                        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select target warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                        {warehouse.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>2. Upload File</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                accept=".xlsx, .xls"
                            />
                            <div className="flex flex-col items-center gap-2">
                                {file ? (
                                    <>
                                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                        <span className="text-sm font-medium text-green-600">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">Click to change file</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
                                        <span className="text-xs text-muted-foreground">Excel files only (.xlsx, .xls)</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !file || !selectedWarehouse}>
                        {loading ? "Importing..." : "Import Stock"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportStockModal;
