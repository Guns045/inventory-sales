import { useForm as useReactHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';

/**
 * Enhanced form hook wrapping React Hook Form with Zod validation
 * @param {object} schema - Zod validation schema
 * @param {object} options - Configuration options
 * @returns {object} Form methods and state
 */
export function useForm(schema, options = {}) {
    const {
        register,
        handleSubmit: rhfHandleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setValue,
        watch,
        getValues,
        control
    } = useReactHookForm({
        resolver: schema ? zodResolver(schema) : undefined,
        defaultValues: options.defaultValues || {},
        mode: options.mode || 'onSubmit'
    });

    const handleSubmit = useCallback((onSuccess, onError) => {
        return rhfHandleSubmit(
            async (data) => {
                try {
                    if (onSuccess) {
                        await onSuccess(data);
                    }
                    if (options.resetOnSuccess !== false) {
                        reset();
                    }
                } catch (error) {
                    if (onError) {
                        onError(error);
                    }
                }
            },
            (errors) => {
                if (onError) {
                    onError(errors);
                }
            }
        );
    }, [rhfHandleSubmit, reset, options.resetOnSuccess]);

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        reset,
        setValue,
        watch,
        getValues,
        control
    };
}
