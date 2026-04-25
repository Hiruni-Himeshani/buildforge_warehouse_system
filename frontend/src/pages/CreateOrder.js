import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaClipboardList, FaArrowLeft } from 'react-icons/fa';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Card from '../components/Card';

function CreateOrder() {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [newOrder, setNewOrder] = useState({
        customerName: '',
        priority: 'Normal',
        equipmentName: '', 
        qty: 1
    });

    // Fetch inventory and customers for dropdowns
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invRes, customerRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/manager/inventory'),
                    axios.get('http://localhost:5001/api/manager/customers')
                ]);

                setInventory(invRes.data);
                setCustomers(customerRes.data);

                if (invRes.data.length > 0) {
                    setNewOrder(prev => ({ ...prev, equipmentName: invRes.data[0].itemName }));
                }

                if (customerRes.data.length > 0) {
                    const eligible = customerRes.data[0];
                    setSelectedCustomerId(eligible._id);
                    setNewOrder(prev => ({ ...prev, customerName: eligible.fullName }));
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        if (!newOrder.customerName || !newOrder.customerName.trim()) {
            toast.error('Customer name is required (select or add a customer)');
            return;
        }

        try {
            const orderPayload = {
                ...newOrder,
                customerId: selectedCustomerId,
                customerName: newOrder.customerName
            };
            await axios.post('http://localhost:5001/api/manager/orders', orderPayload);
            toast.success('New order successfully created!');
        } catch (error) { 
            console.error("Error creating order:", error);
            toast.error(error.response?.data?.error || 'Unable to create order');
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
            
            <Button onClick={() => navigate('/approval-lobby')} variant="secondary" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaArrowLeft />
                Back to Dashboard
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <FaClipboardList size={24} color="#827717" />
                <h2 style={{ color: '#827717', margin: 0 }}>Create New Customer Order</h2>
            </div>
            <p>Enter the details below to add a customer order successfully.</p>
            <hr style={{ marginBottom: '30px' }} />

            <Card>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <FormField
                        label="Choose Registered Customer:"
                        type="select"
                        value={selectedCustomerId}
                        onChange={(e) => {
                            const selected = customers.find(c => c._id === e.target.value);
                            setSelectedCustomerId(e.target.value);
                            setNewOrder(prev => ({ ...prev, customerName: selected ? selected.fullName : '' }));
                        }}
                        options={[
                            { value: '', label: '-- Select existing customer --' },
                            ...customers.map(customer => ({
                                value: customer._id,
                                label: `${customer.fullName} (${customer.status})`
                            }))
                        ]}
                    />
                    
                    <FormField
                        label="Priority Level:"
                        type="select"
                        value={newOrder.priority}
                        onChange={(e) => setNewOrder({...newOrder, priority: e.target.value})}
                        options={[
                            { value: 'Normal', label: 'Normal Priority' },
                            { value: 'High', label: 'High Priority' }
                        ]}
                    />

                    <FormField
                        label="Equipment Requested:"
                        type="select"
                        value={newOrder.equipmentName}
                        onChange={(e) => setNewOrder({...newOrder, equipmentName: e.target.value})}
                        options={inventory.map(inv => ({ value: inv.itemName, label: inv.itemName }))}
                    />

                    <FormField
                        label="Quantity:"
                        type="number"
                        value={newOrder.qty}
                        onChange={(e) => setNewOrder({...newOrder, qty: e.target.value})}
                        required
                        min="1"
                    />
                    
                    <Button type="submit" variant="primary" style={{ marginTop: '10px' }}>
                        Submit Order
                    </Button>
                </form>
            </Card>
        </div>
    );
}

export default CreateOrder;