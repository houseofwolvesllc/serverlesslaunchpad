export function passwordPolicyValidator(password: string) {
    return password.length < 8 ? 'Password should include at least 8 characters' : null;
}
