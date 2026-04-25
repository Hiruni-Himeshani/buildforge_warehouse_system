import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function Settings() {
    const [settings, setSettings] = useState({
        operationsEmail: '',
        operationsPhone: ''
    });

    // Load the current settings when the page opens
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('http://localhost:5001/api/manager/settings');
                setSettings(res.data);
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // Save the new settings to the backend
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put('http://localhost:5001/api/manager/settings', settings);
            toast.success("⚙️ System settings securely updated!");
        } catch (error) {
            toast.error("❌ Failed to save settings.");
            console.error(error);
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
            
            <h2 style={{ color: '#455a64' }}>⚙️ System Settings</h2>
            <p style={{ color: '#78909c' }}>Configure external integrations and notification targets.</p>
            <hr style={{ marginBottom: '30px', border: '0', borderTop: '1px solid #cfd8dc' }} />

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                
                <h3 style={{ margin: '0 0 10px 0', color: '#37474f' }}>Operations Department Contact</h3>
                <p style={{ margin: '0 0 20px 0', color: '#9e9e9e', fontSize: '0.9em' }}>Where should backorder manufacturing requests be sent?</p>

                <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#546e7a' }}>📧 Factory Email Address:</label>
                    <input 
                        type="email" 
                        required 
                        value={settings.operationsEmail} 
                        onChange={(e) => setSettings({...settings, operationsEmail: e.target.value})} 
                        style={{ padding: '12px', width: '100%', borderRadius: '4px', border: '1px solid #b0bec5', boxSizing: 'border-box' }} 
                    />
                </div>
                
                <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#546e7a' }}>📱 Factory SMS Number (with country code):</label>
                    <input 
                        type="text" 
                        placeholder="+947XXXXXXXX"
                        required 
                        value={settings.operationsPhone} 
                        onChange={(e) => setSettings({...settings, operationsPhone: e.target.value})} 
                        style={{ padding: '12px', width: '100%', borderRadius: '4px', border: '1px solid #b0bec5', boxSizing: 'border-box' }} 
                    />
                </div>
                
                <button type="submit" style={{ backgroundColor: '#2196F3', color: 'white', padding: '15px 20px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em', marginTop: '10px', transition: '0.2s' }}>
                    💾 Save Configuration
                </button>
            </form>
        </div>
    );
}

export default Settings;