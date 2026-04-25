import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Send login details to our backend
            const response = await axios.post('http://localhost:5001/api/auth/login', {
                username,
                password
            });

            // Find out what role this person is
            const userRole = response.data.role;

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', userRole);
            localStorage.setItem('username', username);

            // Upgraded from alert() to a nice toast popup!
            toast.success(`Welcome ${username}! Logged in as: ${userRole}`);

            // Route them to their specific lobby based on their role
            if (userRole === 'StoreKeeper') navigate('/inventory');
            if (userRole === 'SalesOfficer') navigate('/create-order');
            if (userRole === 'SalesManager') navigate('/approval-lobby');
            if (userRole === 'WarehouseManager') navigate('/dispatch');

        } catch (error) {
            // Upgraded from alert() to a nice toast error!
            toast.error('Login failed. Please check your username and password.');
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#2c3e50', // Dark industrial background
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}>
            
            {/* The Login Card */}
            <div style={{ 
                backgroundColor: 'white', 
                padding: '40px 50px', 
                borderRadius: '10px', 
                width: '100%', 
                maxWidth: '400px', 
                boxShadow: '0 15px 30px rgba(0,0,0,0.4)',
                position: 'relative'
            }}>
                
                {/* Back to Home Button */}
                <button 
                    onClick={() => navigate('/')}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        left: '15px',
                        background: 'none',
                        border: 'none',
                        color: '#7f8c8d',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    ← Back
                </button>

                {/* Branding Header */}
                <div style={{ textAlign: 'center', marginBottom: '35px', marginTop: '10px' }}>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#2c3e50', letterSpacing: '-1px' }}>
                        🏗️ Build<span style={{color: '#f39c12'}}>Forge</span>
                    </h1>
                    <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontWeight: '500' }}>Secure Staff Portal</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>
                            Username
                        </label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required
                            placeholder="Enter your username"
                            style={{ 
                                width: '100%', 
                                padding: '12px 15px', 
                                border: '1px solid #bdc3c7', 
                                borderRadius: '5px', 
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                backgroundColor: '#f9fcfc'
                            }} 
                        />
                    </div>
                    
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>
                            Password
                        </label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required
                            placeholder="••••••••"
                            style={{ 
                                width: '100%', 
                                padding: '12px 15px', 
                                border: '1px solid #bdc3c7', 
                                borderRadius: '5px', 
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                backgroundColor: '#f9fcfc'
                            }} 
                        />
                    </div>

                    <button 
                        type="submit" 
                        style={{ 
                            width: '100%', 
                            padding: '14px', 
                            backgroundColor: '#f39c12', 
                            color: '#2c3e50', 
                            border: 'none', 
                            borderRadius: '5px', 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#e67e22'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#f39c12'}
                    >
                        Secure Login
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <p style={{ fontSize: '12px', color: '#95a5a6', margin: 0 }}>
                        Authorized personnel only. All access is logged.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;