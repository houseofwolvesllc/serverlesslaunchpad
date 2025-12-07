import { useForm } from '@/hooks/use_form';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthError, passwordPolicyValidator, useAuth } from '../../authentication';
import toast from 'react-hot-toast';

interface FormValues {
    confirmationEmail: string;
    confirmationCode: string;
    newPassword: string;
    confirmNewPassword: string;
}

export const ConfirmResetPasswordForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const confirmationEmail = (searchParams.get('email') || '').trim().replace(/\s/g, '+');

    const form = useForm<FormValues>({
        initialValues: {
            confirmationEmail: confirmationEmail,
            confirmationCode: '',
            newPassword: '',
            confirmNewPassword: '',
        },
        validate: {
            confirmationEmail: (val: string) => (val ? null : 'Confirmation email is required'),
            confirmationCode: (val: string) => (val ? null : 'Confirmation code is required'),
            newPassword: passwordPolicyValidator,
            confirmNewPassword: (val: string, values: FormValues) => (val === values.newPassword ? null : 'Passwords do not match'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            await auth.confirmResetPassword(values.confirmationEmail, values.confirmationCode, values.newPassword);

            toast.success('Your password has been reset. Please sign in to continue.');

            navigate('/auth/signin');
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.name) {
                    case 'ExpiredCodeException':
                        form.setFieldError(
                            'confirmationCode',
                            <>
                                Confirmation code has expired.{' '}
                                <button
                                    type="button"
                                    className="link link-hover text-sm underline"
                                    onClick={async () => {
                                        await auth.resetPassword(values.confirmationEmail);

                                        toast.success('Please check your email for your reset code');
                                    }}
                                >
                                    Resend code?
                                </button>
                            </>
                        );
                        return;
                    case 'InvalidPasswordException':
                        form.setFieldError('newPassword', 'Invalid password');
                        return;
                    case 'LimitExceededException':
                        form.setFieldError('confirmationCode', 'Too many attempts. Please try again later.');
                        return;
                    default:
                        toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
                        throw error;
                }
            }

            throw error;
        }
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
                        <form id="confirm-reset-password-form" onSubmit={form.onSubmit((values: FormValues) => onSubmit(values))}>
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
                                        onChange={(e) => form.setFieldValue('confirmationCode', e.currentTarget.value)}
                                        className="input input-bordered w-full"
                                    />
                                    {form.errors.confirmationCode && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{form.errors.confirmationCode}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control">
                                    <label className="label" htmlFor="newPassword">
                                        <span className="label-text">New Password *</span>
                                    </label>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        value={form.values.newPassword}
                                        onChange={(e) => form.setFieldValue('newPassword', e.currentTarget.value)}
                                        className="input input-bordered w-full"
                                    />
                                    {form.errors.newPassword && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{form.errors.newPassword}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control">
                                    <label className="label" htmlFor="confirmNewPassword">
                                        <span className="label-text">Confirm New Password *</span>
                                    </label>
                                    <input
                                        id="confirmNewPassword"
                                        type="password"
                                        value={form.values.confirmNewPassword}
                                        onChange={(e) => form.setFieldValue('confirmNewPassword', e.currentTarget.value)}
                                        className="input input-bordered w-full"
                                    />
                                    {form.errors.confirmNewPassword && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{form.errors.confirmNewPassword}</span>
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
