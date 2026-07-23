import Image from "next/image";

interface UserAvatarProps {
    avatar?: string;
    name?: string;
    email?: string;
    size?: number;
}

export function UserAvatar({ avatar, name, email, size = 28 }: UserAvatarProps) {
    const label = name || email || "User";
    const letter = label.trim().charAt(0).toUpperCase() || "?";

    return (
        <span
            className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-yellow-500 font-semibold text-white"
            style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }}
        >
            {avatar ? (
                <Image
                    src={avatar}
                    alt={`${label} profile`}
                    fill
                    sizes={`${size}px`}
                    className="object-cover"
                    unoptimized={avatar.startsWith("data:")}
                    referrerPolicy="no-referrer"
                />
            ) : (
                letter
            )}
        </span>
    );
}
