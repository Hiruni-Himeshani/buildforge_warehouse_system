import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const navigate = useNavigate();

    // 🕵️ Get the role from localStorage
    const userRole = localStorage.getItem('role');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get('http://localhost:5001/api/manager/orders');
                setOrders(res.data);
            } catch (error) {
                console.error("Error fetching history:", error);
            }
        };
        fetchHistory();
    }, []);

    // 🚦 Smart Back Button Logic
    const handleBackClick = () => {
        if (userRole === 'SalesManager') {
            navigate('/approval-lobby');
        } else if (userRole === 'SalesOfficer') {
            navigate('/create-order');
        } else {
            navigate('/login'); 
        }
    };

    // 🎨 Priority badge styling
    const getPriorityBadge = (priority) => {
        let bgColor = '#eceff1';
        let textColor = '#37474f';
        let icon = '○';
        
        if (priority === 'HIGH') {
            bgColor = '#ffcdd2';
            textColor = '#c62828';
            icon = '🔴';
        } else if (priority === 'MEDIUM') {
            bgColor = '#fff9c4';
            textColor = '#f57f17';
            icon = '🟡';
        } else if (priority === 'LOW') {
            bgColor = '#c8e6c9';
            textColor = '#1b5e20';
            icon = '🟢';
        }
        
        return { bgColor, textColor, icon };
    };

    // 🚦 Show the full order history with all order statuses
    const historyOrders = [...orders];

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            
            {/* 👈 Dynamic Back Button */}
            <button 
                onClick={handleBackClick} 
                style={{ 
                    backgroundColor: '#2196F3', 
                    color: 'white', 
                    padding: '10px 15px', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    marginBottom: '20px',
                    fontWeight: 'bold'
                }}
            >
                {userRole === 'SalesManager' ? '⬅ Back to Dashboard' : '⬅ Back to Create Order'}
            </button>

            <h2 style={{ color: '#607d8b' }}>Full Order History</h2>
            <p>All orders are visible in this table, including pending, approved, and dispatched orders.</p>
            <hr />

            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eceff1', color: '#37474f' }}>
                            <th style={{ padding: '14px 12px', border: '1px solid #cfd8dc' }}>Order ID</th>
                            <th style={{ padding: '14px 12px', border: '1px solid #cfd8dc' }}>Customer</th>
                            <th style={{ padding: '14px 12px', border: '1px solid #cfd8dc' }}>Priority</th>
                            <th style={{ padding: '14px 12px', border: '1px solid #cfd8dc' }}>Items</th>
                            <th style={{ padding: '14px 12px', border: '1px solid #cfd8dc' }}>Status</th>
                            <th style={{ padding: '14px 12px', border: '1px solid #cfd8dc' }}>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyOrders.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#607d8b' }}>
                                    No orders found.
                                </td>
                            </tr>
                        ) : (
                            historyOrders.map((order) => {
                                const priorityData = getPriorityBadge(order.priority || 'MEDIUM');
                                return (
                                    <tr key={order._id} style={{ backgroundColor: '#ffffff' }}>
                                        <td style={{ padding: '12px', border: '1px solid #cfd8dc' }}>{order._id.slice(-6).toUpperCase()}</td>
                                        <td style={{ padding: '12px', border: '1px solid #cfd8dc' }}>{order.customerName}</td>
                                        <td style={{ padding: '12px', border: '1px solid #cfd8dc' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 10px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold',
                                                color: priorityData.textColor,
                                                backgroundColor: priorityData.bgColor
                                            }}>
                                                {priorityData.icon} {order.priority || 'MEDIUM'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #cfd8dc' }}>
                                            {order.itemsRequested && order.itemsRequested.map((item, index) => (
                                                <div key={index} style={{ marginBottom: '4px' }}>
                                                    • {item.itemName} x {item.qty}
                                                </div>
                                            ))}
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #cfd8dc' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '6px 10px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold',
                                                color: '#263238',
                                                backgroundColor: order.status === 'Approved' ? '#dcedc8' : order.status === 'Dispatched' ? '#b3e5fc' : order.status === 'Pending' ? '#fff9c4' : '#ffcdd2'
                                            }}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #cfd8dc' }}>{new Date(order.createdAt).toLocaleString()}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default OrderHistory;