'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Image, { type ImageProps } from 'next/image';

interface AppImageProps extends Omit<ImageProps, 'src' | 'alt' | 'width' | 'height' | 'fill'> {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  fallbackSrc?: string;
  onClick?: () => void;
}

const DEFAULT_FALLBACK = '/assets/images/no_image.png';

const AppImage = memo(function AppImage({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  fill = false,
  sizes,
  onClick,
  fallbackSrc = DEFAULT_FALLBACK,
  loading = 'lazy',
  unoptimized = false,
  style,
  ...props
}: AppImageProps) {
  const normalizeSrc = (value?: string | null): string => {
    return typeof value === 'string' ? value.trim() : '';
  };

  const originalSrc = normalizeSrc(src);
  const safeFallback = normalizeSrc(fallbackSrc);

  const [imageSrc, setImageSrc] = useState(originalSrc || safeFallback || DEFAULT_FALLBACK);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImageSrc(originalSrc || safeFallback || DEFAULT_FALLBACK);
    setHasError(false);
    setIsLoading(true);
  }, [originalSrc, safeFallback]);

  const resolvedFallback = safeFallback || DEFAULT_FALLBACK;

  const isExternalUrl = useMemo(() => /^https?:\/\//i.test(imageSrc), [imageSrc]);

  const handleError = useCallback(() => {
    setIsLoading(false);

    if (!hasError && imageSrc !== resolvedFallback) {
      setHasError(true);
      setImageSrc(resolvedFallback);
      setIsLoading(true);
      return;
    }

    setHasError(true);
  }, [hasError, imageSrc, resolvedFallback]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Jangan render Image jika sumber gambar masih kosong.
  if (!imageSrc.trim()) {
    return null;
  }

  const finalClassName = [
    className,
    isLoading ? 'bg-gray-200' : '',
    onClick ? 'cursor-pointer transition-opacity duration-200 hover:opacity-90' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const finalPlaceholder: NonNullable<ImageProps['placeholder']> =
  placeholder === 'blur' && blurDataURL
    ? 'blur'
    : 'empty';

  const commonProps = {
    ...props,
    src: imageSrc,
    alt,
    className: finalClassName,
    quality,
    placeholder: finalPlaceholder,
    ...(finalPlaceholder === 'blur' && blurDataURL ? { blurDataURL } : {}),
    unoptimized: unoptimized || isExternalUrl,
    onError: handleError,
    onLoad: handleLoad,
    onClick,
    ...(priority ? { priority: true } : { loading }),
  };

  // Mode fill: gambar mengikuti ukuran container.
  if (fill) {
    return (
      <div className="relative" style={{ width: '100%', height: '100%' }}>
        <Image
          {...commonProps}
          src={imageSrc}
          alt={alt}
          fill={true}
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          style={{
            objectFit: 'cover',
            ...style,
          }}
        />
      </div>
    );
  }

  // Mode ukuran biasa.
  return (
    <Image
      {...commonProps}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      style={style}
    />
  );
});

AppImage.displayName = 'AppImage';

export default AppImage;
