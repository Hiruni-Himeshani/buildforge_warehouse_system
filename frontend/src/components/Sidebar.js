import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaClipboardList, FaUsers, FaWarehouse, FaBoxOpen, FaTachometerAlt, FaCogs, FaHistory, FaMap, FaSignOutAlt, FaChartLine } from 'react-icons/fa';
function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        localStorage.removeItem('wms_auth');
        navigate('/login', { replace: true });
    };

    // Retrieve the user's role from localStorage to determine which menu items to show
    const role = localStorage.getItem('role') || ''; 

    // An array to hold the menu items that will be displayed in the sidebar
    const menuItems = [];

    // Add menu items based on the user's role
    if (role === 'SalesManager') {
        menuItems.push({ name: 'Dashboard', path: '/approval-lobby', icon: <FaTachometerAlt /> });
        menuItems.push({ name: 'Settings', path: '/settings', icon: <FaCogs /> });
        menuItems.push({ name: 'AI Analytics', path: '/manager/analytics', icon: <FaChartLine /> });
    } 
    
    if (role === 'SalesOfficer') {
        menuItems.push({ name: 'Create Order', path: '/create-order', icon: <FaClipboardList /> });
        menuItems.push({ name: 'Customer Management', path: '/customers', icon: <FaUsers /> });
    }
    
    if (role === 'WarehouseManager') {
        menuItems.push({ name: 'Dispatch Center', path: '/dispatch', icon: <FaWarehouse /> });
        menuItems.push({ name: 'Pick List', path: '/picklist', icon: <FaBoxOpen /> });
        menuItems.push({ name: 'Gate Pass', path: '/gatepass', icon: <FaWarehouse /> });
        menuItems.push({ name: 'Manage stock', path: '/equipment', icon: <FaBoxOpen /> });
        menuItems.push({ name: 'Aisle map', path: '/aisles', icon: <FaMap /> });
        menuItems.push({ name: 'Stock Movements', path: '/stock-movements', icon: <FaBoxOpen /> });
        menuItems.push({ name: 'Damage Report', path: '/damage-report', icon: <FaCogs /> });
    }

    if (role === 'StoreKeeper') {
        menuItems.push({ name: 'Inventory Dashboard', path: '/inventory', icon: <FaBoxOpen /> });
        menuItems.push({ name: 'Manage stock', path: '/equipment', icon: <FaBoxOpen /> });
        menuItems.push({ name: 'Aisle map', path: '/aisles', icon: <FaMap /> });
        menuItems.push({ name: 'Stock Movements', path: '/stock-movements', icon: <FaBoxOpen /> });
    }

    // common menu item for all roles
    menuItems.push({ name: 'Order History', path: '/order-history', icon: <FaHistory /> });

    return (
        <div style={{
            width: '250px',
            backgroundColor: '#263238',
            color: 'white',
            height: '100vh',
            padding: '20px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0
        }}>
            <h2 style={{ color: '#8bc34a', borderBottom: '1px solid #455a64', paddingBottom: '15px', marginTop: '10px' }}>
                🏗️ BuildForge
            </h2>
            
            <ul style={{ listStyleType: 'none', padding: 0, marginTop: '20px' }}>
                {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <li 
                            key={index}
                            onClick={() => navigate(item.path)}
                            style={{
                                padding: '15px 15px',
                                marginBottom: '10px',
                                backgroundColor: isActive ? '#37474f' : 'transparent',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: isActive ? 'bold' : 'normal',
                                color: isActive ? '#8bc34a' : '#eceff1',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <span style={{ marginRight: '15px', fontSize: '1.2em' }}>{item.icon}</span>
                            {item.name}
                        </li>
                    )
                })}
            </ul>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #455a64', paddingTop: '15px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#90a4ae' }}>
                    Logged in as:<br />
                    <strong style={{ color: 'white' }}>{localStorage.getItem('role') || 'User'}</strong>
                </p>
                <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 14px',
                        backgroundColor: 'transparent',
                        color: '#ef9a9a',
                        border: '1px solid #546e7a',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.95em',
                        fontWeight: 600,
                        transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 83, 80, 0.15)';
                        e.currentTarget.style.borderColor = '#ef5350';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = '#546e7a';
                    }}
                >
                    <FaSignOutAlt />
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Sidebar;