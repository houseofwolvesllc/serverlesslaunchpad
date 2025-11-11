import { useAuth } from '../../authentication';
import { useForm } from '@/hooks/use_form';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const ConfirmSignUpForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const confirmationEmail = (searchParams.get('email') || '').trim().replace(/\s/g, '+');

    const form = useForm({
        initialValues: {
            confirmationEmail: confirmationEmail || '',
            confirmationCode: '',
        },
        validate: {
            confirmationEmail: (val: string) => (val ? null : 'Please provide the email address you signed up with'),
            confirmationCode: (val: string) => (val ? null : 'Please provide a confirmation code'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            await auth.confirmSignUp({
                confirmationEmail: values.confirmationEmail,
                confirmationCode: values.confirmationCode,
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
            throw error;
        }

        toast.success('Thank you for confirming your account :)');

        navigate('/');
    };

    const resendSignUpCode = async () => {
        try {
            await auth.resendConfirmationCode(form.values.confirmationEmail);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
            throw error;
        }

        toast.success('Please check your email for the new sign up code');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <img
                        src="/svg/serverless_launchpad_logo.svg"
                        alt="Serverless Launchpad Logo"
                        className="h-24"
                    />
                </div>
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Confirm Your Sign Up</h2>
                        <form id="confirm-signup-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                            <div className="flex flex-col space-y-4">
                                <input type="hidden" {...form.getInputProps('confirmationEmail')} />
                                <div className="form-control">
                                    <label className="label" htmlFor="confirmationCode">
                                        <span className="label-text">Confirmation Code *</span>
                                    </label>
                                    <input
                                        id="confirmationCode"
                                        type="text"
                                        value={form.values.confirmationCode}
                                        onChange={(event) => form.setFieldValue('confirmationCode', event.currentTarget.value)}
                                        className="input input-bordered w-full"
                                    />
                                    {form.errors.confirmationCode && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{form.errors.confirmationCode}</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </form>
                        <div className="flex justify-between items-center mt-6">
                            <button
                                type="button"
                                className="link link-hover text-sm"
                                onClick={() => {
                                    resendSignUpCode();
                                }}
                            >
                                Resend Confirmation Code
                            </button>
                            <button type="submit" form="confirm-signup-form" className="btn btn-primary">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
