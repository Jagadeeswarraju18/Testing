import React from 'react';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
}

export const Link: React.FC<LinkProps> = ({ href, className, children, ...props }) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Handle internal links
        if (href.startsWith('/')) {
            e.preventDefault();
            window.history.pushState({}, '', href);
            // Dispatch popstate event so App.tsx or listeners detect the change
            window.dispatchEvent(new Event('popstate'));
        }
    };

    return (
        <a
            href={href}
            className={className}
            onClick={handleClick}
            {...props}
        >
            {children}
        </a>
    );
};
