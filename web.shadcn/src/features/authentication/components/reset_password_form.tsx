import { useForm } from '@/hooks/use_form';
import { toast } from 'sonner';
import { useAuth } from '../../authentication';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
            toast.error('Something Unexpected Happened', {
                description: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
            throw error;
        }

        toast.success('Reset code sent', {
            description: 'Please check your email for your reset code',
        });

        navigate(`/auth/confirm-reset-password?email=${values.email}`);
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
                        <form id="reset-password-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                            <div className="flex flex-col space-y-4">
                                <div>
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={form.values.email}
                                        onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.email && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.email}</p>
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
