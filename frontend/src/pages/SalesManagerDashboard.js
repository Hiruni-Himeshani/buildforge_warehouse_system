import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; 

function SalesManagerDashboard() {
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Cancellation Popup State
    const [cancelCategory, setCancelCategory] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [cancellingOrderId, setCancellingOrderId] = useState(null); 
    
    const username = localStorage.getItem('username');

    const fetchDashboardData = async () => {
        try {
            const orderRes = await axios.get('http://localhost:5001/api/manager/orders');
            const invRes = await axios.get('http://localhost:5001/api/manager/inventory');
            setOrders(orderRes.data);
            setInventory(invRes.data);
        } catch (error) { console.error("Error fetching data:", error); }
    };

    useEffect(() => {
        // Fetch data immediately
        fetchDashboardData();

        // 🪄 MAGIC AUTO-REFRESH: Silently fetch new data every 5 seconds for a "live" presentation!
        const interval = setInterval(() => {
            fetchDashboardData();
        }, 5000);

        // Clean up the timer when leaving the page
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (orderId) => {
        try {
            await axios.put(`http://localhost:5001/api/manager/orders/${orderId}/approve`);
            toast.success("✅ Order successfully approved!"); 
            fetchDashboardData(); 
        } catch (error) { console.error("Error approving:", error); }
    };

    const handleBackorder = async (orderId) => {
        const confirmReorder = window.confirm("⚠️ Send a Backorder request email to the customer?");
        if (confirmReorder) {
            try {
                await axios.put(`http://localhost:5001/api/manager/orders/${orderId}/backorder`);
                toast.info("📧 Email sent to customer. Waiting for their decision."); 
                fetchDashboardData(); 
            } catch (error) { console.error("Error backordering:", error); }
        }
    };

    const handleConfirmFactory = async (orderId) => {
        try {
            await axios.put(`http://localhost:5001/api/manager/orders/${orderId}/confirm-factory`);
            toast.success("🏭 Order sent to factory for production!"); 
            fetchDashboardData(); 
        } catch (error) { 
            console.error("Error confirming factory:", error); 
            toast.error("Failed to send to factory.");
        }
    };

    // "One-Click" Cancel for Customer-Initiated Cancellations
    const handleDirectAcknowledgeCancel = async (orderId) => {
        try {
            await axios.put(`http://localhost:5001/api/manager/orders/${orderId}/cancel`, {
                cancellationCategory: 'Customer Requested Cancellation', 
                cancellationReason: 'Customer clicked Cancel inside their Magic Link email.'
            });
            toast.info("🛑 Order securely moved to Cancellation History.");
            fetchDashboardData(); 
        } catch (error) {
            console.error("Error acknowledging cancel:", error);
            toast.error("Failed to log cancellation.");
        }
    };

    const handleConfirmCancel = async () => {
        if (!cancelCategory) return toast.warning("Please select a cancellation reason.");
        if (cancelCategory === 'Other' && customReason.trim() === '') return toast.warning("Please type the custom reason in the text box.");

        try {
            await axios.put(`http://localhost:5001/api/manager/orders/${cancellingOrderId}/cancel`, {
                cancellationCategory: cancelCategory, 
                cancellationReason: cancelCategory === 'Other' ? customReason : 'Standard cancellation'
            });
            toast.info("🛑 Order securely moved to Cancellation History.");
            setCancelCategory('');
            setCustomReason('');
            setCancellingOrderId(null); 
            fetchDashboardData(); 
        } catch (error) {
            console.error("Error cancelling:", error);
            toast.error("Failed to cancel order.");
        }
    };

    const closeCancelPopup = () => {
        setCancellingOrderId(null);
        setCancelCategory('');
        setCustomReason('');
    };

    /** Filter to only show 'Available' status inventory lines for this table. */
    const availableStatusInventory = inventory.filter(
        (inv) => (inv.status ?? 'Available') === 'Available'
    );

    const canFulfillOrder = (order) => {
        for (let item of order.itemsRequested) {
            const invItem = availableStatusInventory.find(inv => inv.itemName === item.itemName);
            if (!invItem || item.qty > (invItem.availableQty - invItem.reservedQty)) return false; 
        }
        return true; 
    };

    // --- ✂️ FILTERING LOGIC ---
    
    // Normal Pending orders vs orders needing attention (Action Required)
    const pendingOrdersOnly = orders.filter(order => order.status === 'Pending');
    const actionRequiredOrders = orders.filter(order => order.status === 'Pending' || order.status === 'Customer Cancelled');
    
    // Orders in the manufacturing workflow
    const backorderedOrders = orders.filter(order => 
        ['Backordered', 'Waiting on Customer', 'Customer Accepted Delay'].includes(order.status)
    );

    const searchedPendingOrders = actionRequiredOrders.filter(order => 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const searchedBackorderedOrders = backorderedOrders.filter(order => 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get the total units Available to Promise
    const totalAvailablePromiseItems = availableStatusInventory.reduce(
        (total, item) => total + (item.availableQty - item.reservedQty), 
        0
    );

    return (
        <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', paddingBottom: '100px', position: 'relative' }}>
            
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#263238' }}>🚀 Sales Manager Dashboard</h2>
                <p style={{ margin: 0, color: '#546e7a' }}>Welcome back, <strong>{username}</strong>. Here is your warehouse overview.</p>
            </div>
            
            <hr style={{ marginBottom: '30px', border: '0', borderTop: '1px solid #cfd8dc' }} />

            <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '6px solid #4CAF50' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#546e7a', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>📦 Available to Promise</h4>
                    <h1 style={{ margin: 0, color: '#2e7d32', fontSize: '2.5em' }}>{totalAvailablePromiseItems} <span style={{fontSize: '0.4em', color: '#78909c'}}>Units</span></h1>
                </div>
                {/* 🏷️ Task 1 Fixed: Combined Label is broarder and user-friendly */}
                <div style={{ flex: '1', minWidth: '200px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '6px solid #2196F3' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#546e7a', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>📝 Action Required </h4>
                    <h1 style={{ margin: 0, color: actionRequiredOrders.length > 0 ? '#d32f2f' : '#1976d2', fontSize: '2.5em' }}>{actionRequiredOrders.length} <span style={{fontSize: '0.4em', color: '#78909c'}}>Orders</span></h1>
                </div>
                <div style={{ flex: '1', minWidth: '200px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '6px solid #ff9800' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#546e7a', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>🏭 Factory Queue</h4>
                    <h1 style={{ margin: 0, color: '#f57c00', fontSize: '2.5em' }}>{backorderedOrders.length} <span style={{fontSize: '0.4em', color: '#78909c'}}>Orders</span></h1>
                </div>
            </div>

            {/* 📦 Task 2 Fixed: THE RESTORED WAREHOUSE STOCK TABLE */}
            <h3 style={{ color: '#37474f' }}>📦 Current Warehouse Stock</h3>
            <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', textAlign: 'left', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <thead style={{ backgroundColor: '#f4f4f4' }}>
                    <tr><th>Equipment Name</th><th>Physical Stock</th><th>Reserved</th><th style={{ backgroundColor: '#e8f5e9' }}>Available to Promise</th></tr>
                </thead>
                <tbody>
                    {availableStatusInventory.length === 0 ? (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#78909c' }}>
                                No equipment in Available status.
                            </td>
                        </tr>
                    ) : (
                        availableStatusInventory.map((item) => (
                            <tr key={item._id} style={{ borderBottom: '1px solid #eee' }}>
                                <td>{item.itemName}</td>
                                <td>{item.availableQty}</td>
                                <td style={{ color: '#ff9800', fontWeight: 'bold' }}>{item.reservedQty}</td>
                                <td style={{ backgroundColor: '#f1f8e9', fontWeight: 'bold', fontSize: '1.1em', color: '#2e7d32' }}>{item.availableQty - item.reservedQty}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#37474f', margin: 0 }}>📝 Pending Approvals Loby</h3>
                <input 
                    type="text" 
                    placeholder="🔍 Search by Customer Name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '10px 20px', width: '300px', borderRadius: '25px', border: '1px solid #b0bec5', fontSize: '1em', outline: 'none' }} 
                />
            </div>

            <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', textAlign: 'left', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <thead style={{ backgroundColor: '#e3f2fd' }}>
                    <tr><th>Customer</th><th>Priority</th><th>Items Requested</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {searchedPendingOrders.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#78909c' }}>No matching pending orders found.</td></tr> : searchedPendingOrders.map((order) => (
                        <tr key={order._id} style={{ borderBottom: '1px solid #eee', backgroundColor: order.status === 'Customer Cancelled' ? '#ffebee' : 'white' }}>
                            <td style={{ fontWeight: '500' }}>{order.customerName}</td>
                            <td style={{ color: order.priority === 'High' ? '#d32f2f' : '#455a64', fontWeight: 'bold' }}>{order.priority}</td>
                            <td>{order.itemsRequested.map((item, i) => <div key={i}>• {item.itemName} (Qty: {item.qty})</div>)}</td>
                            <td>
                                {order.status === 'Customer Cancelled' ? (
                                    <>
                                        <div style={{ color: '#c0392b', fontWeight: 'bold', marginBottom: '10px' }}>❌ Customer Requested Cancel</div>
                                        <button onClick={() => handleDirectAcknowledgeCancel(order._id)} style={{ backgroundColor: '#c0392b', color: 'white', padding: '8px 12px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Acknowledge Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        {canFulfillOrder(order) ? (
                                            <button onClick={() => handleApprove(order._id)} style={{ backgroundColor: '#4CAF50', color: 'white', padding: '8px 12px', marginRight: '5px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Approve</button>
                                        ) : (
                                            <button onClick={() => handleBackorder(order._id)} style={{ backgroundColor: '#f39c12', color: 'white', padding: '8px 12px', marginRight: '5px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Ask Customer to Wait</button>
                                        )}
                                        <button onClick={() => setCancellingOrderId(order._id)} style={{ backgroundColor: '#f44336', color: 'white', padding: '8px 12px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3 style={{ color: '#f57c00' }}>🏭 Factory Workflow (Backorders)</h3>
            <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <thead style={{ backgroundColor: '#fff3e0' }}>
                    <tr><th>Customer</th><th>Priority</th><th>Items Requested</th><th>Status / Action</th></tr>
                </thead>
                <tbody>
                    {searchedBackorderedOrders.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#78909c' }}>No matching backorders found.</td></tr> : searchedBackorderedOrders.map((order) => (
                        <tr key={order._id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ fontWeight: '500' }}>{order.customerName}</td>
                            <td style={{ color: order.priority === 'High' ? '#d32f2f' : '#455a64', fontWeight: 'bold' }}>{order.priority}</td>
                            <td>{order.itemsRequested.map((item, i) => <div key={i}>• {item.itemName} (Qty: {item.qty})</div>)}</td>
                            <td>
                                {order.status === 'Waiting on Customer' && (
                                    <span style={{ color: '#f39c12', fontWeight: 'bold' }}>⏳ Waiting for Reply...</span>
                                )}
                                
                                {order.status === 'Customer Accepted Delay' && (
                                    <button onClick={() => handleConfirmFactory(order._id)} style={{ backgroundColor: '#27ae60', color: 'white', padding: '8px 12px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                        Send to Factory 🏭
                                    </button>
                                )}

                                {order.status === 'Backordered' && (
                                    <span style={{ color: '#9e9e9e', fontStyle: 'italic', marginRight: '10px' }}>🏭 In Production...</span>
                                )}
                                
                                {order.status === 'Backordered' && canFulfillOrder(order) && (
                                    <button onClick={() => handleApprove(order._id)} style={{ backgroundColor: '#4CAF50', color: 'white', padding: '8px 12px', marginLeft: '10px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Approve (Arrived!)</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* 🛑 THE CANCELLATION POPUP MODAL (Only for normal cancellations) */}
            {cancellingOrderId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ marginTop: 0, color: '#c0392b' }}>🛑 Cancel Order</h3>
                        <p style={{ color: '#7f8c8d', fontSize: '14px' }}>Please specify the reason for cancelling this order.</p>
                        
                        <label style={{ fontWeight: 'bold', display: 'block', marginTop: '15px' }}>Reason for Cancellation:</label>
                        <select 
                            value={cancelCategory} 
                            onChange={(e) => {
                                setCancelCategory(e.target.value);
                                setCustomReason(''); 
                            }}
                            style={{ width: '100%', padding: '10px', marginBottom: '15px', marginTop: '5px', borderRadius: '4px', border: '1px solid #bdc3c7' }}
                        >
                            <option value="">-- Select a Category --</option>
                            <option value="Customer Requested Cancellation">Customer Requested Cancellation</option>
                            <option value="Duplicate Order">Duplicate Order</option>
                            <option value="Stock Discontinued / Unavailable">Stock Discontinued / Unavailable</option>
                            <option value="Payment / Credit Issue">Payment / Credit Issue</option>
                            <option value="Alternative Equipment Selected">Alternative Equipment Selected</option>
                            <option value="Other">Other (Please specify)</option>
                        </select>

                        {cancelCategory === 'Other' && (
                            <div>
                                <label style={{ fontSize: '13px', color: '#e74c3c', fontWeight: 'bold' }}>Please specify the reason:</label>
                                <textarea 
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Type the exact reason here..."
                                    rows="3"
                                    style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #e74c3c', borderRadius: '4px' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' }}>
                            <button onClick={closeCancelPopup} style={{ padding: '8px 15px', border: 'none', backgroundColor: '#95a5a6', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Go Back</button>
                            <button onClick={handleConfirmCancel} style={{ padding: '8px 15px', border: 'none', backgroundColor: '#e74c3c', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Cancellation</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default SalesManagerDashboard;