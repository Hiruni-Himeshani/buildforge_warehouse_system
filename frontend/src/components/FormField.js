import React from 'react';

const FormField = ({ label, type = 'text', value, onChange, options = [], required = false, min, style = {} }) => {
    return (
        <div style={{ marginBottom: '15px', ...style }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                {label}
                {required && <span style={{ color: 'red' }}> *</span>}
            </label>
            {type === 'select' ? (
                <select
                    value={value}
                    onChange={onChange}
                    required={required}
                    style={{
                        padding: '10px',
                        width: '100%',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                    }}
                >
                    {options.map((option, index) => (
                        <option key={index} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    required={required}
                    min={min}
                    style={{
                        padding: '10px',
                        width: '100%',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                    }}
                />
            )}
        </div>
    );
};

export default FormField;