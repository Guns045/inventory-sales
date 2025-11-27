import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../Input';

describe('Input Component', () => {
    test('renders input with label', () => {
        render(<Input name="email" label="Email Address" onChange={() => { }} />);
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    test('calls onChange handler when typed', () => {
        const handleChange = vi.fn();
        render(<Input name="email" onChange={handleChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test@example.com' } });

        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    test('displays error message', () => {
        render(<Input name="email" error="Invalid email" onChange={() => { }} />);
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
        // Note: The input might not have the class directly if it's wrapped, but let's check the error text presence which is most important
    });

    test('toggles password visibility', () => {
        render(<Input name="password" label="Password" type="password" onChange={() => { }} />);

        const input = screen.getByLabelText('Password');
        expect(input).toHaveAttribute('type', 'password');

        const toggleButton = screen.getByRole('button');
        fireEvent.click(toggleButton);

        expect(input).toHaveAttribute('type', 'text');

        fireEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'password');
    });
});
