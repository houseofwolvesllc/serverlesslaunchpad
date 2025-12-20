import { useForm } from '@/hooks/use_form';
import { AuthError, SignInStep, useAuth } from '../../authentication';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { LoadingContext } from '../../../context/loading_context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export const SignInForm = () => {
    const { signIn } = useAuth();
    const { setIsLoading } = useContext(LoadingContext);
    const location = useLocation();
    const navigate = useNavigate();

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: (val: string) => (/^\S+@\S+$/.test(val) ? null : 'Please provide a valid email'),
            password: (val: string) => (val ? null : 'Please provide a password'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            setIsLoading(true);

            const result = await signIn({
                username: values.email,
                password: values.password,
            });

            switch (result) {
                case SignInStep.CONFIRM_SIGNUP:
                    navigate(`/auth/confirm-signup?username=${values.email}`);
                    break;
                case SignInStep.RESET_PASSWORD:
                    navigate(`/auth/reset-password`);
                    break;
                case SignInStep.COMPLETED:
                    const origin = location.state?.from?.pathname || '/';
                    navigate(origin);
                    break;
                default:
                    throw new Error(`Unexpected sign in step: ${result}`);
            }
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.name) {
                    case 'UserNotConfirmedException':
                        navigate(`/auth/confirm-signup?username=${values.email}`);
                        break;
                    case 'PasswordResetRequiredException':
                        navigate(`/auth/reset-password`);
                        break;
                    case 'NotAuthorizedException':
                        form.setFieldError(
                            'password',
                            <>
                                Incorrect username or password.{' '}
                                <button
                                    type="button"
                                    className="text-xs underline cursor-pointer text-muted-foreground hover:text-foreground"
                                    onClick={() => navigate(`/auth/reset-password`)}
                                >
                                    Forgot password?
                                </button>
                            </>
                        );
                        break;
                    case 'UserNotFoundException':
                        form.setFieldError('email', 'User not found');
                        break;
                    default:
                        toast.error('Something Unexpected Happened', {
                            description: error instanceof Error ? error.message : 'An unexpected error occurred',
                        });
                        throw error;
                }
            } else {
                // Handle non-AuthError exceptions (e.g., network errors, API errors)
                toast.error('Sign In Failed', {
                    description: error instanceof Error ? error.message : 'An unexpected error occurred during sign in',
                });
            }
        } finally {
            setIsLoading(false);
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
                        <form id="signin-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
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
                            </div>
                        </form>
                        <div className="flex justify-between items-center mt-6">
                            <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    navigate(`/auth/signup`);
                                }}
                            >
                                Don't have an account? Sign Up
                            </button>
                            <Button type="submit" form="signin-form">
                                Sign In
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
