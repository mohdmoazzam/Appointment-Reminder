import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage, isApiErrorWithStatus } from '@/lib/api/api-error';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { AuthLayout } from '../components/AuthLayout';
import { useLogin } from '../queries';
import { loginSchema, toLoginRequest, type LoginFormValues } from '../schemas';

/** After a successful login, RequireGuest (the parent route) redirects to the requested page. */
export function LoginPage() {
  useDocumentTitle('Sign in');
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => loginMutation.mutate(toLoginRequest(values)));

  return (
    <AuthLayout
      title="Sign in"
      description="Welcome back. Sign in to manage your appointments."
      footer={
        <>
          New to Appointment Reminder?{' '}
          <Link to={paths.signup} className="font-medium text-brand-600 hover:text-brand-700">
            Create a business account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {loginMutation.isError && (
          <Alert tone="error">{loginErrorMessage(loginMutation.error)}</Alert>
        )}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full" isLoading={loginMutation.isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

/** The API answers 401 for a wrong email, a wrong password and a disabled account alike. */
function loginErrorMessage(error: unknown): string {
  if (isApiErrorWithStatus(error, 401)) {
    return 'Incorrect email or password. If your account was disabled, ask the business owner.';
  }
  return getErrorMessage(error);
}
