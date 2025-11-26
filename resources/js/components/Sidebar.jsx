import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useCompany } from '@/contexts/CompanyContext';
import {
    LayoutDashboard,
    Package,
    Users,
    Settings,
    FileText,
    ShoppingCart,
    Truck,
    ClipboardList,
    LogOut,
    Menu,
    ChevronDown,
    ChevronRight,
    Box
} from 'lucide-react';

const SidebarContent = ({ menuItems, pathname, onNavigate }) => {
    const [expandedMenus, setExpandedMenus] = React.useState({});

    const toggleSubmenu = (path) => {
        setExpandedMenus(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    const isActive = (path) => pathname === path;

    const isParentActive = (children) => {
        return children?.some(child => isActive(child.path));
    };

    const renderIcon = (iconName) => {
        // Map bootstrap icons to Lucide icons or use a default
        // This is a simplified mapping, you might need to expand it
        const iconMap = {
            'bi-speedometer2': LayoutDashboard,
            'bi-box-seam': Package,
            'bi-people': Users,
            'bi-gear': Settings,
            'bi-file-text': FileText,
            'bi-cart': ShoppingCart,
            'bi-truck': Truck,
            'bi-clipboard-data': ClipboardList,
            'bi-box-arrow-right': LogOut
        };

        const IconComponent = iconMap[iconName] || Box;
        return <IconComponent className="h-4 w-4 mr-2" />;
    };

    return (
        <div className="flex flex-col h-full py-4">
            <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                    Menu
                </h2>
                <div className="space-y-1">
                    {menuItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const active = isActive(item.path);
                        const parentActive = hasChildren && isParentActive(item.children);
                        const expanded = expandedMenus[item.path] || parentActive;

                        if (item.action === 'logout') return null; // Handle logout separately

                        if (hasChildren) {
                            return (
                                <div key={item.path}>
                                    <Button
                                        variant={parentActive ? "secondary" : "ghost"}
                                        className="w-full justify-start"
                                        onClick={() => toggleSubmenu(item.path)}
                                    >
                                        {renderIcon(item.icon)}
                                        <span className="flex-1 text-left">{item.title}</span>
                                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                    {expanded && (
                                        <div className="pl-4 space-y-1 mt-1">
                                            {item.children.map((child) => (
                                                <Button
                                                    key={child.path}
                                                    variant={isActive(child.path) ? "secondary" : "ghost"}
                                                    className="w-full justify-start h-9"
                                                    asChild
                                                    onClick={onNavigate}
                                                >
                                                    <Link to={child.path}>
                                                        {renderIcon(child.icon)}
                                                        {child.title}
                                                    </Link>
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Button
                                key={item.path}
                                variant={active ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                asChild
                                onClick={onNavigate}
                            >
                                <Link to={item.path}>
                                    {renderIcon(item.icon)}
                                    {item.title}
                                </Link>
                            </Button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export function Sidebar({ className }) {
    const { visibleMenuItems } = usePermissions();
    const { companySettings, getLogoUrl } = useCompany();
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = React.useState(false);

    const logoUrl = getLogoUrl();

    return (
        <>
            {/* Mobile Trigger */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <div className="md:hidden fixed top-4 left-4 z-50">
                    <Button variant="outline" size="icon" onClick={() => setIsOpen(true)}>
                        <Menu className="h-4 w-4" />
                    </Button>
                </div>

                <SheetContent side="left" className="p-0 w-[280px]">
                    <SheetHeader className="p-4 border-b">
                        <div className="flex items-center gap-2">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
                            ) : (
                                <Box className="h-6 w-6" />
                            )}
                            <SheetTitle className="text-left">
                                {companySettings?.company_name || 'Inventory System'}
                            </SheetTitle>
                        </div>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-8rem)]">
                        <SidebarContent
                            menuItems={visibleMenuItems}
                            pathname={location.pathname}
                            onNavigate={() => setIsOpen(false)}
                        />
                    </ScrollArea>
                    <div className="p-4 border-t mt-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="font-medium text-sm">
                                    {user?.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user?.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full justify-start" onClick={logout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <div className={cn("hidden md:flex flex-col w-[280px] border-r bg-background h-screen sticky top-0", className)}>
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
                        ) : (
                            <Box className="h-6 w-6" />
                        )}
                        <span className="font-bold text-lg truncate">
                            {companySettings?.company_name || 'Inventory System'}
                        </span>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <SidebarContent
                        menuItems={visibleMenuItems}
                        pathname={location.pathname}
                    />
                </ScrollArea>

                <div className="p-4 border-t">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="font-medium text-sm">
                                {user?.name?.charAt(0) || 'U'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start" onClick={logout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </div>
        </>
    );
}
