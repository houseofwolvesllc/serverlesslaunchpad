import { useForm } from '@/hooks/use_form';
import { AuthenticationContext, AuthError, SignInStep, useAuth } from '../../authentication';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { LoadingContext } from '../../../context/loading_context';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export const SignInForm = () => {
    const { signIn } = useAuth();
    const { signedInUser, initialized } = useContext(AuthenticationContext);
    const { setIsLoading } = useContext(LoadingContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    // Redirect to dashboard if already authenticated
    useEffect(() => {
        if (initialized && signedInUser) {
            const origin = location.state?.from?.pathname || '/';
            navigate(origin, { replace: true });
        }
    }, [initialized, signedInUser, navigate, location.state]);

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
                    case 'InvalidPasswordException': // cognito-local uses this instead of NotAuthorizedException
                        form.setFieldError(
                            'password',
                            <>
                                Incorrect username or password.{' '}
                                <button
                                    type="button"
                                    className="text-xs underline cursor-pointer opacity-70 hover:opacity-100"
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
                        toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
                        throw error;
                }
            } else {
                // Handle non-AuthError exceptions (e.g., network errors, API errors)
                toast.error(error instanceof Error ? error.message : 'An unexpected error occurred during sign in');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
            <div className="w-full max-w-md px-4">
                <div className="flex justify-center mb-8">
                    <img
                        src="/svg/serverless_launchpad_logo.svg"
                        alt="Serverless Launchpad Logo"
                        className="h-24"
                    />
                </div>
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <form id="signin-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                            <div className="space-y-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Email *</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        className="input input-bordered w-full"
                                        value={form.values.email}
                                        onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
                                    />
                                    {form.errors.email && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{form.errors.email}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Password *</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Your password"
                                            className="input input-bordered w-full pr-10"
                                            value={form.values.password}
                                            onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    {form.errors.password && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{form.errors.password}</span>
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
                                    navigate(`/auth/signup`);
                                }}
                            >
                                Don't have an account? Sign Up
                            </button>
                            <button type="submit" form="signin-form" className="btn btn-primary">
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
