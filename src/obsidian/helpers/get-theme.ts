export const getTheme = () => {
    if (document.body.hasClass('theme-light')) return 'light';
    else if (document.body.hasClass('theme-dark')) return 'dark';
    throw new Error('could not detect theme');
};
