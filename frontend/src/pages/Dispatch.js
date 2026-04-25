import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Dispatch() {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'picking', 'gatepass', 'dispatched'

    const fetchOrders = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/manager/orders');
            setOrders(res.data);
        } catch (error) { 
            console.error(error);
            toast.error("Failed to fetch orders");
        }
    };

    useEffect(() => { 
        fetchOrders(); 
    }, []);

    const handleConfirmDispatch = async (orderId) => {
        try {
            await axios.put(`http://localhost:5001/api/manager/orders/${orderId}/dispatch`);
            toast.success("🚚 Order Dispatched from Warehouse!");
            fetchOrders();
        } catch (error) { 
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to dispatch order");
        }
    };



    // Filter orders based on selected filter
    const getFilteredOrders = () => {
        switch (filter) {
            case 'pending':
                return orders.filter(o => o.status === 'Approved');
            case 'picking':
                return orders.filter(o => o.status === 'Picking');
            case 'gatepass':
                return orders.filter(o => o.status === 'Ready for Gate Pass');
            case 'dispatched':
                return orders.filter(o => o.status === 'Dispatched');
            default:
                return orders.filter(o => 
                    o.status === 'Approved' || 
                    o.status === 'Picking' || 
                    o.status === 'Ready for Gate Pass' ||
                    o.status === 'Dispatched'
                );
        }
    };

    const filteredOrders = getFilteredOrders();

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved':
                return '#3498db';
            case 'Picking':
                return '#f39c12';
            case 'Ready for Gate Pass':
                return '#9b59b6';
            case 'Dispatched':
                return '#27ae60';
            default:
                return '#95a5a6';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved':
                return '📋';
            case 'Picking':
                return '📦';
            case 'Ready for Gate Pass':
                return '🚪';
            case 'Dispatched':
                return '✅';
            default:
                return '📝';
        }
    };

    return (
        <div style={{ padding: '30px' }}>
            <h2>📦 Warehouse Dispatch Center</h2>
            <p>Manage warehouse dispatch operations including picking, gate passes, and order dispatch.</p>

            {/* Filter Buttons */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setFilter('all')}
                    style={{
                        backgroundColor: filter === 'all' ? '#3498db' : '#95a5a6',
                        color: 'white',
                        padding: '10px 15px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === 'all' ? 'bold' : 'normal'
                    }}
                >
                    All Orders ({orders.filter(o => ['Approved', 'Picking', 'Ready for Gate Pass', 'Dispatched'].includes(o.status)).length})
                </button>
                <button
                    onClick={() => setFilter('pending')}
                    style={{
                        backgroundColor: filter === 'pending' ? '#3498db' : '#95a5a6',
                        color: 'white',
                        padding: '10px 15px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === 'pending' ? 'bold' : 'normal'
                    }}
                >
                    📋 Pending ({orders.filter(o => o.status === 'Approved').length})
                </button>
                <button
                    onClick={() => setFilter('picking')}
                    style={{
                        backgroundColor: filter === 'picking' ? '#f39c12' : '#95a5a6',
                        color: 'white',
                        padding: '10px 15px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === 'picking' ? 'bold' : 'normal'
                    }}
                >
                    📦 Picking ({orders.filter(o => o.status === 'Picking').length})
                </button>
                <button
                    onClick={() => setFilter('gatepass')}
                    style={{
                        backgroundColor: filter === 'gatepass' ? '#9b59b6' : '#95a5a6',
                        color: 'white',
                        padding: '10px 15px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === 'gatepass' ? 'bold' : 'normal'
                    }}
                >
                    🚪 Gate Pass ({orders.filter(o => o.status === 'Ready for Gate Pass').length})
                </button>
                <button
                    onClick={() => setFilter('dispatched')}
                    style={{
                        backgroundColor: filter === 'dispatched' ? '#27ae60' : '#95a5a6',
                        color: 'white',
                        padding: '10px 15px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: filter === 'dispatched' ? 'bold' : 'normal'
                    }}
                >
                    ✅ Dispatched ({orders.filter(o => o.status === 'Dispatched').length})
                </button>
            </div>

            {/* Info Box */}
            <div style={{ backgroundColor: '#ecf0f1', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ margin: '0' }}>
                    <strong>Workflow:</strong> Approved Orders → Pick Items → Generate Gate Pass → Dispatch
                </p>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
                <div style={{ backgroundColor: '#ecf0f1', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#7f8c8d' }}>
                    <p>No orders found in this category.</p>
                </div>
            ) : (
                <table border="1" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                    <thead style={{ backgroundColor: '#34495e', color: 'white' }}>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Picked By</th>
                            <th>Gate Pass</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order._id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                <td><strong>{order._id}</strong></td>
                                <td>{order.customerName}</td>
                                <td style={{ fontSize: '12px' }}>
                                    {order.itemsRequested.map(i => `${i.pickedQty || 0}/${i.qty} ${i.itemName}`).join(', ')}
                                </td>
                                <td>{order.priority}</td>
                                <td>
                                    <span style={{
                                        backgroundColor: getStatusColor(order.status),
                                        color: 'white',
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        display: 'inline-block'
                                    }}>
                                        {getStatusIcon(order.status)} {order.status}
                                    </span>
                                </td>
                                <td>{order.pickedBy || '-'}</td>
                                <td>{order.gatePassNumber || '-'}</td>
                                <td>
                                    {order.status === 'Dispatched' && (
                                        <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ Completed</span>
                                    )}
                                    {order.status === 'Ready for Gate Pass' && (
                                        <button
                                            onClick={() => handleConfirmDispatch(order._id)}
                                            style={{
                                                backgroundColor: '#27ae60',
                                                color: 'white',
                                                padding: '8px 10px',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            Dispatch
                                        </button>
                                    )}
                                    {order.status === 'Approved' && (
                                        <span style={{ color: '#3498db', fontSize: '12px' }}>Go to Pick List →</span>
                                    )}
                                    {order.status === 'Picking' && (
                                        <span style={{ color: '#f39c12', fontSize: '12px' }}>In Progress →</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default Dispatch;