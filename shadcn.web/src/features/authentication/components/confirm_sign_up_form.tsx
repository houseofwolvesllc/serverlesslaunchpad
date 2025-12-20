import { useAuth } from '../../authentication';
import { useForm } from '@/hooks/use_form';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
            toast.error('Something Unexpected Happened', {
                description: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
            throw error;
        }

        toast.success('Confirmed!', {
            description: 'Thank you for confirming your account :)',
        });

        navigate('/');
    };

    const resendSignUpCode = async () => {
        try {
            await auth.resendConfirmationCode(form.values.confirmationEmail);
        } catch (error) {
            toast.error('Something Unexpected Happened', {
                description: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
            throw error;
        }

        toast.success('Sign up code resent', {
            description: 'Please check your email for the new sign up code',
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <img
                        src="/svg/serverless_launchpad_logo.svg"
                        alt="Serverless Launchpad Logo"
                        className="h-24"
                    />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Confirm Your Sign Up</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form id="confirm-signup-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                            <div className="flex flex-col space-y-4">
                                <input type="hidden" {...form.getInputProps('confirmationEmail')} />
                                <div>
                                    <Label htmlFor="confirmationCode">Confirmation Code *</Label>
                                    <Input
                                        id="confirmationCode"
                                        type="text"
                                        value={form.values.confirmationCode}
                                        onChange={(event) => form.setFieldValue('confirmationCode', event.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.confirmationCode && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.confirmationCode}</p>
                                    )}
                                </div>
                            </div>
                        </form>
                        <div className="flex justify-between items-center mt-6">
                            <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    resendSignUpCode();
                                }}
                            >
                                Resend Confirmation Code
                            </button>
                            <Button type="submit" form="confirm-signup-form">
                                Confirm
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
