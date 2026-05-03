import React from 'react';
import AIDashboard from '../components/AIDashboard'; // Adjust the path if needed

const AnalyticsPage = () => {
    return (
        <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#263238' }}>📈 Business Intelligence & AI Forecast</h2>
                <p style={{ margin: 0, color: '#546e7a' }}>View your warehouse performance and future demand predictions.</p>
            </div>
            
            <hr style={{ marginBottom: '30px', border: '0', borderTop: '1px solid #cfd8dc' }} />

            {/* This drops your beautiful AI component right onto this new page! */}
            <AIDashboard />
        </div>
    );
};

export default AnalyticsPage;