import React from 'react';
import SalesDashboard from './SalesDashboard';
import WarehouseDashboard from './WarehouseDashboard';
import FinanceDashboard from './FinanceDashboard';
import { Tabs, Tab } from 'react-bootstrap';

const MainDashboard = () => {
    return (
        <div className="main-dashboard">
            <h2 className="mb-4">Main Dashboard</h2>
            <Tabs defaultActiveKey="sales" id="main-dashboard-tabs" className="mb-3">
                <Tab eventKey="sales" title="Sales">
                    <SalesDashboard />
                </Tab>
                <Tab eventKey="warehouse" title="Warehouse">
                    <WarehouseDashboard />
                </Tab>
                <Tab eventKey="finance" title="Finance">
                    <FinanceDashboard />
                </Tab>
            </Tabs>
        </div>
    );
};

export default MainDashboard;
