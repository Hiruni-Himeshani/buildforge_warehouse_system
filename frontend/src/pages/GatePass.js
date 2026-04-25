import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { toast } from 'react-toastify';

function GatePass() {
    const [orders, setOrders] = useState([]);
    const [gatePass, setGatePass] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [driverName, setDriverName] = useState('');
    const [dispatchLocation, setDispatchLocation] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleType, setVehicleType] = useState('');

    const buildGatePassData = (order) => ({
        gatePassNumber: order.gatePassNumber,
        orderId: order._id,
        customerName: order.customerName,
        pickedBy: order.pickedBy,
        driverName: order.driverName || 'N/A',
        dispatchLocation: order.dispatchLocation || 'N/A',
        vehicleNumber: order.vehicleNumber || 'N/A',
        vehicleType: order.vehicleType || 'N/A',
        generatedAt: order.generatedAt,
        items: order.itemsRequested.map(item => ({ itemName: item.itemName, qty: item.pickedQty || item.qty }))
    });

    const fetchReadyOrders = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/manager/orders');
            const ready = res.data.filter(o => o.status === 'Ready for Gate Pass');
            setOrders(ready);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch orders");
        }
    };


    useEffect(() => {
        fetchReadyOrders();
    }, []);

    const generateGatePass = async () => {
        if (!selectedOrder) {
            toast.error("Select an order first.");
            return;
        }
        if (!driverName || !dispatchLocation || !vehicleNumber || !vehicleType) {
            toast.error("Please fill all gate pass details.");
            return;
        }

        try {
            const res = await axios.post(
                `http://localhost:5001/api/manager/orders/${selectedOrder._id}/generate-gatepass`,
                {
                    driverName,
                    dispatchLocation,
                    vehicleNumber,
                    vehicleType
                }
            );
            setGatePass(res.data.gatePass);
            setSelectedOrder(null);
            setDriverName('');
            setDispatchLocation('');
            setVehicleNumber('');
            setVehicleType('');
            toast.success("✅ Gate Pass generated!");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to generate gate pass");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const margin = 40;
        let y = 50;

        doc.setFontSize(18);
        doc.text('GATE PASS', 297.5, y, { align: 'center' });
        y += 30;
        doc.setFontSize(11);

        const lines = [
            `Gate Pass Number: ${gatePass.gatePassNumber}`,
            `Order ID: ${gatePass.orderId}`,
            `Customer: ${gatePass.customerName}`,
            `Picked By: ${gatePass.pickedBy || 'N/A'}`,
            `Driver: ${gatePass.driverName || 'N/A'}`,
            `Vehicle Number: ${gatePass.vehicleNumber || 'N/A'}`,
            `Vehicle Type: ${gatePass.vehicleType || 'N/A'}`,
            `Dispatch Location: ${gatePass.dispatchLocation || 'N/A'}`,
            `Generated: ${new Date(gatePass.generatedAt).toLocaleString()}`
        ];

        lines.forEach(line => {
            doc.text(line, margin, y);
            y += 18;
        });

        y += 15;
        doc.setFontSize(13);
        doc.text('Items Released:', margin, y);
        y += 20;
        doc.setFontSize(11);

        gatePass.items.forEach(item => {
            doc.text(`${item.itemName} - Qty: ${item.qty}`, margin, y);
            y += 16;
        });

        y += 25;
        doc.setFontSize(11);
        doc.text('Warehouse Manager: ____________________', margin, y);
        doc.text('Gate Keeper: ____________________', 320, y);
        y += 25;
        doc.text('Authorized: ____________________', margin, y);

        doc.save(`gate-pass-${gatePass.gatePassNumber}.pdf`);
    };

    return (
        <div style={{ padding: '30px' }}>
            <h2>🚪 Gate Pass Management</h2>
            <p>Generate and manage gate passes for dispatched orders.</p>

            {!gatePass ? (
                <div>
                    <h3>Orders Ready for Gate Pass</h3>
                    {orders.length === 0 ? (
                        <p style={{ color: '#7f8c8d' }}>No orders ready for gate pass. Complete picking first.</p>
                    ) : (
                        <>
                            {!selectedOrder ? (
                                <table border="1" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                                    <thead style={{ backgroundColor: '#9b59b6', color: 'white' }}>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Items</th>
                                            <th>Picked By</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(order => (
                                            <tr key={order._id}>
                                                <td>{order._id}</td>
                                                <td>{order.customerName}</td>
                                                <td>{order.itemsRequested.map(i => `${i.pickedQty}x ${i.itemName}`).join(', ')}</td>
                                                <td>{order.pickedBy || 'N/A'}</td>
                                                <td>
                                                    <button
                                                        onClick={() => {
                                                            if (order.gatePassNumber) {
                                                                setGatePass(buildGatePassData(order));
                                                                setSelectedOrder(null);
                                                            } else {
                                                                setSelectedOrder(order);
                                                            }
                                                        }}
                                                        style={{ backgroundColor: '#9b59b6', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                    >
                                                        {order.gatePassNumber ? 'View Gate Pass' : 'Add Gate Pass Details'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ backgroundColor: '#fff', padding: '20px', border: '1px solid #dcdcdc', borderRadius: '10px' }}>
                                    <h4>Enter Gate Pass Details for Order: {selectedOrder._id}</h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div>
                                            <label><strong>Driver Name:</strong></label>
                                            <input
                                                value={driverName}
                                                onChange={(e) => setDriverName(e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #bdc3c7' }}
                                                placeholder="Enter driver name"
                                            />
                                        </div>

                                        <div>
                                            <label><strong>Location:</strong></label>
                                            <input
                                                value={dispatchLocation}
                                                onChange={(e) => setDispatchLocation(e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #bdc3c7' }}
                                                placeholder="Enter dispatch location"
                                            />
                                        </div>

                                        <div>
                                            <label><strong>Vehicle Number:</strong></label>
                                            <input
                                                value={vehicleNumber}
                                                onChange={(e) => setVehicleNumber(e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #bdc3c7' }}
                                                placeholder="Enter vehicle number"
                                            />
                                        </div>

                                        <div>
                                            <label><strong>Vehicle Type:</strong></label>
                                            <select
                                                value={vehicleType}
                                                onChange={(e) => setVehicleType(e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #bdc3c7' }}
                                            >
                                                <option value="">-- Select --</option>
                                                <option value="Small Truck">Small Truck</option>
                                                <option value="Medium Truck">Medium Truck</option>
                                                <option value="Large Truck">Large Truck</option>
                                                <option value="Pickup">Pickup</option>
                                                <option value="Trailer">Trailer</option>
                                                <option value="Van">Van</option>
                                                <option value="SUV">SUV</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={generateGatePass}
                                            style={{ backgroundColor: '#27ae60', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                        >
                                            Generate Gate Pass
                                        </button>

                                        <button
                                            onClick={() => setSelectedOrder(null)}
                                            style={{ backgroundColor: '#95a5a6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div style={{ backgroundColor: '#ecf0f1', padding: '30px', borderRadius: '8px', marginTop: '20px', maxWidth: '600px' }} id="gatepass-print">
                    <div style={{ border: '3px solid #2c3e50', padding: '20px', backgroundColor: 'white', borderRadius: '4px' }}>
                        <h2 style={{ textAlign: 'center', borderBottom: '2px solid #2c3e50', paddingBottom: '10px' }}>🚪 GATE PASS</h2>

                        <div style={{ marginTop: '20px', lineHeight: '1.8' }}>
                            <p><strong>Gate Pass Number:</strong> <span style={{ fontSize: '18px', fontFamily: 'monospace', color: '#9b59b6' }}>{gatePass.gatePassNumber}</span></p>
                            <p><strong>Order ID:</strong> {gatePass.orderId}</p>
                            <p><strong>Customer:</strong> {gatePass.customerName}</p>
                            <p><strong>Picked By:</strong> {gatePass.pickedBy}</p>
                            <p><strong>Driver:</strong> {gatePass.driverName || 'N/A'}</p>
                            <p><strong>Vehicle Number:</strong> {gatePass.vehicleNumber || 'N/A'}</p>
                            <p><strong>Vehicle Type:</strong> {gatePass.vehicleType || 'N/A'}</p>
                            <p><strong>Dispatch Location:</strong> {gatePass.dispatchLocation || 'N/A'}</p>
                            <p><strong>Generated:</strong> {new Date(gatePass.generatedAt).toLocaleString()}</p>
                        </div>

                        <div style={{ marginTop: '20px', borderTop: '2px solid #ecf0f1', paddingTop: '15px' }}>
                            <h3>Items Released:</h3>
                            <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#34495e', color: 'white' }}>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gatePass.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.itemName}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: '30px', borderTop: '2px solid #ecf0f1', paddingTop: '15px' }}>
                            <table style={{ width: '100%', textAlign: 'center' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ borderTop: '2px solid #2c3e50', paddingTop: '10px' }}>
                                            <strong>Warehouse Manager</strong>
                                        </td>
                                        <td style={{ borderTop: '2px solid #2c3e50', paddingTop: '10px' }}>
                                            <strong>Gate Keeper</strong>
                                        </td>
                                        <td style={{ borderTop: '2px solid #2c3e50', paddingTop: '10px' }}>
                                            <strong>Authorized</strong>
                                        </td>
                                    </tr>
                                    <tr style={{ height: '50px' }}>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                    <tr style={{ fontSize: '12px' }}>
                                        <td>Date: _________</td>
                                        <td>Date: _________</td>
                                        <td>Date: _________</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={handlePrint} style={{ backgroundColor: '#3498db', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            🖨️ Print
                        </button>
                        <button onClick={handleDownload} style={{ backgroundColor: '#27ae60', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            📥 Download
                        </button>
                        <button
                            onClick={() => {
                                setGatePass(null);
                                fetchReadyOrders();
                            }}
                            style={{ backgroundColor: '#95a5a6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GatePass;
