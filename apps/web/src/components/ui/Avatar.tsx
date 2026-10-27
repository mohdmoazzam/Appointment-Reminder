import { initials } from '@/lib/names';
import { cn } from '@/lib/cn';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-20 text-xl',
};

interface AvatarProps {
  /** Used for the initials and the image's alt text. */
  name: string;
  imageUrl?: string | null;
  size?: AvatarSize;
  /** "rounded" suits logos; "circle" suits people. */
  shape?: 'circle' | 'rounded';
}

/** An image, or the name's initials when there is no image. */
export function Avatar({ name, imageUrl, size = 'md', shape = 'circle' }: AvatarProps) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn(
          'shrink-0 border border-slate-200 bg-white object-contain',
          SIZE_CLASSES[size],
          shapeClass,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-brand-100 font-semibold text-brand-700',
        SIZE_CLASSES[size],
        shapeClass,
      )}
    >
      {initials(name)}
    </span>
  );
}
