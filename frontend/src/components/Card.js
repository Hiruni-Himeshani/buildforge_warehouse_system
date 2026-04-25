import React from 'react';

const Card = ({ children, style = {} }) => {
    return (
        <div style={{
            backgroundColor: '#f9fbe7',
            padding: '30px',
            borderRadius: '8px',
            border: '1px solid #cddc39',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            ...style
        }}>
            {children}
        </div>
    );
};

export default Card;