// The staff user the form describes; a new user starts with the one role chosen in it.
export const readNewUser = (form: FormData) => ({
    name: String(form.get('name')),
    email: String(form.get('email')),
    password: String(form.get('password')),
    roles: [String(form.get('role'))],
});
