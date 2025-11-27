import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button Component', () => {
    test('renders button with text', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    test('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);

        fireEvent.click(screen.getByText('Click Me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('renders loading state correctly', () => {
        render(<Button loading>Click Me</Button>);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('Click Me')).not.toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    test('renders disabled state correctly', () => {
        render(<Button disabled>Click Me</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    test('applies variant classes correctly', () => {
        const { rerender } = render(<Button variant="primary">Primary</Button>);
        expect(screen.getByRole('button')).toHaveClass('bg-indigo-600');

        rerender(<Button variant="danger">Danger</Button>);
        expect(screen.getByRole('button')).toHaveClass('bg-red-600');
    });
});
