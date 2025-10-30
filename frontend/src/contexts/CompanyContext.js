import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAPI } from './APIContext';

const getBaseURL = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  } else {
    return `http://${hostname}:8000`;
  }
};

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const { get } = useAPI();
  const [companySettings, setCompanySettings] = useState({
    company_name: 'Inventory Management System',
    company_logo: null,
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    tax_id: '',
    theme_color: '#0d6efd',
    theme_dark_color: '#212529',
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await get('/company-settings/public');

      if (response && response.data) {
        setCompanySettings(response.data);
      }
    } catch (err) {
      console.error('Error fetching company settings:', err);
      setError(err.message || 'Failed to fetch company settings');
    } finally {
      setLoading(false);
    }
  };

  const updateCompanySettings = async (settingsData) => {
    try {
      const response = await get('/company-settings');
      if (response && response.data) {
        setCompanySettings(response.data);
      }
    } catch (err) {
      console.error('Error updating company settings:', err);
      setError(err.message || 'Failed to update company settings');
    }
  };

  const getLogoUrl = () => {
    if (companySettings.company_logo) {
      // If logo is a full URL, return it as is
      if (companySettings.company_logo.startsWith('http')) {
        return companySettings.company_logo;
      }
      // If logo is a relative path, construct full URL
      return `${getBaseURL()}/storage/logos/${companySettings.company_logo}`;
    }
    return null;
  };

  const getThemeStyles = () => {
    return {
      primaryColor: companySettings.theme_color,
      darkColor: companySettings.theme_dark_color,
    };
  };

  const value = {
    companySettings,
    loading,
    error,
    fetchCompanySettings,
    updateCompanySettings,
    getLogoUrl,
    getThemeStyles,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};