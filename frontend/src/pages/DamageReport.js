import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function DamageReport() {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedItemName, setSelectedItemName] = useState('');
    const [damageQty, setDamageQty] = useState(1);
    const [reason, setReason] = useState('');
    const [reportedBy, setReportedBy] = useState('');

    const fetchOrders = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/manager/orders');
            // Show orders that are in picking or ready for dispatch
            const activeOrders = res.data.filter(o => 
                o.status === 'Picking' || 
                o.status === 'Ready for Gate Pass' || 
                o.status === 'Approved'
            );
            setOrders(activeOrders);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch orders");
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleReportDamage = async (e) => {
        e.preventDefault();

        if (!selectedOrder) {
            toast.error("Please select an order");
            return;
        }

        if (!selectedItemName) {
            toast.error("Please select an item");
            return;
        }

        if (!reason) {
            toast.error("Please provide damage reason");
            return;
        }

        if (!reportedBy) {
            toast.error("Please enter reporter name");
            return;
        }

        try {
            const res = await axios.post(
                `http://localhost:5001/api/manager/orders/${selectedOrder._id}/damage-report`,
                {
                    itemName: selectedItemName,
                    qty: damageQty,
                    reason,
                    reportedBy
                }
            );

            toast.success(`⚠️ Damage report recorded for ${damageQty}x ${selectedItemName}`);
            setSelectedItemName('');
            setDamageQty(1);
            setReason('');
            setReportedBy('');
            fetchOrders();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to report damage");
        }
    };

    const currentOrderItems = selectedOrder?.itemsRequested || [];
    const damageReasons = [
        'Broken/Damaged in transit',
        'Manufacturing defect',
        'Environmental damage (rust, corrosion, etc)',
        'Theft/Missing parts',
        'Collision damage',
        'Contamination',
        'Other'
    ];

    return (
        <div style={{ padding: '30px' }}>
            <h2>⚠️ Damage Report</h2>
            <p>Report damaged or defective equipment during picking or dispatch.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '20px' }}>
                {/* Left Side - Order Selection */}
                <div>
                    <h3>1. Select Order</h3>
                    <div style={{ backgroundColor: '#ecf0f1', padding: '20px', borderRadius: '8px' }}>
                        {orders.length === 0 ? (
                            <p style={{ color: '#7f8c8d' }}>No active orders available.</p>
                        ) : (
                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Active Orders:</label>
                                <select
                                    value={selectedOrder?._id || ''}
                                    onChange={(e) => {
                                        const order = orders.find(o => o._id === e.target.value);
                                        setSelectedOrder(order || null);
                                        setSelectedItemName('');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        border: '1px solid #bdc3c7',
                                        marginBottom: '15px'
                                    }}
                                >
                                    <option value="">-- Select Order --</option>
                                    {orders.map(order => (
                                        <option key={order._id} value={order._id}>
                                            {order._id} - {order.customerName} ({order.status})
                                        </option>
                                    ))}
                                </select>

                                {selectedOrder && (
                                    <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px' }}>
                                        <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                                        <p><strong>Status:</strong> {selectedOrder.status}</p>
                                        <p><strong>Priority:</strong> {selectedOrder.priority}</p>
                                        <p><strong>Items in Order:</strong> {selectedOrder.itemsRequested.length}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side - Damage Report Form */}
                <div>
                    <h3>2. Report Damage</h3>
                    <form onSubmit={handleReportDamage} style={{ backgroundColor: '#ecf0f1', padding: '20px', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Equipment Item:</label>
                            <select
                                value={selectedItemName}
                                onChange={(e) => setSelectedItemName(e.target.value)}
                                disabled={!selectedOrder}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #bdc3c7',
                                    backgroundColor: !selectedOrder ? '#ecf0f1' : 'white'
                                }}
                            >
                                <option value="">-- Select Item --</option>
                                {currentOrderItems.map(item => (
                                    <option key={item.itemName} value={item.itemName}>
                                        {item.itemName} (Required: {item.qty}, Picked: {item.pickedQty})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Damaged Quantity:</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedOrder?.itemsRequested?.find(i => i.itemName === selectedItemName)?.pickedQty || 1}
                                value={damageQty}
                                onChange={(e) => setDamageQty(parseInt(e.target.value) || 1)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #bdc3c7'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Reason for Damage:</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #bdc3c7',
                                    marginBottom: '10px'
                                }}
                            >
                                <option value="">-- Select Reason --</option>
                                {damageReasons.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            {reason === 'Other' && (
                                <input
                                    type="text"
                                    placeholder="Specify other reason..."
                                    onChange={(e) => setReason(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #bdc3c7'
                                    }}
                                />
                            )}
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Reported By (Name):</label>
                            <input
                                type="text"
                                value={reportedBy}
                                onChange={(e) => setReportedBy(e.target.value)}
                                placeholder="Your name"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #bdc3c7'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedOrder || !selectedItemName}
                            style={{
                                width: '100%',
                                backgroundColor: !selectedOrder || !selectedItemName ? '#95a5a6' : '#e74c3c',
                                color: 'white',
                                padding: '10px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: !selectedOrder || !selectedItemName ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            ⚠️ Report Damage
                        </button>
                    </form>
                </div>
            </div>

            {/* Damage History */}
            {selectedOrder && selectedOrder.damageReports.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    <h3>Damage History for This Order</h3>
                    <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                        <thead style={{ backgroundColor: '#e74c3c', color: 'white' }}>
                            <tr>
                                <th>Timestamp</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Reason</th>
                                <th>Reported By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedOrder.damageReports.map((report, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontSize: '12px' }}>{new Date(report.timestamp).toLocaleString()}</td>
                                    <td>{report.itemName}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{report.qty}</td>
                                    <td>{report.reason}</td>
                                    <td>{report.reportedBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default DamageReport;
