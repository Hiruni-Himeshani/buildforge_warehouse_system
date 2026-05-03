import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AIDashboard = () => {
    const [stats, setStats] = useState(null);
    const [forecastData, setForecastData] = useState([]);

    useEffect(() => {
        // Fetch the KPI stats
        axios.get('http://localhost:5001/api/manager/reports/dashboard-stats')
            .then(res => setStats(res.data))
            .catch(err => console.error("Stats Error:", err));

        // Fetch the AI Forecast
        axios.get('http://localhost:5001/api/manager/reports/forecast/ai')
            .then(res => setForecastData(res.data))
            .catch(err => console.error("AI Forecast Error:", err));
    }, []);

    // If data is still loading, show a nice message
    if (!stats) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Business Intelligence Data...</div>;

    return (
        <div style={{ marginBottom: '40px' }}>
            {/* ROW 1: KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderLeft: '5px solid #3498db' }}>
                    <h4 style={{ margin: 0, color: '#7f8c8d' }}>📦 Total Orders</h4>
                    <h2 style={{ margin: '10px 0 0 0', color: '#2c3e50' }}>{stats.kpis.totalOrders}</h2>
                </div>
                
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderLeft: `5px solid ${stats.kpis.pendingApprovals > 5 ? '#e74c3c' : '#f1c40f'}` }}>
                    <h4 style={{ margin: 0, color: '#7f8c8d' }}>⏳ Pending Approvals</h4>
                    <h2 style={{ margin: '10px 0 0 0', color: '#2c3e50' }}>{stats.kpis.pendingApprovals}</h2>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderLeft: '5px solid #2ecc71' }}>
                    <h4 style={{ margin: 0, color: '#7f8c8d' }}>🔥 Top Selling Item</h4>
                    <h2 style={{ margin: '10px 0 0 0', color: '#2c3e50', fontSize: '1.2rem' }}>{stats.kpis.topItem}</h2>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderLeft: '5px solid #9b59b6' }}>
                    <h4 style={{ margin: 0, color: '#7f8c8d' }}>👑 VIP Client</h4>
                    <h2 style={{ margin: '10px 0 0 0', color: '#2c3e50', fontSize: '1.2rem' }}>{stats.kpis.topClient}</h2>
                </div>
            </div>

            {/* ROW 2: AI FORECAST CHART */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🤖 AI Demand Forecast (Next 30 Days)</h3>
                {forecastData.length > 0 ? (
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <BarChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="pastSales" name="Past 30 Days Sales" fill="#3498db" />
                                <Bar dataKey="predictedDemand" name="AI Predicted Demand" fill="#2ecc71" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p>Generating AI Predictions...</p>
                )}
            </div>

            {/* ROW 3: LEADERBOARD TABLES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#2c3e50' }}>🏆 Top Clients</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                                <th style={{ padding: '10px' }}>Client Name</th>
                                <th style={{ padding: '10px' }}>Orders Placed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.leaderboards.clients.map((client, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                    <td style={{ padding: '10px' }}>{client.name}</td>
                                    <td style={{ padding: '10px' }}>{client.orders}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#2c3e50' }}>📊 Equipment Velocity</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                                <th style={{ padding: '10px' }}>Equipment Name</th>
                                <th style={{ padding: '10px' }}>Total Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.leaderboards.items.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                    <td style={{ padding: '10px' }}>{item.name}</td>
                                    <td style={{ padding: '10px' }}>{item.qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AIDashboard;