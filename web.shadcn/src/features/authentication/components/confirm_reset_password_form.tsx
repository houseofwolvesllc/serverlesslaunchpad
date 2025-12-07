import { useForm } from '@/hooks/use_form';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthError, passwordPolicyValidator, useAuth } from '../../authentication';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/logging/logger';

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

            toast.success('Password reset successful', {
                description: 'Your password has been reset. Please sign in to continue.',
            });

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
                                    className="text-xs underline cursor-pointer text-muted-foreground hover:text-foreground"
                                    onClick={async () => {
                                        await auth.resetPassword(values.confirmationEmail);

                                        toast.success('Reset code resent', {
                                            description: 'Please check your email for your reset code',
                                        });
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
                        toast.error('Something Unexpected Happened', {
                            description: error instanceof Error ? error.message : 'An unexpected error occurred',
                        });
                        throw error;
                }
            }

            logger.error('FORM Unexpected error', { error });
            throw error;
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                        <div className="flex justify-center mb-2">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary font-bold text-2xl">SL</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-lg">Serverless Launchpad</span>
                                    <span className="text-sm text-muted-foreground">shadcn Edition</span>
                                </div>
                            </div>
                        </div>
                        <hr className="my-4 border-border" />
                        <CardTitle>Reset Your Password</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form id="confirm-reset-password-form" onSubmit={form.onSubmit((values: FormValues) => onSubmit(values))}>
                            <div className="flex flex-col space-y-4">
                                <input type="hidden" {...form.getInputProps('confirmationEmail')} />
                                <div>
                                    <Label htmlFor="confirmationCode">Confirmation Code *</Label>
                                    <Input
                                        id="confirmationCode"
                                        type="text"
                                        value={form.values.confirmationCode}
                                        onChange={(e) => form.setFieldValue('confirmationCode', e.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.confirmationCode && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.confirmationCode}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="newPassword">New Password *</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={form.values.newPassword}
                                        onChange={(e) => form.setFieldValue('newPassword', e.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.newPassword && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.newPassword}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="confirmNewPassword">Confirm New Password *</Label>
                                    <Input
                                        id="confirmNewPassword"
                                        type="password"
                                        value={form.values.confirmNewPassword}
                                        onChange={(e) => form.setFieldValue('confirmNewPassword', e.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.confirmNewPassword && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.confirmNewPassword}</p>
                                    )}
                                </div>
                                <Button type="submit" className="w-full">Reset Password</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
