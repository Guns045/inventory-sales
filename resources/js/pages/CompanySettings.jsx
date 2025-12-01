import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAPI } from '@/contexts/APIContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Image as ImageIcon, Building, Palette, Save, Trash2, Loader2 } from "lucide-react";

const CompanySettingsPage = () => {
  const { get, post, put } = useAPI();
  const { companySettings, fetchCompanySettings, getLogoUrl } = useCompany();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    tax_id: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const logoFileRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (companySettings) {
      setFormData({
        company_name: companySettings.company_name || '',
        company_address: companySettings.company_address || '',
        company_phone: companySettings.company_phone || '',
        company_email: companySettings.company_email || '',
        company_website: companySettings.company_website || '',
        tax_id: companySettings.tax_id || ''
      });
    }
  }, [companySettings]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB
        showError('Logo file size must be less than 2MB');
        return;
      }

      setLogoFile(file);
      logoFileRef.current = file;
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    const fileInput = document.getElementById('logo-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data = new FormData();
      data.append('company_name', formData.company_name);
      data.append('company_address', formData.company_address || '');
      data.append('company_phone', formData.company_phone || '');
      data.append('company_email', formData.company_email || '');
      data.append('company_website', formData.company_website || '');
      data.append('tax_id', formData.tax_id || '');

      const fileToUpload = logoFile || logoFileRef.current;
      if (fileToUpload) {
        data.append('company_logo', fileToUpload);
      }

      let response;
      if (companySettings?.id) {
        data.append('_method', 'PUT');
        response = await post(`/company-settings/${companySettings.id}`, data);
      } else {
        response = await post('/company-settings', data);
      }

      if (response) {
        showSuccess('Company settings updated successfully!');
        await fetchCompanySettings();
        setLogoFile(null);
        setLogoPreview('');
      }

    } catch (err) {
      console.error('Error saving company settings:', err);
      showError(err.response?.data?.message || 'Failed to save company settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Company Logo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0">
              {(logoPreview || companySettings?.company_logo) ? (
                <img
                  src={logoPreview || getLogoUrl()}
                  alt="Company Logo Preview"
                  className="h-32 w-48 object-contain border rounded-md p-2 bg-white"
                />
              ) : (
                <div className="h-32 w-48 border rounded-md bg-muted flex flex-col items-center justify-center text-muted-foreground p-4">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-xs">No logo uploaded</span>
                </div>
              )}
            </div>
            <div className="flex-1 w-full space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="logo-upload">Upload Logo</Label>
                <Input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF, SVG. Max size: 2MB
                </p>
              </div>
              {(logoPreview || companySettings?.company_logo) && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Logo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                required
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input
                type="email"
                id="company_email"
                name="company_email"
                value={formData.company_email}
                onChange={handleInputChange}
                placeholder="company@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_phone">Phone</Label>
              <Input
                type="tel"
                id="company_phone"
                name="company_phone"
                value={formData.company_phone}
                onChange={handleInputChange}
                placeholder="+62 21 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_website">Website</Label>
              <Input
                type="url"
                id="company_website"
                name="company_website"
                value={formData.company_website}
                onChange={handleInputChange}
                placeholder="https://www.example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_address">Address</Label>
            <Textarea
              id="company_address"
              name="company_address"
              value={formData.company_address}
              onChange={handleInputChange}
              rows={3}
              placeholder="Enter company address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID</Label>
            <Input
              type="text"
              id="tax_id"
              name="tax_id"
              value={formData.tax_id}
              onChange={handleInputChange}
              placeholder="e.g., NPWP, GST number"
            />
          </div>
        </CardContent>
      </Card>



      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CompanySettingsPage;