import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
    Box,
    Archive,
    Building,
    ArrowLeftRight,
    CreditCard,
    Receipt,
    BarChart3,
    ShoppingBag,
    Undo2
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
        const iconMap = {
            'bi-speedometer2': LayoutDashboard,
            'bi-box-seam': Package,
            'bi-people': Users,
            'bi-gear': Settings,
            'bi-file-text': FileText,
            'bi-cart': ShoppingCart,
            'bi-cart3': ShoppingCart,
            'bi-cart-check': ShoppingBag,
            'bi-truck': Truck,
            'bi-clipboard-data': ClipboardList,
            'bi-box-arrow-right': LogOut,
            'bi-boxes': Package,
            'bi-box': Box,
            'bi-archive': Archive,
            'bi-building': Building,
            'bi-arrow-left-right': ArrowLeftRight,
            'bi-credit-card': CreditCard,
            'bi-receipt': Receipt,

            'bi-graph-up': BarChart3,
            'bi-arrow-return-left': Undo2
        };

        const IconComponent = iconMap[iconName] || Box;
        return <IconComponent className="h-4 w-4 mr-2" />;
    };

    return (
        <div className="flex flex-col h-full py-4 bg-[#172554] text-white">
            <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-indigo-100">
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
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start hover:bg-[#1e3a8a] hover:text-white",
                                            parentActive ? "bg-[#1e3a8a] text-white" : "text-indigo-100"
                                        )}
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
                                                    variant="ghost"
                                                    className={cn(
                                                        "w-full justify-start h-9 hover:bg-[#1e40af] hover:text-white",
                                                        isActive(child.path) ? "bg-[#1e40af] text-white font-medium" : "text-indigo-200"
                                                    )}
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
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start hover:bg-[#1e3a8a] hover:text-white",
                                    active ? "bg-[#1e3a8a] text-white font-medium" : "text-indigo-100"
                                )}
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

                <SheetContent side="left" className="p-0 w-[280px] bg-[#172554] border-r-indigo-800 text-white flex flex-col h-full">
                    <SheetHeader className="p-4 border-b border-indigo-800">
                        <div className="flex flex-col items-center gap-3 w-full">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
                            ) : (
                                <Box className="h-12 w-12 text-indigo-300" />
                            )}
                            <SheetTitle className="text-center text-white text-lg font-bold leading-tight">
                                {companySettings?.company_name || 'Jinan Truck Power Indonesia'}
                            </SheetTitle>
                        </div>
                        <SheetDescription className="sr-only">
                            Navigation Menu
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-8rem)]">
                        <SidebarContent
                            menuItems={visibleMenuItems}
                            pathname={location.pathname}
                            onNavigate={() => setIsOpen(false)}
                        />
                    </ScrollArea>
                    <div className="p-4 border-t border-indigo-800 mt-auto">
                        <Link to="/profile" className="flex items-center gap-2 mb-4 hover:bg-indigo-900/50 p-2 rounded-lg transition-colors cursor-pointer">
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    className="h-8 w-8 rounded-full object-cover border border-indigo-600"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-indigo-800 flex items-center justify-center text-white">
                                    <span className="font-medium text-sm">
                                        {user?.name?.charAt(0) || 'U'}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                                <p className="text-xs text-indigo-300 truncate">
                                    {typeof user?.role === 'string' ? user.role : user?.role?.name}
                                </p>
                            </div>
                        </Link>
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-indigo-200 hover:text-white hover:bg-indigo-900"
                            onClick={logout}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <div className={cn("hidden md:flex flex-col w-[280px] shrink-0 border-r border-indigo-800 bg-[#172554] h-screen sticky top-0 text-white", className)}>
                <div className="p-6 border-b border-indigo-800">
                    <div className="flex flex-col items-center gap-3 w-full">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                        ) : (
                            <Box className="h-12 w-12 text-indigo-300" />
                        )}
                        <span className="font-bold text-lg text-center text-white leading-tight">
                            {companySettings?.company_name || 'Jinan Truck Power Indonesia'}
                        </span>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {visibleMenuItems && visibleMenuItems.length > 0 ? (
                        <SidebarContent
                            menuItems={visibleMenuItems}
                            pathname={location.pathname}
                        />
                    ) : (
                        <div className="p-4 text-indigo-200 text-sm">
                            <p>No menu items available.</p>
                            <p className="mt-2 text-xs">Role: {typeof user?.role === 'string' ? user.role : (user?.role?.name || 'None')}</p>
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 border-t border-indigo-800">
                    <Link to="/profile" className="flex items-center gap-2 mb-4 hover:bg-indigo-900/50 p-2 rounded-lg transition-colors cursor-pointer">
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="h-8 w-8 rounded-full object-cover border border-indigo-600"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-800 flex items-center justify-center text-white">
                                <span className="font-medium text-sm">
                                    {user?.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                            <p className="text-xs text-indigo-300 truncate">
                                {typeof user?.role === 'string' ? user.role : user?.role?.name}
                            </p>
                        </div>
                    </Link>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-indigo-200 hover:text-white hover:bg-indigo-900"
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </div>
        </>
    );
}
