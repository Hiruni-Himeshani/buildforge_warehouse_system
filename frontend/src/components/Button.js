import React from 'react';

const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, style = {} }) => {
    const baseStyle = {
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
        ...style
    };

    const variants = {
        primary: { backgroundColor: '#8bc34a', color: 'white' },
        secondary: { backgroundColor: '#e0e0e0', color: '#333' },
        warning: { backgroundColor: '#f9a825', color: 'white' },
        danger: { backgroundColor: '#f44336', color: 'white' }
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={{ ...baseStyle, ...variants[variant] }}
        >
            {children}
        </button>
    );
};

export default Button;