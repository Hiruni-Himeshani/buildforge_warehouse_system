import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function StockMovementHistory() {
    const [movements, setMovements] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderMovements, setOrderMovements] = useState(null);
    const [view, setView] = useState('all'); // 'all' or 'byOrder'

    const fetchAllMovements = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/manager/stock-movements');
            setMovements(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch stock movements");
        }
    };

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
        fetchAllMovements();
        fetchOrders();
    }, []);

    const fetchOrderMovements = async (orderId) => {
        try {
            const res = await axios.get(`http://localhost:5001/api/manager/orders/${orderId}/stock-movements`);
            setOrderMovements(res.data);
            setSelectedOrder(orderId);
            setView('byOrder');
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch order movements");
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'Reserved':
                return '#3498db';
            case 'Picked':
                return '#27ae60';
            case 'Dispatched':
                return '#16a085';
            case 'Damaged':
                return '#e74c3c';
            case 'Returned':
                return '#f39c12';
            default:
                return '#95a5a6';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'Reserved':
                return '📌';
            case 'Picked':
                return '📦';
            case 'Dispatched':
                return '🚚';
            case 'Damaged':
                return '⚠️';
            case 'Returned':
                return '↩️';
            default:
                return '📝';
        }
    };

    return (
        <div style={{ padding: '30px' }}>
            <h2>📊 Stock Movement History</h2>
            <p>Track all inventory movements and status changes.</p>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setView('all')}
                    style={{
                        backgroundColor: view === 'all' ? '#3498db' : '#95a5a6',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px'
                    }}
                >
                    All Movements
                </button>
                <button
                    onClick={() => setView('byOrder')}
                    style={{
                        backgroundColor: view === 'byOrder' ? '#3498db' : '#95a5a6',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    By Order
                </button>
            </div>

            {view === 'all' ? (
                <div>
                    <h3>All Stock Movements</h3>
                    {movements.length === 0 ? (
                        <p style={{ color: '#7f8c8d' }}>No stock movements recorded yet.</p>
                    ) : (
                        <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                            <thead style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Item Name</th>
                                    <th>Qty</th>
                                    <th>Action</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map((movement, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                        <td style={{ fontSize: '12px' }}>
                                            {new Date(movement.timestamp).toLocaleString()}
                                        </td>
                                        <td><strong>{movement.orderId}</strong></td>
                                        <td>{movement.customerName}</td>
                                        <td>{movement.itemName}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{movement.qty}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                backgroundColor: getActionColor(movement.action),
                                                color: 'white',
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                display: 'inline-block'
                                            }}>
                                                {getActionIcon(movement.action)} {movement.action}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '12px' }}>{movement.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : (
                <div>
                    <h3>Select Order to View Movements</h3>
                    <select
                        onChange={(e) => {
                            if (e.target.value) fetchOrderMovements(e.target.value);
                        }}
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #bdc3c7', marginBottom: '20px' }}
                    >
                        <option value="">-- Select Order --</option>
                        {orders.map(order => (
                            <option key={order._id} value={order._id}>
                                {order._id} - {order.customerName}
                            </option>
                        ))}
                    </select>

                    {orderMovements && (
                        <div>
                            <h4>Order #{orderMovements.orderId} - {orderMovements.customerName}</h4>

                            <div style={{ marginBottomTop: '20px' }}>
                                <h4>Stock Movements:</h4>
                                {orderMovements.stockMovements.length === 0 ? (
                                    <p style={{ color: '#7f8c8d' }}>No movements for this order.</p>
                                ) : (
                                    <div>
                                        {orderMovements.stockMovements.map((movement, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    borderLeft: `4px solid ${getActionColor(movement.action)}`,
                                                    padding: '15px',
                                                    marginBottom: '10px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                <p style={{ margin: '0 0 5px 0' }}>
                                                    <strong>{getActionIcon(movement.action)} {movement.action}</strong>
                                                </p>
                                                <p style={{ margin: '0 0 5px 0', color: '#7f8c8d', fontSize: '12px' }}>
                                                    {new Date(movement.timestamp).toLocaleString()}
                                                </p>
                                                <p style={{ margin: '0 0 5px 0' }}>
                                                    Item: <strong>{movement.itemName}</strong> | Qty: <strong>{movement.qty}</strong>
                                                </p>
                                                {movement.notes && (
                                                    <p style={{ margin: '0', color: '#34495e', fontSize: '12px' }}>
                                                        Notes: {movement.notes}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {orderMovements.damageReports.length > 0 && (
                                <div style={{ marginTop: '20px' }}>
                                    <h4>Damage Reports:</h4>
                                    {orderMovements.damageReports.map((report, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                borderLeft: '4px solid #e74c3c',
                                                padding: '15px',
                                                marginBottom: '10px',
                                                backgroundColor: '#fadbd8',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            <p style={{ margin: '0 0 5px 0' }}>
                                                <strong>⚠️ Damage Report</strong>
                                            </p>
                                            <p style={{ margin: '0 0 5px 0', color: '#7f8c8d', fontSize: '12px' }}>
                                                {new Date(report.timestamp).toLocaleString()}
                                            </p>
                                            <p style={{ margin: '0 0 5px 0' }}>
                                                Item: <strong>{report.itemName}</strong> | Qty: <strong>{report.qty}</strong>
                                            </p>
                                            <p style={{ margin: '0 0 5px 0' }}>
                                                Reason: {report.reason}
                                            </p>
                                            <p style={{ margin: '0', fontSize: '12px' }}>
                                                Reported by: {report.reportedBy}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default StockMovementHistory;
