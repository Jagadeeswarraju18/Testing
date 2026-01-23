import React, { useState } from 'react';

interface ServiceLogoProps {
    name: string;
    logoUrl?: string;
    className?: string; // For the container
}

const ServiceLogo: React.FC<ServiceLogoProps> = ({ name, logoUrl, className = "w-10 h-10" }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(logoUrl || null);
    const [hasError, setHasError] = useState(false);

    // 1. Primary: logoUrl prop
    // 2. Secondary: Clearbit
    // 3. Tertiary: Google Favicon

    const clearbitUrl = React.useMemo(() => {
        if (!name) return null;
        const cleanName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        return `https://logo.clearbit.com/${cleanName}.com`;
    }, [name]);

    const googleUrl = React.useMemo(() => {
        if (!name) return null;
        const cleanName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        return `https://www.google.com/s2/favicons?domain=${cleanName}.com&sz=128`;
    }, [name]);

    const handleError = () => {
        if (imageSrc === logoUrl && clearbitUrl) {
            setImageSrc(clearbitUrl);
        } else if (imageSrc === clearbitUrl && googleUrl) {
            setImageSrc(googleUrl);
        } else {
            setHasError(true);
        }
    };

    // Initialize
    React.useEffect(() => {
        if (!logoUrl) {
            if (clearbitUrl) setImageSrc(clearbitUrl);
        } else {
            setImageSrc(logoUrl);
        }
        setHasError(false);
    }, [logoUrl, clearbitUrl]);

    if (imageSrc && !hasError) {
        return (
            <img
                src={imageSrc}
                alt={name}
                className="w-full h-full object-contain"
                onError={handleError}
            />
        );
    }

    return (
        <span className="font-bold text-lg capitalize">{name.charAt(0)}</span>
    );
};

export default ServiceLogo;
