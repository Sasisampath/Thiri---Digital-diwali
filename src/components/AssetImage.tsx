import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & { src: string };

/** Prefer optimized WebP; fall back to the untouched supplied PNG on failure. */
export default function AssetImage({ src, alt, ...props }: Props) {
  const [pngOnly, setPngOnly] = useState(false);
  return <picture className="asset-picture">
    {!pngOnly && <source type="image/webp" srcSet={src.replace(/\.png$/, '.webp')} />}
    <img {...props} src={src} alt={alt} onError={() => setPngOnly(true)} />
  </picture>;
}
