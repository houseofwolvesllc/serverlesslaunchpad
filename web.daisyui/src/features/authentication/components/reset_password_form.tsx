import { useForm } from '@/hooks/use_form';
import toast from 'react-hot-toast';
import { useAuth } from '../../authentication';
import { useNavigate } from 'react-router-dom';

export const ResetPasswordForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();

    const form = useForm({
        initialValues: {
            email: '',
        },
        validate: {
            email: (val: string) => (/^\S+@\S+$/.test(val) ? null : 'Please provide a valid email to send the reset code to'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            await auth.resetPassword(values.email);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
            throw error;
        }

        toast.success('Please check your email for your reset code');

        navigate(`/auth/confirm-reset-password?email=${values.email}`);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
            <div className="w-full max-w-md">
                <div className="card bg-base-100 shadow-xl">
                    <div className="flex justify-center pt-8 pb-4 px-8">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-2xl">SL</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-lg">Serverless Launchpad</span>
                                <span className="text-sm text-base-content/60">DaisyUI Edition</span>
                            </div>
                        </div>
                    </div>
                    <div className="divider my-0 mx-8"></div>
                    <div className="card-body pt-4">
                        <h2 className="card-title mb-4">Reset Your Password</h2>
                        <form id="reset-password-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                            <div className="flex flex-col space-y-4">
                                <div className="form-control">
                                    <label className="label" htmlFor="email">
                                        <span className="label-text">Email *</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={form.values.email}
                                        onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
                                        className="input input-bordered w-full"
                                    />
                                    {form.errors.email && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{form.errors.email}</span>
                                        </label>
                                    )}
                                </div>
                                <button type="submit" className="btn btn-primary w-full">Reset Password</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
