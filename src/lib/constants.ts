export const ADMIN_EMAILS = [
    'jules.boullier@gmail.com',
    'jules.boullier@audencia.com'
];

export const isUserAdmin = (email?: string | null): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
};
