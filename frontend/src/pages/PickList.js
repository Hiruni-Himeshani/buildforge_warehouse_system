import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function PickList() {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [pickList, setPickList] = useState(null);
    const [pickDetails, setPickDetails] = useState({});
    const [warehouseStaff, setWarehouseStaff] = useState('');

    const fetchApprovedOrders = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/manager/orders');
            const approvedOrPicking = res.data.filter(o => o.status === 'Approved' || o.status === 'Picking');
            setOrders(approvedOrPicking);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch orders");
        }
    };

    useEffect(() => {
        fetchApprovedOrders();
    }, []);

    const generatePickList = async (orderId) => {
        try {
            const res = await axios.post(`http://localhost:5001/api/manager/orders/${orderId}/generate-picklist`);
            setSelectedOrder(res.data.order);
            setPickList(res.data.pickList);
            setPickDetails({});
            res.data.pickList.items.forEach(item => {
                setPickDetails(prev => ({ ...prev, [item.itemName]: 0 }));
            });
            toast.success("✅ Pick List generated!");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to generate pick list");
        }
    };

    const handlePickQuantityChange = (itemName, value) => {
        setPickDetails(prev => ({ ...prev, [itemName]: parseInt(value) || 0 }));
    };

    const confirmPick = async (itemName) => {
        if (!warehouseStaff) {
            toast.error("Please enter warehouse staff name");
            return;
        }

        const pickedQty = pickDetails[itemName];
        if (pickedQty <= 0) {
            toast.error("Please pick at least 1 item");
            return;
        }

        try {
            const res = await axios.put(
                `http://localhost:5001/api/manager/orders/${selectedOrder._id}/confirm-pick`,
                { itemName, pickedQty, warehouseStaff }
            );
            setSelectedOrder(res.data.order);
            setPickDetails(prev => ({ ...prev, [itemName]: 0 }));
            fetchApprovedOrders();
            toast.success(`✅ ${pickedQty}x ${itemName} picked!`);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to confirm pick");
        }
    };

    return (
        <div style={{ padding: '30px' }}>
            <h2>📋 Warehouse Pick List</h2>
            <p>Generate pick lists and confirm items picked from warehouse.</p>

            {!pickList ? (
                <div>
                    <h3>Select an Approved or In-Progress Order</h3>
                    <table border="1" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                        <thead style={{ backgroundColor: '#3498db', color: 'white' }}>
                            <tr>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td>{order.customerName}</td>
                                    <td>{order.itemsRequested.map(i => `${i.pickedQty || 0}/${i.qty} ${i.itemName}`).join(', ')}</td>
                                    <td>{order.priority}</td>
                                    <td>{order.status}</td>
                                    <td>
                                        <button
                                            onClick={() => generatePickList(order._id)}
                                            style={{ backgroundColor: '#3498db', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            {order.status === 'Picking' ? 'Continue Pick List' : 'Generate Pick List'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ backgroundColor: '#ecf0f1', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
                    <h3>📦 Pick List {pickList.pickListId}</h3>
                    <p><strong>Order:</strong> {pickList.orderId}</p>
                    <p><strong>Customer:</strong> {pickList.customerName}</p>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontWeight: 'bold' }}>Warehouse Staff Name:</label>
                        <input
                            type="text"
                            value={warehouseStaff}
                            onChange={(e) => setWarehouseStaff(e.target.value)}
                            placeholder="Enter staff name"
                            style={{ padding: '8px', marginLeft: '10px', borderRadius: '4px', border: '1px solid #bdc3c7', width: '200px' }}
                        />
                    </div>

                    <table border="1" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', marginTop: '15px' }}>
                        <thead style={{ backgroundColor: '#27ae60', color: 'white' }}>
                            <tr>
                                <th>Item Name</th>
                                <th>Required Qty</th>
                                <th>Already Picked</th>
                                <th>Pick Now</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedOrder.itemsRequested.map(item => (
                                <tr key={item.itemName}>
                                    <td><strong>{item.itemName}</strong></td>
                                    <td>{item.qty}</td>
                                    <td style={{ color: '#27ae60', fontWeight: 'bold' }}>{item.pickedQty}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.qty - item.pickedQty}
                                            value={pickDetails[item.itemName] || 0}
                                            onChange={(e) => handlePickQuantityChange(item.itemName, e.target.value)}
                                            style={{ padding: '6px', width: '60px', borderRadius: '4px', border: '1px solid #bdc3c7' }}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => confirmPick(item.itemName)}
                                            disabled={item.pickedQty >= item.qty}
                                            style={{
                                                backgroundColor: item.pickedQty >= item.qty ? '#95a5a6' : '#27ae60',
                                                color: 'white',
                                                padding: '6px 12px',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: item.pickedQty >= item.qty ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {item.pickedQty >= item.qty ? '✓ Done' : 'Confirm'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {selectedOrder.status === 'Ready for Gate Pass' && (
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d5f4e6', borderRadius: '4px', color: '#27ae60', fontWeight: 'bold' }}>
                            ✅ All items picked! Ready for Gate Pass generation.
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setPickList(null);
                            setSelectedOrder(null);
                            setWarehouseStaff('');
                            fetchApprovedOrders();
                        }}
                        style={{ backgroundColor: '#95a5a6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}
                    >
                        ← Back to Orders
                    </button>
                </div>
            )}
        </div>
    );
}

export default PickList;
