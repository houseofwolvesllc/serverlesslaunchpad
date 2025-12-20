import { useForm } from '@/hooks/use_form';
import { AuthError, useAuth, passwordPolicyValidator, SignInStep } from '../../authentication';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export const SignUpForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const form = useForm({
        initialValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            terms: false,
        },
        validate: {
            firstName: (val: string) => (val ? null : 'Please provide a first name'),
            lastName: (val: string) => (val ? null : 'Please provide a last name'),
            email: (val: string) => (/^\S+@\S+$/.test(val) ? null : 'Please provide a valid email'),
            password: passwordPolicyValidator,
            terms: (val: boolean) => (val ? null : 'Please accept terms and conditions'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            const result = await auth.signUp({
                email: values.email,
                password: values.password,
                firstName: values.firstName,
                lastName: values.lastName,
            });

            switch (result) {
                case SignInStep.CONFIRM_SIGNUP:
                    toast.success('Sign up code sent', {
                        description: 'Please check your email for your sign up code',
                    });

                    navigate(`/auth/confirm-signup?email=${values.email}`);
                    break;
                case SignInStep.SIGNIN:
                    navigate(`/auth/signin`);
                    break;
                default:
                    throw new Error(`Unexpected sign in step: ${result}`);
            }
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.name) {
                    case 'UsernameExistsException':
                        form.setFieldError('email', 'Email already in use. Sign in or reset yourpassword.');
                        break;
                    default:
                        toast.error('Something Unexpected Happened', {
                            description: error instanceof Error ? error.message : 'An unexpected error occurred',
                        });
                        throw error;
                }
            } else {
                toast.error('Something Unexpected Happened', {
                    description: error instanceof Error ? error.message : 'An unexpected error occurred',
                });
                throw error;
            }
        }
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
                    <CardContent className="pt-6">
                        <form id="signup-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                            <div className="flex flex-col space-y-4">
                                <div>
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        type="text"
                                        placeholder="Elon"
                                        value={form.values.firstName}
                                        onChange={(event) => form.setFieldValue('firstName', event.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.firstName && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.firstName}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        type="text"
                                        placeholder="Musk"
                                        value={form.values.lastName}
                                        onChange={(event) => form.setFieldValue('lastName', event.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.lastName && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.lastName}</p>
                                    )}
                                </div>
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
                                <div>
                                    <Label htmlFor="password">Password *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Your password"
                                        value={form.values.password}
                                        onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
                                        className="mt-1"
                                    />
                                    {form.errors.password && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.password}</p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="terms"
                                        checked={form.values.terms}
                                        onCheckedChange={(checked) => form.setFieldValue('terms', checked as boolean)}
                                    />
                                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                                        I accept terms and conditions
                                    </Label>
                                </div>
                                {form.errors.terms && (
                                    <p className="text-sm text-destructive">{form.errors.terms}</p>
                                )}
                            </div>
                        </form>
                        <div className="flex justify-between items-center mt-6">
                            <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    navigate(`/auth/signin`);
                                }}
                            >
                                Already have an account? Sign In
                            </button>
                            <Button type="submit" form="signup-form">
                                Sign Up
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
