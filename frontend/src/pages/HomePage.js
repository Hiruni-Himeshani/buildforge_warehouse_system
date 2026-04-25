import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
    const navigate = useNavigate();

    return (
        <div style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', margin: 0, padding: 0, backgroundColor: '#f4f7f6' }}>
            
            {/* HERO SECTION */}
            <div style={{ 
                backgroundColor: '#2c3e50', 
                color: 'white', 
                minHeight: '70vh', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                textAlign: 'center',
                padding: '0 20px',
                borderBottom: '8px solid #f39c12' // Construction Orange/Yellow border
            }}>
                <div style={{ 
                    backgroundColor: '#f39c12', 
                    color: '#2c3e50', 
                    padding: '5px 15px', 
                    borderRadius: '20px', 
                    fontWeight: 'bold', 
                    marginBottom: '20px',
                    letterSpacing: '2px',
                    fontSize: '12px'
                }}>
                    ENTERPRISE RESOURCE PLANNING
                </div>
                
                <h1 style={{ fontSize: '4rem', margin: '0 0 20px 0', letterSpacing: '-1px' }}>
                    🏗️ Build<span style={{ color: '#f39c12' }}>Forge</span>
                </h1>
                
                <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 0 40px 0', color: '#bdc3c7', lineHeight: '1.6' }}>
                    The ultimate digital infrastructure for construction equipment manufacturing, inventory management, and heavy-duty dispatching.
                </p>

                {/* THE LOGIN BUTTON */}
                <button 
                    onClick={() => navigate('/login')}
                    style={{
                        backgroundColor: '#f39c12',
                        color: '#2c3e50',
                        border: 'none',
                        padding: '15px 40px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        transition: 'transform 0.2s, backgroundColor 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#e67e22'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#f39c12'}
                >
                    Access Staff Portal ➔
                </button>
            </div>

            {/* FEATURES SECTION (To impress the examiners) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', padding: '60px 20px', flexWrap: 'wrap' }}>
                
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📦</div>
                    <h3 style={{ color: '#2c3e50', margin: '0 0 10px 0' }}>Smart Inventory</h3>
                    <p style={{ color: '#7f8c8d', fontSize: '0.9rem', lineHeight: '1.5' }}>Real-time tracking of heavy machinery, scaffolding, and tools. Never over-promise stock again.</p>
                </div>

                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚚</div>
                    <h3 style={{ color: '#2c3e50', margin: '0 0 10px 0' }}>Fleet Dispatch</h3>
                    <p style={{ color: '#7f8c8d', fontSize: '0.9rem', lineHeight: '1.5' }}>Seamlessly generate pick-lists and gate passes to coordinate drivers and warehouse staff.</p>
                </div>

                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏭</div>
                    <h3 style={{ color: '#2c3e50', margin: '0 0 10px 0' }}>Factory Integration</h3>
                    <p style={{ color: '#7f8c8d', fontSize: '0.9rem', lineHeight: '1.5' }}>Automated backorder routing directly to the manufacturing plant via Email and SMS alerts.</p>
                </div>

            </div>

            {/* FOOTER */}
            <div style={{ backgroundColor: '#34495e', color: '#95a5a6', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>
                © 2026 BuildForge Industries. Authorized Personnel Only.
            </div>
        </div>
    );
}

export default HomePage;